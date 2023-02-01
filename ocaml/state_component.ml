(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

module Log = Pulse_log (*TODO: to replace by Lwt_log_js*)

exception State_not_defined
exception No_start_state
exception No_next_context

exception Visible_block_element_found

class virtual ['context, 'key] pulse_state_component element =
  object (self: 'self)
    inherit Pulse_component.pulse_component element as super

    method virtual context_to_string : 'context -> string
    method virtual key_to_string : 'key -> string
    
    val mutable error_message: string option = None
    method private error_message = error_message
    method set_error m = error_message <- Some m
    method show_error () = match self#error_message with
    | None -> raise Not_found
    | Some m -> self#display_error m

    method virtual private display_error: string -> unit

    method virtual remove_error: unit -> unit
    
    val mutable visible = false

    method is_visible =
      (* The following code is a little bit tricky because on Chrome: 
         - is_visible only works on block elements, else false is always returned 
         - the x-tag element is always inline *)
      if not visible
      then false
      else if Pulse_dom_html.is_visible self#element
      then true
      else if Pulse_dom_html.is_block self#element
      then false
      else
        begin
          (* because the x-tag element is always inline on Chrome, visit all the children 
             and try to find among them a visible block element *)
          let block_element_found = ref false in
          let is_node_block_element_and_visible child =
            match Dom.nodeType child with
            | Dom.Element child_element ->
              begin
                block_element_found := true;
                let child_html_element = Dom_html.element child_element in
                if (Pulse_dom_html.is_block child_html_element) && (Pulse_dom_html.is_visible child_html_element)
                then raise Visible_block_element_found
              end
            | _ -> ()
          in
          try
            Pulse_dom.NodeList.iter is_node_block_element_and_visible self#element##.childNodes;
            not !block_element_found
          with
          | Visible_block_element_found -> true
        end

    method connected_callback () =
      super#connected_callback ();
      visible <- true

    method disconnected_callback () =
      visible <- false;
      super#disconnected_callback ()

    val mutable get_initialized_state: 'context -> 'key -> ('context, 'key) State.t = fun c k -> raise State_not_defined

    val mutable pending_post_action: unit -> unit = fun () -> ()

    method private virtual define_state: 'context -> 'key -> ('context, 'key) State.t

    method private virtual start_context: 'context

    method private virtual get_start_key: 'context -> 'key

    method private virtual get_next_context: 'context -> 'context

    method private enter_context = function
      | _ -> (fun () -> ())

    method private exit_context = function
      | _ -> (fun () -> ())

    method get_state context key =
      try get_initialized_state context key
      with State_not_defined ->
        let state = self#define_state context key in
        Log.debug "get_state: define new state";
        let previous_get_initialized_state = get_initialized_state in
        let new_get_initialized_state c k = match (c,k) with
          | c1, k1 when c1=context && k1=key -> state
          | _,_ -> previous_get_initialized_state c k
        in
        get_initialized_state <- new_get_initialized_state;
        state

    val mutable state_key: 'key option = None
    method state_key = match state_key with
      | None ->
        begin
          Log.error "No state key is defined yet";
          raise Option.No_value
        end
      | Some k -> k

    val mutable state_context: 'context option = None
    method state_context = match state_context with
      | None ->
        begin
          Log.error "No state context is defined yet";
          raise Option.No_value
        end
      | Some c -> c

    method state = self#get_state self#state_context self#state_key

    method is_started = match state_context, state_key with
      | None, _ | _, None -> false
      | Some _, Some _ -> true

    method switch_to_state ?context ?key ?pre_action:(pre_action=fun () -> ()) ?post_action:(post_action=fun () -> ()) (): unit =
      Log.debug "switch_to_state";
      let switch_to_state_aux c k: unit =
        match (state_context, state_key) with
        | None, None ->
          begin
            Log.debug "switch_to_state: switching to initial state";
            self#enter_context c ();
            state_context <- Some c;
            state_key <- Some k;
            pre_action ();
            let new_state = self#get_state c k in
            new_state#enter_state ();
            pending_post_action <- post_action;
            ()
          end
        | None, _ | _, None -> raise State_not_defined
        | Some current_context, Some current_key when current_context=c && current_key=k ->
          begin
            pending_post_action ();
            pending_post_action <- (fun () -> ());
            Log.debug "switch_to_state: staying";
            pre_action ();
            (self#get_state c k)#stay ();
            pending_post_action <- post_action
          end
        | Some current_context, Some current_key ->
          begin
            (self#get_state current_context current_key)#exit_state c k;
            Log.debug "switch_to_state: post action";
            pending_post_action ();
            pending_post_action <- (fun () -> ());
            Log.debug "switch_to_state: switching";
            if current_context != c then
              begin
                self#exit_context current_context ();
                self#enter_context c ();
              end;
            state_context <- Some c;
            state_key <- Some k;
            pre_action ();
            (self#get_state c k)#enter_state ~previous_context:current_context ~previous_key:current_key ();
            pending_post_action <- post_action;
            ()
          end
      in
      let switch_to_state_aux2 k =
        match state_context with
        | None -> switch_to_state_aux self#start_context k
        | Some current_context -> switch_to_state_aux current_context k
      in
      match (context, key) with
      | None, None -> raise State_not_defined
      | Some c, None -> let k = self#get_start_key c in switch_to_state_aux c k
      | None, Some k -> switch_to_state_aux2 k
      | Some c, Some k -> switch_to_state_aux c k

    method switch_to_next_context ?pre_action:(pre_action=fun () -> ()) ?post_action:(post_action=fun () -> ()) () =
      Log.debug "switch_to_next_context";
      let next_context = match state_context with
        | None -> self#start_context
        | Some c ->
          begin
            try self#get_next_context c
            with No_next_context -> begin
                Log.error "switch_to_next_context: no next context";
                c
              end
          end
      in
      self#switch_to_state ~context:next_context ~pre_action ~post_action ()
  end


type initialized_component_contexts =
  [ `Initialization | `Reset ] [@@deriving sexp]
type initialized_component_keys =
  [ `Initializing | `Error ] [@@deriving sexp]

class virtual ['context, 'key] pulse_initialized_component element =
  object (self: 'self)
    constraint 'context = [> initialized_component_contexts ]
    constraint 'key = [> initialized_component_keys ]
    inherit ['context, 'key] pulse_state_component element as super

    method private start_context : 'context = `Initialization

    (*  Error message to display *)
    val mutable error: string option = None

    method virtual initialize: unit -> unit

    method is_initialized () =
      if not self#is_started
      then false
      else
        try
          not (List.exists ((=) self#state_context) [`Initialization; `Reset])
        with _ ->
          begin
            Log.error "is_initialized: check state_context failed";
            false
          end

    method connected_callback () =
      super#connected_callback ();
      if not self#is_started then self#start ();

    method clear () =
      (*TODO: dipatchers *)
      ()

    method enter_error_state () =
      self#add_class "pulse-component-error"

    method exit_error_state () =
      self#remove_class "pulse-component-error"

    method reset () =
      self#switch_to_next_context ()

    method start () =
      if self#is_initialized ()
      then self#switch_to_state ~context:`Reset ()
      else self#switch_to_state ~context:self#start_context ();
      match state_context, state_key with
      | None, _ -> Log.error "State context is not defined after start"
      | _, None -> Log.error "State key is not defined after start"
      | _, _ -> ()
  end


type basic_initialized_component_contexts =
  [ initialized_component_contexts | `Initialized ] [@@deriving sexp]
type basic_initialized_component_keys =
  [ initialized_component_keys | `Standard ] [@@deriving sexp]

class virtual pulse_basic_initialized_component element =
  object (self: 'self)
    inherit [basic_initialized_component_contexts, basic_initialized_component_keys] pulse_initialized_component element as super

    method context_to_string c =  Sexplib.Sexp.to_string (sexp_of_basic_initialized_component_contexts c);
    method key_to_string k = Sexplib.Sexp.to_string (sexp_of_basic_initialized_component_keys k);

    method private get_start_key = function
      | `Initialization | `Reset -> `Initializing
      | `Initialized -> `Standard

    method private get_next_context = function
      | `Initialization | `Reset -> `Initialized
      | `Initialized ->
        begin
          Log.error "No next context is defined";
          raise No_next_context
        end

    method private define_state context key = match (context, key) with
      | `Initialization, `Initializing -> new State.initial context  key self
      | `Reset, `Initializing -> new State.reset context key self
      | `Initialized, _ -> new State.static context key self
      | _, _ -> raise State_not_defined

  end
