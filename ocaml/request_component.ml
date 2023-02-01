(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

open State_component

module Log = Pulse_log (*TODO: to replace by Lwt_log_js*)

exception Empty_path

type request_component_contexts = [ initialized_component_contexts | `Not_applicable ] [@@deriving sexp]
type request_component_keys = [ initialized_component_keys | `Transient_error | `Delay | `Error | `Temporary ] [@@deriving sexp]

class virtual ['context,'key] pulse_request_component element =
  object (self: 'self)
    constraint 'context = [> request_component_contexts]
    constraint 'key = [> request_component_keys ]
    inherit ['context,'key] pulse_initialized_component element as super

    method virtual context_to_string : 'context -> string
    method virtual key_to_string : 'key -> string
    
    val mutable loading = false
    method loading = loading

    val timeout: float option = None
    method timeout  = timeout

    val default_delay_rate = 10.0 (* in seconds *)
    method delay_rate = default_delay_rate

    val default_transient_error_delay = 3.*.60. (* 3 minutes *)
    method transient_error_delay = default_transient_error_delay

    method virtual get_url: unit -> string

    method enter_transient_error_state () =
      self#add_class "pulse-component-warning"

    method exit_transient_error_state () =
      self#remove_class "pulse-component-warning"

    method before_reload () =
      ()

    method virtual refresh: string -> unit

    method manage_success data =
      self#switch_to_next_context ~pre_action:(fun () -> self#refresh data) ()

    method manage_error {Dto_t.error_message;Dto_t.error_status} =
      match error_status with
      (* new status *)
      | `WrongRequestParameter | `MissingConfiguration | `UnexpectedError ->
        begin
          self#switch_to_state ~key:`Error ~pre_action:(fun () -> self#display_error error_message) ~post_action:self#remove_error ()
        end
      | `NotApplicable -> self#manage_not_applicable ()
      | `ProcessingDelay -> self#retry_with_delay error_message
      | `TransientProcessError | `Stale -> self#retry_immediately error_message
      (* old status *)
      | `OldPermanent -> 
        begin
          self#switch_to_state ~key:`Error ~pre_action:(fun () -> self#display_error error_message) ~post_action:self#remove_error ()
        end
      | `OldPermanentNoConfig -> self#manage_not_applicable ()
         (*
For CncValueColorService, GetMainCncValueService and GetCurrentCncValueService => not applicable,
For UtilizationTargetService, CncValueColorService, GetMachineNameAndTargetService => MissingConfiguration
          *)
      | `OldTransientDelay -> self#retry_with_delay error_message
      | `OldTransient -> self#retry_immediately error_message
      | `OldNoData -> self#manage_old_no_data error_message
      | `OldNotApplicable -> self#manage_not_applicable ()

    method retry_immediately message =
      match self#state_key with
      | `Transient_error -> self#switch_to_state ~key:`Transient_error () ~pre_action:(fun () -> self#display_error message) ~post_action:(self#remove_error)
      | _ -> self#switch_to_state ~key:`Temporary ~pre_action:(fun () -> self#set_error message) ~post_action:(fun () -> self#set_error "") ()

    method retry_with_delay message =
      match self#state_key with
      | `Transient_error -> self#switch_to_state ~key:`Transient_error () ~pre_action:(fun () -> self#display_error message) ~post_action:(self#remove_error)
      | _ -> self#switch_to_state ~key:`Delay ~pre_action:(fun () -> self#set_error message) ~post_action:(fun () -> self#set_error "") ()

    method manage_not_applicable () =
      self#switch_to_state ~context:`Not_applicable ()

    method manage_old_no_data message =
      (* Default: delay, but:
         - GetListOfShiftSlotService: not applicable
         - GetMachineStatusByIWP: not applicable
         - GetShiftAround/After/Before: not applicable
         - GetFieldLegendsForMachine: not applicable
         - GetMachinePerformanceDay(V2): delay or permanent
         - GetModeColor: delay or permanent
         - GetMachineStatus: delay or permament
         - GetReasonSlots(V3): delay or permanent
      *)
      self#retry_with_delay message

    method manage_failure xhr_status =
      let message = match xhr_status with
        | 0 -> "Not connected, check the network"
        | 400 -> "Bad request"
        | 401 -> "Unauthorized access"
        | 403 -> "Forbidden resource, cannot be accessed"
        | 404 -> "Requested page not found"
        | 500 -> "Internal Server Error"
        | 501 -> "Not implemented"
        | 502 -> "Bad Gateway or Proxy Error"
        | 503 -> "Service Unavailable"
        | 504 -> "Gateway Timeout"
        | 520 -> "Unknown Error"
        | s -> "Unknown status " ^ (string_of_int s)
      in
      Log.error ("Ajax failure: " ^ message);
      match xhr_status with
      | 0 | 500 | 504 -> self#retry_with_delay message
      | _ -> self#switch_to_state ~key:`Error ~pre_action:(fun () -> self#display_error message) ~post_action:(self#remove_error) ()

    method manage_timeout () =
      self#retry_with_delay "time out"

    method start_loading () =
      loading <- true;
      self#add_class "pulse-component-loading"

    method end_loading () =
      self#remove_class "pulse-component-loading";
      loading <- false
  end


type single_request_component_contexts = [ initialized_component_contexts | `Load | `Loaded | `Reload | `Stop | `Not_applicable ] [@@deriving sexp]
type single_request_component_keys = [ request_component_keys | `Loading | `Standard ] [@@deriving sexp]

class virtual pulse_single_request_component element =
  object (self: 'self)
    inherit [single_request_component_contexts, single_request_component_keys] pulse_request_component element as super

    method context_to_string c =  Sexplib.Sexp.to_string (sexp_of_single_request_component_contexts c);
    method key_to_string k = Sexplib.Sexp.to_string (sexp_of_single_request_component_keys k);

    method private get_start_key = function
      | `Initialization | `Reset -> `Initializing
      | `Load | `Reload -> `Loading
      | `Loaded | `Stop | `Not_applicable -> `Standard

    method private get_next_context = function
      | `Initialization | `Reset -> `Load
      | `Load | `Reload -> `Loaded
      | `Loaded | `Stop | `Not_applicable as c ->
        begin
          Log.error_f "get_next_context: no next context for %s" (self#context_to_string c);
          raise No_next_context
        end

    method private define_state context key = match (context, key) with
      | `Initialization, `Initializing -> new State.initial context key self
      | `Reset, `Initializing -> new State.reset context key self
      | `Load, `Loading -> new State.load context key self
      | `Reload, `Loading -> new State.reload context key self
      | _, `Temporary -> new State.temporary `Transient_error context key self
      | _, `Delay -> new State.delay `Transient_error context ~delay_callback:(fun c -> c#delay_rate) key self
      | _, `Transient_error -> new State.transient_error ~delay_callback:(fun c -> c#delay_rate) context key self
      | _, `Error -> new State.error context key self
      | `Not_applicable, _ -> new State.not_applicable context key self
      | `Loaded, _ -> new State.static context key self
      | `Stop, _ -> new State.stop context key self
      | _, _ -> raise State_not_defined

    method private enter_context = function
      | `Load | `Reload -> self#start_loading
      | _ as c -> super#enter_context c

    method private exit_context = function
      | `Load | `Reload -> self#end_loading
      | _ as c -> super#exit_context c

  end


type param_single_request_component_contexts = [ single_request_component_contexts | `ParamValidation ] [@@deriving sexp]
type param_single_request_component_keys = [ single_request_component_keys | `Validating ] [@@deriving sexp]

class virtual pulse_param_auto_path_single_request_component element =
  object (self: 'self)
    inherit [param_single_request_component_contexts, param_single_request_component_keys] pulse_request_component element as super

    method context_to_string c =  Sexplib.Sexp.to_string (sexp_of_param_single_request_component_contexts c);
    method key_to_string k = Sexplib.Sexp.to_string (sexp_of_param_single_request_component_keys k);

    val mutable path = None;
    method path = path;

    method update_path_from_config_or_attribute () =
      match self#get_config_or_attribute "path" with
      | "" -> begin path <- None; false end
      | p -> begin path <- Some p; true end

    method validate_parameters () =
      self#switch_to_next_context ()

    method private get_start_key = function
      | `Initialization | `Reset -> `Initializing
      | `ParamValidation -> `Validating
      | `Load | `Reload -> `Loading
      | `Loaded | `Stop | `Not_applicable -> `Standard

    method private get_next_context = function
      | `Initialization | `Reset -> `ParamValidation
      | `ParamValidation -> `Load
      | `Load | `Reload -> `Loaded
      | `Loaded | `Stop | `Not_applicable as c ->
        begin
          Log.error_f "get_next_context: no next context for %s" (self#context_to_string c);
          raise No_next_context
        end

    method private define_state context key = match (context, key) with
      | `Initialization, `Initializing -> new State.auto_path_initial context key self
      | `ParamValidation, `Validating -> new State.param_and_path_validation_timeout ~delay_callback:(fun c -> 30.) `Error context key self (* timeout = 30s *)
      | `Reset, `Initializing -> new State.reset context key self
      | `Load, `Loading -> new State.load context key self
      | `Reload, `Loading -> new State.reload context key self
      | _, `Temporary -> new State.temporary `Transient_error context key self
      | _, `Delay -> new State.delay `Transient_error context ~delay_callback:(fun c -> c#delay_rate) key self
      | _, `Transient_error -> new State.transient_error ~delay_callback:(fun c -> c#delay_rate) context key self
      | _, `Error -> new State.error context key self
      | `Not_applicable, _ -> new State.not_applicable context key self
      | `Loaded, _ -> new State.static context key self
      | `Stop, _ -> new State.stop context key self
      | _, _ -> raise State_not_defined

    method private enter_context = function
      | `ParamValidation | `Load | `Reload as c ->
        if not self#loading then self#start_loading ();
        super#enter_context c
      | _ as c -> super#enter_context c

    method private exit_context = function
      | `ParamValidation | `Load | `Reload as c ->
        self#end_loading ();
        super#exit_context c
      | _ as c -> super#exit_context c

    method private virtual get_short_url : unit -> string

    method get_url () =
      match self#path with
      | None ->
        begin
          Log.error "empty path";
          failwith "empty path"
        end
      | Some p -> p ^ self#get_short_url ()

    method event_bus_callback ~data:(data:Js.Unsafe.any Js.t) ~signal ~name =
      Log.debug_f "event_bus_callback signal:%s name:%s" signal name;
      match signal,name with
      | "pathChangeEvent","pathChange" -> self#start ()
      | _ -> super#event_bus_callback ~data ~signal ~name

  end


type refreshing_component_contexts = [ initialized_component_contexts | `Load | `Normal | `Reload | `Not_available | `Stop | `Not_applicable ] [@@deriving sexp]
type refreshing_component_keys = [ request_component_keys | `Loading | `Standard ] [@@deriving sexp]

class virtual pulse_refreshing_component element =
  object (self: 'self)
    inherit [refreshing_component_contexts, refreshing_component_keys] pulse_request_component element as super

    method context_to_string c =  Sexplib.Sexp.to_string (sexp_of_refreshing_component_contexts c);
    method key_to_string k = Sexplib.Sexp.to_string (sexp_of_refreshing_component_keys k);

    val refresh_rate: float option = None
    method refresh_rate = match refresh_rate with
      | None -> 20.
      | Some r -> r

    method private get_start_key = function
      | `Initialization | `Reset -> `Initializing
      | `Load | `Reload | `Normal | `Not_available -> `Loading
      | `Stop | `Not_applicable -> `Standard

    method private get_next_context = function
      | `Initialization | `Reset -> `Load
      | `Load | `Reload | `Normal | `Not_available -> `Normal
      | `Stop | `Not_applicable ->
        begin
          Log.error "get_next_context: not defined";
          raise No_next_context
        end

    method private define_state context key = match (context, key) with
      | `Initialization, `Initializing -> new State.initial context  key self
      | `Reset, `Initializing -> new State.reset context key self
      | `Load, `Loading -> new State.load context key self
      | `Reload, `Loading -> new State.reload context key self
      | `Normal, `Loading -> new State.normal_request ~delay_callback:(fun c -> c#refresh_rate) context key self
      | `Not_available, `Loading -> new State.not_available ~delay_callback:(fun c -> c#refresh_rate) context key self
      | _, `Temporary -> new State.temporary `Transient_error context key self
      | _, `Delay -> new State.delay `Transient_error ~delay_callback:(fun c -> c#delay_rate) context key self
      | _, `Transient_error -> new State.transient_error ~delay_callback:(fun c -> c#delay_rate) context key self
      | _, `Error -> new State.error context key self
      | `Not_applicable, _ -> new State.not_applicable context key self
      | `Stop, _ -> new State.stop context key self
      | _, _ -> raise State_not_defined


    method private enter_context = function
      | `Load | `Reload -> self#start_loading
      | _ as c -> super#enter_context c

    method private exit_context = function
      | `Load | `Reload -> self#end_loading
      | _ as c -> super#exit_context c

  end
