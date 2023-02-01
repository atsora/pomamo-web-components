(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

module Log = Pulse_log (*TODO: to replace by Lwt_log_js*)

class type ['context, 'key] t =
  object
    method context: 'context
    method key: 'key
    method previous_context: 'context option
    method previous_key: 'key option
    method enter_state: ?previous_context:'context -> ?previous_key:'key -> unit -> unit
    method exit_state: next_context:'context -> next_key:'key -> unit
    method stay: unit -> unit
    method to_string: string
  end  

class virtual ['context, 'key] base context key component: ['context, 'key] t =
  object (self)
    val component = component
    method private component = component

    val context:'context = context
    method context = context

    val key:'key = key
    method key = key

    val mutable previous_state_context:'context option = None
    method previous_context = previous_state_context

    val mutable previous_state_key:'key option = None
    method previous_key = previous_state_key

    method enter_state ?previous_context ?previous_key () : unit =
      Log.debug_f "enter_state %s" self#to_string;
      previous_state_context <- previous_context;
      previous_state_key <- previous_key;
      component#add_class ("pulsecomponent-context-" ^ (component#context_to_string context));
      component#add_class ("pulsecomponent-key-" ^ (component#key_to_string key))

    method exit_state ~next_context ~next_key : unit =
      Log.debug_f "exit_state %s" self#to_string;
      component#remove_class ("pulsecomponent-context-" ^ (component#context_to_string context));
      component#remove_class ("pulsecomponent-key-" ^ (component#key_to_string key));
      previous_state_context <- None;
      previous_state_key <- None

    method stay () =
      ()

    method to_string = ""
  end


class ['context, 'key] initial context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    method enter_state ?previous_context ?previous_key () =
      super#enter_state ?previous_context ?previous_key ();
      if component#is_initialized ()
      then component#clear ();
      Log.debug_f "initial#enter_state: initialize %s" self#to_string;
      component#initialize ()

    method to_string = "initial"
  end

class ['context, 'key] auto_path_initial context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    method enter_state ?previous_context ?previous_key () =
      super#enter_state ?previous_context ?previous_key ();
      if (component#is_initialized ())
      then component#clear ();
      Log.debug_f "initial#enter_state: initialize %s" self#to_string;

      component#add_listener "pathChangeEvent" "pathChange";

      component#initialize ()

    method to_string = "auto_path_initial"
  end


class ['context, 'key] reset context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    method enter_state ?previous_context ?previous_key () =
      super#enter_state ?previous_context ?previous_key ();
      component#reset ()

    method to_string = "reset"
  end


class ['context, 'key] static context key component =
  object (self)
    inherit ['context, 'key] base context key component as super
  end


class ['context, 'key] no_action ?next_context:next_context_parameter ?next_key:next_key_parameter context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    val next_context: 'context option = next_context_parameter
    val next_key: 'key option = next_key_parameter

    method enter_state ?previous_context ?previous_key () =
      super#enter_state ?previous_context ?previous_key ();
      match next_context, next_key with
      | None, None ->
        begin
          let switch_to_next_context:(?pre_action:(unit->unit) -> ?post_action:(unit->unit) -> unit -> unit) = component#switch_to_next_context in
          switch_to_next_context ()
        end
      | _, _ ->
        begin
          let switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit->unit) -> ?post_action:(unit -> unit) -> unit -> unit) = component#switch_to_state in
          switch_to_state ?context:next_context ?key:next_key  ()
        end

    method to_string = "no_action"
  end


class ['context, 'key] wait ?next_context:next_context_parameter ?next_key:next_key_parameter ?pre_action:pre_action_parameter ?post_action:post_action_parameter ?delay_callback:delay_callback_parameter context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    val delay_callback: ('component -> float) option = delay_callback_parameter

    val mutable thread: unit Lwt.t option = None

    val next_context: 'context option = next_context_parameter
    val next_key: 'key option = next_key_parameter
    val pre_action: (unit -> unit) option = pre_action_parameter
    val post_action: (unit -> unit) option = post_action_parameter

    method enter_state ?previous_context ?previous_key () =
      super#enter_state ?previous_context ?previous_key ();
      self#start_thread ()

    method exit_state ~next_context ~next_key =
      self#cancel_thread ();
      super#exit_state next_context next_key

    method stay () =
      super#stay ();
      self#cancel_thread ();
      self#start_thread ()

    method private cancel_thread () =
      match thread with
      | None -> ()
      | Some t -> Lwt.cancel t

    method private start_thread () =
      match delay_callback_parameter with
      | None -> ()
      | Some callback ->
        begin
          let waiter, wakener = Lwt.task () in
          thread <- Some (Lwt.bind waiter self#sleep_and_switch);
          let delay = callback component in
          Lwt.wakeup wakener delay
        end

    method private sleep_and_switch delay =
      let%lwt _ = Lwt_js.sleep delay in
      self#switch ()

    method private switch () =
      begin
        match next_context, next_key with
        | None, None ->
          begin
            let switch_to_next_context:(?pre_action:(unit->unit) -> ?post_action:(unit->unit) -> unit -> unit) = component#switch_to_next_context in
            switch_to_next_context ?pre_action:pre_action ?post_action:post_action_parameter ()
          end
        | _, _ ->
          begin
            let switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit->unit) -> ?post_action:(unit -> unit) -> unit -> unit) = component#switch_to_state in
            switch_to_state ?context:next_context ?key:next_key ?pre_action:pre_action ?post_action:post_action ()
          end
      end;
      Lwt.return ()

    method to_string = "wait"
  end


class ['context, 'key] param_validation_timeout ?delay_callback:delay_callback_parameter error_key context key component =
  object (self)
    inherit ['context, 'key] wait ~next_key:error_key ~pre_action:(component#show_error) ~post_action:(component#remove_error) ?delay_callback:delay_callback_parameter context key component as super

    method enter_state ?previous_context ?previous_key () =
      super#enter_state ?previous_context ?previous_key ();
      self#validate();
      ()

    method stay () =
      super#stay ();
      self#validate ();
      ()

    method private validate () =
      component#validate_parameters ();
      ()
  end

class ['context, 'key] param_and_path_validation_timeout ?delay_callback:delay_callback_parameter error_key context key component =
  object (self)
    inherit ['context, 'key] param_validation_timeout ?delay_callback:delay_callback_parameter error_key context key component as super

    method private validate () =
      if not (component#update_path_from_config_or_attribute ())
      then
        begin
          Log.debug "waiting attribute path";
          component#set_error "waiting path..."
        end
      else
        component#validate_parameters ()
  end

class ['context, 'key] error context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    method enter_state ?previous_context ?previous_key () =
      super#enter_state ?previous_context ?previous_key ();
      component#enter_error_state ();
      ()

    method exit_state ~next_context ~next_key =
      component#exit_error_state ();
      super#exit_state next_context next_key;
      ()

    method to_string = "error"
  end


class ['context, 'key] not_applicable context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    method to_string = "not_applicable"
  end


class ['context, 'key] stop context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    method to_string = "stop"
  end


(* request state. After a specified delay, an Ajax method is called to refresh the component.
   This is the base class for many other states like loading, normal_request, ...

   The URL used by the Ajax request is the property url of the pulse component.

   @param component Associated component
   @param delay_callback_parameter Callback to get the initial delay before the Ajax method is called
*)
class virtual ['context, 'key] request ?delay_callback:(delay_callback_parameter = fun c -> 0.) context key component =
  object (self)
    inherit ['context, 'key] base context key component as super

    val delay_callback: ('component -> float) = delay_callback_parameter

    val mutable thread: unit Lwt.t option = None

    method private get_url () =
      component#get_url ()

    method enter_state ?previous_context ?previous_key () =
      super#enter_state ?previous_context ?previous_key ();
      Log.debug "request#enter_state: start_thread";
      self#start_thread ()

    method exit_state ~next_context ~next_key =
      super#exit_state next_context next_key;
      self#cancel_thread ()

    method stay () =
      super#stay ();
      self#cancel_thread ();
      self#start_thread ()

    method private cancel_thread () =
      match thread with
      | None -> ()
      | Some t -> Lwt.cancel t

    method private start_thread () =
      let waiter, wakener = Lwt.task () in
      thread <- Some (Lwt.bind waiter self#sleep_and_run_ajax);
      let delay = delay_callback component in
      Lwt.wakeup wakener delay

    method private sleep_and_run_ajax delay =
      let rec run_ajax_when_is_visible () =
        if component#is_visible
        then self#run_ajax ()
        else
          let%lwt _ = Lwt_js.sleep 0.200 in
          run_ajax_when_is_visible ()
      in  
      let%lwt _ = Lwt_js.sleep delay in
      run_ajax_when_is_visible ()

    method private run_ajax = self#run_ajax_perform (* Choose between run_ajax_perform (preferred method) and run_ajax_raw*)

    (* Note: run_ajax_perform is the preferred method to run an Ajax request.
       This is only to show how XmlHttpRequest can be called directly *)
    method private run_ajax_raw () =
      let random = string_of_int (Random.int 100000) in
      let url = self#get_url () ^ "?_=" ^ random in
      Log.debug ("run_ajax " ^ url);
      let xmlhttp = XmlHttpRequest.create () in
      let waiter, wakener = Lwt.task () in
      let t = Lwt.bind waiter self#process_response_js in
      let onreadystatechange () =
        match xmlhttp##.readyState, xmlhttp##.status with
        | XmlHttpRequest.DONE, code ->
          Log.debug ("run_ajax: received status=" ^ (string_of_int code));
          Lwt.wakeup wakener xmlhttp
        | _ -> Log.debug "Other ready state"
      in
      xmlhttp##.onreadystatechange := Js.wrap_callback onreadystatechange;
      xmlhttp##(_open (Js.string "GET") (Js.string url) (Js._true));
      xmlhttp##(setRequestHeader (Js.string "Accept") (Js.string "application/json, text/javascript, */*; q=0.01"));
      xmlhttp##(send Js.null);
      Log.debug "run_ajax, send";
      t

    (* Only used by run_ajax_raw *)
    method private process_response_js xmlhttp =
      let content = Js.to_string (xmlhttp##.responseText) in
      Log.debug ("process_response_js: content=" ^ content);
      self#process_response "" (xmlhttp##.status) content

    method private run_ajax_perform () =
      let url = self#get_url () in
      let random = string_of_int (Random.int 100000) in
      let%lwt response = Ajax.perform_raw_url
          ~headers:["Accept", "application/json, text/javascript, */*; q=0.01"]
          ~get_args: ["_", random]
          url
      in
      self#process_response_perform response

    method private process_response_perform {XmlHttpRequest.url;XmlHttpRequest.code;XmlHttpRequest.content;_} =
      self#process_response url code content

    method private process_response url code content =
      (* TODO: timeout *)
      if (200 <= code) && (code <= 299)
      then (* Success  or Error *)
        try
          let error_dto:Dto_t.error = Dto_j.error_of_string content
          in self#error error_dto
        with
        | _ -> self#success content
      else (* Failure *)
        self#fail url code;
      Lwt.return ()

    method private success data : unit =
      component#manage_success data

    method private error data : unit =
      component#manage_error data

    method private fail url xhr_status : unit =
      component#manage_failure xhr_status

    method private timeout url : unit =
      component#manage_timeout ()

  end


class ['context, 'key] load context key component =
  object (self)
    inherit ['context, 'key] request  ~delay_callback:(fun c -> 0.) context key component as super
  end


class ['context, 'key] normal_request ?delay_callback context key component =
  object (self)
    inherit ['context, 'key] request ?delay_callback context key component as super

    method to_string = "normal_request"
  end


class ['context, 'key] reload context key component =
  object (self)
    inherit ['context, 'key] request ~delay_callback:(fun _ -> 0.) context key component as super

    method enter_state ?previous_context ?previous_key () =
      component#before_reload ();
      super#enter_state ?previous_context ?previous_key ();

    method to_string = "reload"
  end


class ['context, 'key] not_available ?delay_callback context key component =
  object (self)
    inherit ['context, 'key] request ?delay_callback context key component as super

    method to_string = "not_available"
  end


class ['context, 'key] temporary transient_error_key ?delay_callback context key component =
  object (self)
    inherit ['context, 'key] request ~delay_callback:(match delay_callback with | None -> (fun c -> 1.) | Some c -> c) context key component as super

    val mutable enter_date_time = None

    method enter_state ?previous_context ?previous_key () =
      enter_date_time <- Some (new%js Js.date_now);
      super#enter_state ?previous_context ?previous_key ()

    method exit_state ~next_context ~next_key =
      enter_date_time <- None;
      super#exit_state next_context next_key

    method stay () =
      let age = ((new%js Js.date_now)##valueOf -. (Option.get enter_date_time)##valueOf) /. 1000. in
      if component#transient_error_delay < age
      then 
        let switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit->unit) -> ?post_action:(unit -> unit) -> unit -> unit) = component#switch_to_state in
        switch_to_state ~key:transient_error_key ~pre_action:(component#show_error) ~post_action:(component#remove_error) ()
      else super#stay ()

    method to_string = "temporary"
  end


class ['context, 'key] delay transient_error_key ?delay_callback context key component =
  object (self)
    inherit ['context, 'key] request ?delay_callback context key component as super

    val mutable enter_date_time = None

    method enter_state ?previous_context ?previous_key () =
      enter_date_time <- Some (new%js Js.date_now);
      super#enter_state ?previous_context ?previous_key ()

    method exit_state ~next_context ~next_key =
      enter_date_time <- None;
      super#exit_state next_context next_key

    method stay () =
      let age = ((new%js Js.date_now)##valueOf -. (Option.get enter_date_time)##valueOf) /. 1000. in
      if component#transient_error_delay < age
      then 
        let switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit->unit) -> ?post_action:(unit -> unit) -> unit -> unit) = component#switch_to_state in
        switch_to_state ~key:transient_error_key ~pre_action:(component#show_error) ~post_action:(component#remove_error) ()
      else super#stay ()

    method to_string = "delay"
  end


class ['context, 'key] transient_error ?delay_callback context key component =
  object (self)
    inherit ['context, 'key] request ?delay_callback context key component as super

    method enter_state ?previous_context ?previous_key ()=
      super#enter_state ?previous_context ?previous_key ();
      component#enter_transient_error_state ();
      ()

    method exit_state ~next_context ~next_key =
      component#exit_transient_error_state ();
      super#exit_state next_context next_key;
      ()

    method to_string = "transient_error"
  end



