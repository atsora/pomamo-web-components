(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** Minimum set of contexts used by a pulse_request_component *)
type request_component_contexts = [ State_component.initialized_component_contexts | `Not_applicable ] [@@deriving sexp]

(** Minimum set of keys used by a pulse_request_component *)
type request_component_keys = [ State_component.initialized_component_keys | `Transient_error | `Delay | `Temporary ] [@@deriving sexp]

(** Abstract pulse component for components that potentially run Ajax requests
*)
class virtual ['context,'key] pulse_request_component :
  Dom_html.element Js.t ->
  object
    constraint 'context = [> request_component_contexts ]
    constraint 'key = [> request_component_keys ]

    (** Convert a context to a string *)
    method virtual context_to_string : 'context -> string

    (** Convert a key to a string *)
    method virtual key_to_string : 'key -> string

    (** Is the component in a loading state ? *)
    method loading : bool

    (** Add a CSS class to the custom element *)
    method add_class : string -> unit

    (** Event bus callback *)
    method event_bus_callback: data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit

    (** attribute changed callback for the custom element *)
    method attribute_changed_callback :
      attr_name:string -> old_value:string option -> new_value:string -> unit

    (** attribute changed callback for the custom element when the component has already been connected once *)
    method attribute_changed_when_connected_once : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** Do nothing special in case of reload. To be overridden if necessary *)
    method before_reload : unit -> unit

    (** Clear anything that was done during intialization, so that initialize can be called once again. Remove all the dispatchers and listeners *)
    method clear : unit -> unit

    (** Callback that is called  when the custom element is connected to the DOM document *)
    method connected_callback : unit -> unit

    (** Delay in seconds to wait in case of a delay error *)
    method delay_rate : float

    (** Callback that is called when the custom element is disconnected from the DOM document *)
    method disconnected_callback : unit -> unit

    (** Error message that is set by the set_error method *)
    method private error_message : string option

    (** Set an error on the component without displaying it *)
    method set_error : string -> unit

    (** Show the error that has been previously stored. An exception is raised if no error_message is None *)
    method show_error : unit -> unit

    (** Display the error message. To be overridden by the sub-class

        @param message Error message to display
    *)
    method private virtual display_error : string -> unit

    (** Stop displaying the error message. To be overridden by the sub-class *)
    method virtual remove_error : unit -> unit

    (** Delay before switching to a transient error *)
    method transient_error_delay: float

    (** Associated custom element *)
    method element : Dom_html.element Js.t

    (** Method that is called when the 'loading' state is exited. By default, remove the css class 'pulse-component-loading' *)
    method end_loading : unit -> unit

    (** Add the class 'pulse-component-error' to the component. Used by the error state *)
    method enter_error_state : unit -> unit

    (** Add the CSS class 'pulse-component-warning' in case the component enters the transient error state *)
    method enter_transient_error_state : unit -> unit

    (** Remove the display message and remove the 'pulse-component-error' class from the component. Used by the error state *)
    method exit_error_state : unit -> unit

    (** Remove the CSS class 'pulse-component-warning' and the error message in case the component exists a transient error state *)
    method exit_transient_error_state : unit -> unit

    (** Get some information on the web component instance, including its id and class if they are defined *)
    method get_info : unit -> string

    (** Get the url to use by the Ajax request. To be overridden *)
    method virtual get_url : unit -> string

    (** Method to override by the inherited class *)
    method virtual initialize : unit -> unit

    (** Is the associated custom element connected to the DOM document ? *)
    method connected : bool

    (** Has the associated custom element been connected once to the DOM document ? *)
    method connected_once : bool

    (** Check if the component is initialized, meaning its state is defined and not in the `Initialization or `Reset context

        @return the component is initialized
    *)
    method is_initialized : unit -> bool

    (** Method that is called in case the Ajax request returns an error dto *)
    method manage_error : Dto_t.error -> unit

    (** Manage a request failure. Switch to an error state *)
    method manage_failure : int -> unit

    (** Manage the case when the component data does not apply. Switch by default to the state not_applicable *)
    method manage_not_applicable : unit -> unit

    (** Manage an old NO_DATA error status. By default, run the retry_with_delay method, but override this method in case one of the following services is used: GetListOfShiftSlotService, GetMachineStatusByIWP, GetShiftAround/After/Before, GetFieldLegendsForMachine, GetMachinePerformanceDay(V2), GetModeColor, GetMachineStatus, GetReasonSlots(V3) *)
    method manage_old_no_data : string -> unit

    (** Manage a timeout failure. Retry immediately *)
    method manage_timeout : unit -> unit

    (** Method that is called when the next context is loaded. To be overridden *)
    method virtual refresh : string -> unit

    (** Method that is called in case of Ajax request success *)
    method manage_success : string -> unit

    (** Remove a css class *)
    method remove_class : string -> unit

    (** Reset the component itself. Set the next state at the end of the method *)
    method reset : unit -> unit

    (** Retry immediately the Ajax request. Swith to either the 'loading' or 'temporary' state, whether the current state is 'loading' or not *)
    method retry_immediately : string -> unit

    (** Retry with a delay the Ajax request. Switch to either the 'loading' or 'delay' state, whether the current state is 'loading' or not *)
    method retry_with_delay : string -> unit

    (** (Re-)start loading the component. Switch to context `Initialization or `Reset, whether the component has already been initialized or not *)
    method start : unit -> unit

    (** Method that is called when the 'loading' state is entered. By default add the css class 'pulse-component-loading' *)
    method start_loading : unit -> unit

    (** Timeout in seconds of the ajax requests *)
    method timeout : float option

    (** Is the component visible ? *)
    method is_visible: bool

    (** Current state_context *)
    method state_context: 'context

    (** Current state_key *)
    method state_key : 'key

    (** Current state *)
    method state : ('context, 'key) State.t

    (** Define the states *)
    method private virtual define_state: 'context -> 'key -> ('context, 'key) State.t

    (** Define for each key the start context *)
    method private virtual get_start_key: 'context -> 'key

    (** Define which context comes after another *)
    method private virtual get_next_context: 'context -> 'context

    (** Method to execute when you enter a context *)
    method private enter_context: 'context -> unit -> unit

    (** Method to execute when you exit a context *)
    method private exit_context: 'context -> unit -> unit

    (** Has a state been already initialized to this component ? *)
    method is_started : bool

    (** Get a state (initialize it if necessary) *)
    method get_state : 'context -> 'key -> ('context,'key) State.t

    (** Switch to the state with the specified key *)
    method switch_to_state : ?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Consider the current context is completed, switch to the next one *)
    method switch_to_next_context: ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Get a config or an attribute given a config key and a default value *)
    method get_config_or_attribute : ?default:string -> string -> string

    (** Add an event listener given a signal, a name and a callback *)
    method add_listener: string -> string -> unit
  end

(** Set of contexts used by a pulse_single_request_component *)
type single_request_component_contexts = [ request_component_contexts | `Load | `Loaded | `Reload | `Stop ]

(** Set of keys used by a pulse_single_request_component *)
type single_request_component_keys = [ request_component_keys | `Loading | `Standard ]

(** Abstract class for pulse components that run a single Ajax request during the loading phase

    Available contexts: Initialization, Reset, Load, Loaded, Reload, Stop, Not_applicable
    Available states: Initializing, Error, Loading, Standard, Temporary, Delay, Transient_error

    Some state flows:
    Default flow: Initialization:Initializing -> Load:Loading -> Loaded:Standard
    Initialization error flow: Initializiation:Initializing -> Initialization:Error
    Ajax transient error flow: Initialization:Initializing -> Load:Loading -> Load:Temporary -> ... -> Load:Transient_error
*)
class virtual pulse_single_request_component :
  Dom_html.element Js.t ->
  object
    (** Convert a context to a string *)
    method context_to_string : single_request_component_contexts -> string

    (** Convert a key to a string *)
    method key_to_string : single_request_component_keys -> string

    (** Is the component in a loading state ? *)
    method loading : bool

    (** Add a CSS class to the custom element *)
    method add_class : string -> unit

    (** Event bus callback *)
    method event_bus_callback: data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit

    (** attribute changed callback for the custom element *)
    method attribute_changed_callback :
      attr_name:string -> old_value:string option -> new_value:string -> unit

    (** attribute changed callback for the custom element when the component has already been connected once *)
    method attribute_changed_when_connected_once : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** Do nothing special in case of reload. To be overridden if necessary *)
    method before_reload : unit -> unit

    (** Clear anything that was done during intialization, so that initialize can be called once again. Remove all the dispatchers and listeners *)
    method clear : unit -> unit

    (** Callback that is called  when the custom element is connected to the DOM document *)
    method connected_callback : unit -> unit

    (** Delay in seconds to wait in case of a delay error *)
    method delay_rate : float

    (** Callback that is called when the custom element is disconnected from the DOM document *)
    method disconnected_callback : unit -> unit

    (** Error message that is set by the set_error method *)
    method private error_message : string option

    (** Set an error on the component without displaying it *)
    method set_error : string -> unit

    (** Show the error that has been previously stored. An exception is raised if no error_message is None *)
    method show_error : unit -> unit

    (** Display the error message. To be overridden by the sub-class

        @param message Error message to display
    *)
    method private virtual display_error : string -> unit

    (** Stop displaying the error message. To be overridden by the sub-class *)
    method virtual remove_error : unit -> unit

    (** Delay before switching to a transient error *)
    method transient_error_delay: float

    (** Associated custom element *)
    method element : Dom_html.element Js.t

    (** Method that is called when the 'loading' state is exited. By default, remove the css class 'pulse-component-loading' *)
    method end_loading : unit -> unit

    (** Add the class 'pulse-component-error' to the component. Used by the error state *)
    method enter_error_state : unit -> unit

    (** Add the CSS class 'pulse-component-warning' in case the component enters the transient error state *)
    method enter_transient_error_state : unit -> unit

    (** Remove the display message and remove the 'pulse-component-error' class from the component. Used by the error state *)
    method exit_error_state : unit -> unit

    (** Remove the CSS class 'pulse-component-warning' and the error message in case the component exists a transient error state *)
    method exit_transient_error_state : unit -> unit

    (** Get some information on the web component instance, including its id and class if they are defined *)
    method get_info : unit -> string

    (** Get the url to use by the Ajax request. To be overridden *)
    method virtual get_url : unit -> string

    (** Method to override by the inherited class *)
    method virtual initialize : unit -> unit

    (** Is the associated custom element connected to the DOM document ? *)
    method connected : bool

    (** Has the associated custom element been connected once to the DOM document ? *)
    method connected_once : bool

    (** Check if the component is initialized, meaning its state context is defined and not 'Initialization' or 'Reset'

        @return the component is initialized
    *)
    method is_initialized : unit -> bool

    (** Method that is called in case the Ajax request returns an error dto *)
    method manage_error : Dto_t.error -> unit

    (** Manage a request failure. Switch to an error state *)
    method manage_failure : int -> unit

    (** Manage the case when the component data does not apply. Switch by default to the state not_applicable *)
    method manage_not_applicable : unit -> unit

    (** Manage an old NO_DATA error status. By default, run the retry_with_delay method, but override this method in case one of the following services is used: GetListOfShiftSlotService, GetMachineStatusByIWP, GetShiftAround/After/Before, GetFieldLegendsForMachine, GetMachinePerformanceDay(V2), GetModeColor, GetMachineStatus, GetReasonSlots(V3) *)
    method manage_old_no_data : string -> unit

    (** Manage a timeout failure. Retry immediately *)
    method manage_timeout : unit -> unit

    (** Method that is called when the next context is loaded. To be overridden *)
    method virtual refresh : string -> unit

    (** Method that is called in case of Ajax request success *)
    method manage_success : string -> unit

    (** Remove a css class *)
    method remove_class : string -> unit

    (** Reset the component itself. Set the next state at the end of the method *)
    method reset : unit -> unit

    (** Retry immediately the Ajax request *)
    method retry_immediately : string -> unit

    (** Retry with a delay the Ajax request *)
    method retry_with_delay : string -> unit

    (** (Re-)start loading the component. Switch to context 'Reset' or 'Initialization', whether the component has already been initialized or not *)
    method start : unit -> unit

    (** Method that is called when the 'loading' state is entered. By default add the css class 'pulse-component-loading' *)
    method start_loading : unit -> unit

    (** Timeout in seconds of the ajax requests *)
    method timeout : float option

    (** Is the component visible ? *)
    method is_visible: bool

    (** Current state_context *)
    method state_context: single_request_component_contexts

    (** Current state_key *)
    method state_key : single_request_component_keys

    (** Current state *)
    method state : (single_request_component_contexts, single_request_component_keys) State.t

    (** Has a state been already initialized to this component ? *)
    method is_started : bool

    (** Get a state (initialize it if necessary) *)
    method get_state : single_request_component_contexts ->single_request_component_keys -> (single_request_component_contexts,single_request_component_keys) State.t

    (** Switch to the state with the specified key *)
    method switch_to_state : ?context:single_request_component_contexts -> ?key:single_request_component_keys -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Consider the current context is completed, switch to the next one *)
    method switch_to_next_context: ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Get a config or an attribute given a config key and a default value *)
    method get_config_or_attribute : ?default:string -> string -> string

    (** Add an event listener given a signal, a name and a callback *)
    method add_listener: string -> string -> unit
  end


type param_single_request_component_contexts = [ single_request_component_contexts | `ParamValidation ]
type param_single_request_component_keys = [ single_request_component_keys | `Validating ]

(** Abstract class for pulse components that run a single Ajax request during the loading phase

    Available contexts: Initialization, Reset, Load, Loaded, Reload, Stop, Not_applicable
    Available states: Initializing, Error, Loading, Standard, Temporary, Delay, Transient_error

    Some state flows:
    Default flow: Initialization:Initializing -> Load:Loading -> Loaded:Standard
    Initialization error flow: Initializiation:Initializing -> Initialization:Error
    Ajax transient error flow: Initialization:Initializing -> Load:Loading -> Load:Temporary -> ... -> Load:Transient_error
*)
class virtual pulse_param_auto_path_single_request_component :
  Dom_html.element Js.t ->
  object
    (** Convert a context to a string *)
    method context_to_string : param_single_request_component_contexts -> string

    (** Convert a key to a string *)
    method key_to_string : param_single_request_component_keys -> string

    (** Active path *)
    method path : string option

    (** Update the path from the configuration or the attribute. Retruns true in case of success *)
    method update_path_from_config_or_attribute : unit -> bool

    method validate_parameters : unit -> unit

    (** Short URL (without the path) to use in the Ajax request *)
    method virtual private get_short_url : unit -> string

    (** Is the component in a loading state ? *)
    method loading : bool

    (** Add a CSS class to the custom element *)
    method add_class : string -> unit

    (** Event bus callback *)
    method event_bus_callback: data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit

    (** attribute changed callback for the custom element *)
    method attribute_changed_callback :
      attr_name:string -> old_value:string option -> new_value:string -> unit

    (** attribute changed callback for the custom element when the component has already been connected once *)
    method attribute_changed_when_connected_once : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** Do nothing special in case of reload. To be overridden if necessary *)
    method before_reload : unit -> unit

    (** Clear anything that was done during intialization, so that initialize can be called once again. Remove all the dispatchers and listeners *)
    method clear : unit -> unit

    (** Callback that is called  when the custom element is connected to the DOM document *)
    method connected_callback : unit -> unit

    (** Delay in seconds to wait in case of a delay error *)
    method delay_rate : float

    (** Callback that is called when the custom element is disconnected from the DOM document *)
    method disconnected_callback : unit -> unit

    (** Error message that is set by the set_error method *)
    method private error_message : string option

    (** Set an error on the component without displaying it *)
    method set_error : string -> unit

    (** Show the error that has been previously stored. An exception is raised if no error_message is None *)
    method show_error : unit -> unit

    (** Display the error message. To be overridden by the sub-class

        @param message Error message to display
    *)
    method private virtual display_error : string -> unit

    (** Stop displaying the error message. To be overridden by the sub-class *)
    method virtual remove_error : unit -> unit

    (** Delay before switching to a transient error *)
    method transient_error_delay: float

    (** Associated custom element *)
    method element : Dom_html.element Js.t

    (** Method that is called when the 'loading' state is exited. By default, remove the css class 'pulse-component-loading' *)
    method end_loading : unit -> unit

    (** Add the class 'pulse-component-error' to the component. Used by the error state *)
    method enter_error_state : unit -> unit

    (** Add the CSS class 'pulse-component-warning' in case the component enters the transient error state *)
    method enter_transient_error_state : unit -> unit

    (** Remove the display message and remove the 'pulse-component-error' class from the component. Used by the error state *)
    method exit_error_state : unit -> unit

    (** Remove the CSS class 'pulse-component-warning' and the error message in case the component exists a transient error state *)
    method exit_transient_error_state : unit -> unit

    (** Get some information on the web component instance, including its id and class if they are defined *)
    method get_info : unit -> string

    (** Get the url to use by the Ajax request. To be overridden *)
    method get_url : unit -> string

    (** Method to override by the inherited class *)
    method virtual initialize : unit -> unit

    (** Is the associated custom element connected to the DOM document ? *)
    method connected : bool

    (** Has the associated custom element been connected once to the DOM document ? *)
    method connected_once : bool

    (** Check if the component is initialized, meaning its state context is defined and not 'Initialization' or 'Reset'

        @return the component is initialized
    *)
    method is_initialized : unit -> bool

    (** Method that is called in case the Ajax request returns an error dto *)
    method manage_error : Dto_t.error -> unit

    (** Manage a request failure. Switch to an error state *)
    method manage_failure : int -> unit

    (** Manage the case when the component data does not apply. Switch by default to the state not_applicable *)
    method manage_not_applicable : unit -> unit

    (** Manage an old NO_DATA error status

        By default, run the retry_with_delay method, but override this method in case one of the following services is used:
        GetListOfShiftSlotService, GetMachineStatusByIWP, GetShiftAround/After/Before, GetFieldLegendsForMachine, GetMachinePerformanceDay(V2), GetModeColor, GetMachineStatus, GetReasonSlots(V3)
    *)
    method manage_old_no_data : string -> unit

    (** Manage a timeout failure. Retry immediately *)
    method manage_timeout : unit -> unit

    (** Method that is called when the next context is loaded. To be overridden *)
    method virtual refresh : string -> unit

    (** Method that is called in case of Ajax request success *)
    method manage_success : string -> unit

    (** Remove a css class *)
    method remove_class : string -> unit

    (** Reset the component itself. Set the next state at the end of the method *)
    method reset : unit -> unit

    (** Retry immediately the Ajax request *)
    method retry_immediately : string -> unit

    (** Retry with a delay the Ajax request *)
    method retry_with_delay : string -> unit

    (** (Re-)start loading the component. Switch to context 'Reset' or 'Initialization', whether the component has already been initialized or not *)
    method start : unit -> unit

    (** Method that is called when the 'loading' state is entered. By default add the css class 'pulse-component-loading' *)
    method start_loading : unit -> unit

    (** Timeout in seconds of the ajax requests *)
    method timeout : float option

    (** Is the component visible ? *)
    method is_visible: bool

    (** Current state_context *)
    method state_context: param_single_request_component_contexts

    (** Current state_key *)
    method state_key : param_single_request_component_keys

    (** Current state *)
    method state : (param_single_request_component_contexts, param_single_request_component_keys) State.t

    (** Has a state been already initialized to this component ? *)
    method is_started : bool

    (** Get a state (initialize it if necessary) *)
    method get_state : param_single_request_component_contexts -> param_single_request_component_keys -> (param_single_request_component_contexts,param_single_request_component_keys) State.t

    (** Switch to the state with the specified key *)
    method switch_to_state : ?context:param_single_request_component_contexts -> ?key:param_single_request_component_keys -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Consider the current context is completed, switch to the next one *)
    method switch_to_next_context: ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Get a config or an attribute given a config key and a default value *)
    method get_config_or_attribute : ?default:string -> string -> string

    (** Add an event listener given a signal, a name and a callback *)
    method add_listener: string -> string -> unit
  end


(** Set of keys used by a pulse_refreshing_component *)
type refreshing_component_contexts = [ request_component_contexts | `Load | `Normal | `Reload | `Not_available | `Stop ]

(** Set of keys used by a pulse_refreshing_component *)
type refreshing_component_keys = [ request_component_keys | `Loading | `Standard ]

(** Abstract class for Pulse components that run an ajax request regularly, each time it needs to be refreshed

    Available contexts: Initialization, Reset, Load, Normal, Reload, Stop, Not_applicable
    Available states: Initializing, Error, Loading, Standard, Temporary, Delay, Transient_error

    Some state flows:
    Default flow: Initialization:Initializing -> Load:Loading -> Normal:Loading -> Normal:Loading -> ...
    Initialization error flow: Initializiation:Initializing -> Initialization:Error
    Ajax transient error flow: Normal:Loading -> Normal:Temporary -> Normal:Temporary -> ... -> Normal:TransientError
    Ajax delay error flow: Normal:Loading -> Normal:Delay -> Normal:Delay -> ... -> Normal:TransientError
    Not available flow: Normal:Loading -> Not_available:Loading -> ... -> Normal:Loading
*)
class virtual pulse_refreshing_component :
  Dom_html.element Js.t ->
  object
    (** Convert a context to a string *)
    method context_to_string : refreshing_component_contexts -> string

    (** Convert a key to a string *)
    method key_to_string : refreshing_component_keys -> string

    (** Is the component in a loading state ? *)
    method loading : bool

    (** Add a CSS class to the custom element *)
    method add_class : string -> unit

    (** Event bus callback *)
    method event_bus_callback: data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit

    (** attribute changed callback for the custom element *)
    method attribute_changed_callback :
      attr_name:string -> old_value:string option -> new_value:string -> unit

    (** attribute changed callback for the custom element when the component has already been connected once *)
    method attribute_changed_when_connected_once : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** Do nothing special in case of reload. To be overridden if necessary *)
    method before_reload : unit -> unit

    (** Clear anything that was done during intialization, so that initialize can be called once again. Remove all the dispatchers and listeners *)
    method clear : unit -> unit

    (** Callback that is called  when the custom element is connected to the DOM document *)
    method connected_callback : unit -> unit

    (** Delay in seconds to wait in case of a delay error *)
    method delay_rate : float

    (** Callback that is called when the custom element is disconnected from the DOM document *)
    method disconnected_callback : unit -> unit

    (** Error message that is set by the set_error method *)
    method private error_message : string option

    (** Set an error on the component without displaying it *)
    method set_error : string -> unit

    (** Show the error that has been previously stored. An exception is raised if no error_message is None *)
    method show_error : unit -> unit

    (** Display the error message. To be overridden by the sub-class

        @param message Error message to display
    *)
    method private virtual display_error : string -> unit

    (** Stop displaying the error message. To be overridden by the sub-class *)
    method virtual remove_error : unit -> unit

    (** Delay before switching to a transient error *)
    method transient_error_delay: float

    (** Associated custom element *)
    method element : Dom_html.element Js.t

    (** Method that is called when the 'loading' state is exited. By default, remove the css class 'pulse-component-loading' *)
    method end_loading : unit -> unit

    (** Add the class 'pulse-component-error' to the component. Used by the error state *)
    method enter_error_state : unit -> unit

    (** Add the CSS class 'pulse-component-warning' in case the component enters the transient error state *)
    method enter_transient_error_state : unit -> unit

    (** Remove the display message and remove the 'pulse-component-error' class from the component. Used by the error state *)
    method exit_error_state : unit -> unit

    (** Remove the CSS class 'pulse-component-warning' and the error message in case the component exists a transient error state *)
    method exit_transient_error_state : unit -> unit

    (** Get some information on the web component instance, including its id and class if they are defined *)
    method get_info : unit -> string

    (** Get the url to use by the Ajax request. To be overridden *)
    method virtual get_url : unit -> string

    (** Method to override by the inherited class *)
    method virtual initialize : unit -> unit

    (** Is the associated custom element connected to the DOM document ? *)
    method connected : bool

    (** Has the associated custom element been connected once to the DOM document ? *)
    method connected_once : bool

    (** Check if the component is initialized, meaning its state context is defined and not 'Initialization' or 'Reset'

        @return the component is initialized
    *)
    method is_initialized : unit -> bool

    (** Method that is called in case the Ajax request returns an error dto *)
    method manage_error : Dto_t.error -> unit

    (** Manage a request failure. Switch to an error state *)
    method manage_failure : int -> unit

    (** Manage the case when the component data does not apply. Switch by default to the state not_applicable *)
    method manage_not_applicable : unit -> unit

    (** Manage an old NO_DATA error status. By default, run the retry_with_delay method, but override this method in case one of the following services is used: GetListOfShiftSlotService, GetMachineStatusByIWP, GetShiftAround/After/Before, GetFieldLegendsForMachine, GetMachinePerformanceDay(V2), GetModeColor, GetMachineStatus, GetReasonSlots(V3) *)
    method manage_old_no_data : string -> unit

    (** Manage a timeout failure. Retry immediately *)
    method manage_timeout : unit -> unit

    (** Method that is called when the next context is loaded. To be overridden *)
    method virtual refresh : string -> unit

    (** Method that is called in case of Ajax request success *)
    method manage_success : string -> unit

    (** Refresh rate in seconds *)
    method refresh_rate : float

    (** Remove a css class *)
    method remove_class : string -> unit

    (** Reset the component itself. Set the next state at the end of the method *)
    method reset : unit -> unit

    (** Retry immediately the Ajax request *)
    method retry_immediately : string -> unit

    (** Retry with a delay the Ajax request *)
    method retry_with_delay : string -> unit

    (** (Re-)start loading the component. Switch to context 'Reset' or 'Initialization', whether the component has already been initialized or not *)
    method start : unit -> unit

    (** Method that is called when the 'loading' state is entered. By default add the css class 'pulse-component-loading' *)
    method start_loading : unit -> unit

    (** Timeout in seconds of the ajax requests *)
    method timeout : float option

    (** Is the component visible ? *)
    method is_visible: bool

    (** Current state_context *)
    method state_context: refreshing_component_contexts

    (** Current state_key *)
    method state_key : refreshing_component_keys

    (** Current state *)
    method state : (refreshing_component_contexts, refreshing_component_keys) State.t

    (** Has a state been already initialized to this component ? *)
    method is_started : bool

    (** Get a state (initialize it if necessary) *)
    method get_state : refreshing_component_contexts -> refreshing_component_keys -> (refreshing_component_contexts,refreshing_component_keys) State.t

    (** Switch to the state with the specified key *)
    method switch_to_state : ?context:refreshing_component_contexts -> ?key:refreshing_component_keys -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Consider the current context is completed, switch to the next one *)
    method switch_to_next_context: ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Get a config or an attribute given a config key and a default value *)
    method get_config_or_attribute : ?default:string -> string -> string

    (** Add an event listener given a signal, a name and a callback *)
    method add_listener: string -> string -> unit
  end
