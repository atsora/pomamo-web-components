(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** The state is not defined for the specified context and key *)
exception State_not_defined

(** There is no start state for the specified context *)
exception No_start_state

(** There is no next context for the speicifed context *)
exception No_next_context

(** Pulse component that implements the state machine pattern *)
class virtual ['context, 'key] pulse_state_component :
  Dom_html.element Js.t ->
  object
    (** Convert a context to a string *)
    method virtual context_to_string : 'context -> string

    (** Convert a key to a string *)
    method virtual key_to_string : 'key -> string

    (** Add a CSS class to the custom element *)
    method add_class : string -> unit

    (** Event bus callback *)
    method event_bus_callback: data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit

    (** attribuce changed callback for the custom element *)
    method attribute_changed_callback : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** attribute changed callback for the custom element when the component has already been connected once *)
    method attribute_changed_when_connected_once : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** Callback that is called  when the custom element is connected to the DOM document *)
    method connected_callback : unit -> unit

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

    (** Associated custom element *)
    method element : Dom_html.element Js.t

    (** Get some information on the web component instance, including its id and class if they are defined *)
    method get_info : unit -> string

    (** Is the associated custom element connected to the DOM document ? *)
    method connected : bool

    (** Has the associated custom element been connected once to the DOM document ? *)
    method connected_once : bool

    (** Remove a css class *)
    method remove_class : string -> unit

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

    (** Define the start context *)
    method private virtual start_context: 'context

    (** Define for each context the start key *)
    method private virtual get_start_key: 'context -> 'key

    (** Define which context should be considered once a context is completed *)
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


(** Minimum set of context used by a pulse_initialized_component *)
type initialized_component_contexts =
  [ `Initialization | `Reset ]  [@@deriving sexp]
(** Minimum set of keys used by a pulse_initialized_component *)
type initialized_component_keys =
  [ `Initializing | `Error ]  [@@deriving sexp]

(** Abstract pulse component with an initialization phase

    Available contexts: Initialization, Reset, ...
    Available states: Initializing, Error, ...

    Some state flows:
    - Default flow: Initialization:Initializing -> ...
    - Initialization error flow: Initialization:Initializing -> Initialization:Error
    - Reset flow: ... -> Reset:Initializing -> ...
*)
class virtual ['context, 'key] pulse_initialized_component :
  Dom_html.element Js.t ->
  object
    constraint 'context = [> initialized_component_contexts ]
    constraint 'key = [> initialized_component_keys ]

    (** Convert a context to a string *)
    method virtual context_to_string : 'context -> string

    (** Convert a key to a string *)
    method virtual key_to_string : 'key -> string

    (** Add a CSS class to the custom element *)
    method add_class : string -> unit

    (** Event bus callback *)
    method event_bus_callback: data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit

    (** attribute changed callback for the custom element *)
    method attribute_changed_callback : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** attribute changed callback for the custom element when the component has already been connected once *)
    method attribute_changed_when_connected_once : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** Clear anything that was done during intialization, so that initialize can be called once again.
        Remove all the dispatchers and listeners.
        Please note that no state switch is done here *)
    method clear : unit -> unit

    (** Callback that is called  when the custom element is connected to the DOM document *)
    method connected_callback : unit -> unit

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

    (** Associated custom element *)
    method element : Dom_html.element Js.t

    (** Add the class 'pulse-component-error' to the component. Used by the error state *)
    method enter_error_state : unit -> unit

    (** Remove the display message and remove the 'pulse-component-error' class from the component. Used by the error state *)
    method exit_error_state : unit -> unit

    (** Get some information on the web component instance, including its id and class if they are defined *)
    method get_info : unit -> string

    (** Method to override by the inherited class *)
    method virtual initialize : unit -> unit

    (** Is the associated custom element connected to the DOM document ? *)
    method connected : bool

    (** Has the associated custom element been connected once to the DOM document ? *)
    method connected_once : bool

    (** Check if the component is initialized, meaning its context is defined and not '`Initializing' or '`Reset'

        @return the component is initialized
    *)
    method is_initialized : unit -> bool

    (** Remove a css class *)
    method remove_class : string -> unit

    (** Reset the component itself. Set the next state at the end of the method *)
    method reset : unit -> unit

    (** (Re-)start loading the component. Switch to context `Initialization or `Reset, whether the component has already been initialized or not *)
    method start : unit -> unit

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


(** Minimum set of contexts to be used by a pulse_basic_initialized_component *)
type basic_initialized_component_contexts =
  [ initialized_component_contexts | `Initialized ]
(** Minimum set of keys to be used by a pulse_basic_initialized_component *)
type basic_initialized_component_keys =
  [ initialized_component_keys | `Standard ]

(** Pulse component with an initialization phase

    Available contexts: Initialization, Reset, Initialized
    Available states: Initializing, Error, Standard

    Some state flows:
    - Default flow: Initialization:Initializing -> Initialized:Standard
    - Initialization error flow: Initialization:Initializing -> Initialization:Error
    - Reset flow: Initialized:Standard -> Reset:Initializing -> Initialized:Standard
*)
class virtual pulse_basic_initialized_component :
  Dom_html.element Js.t ->
  object
    (** Convert a context to a string *)
    method context_to_string : basic_initialized_component_contexts -> string

    (** Convert a key to a string *)
    method key_to_string : basic_initialized_component_keys -> string

    (** Add a CSS class to the custom element *)
    method add_class : string -> unit

    (** Event bus callback *)
    method event_bus_callback: data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit

    (** attribute changed callback for the custom element *)
    method attribute_changed_callback : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** attribute changed callback for the custom element when the component has already been connected once *)
    method attribute_changed_when_connected_once : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** Clear anything that was done during intialization, so that initialize can be called once again.
        Remove all the dispatchers and listeners.
        Please note that no state switch is done here *)
    method clear : unit -> unit

    (** Callback that is called  when the custom element is connected to the DOM document *)
    method connected_callback : unit -> unit

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

    (** Associated custom element *)
    method element : Dom_html.element Js.t

    (** Add the class 'pulse-component-error' to the component. Used by the error state *)
    method enter_error_state : unit -> unit

    (** Remove the display message and remove the 'pulse-component-error' class from the component. Used by the error state *)
    method exit_error_state : unit -> unit

    (** Get some information on the web component instance, including its id and class if they are defined *)
    method get_info : unit -> string

    (** Method to override by the inherited class *)
    method virtual initialize : unit -> unit

    (** Is the associated custom element connected to the DOM document ? *)
    method connected : bool

    (** Has the associated custom element been connected once to the DOM document ? *)
    method connected_once : bool

    (** Check if the component is initialized, meaning its context is defined and not '`Initializing' or '`Reset'

        @return the component is initialized
    *)
    method is_initialized : unit -> bool

    (** Remove a css class *)
    method remove_class : string -> unit

    (** Reset the component itself. Set the next state at the end of the method *)
    method reset : unit -> unit

    (** (Re-)start loading the component. Switch to state 'reset' or 'initial', whether the component has already been initialized or not *)
    method start : unit -> unit

    (** Is the component visible ? *)
    method is_visible: bool
    
    (** Current state_context *)
    method state_context: basic_initialized_component_contexts

    (** Current state_key *)
    method state_key : basic_initialized_component_keys

    (** Current state *)
    method state : (basic_initialized_component_contexts, basic_initialized_component_keys) State.t

    (** Has a state been already initialized to this component ? *)
    method is_started : bool

    (** Get a state (initialize it if necessary) *)
    method get_state : basic_initialized_component_contexts -> basic_initialized_component_keys -> (basic_initialized_component_contexts,basic_initialized_component_keys) State.t

    (** Switch to the state with the specified key *)
    method switch_to_state : ?context:basic_initialized_component_contexts -> ?key:basic_initialized_component_keys -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Consider the current context is completed, switch to the next one *)
    method switch_to_next_context: ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit

    (** Get a config or an attribute given a config key and a default value *)
    method get_config_or_attribute : ?default:string -> string -> string

    (** Add an event listener given a signal, a name and a callback *)
    method add_listener: string -> string -> unit
  end
