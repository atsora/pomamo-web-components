(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** State module, to which a component is associated *)

(** State type *)
class type ['context, 'key] t =
  object
    (** Context that is associated to this state *)
    method context: 'context

    (** Key that is associated to this state *)
    method key: 'key
        
    (** Previous state context, before this state is active (after enter() is called) *)
    method previous_context: 'context option

    (** Previous state key, before this state is active (after enter() is called) *)
    method previous_key: 'key option

    (** Function that is called when the component enters this state *)
    method enter_state: ?previous_context:'context -> ?previous_key:'key -> unit -> unit

    (** Function that is called when the component exists this state *)
    method exit_state: next_context:'context -> next_key:'key -> unit

    (** Function that is called when the component stays in this state *)
    method stay: unit -> unit

    (** to_string method *)
    method to_string: string
  end


(** Initial state. Set the next state in the initialize method *)
class ['context, 'key] initial: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);is_initialized:(unit->bool);initialize:(unit->unit);clear:(unit->unit);..> -> ['context, 'key] t

(** Initial state for auto path components. Set the next state in the initialize method *)
class ['context, 'key] auto_path_initial: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);is_initialized:(unit->bool);initialize:(unit->unit);clear:(unit->unit);add_listener: string -> string -> unit;..> -> ['context, 'key] t

(** Reset state. Set the next state in the initialize method *)
class ['context, 'key] reset: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);reset:(unit->unit);..> -> ['context, 'key] t

(** Static state. It does not switch automatically to any other state *)
class ['context, 'key] static: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);..> -> ['context, 'key] t

(** No action state. The next state is directly the state that is given in the argument of the constructor. Nothing else special is done.*)
class ['context, 'key] no_action: ?next_context:'context -> ?next_key:'key -> 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);..> -> ['context, 'key] t

(** Wait state. Switch to the next state after a specified time *)
class ['context, 'key] wait: ?next_context:'context -> ?next_key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> ?delay_callback:('component -> float) -> 'context -> 'key -> (<context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);..> as 'component) -> ['context, 'key] t

(** Param validation state with a timeout. The event/live parameters are checked by the ValidateParameters methods of the web component. 

In case they are ok, switch to the next context.

After some time, if the parameters could not be validated, the web component is automatically switched to an error state.Ag_biniou

When this state is entered the validateParameters method of the component is called
*)
class ['context, 'key] param_validation_timeout: ?delay_callback:('component -> float) -> 'key -> 'context -> 'key -> (<context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);validate_parameters:(unit -> unit);show_error:(unit -> unit);remove_error:(unit -> unit);..> as 'component) -> ['context, 'key] t

(** Param validation state with a timeout + wait for url path.
The event/live parameters are checked by the ValidateParameters methods of the web component. 

In case they are ok, switch to the next context.

After some time, if the parameters could not be validated, the web component is automatically switched to an error state.Ag_biniou

When this state is entered the validateParameters method of the component is called
*)
class ['context, 'key] param_and_path_validation_timeout: ?delay_callback:('component -> float) -> 'key -> 'context -> 'key -> (<context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);validate_parameters:(unit -> unit);show_error:(unit -> unit);remove_error:(unit -> unit);set_error:(string -> unit);update_path_from_config_or_attribute:(unit -> bool);..> as 'component) -> ['context, 'key] t

(** Loading state. The initial ajax request was sent, but no normal data has been loaded yet. The ajax request is sent right now *)
class ['context, 'key] load: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);is_visible:bool;switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);get_url:(unit->string);manage_success:(string->unit);manage_error:(Dto_t.error->unit);manage_failure:(int->unit);manage_timeout:(unit->unit);..> -> ['context, 'key] t

(** Normal request state *)
class ['context, 'key] normal_request: ?delay_callback:('a -> float) -> 'context -> 'key -> (<context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);is_visible:bool;switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);get_url:(unit->string);manage_success:(string->unit);manage_error:(Dto_t.error->unit);manage_failure:(int->unit);manage_timeout:(unit->unit);..> as 'a) -> ['context, 'key] t

(** Reload state. The component is in a state when the data must be reloaded right now. The default delay is 0ms here *)
class ['context, 'key] reload: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);is_visible:bool;switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);before_reload:(unit->unit);get_url:(unit->string);manage_success:(string->unit);manage_error:(Dto_t.error->unit);manage_failure:(int->unit);manage_timeout:(unit->unit);..> -> ['context, 'key] t

(** Not available state. The data is not available right now (it may be in the future) *)
class ['context, 'key] not_available: ?delay_callback:('a -> float) -> 'context -> 'key -> (<context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);is_visible:bool;switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);get_url:(unit->string);manage_success:(string->unit);manage_error:(Dto_t.error->unit);manage_failure:(int->unit);manage_timeout:(unit->unit);..> as 'a) -> ['context, 'key] t

(** Temporary error state. A temporary error happened *)
class ['context, 'key] temporary: 'key -> ?delay_callback:('a -> float) -> 'context -> 'key -> (<context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);is_visible:bool;switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);get_url:(unit->string);manage_success:(string->unit);manage_error:(Dto_t.error->unit);manage_failure:(int->unit);manage_timeout:(unit->unit);transient_error_delay:float;show_error:(unit->unit);remove_error:(unit->unit);..> as 'a) -> ['context, 'key] t

(** Delay error state. A temporary error that can remain active potentially a long time happened *)
class ['context, 'key] delay: 'key -> ?delay_callback:('a -> float) -> 'context -> 'key -> (<context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);is_visible:bool;switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);get_url:(unit->string);manage_success:(string->unit);manage_error:(Dto_t.error->unit);manage_failure:(int->unit);manage_timeout:(unit->unit);transient_error_delay:float;show_error:(unit->unit);remove_error:(unit->unit);..> as 'a) -> ['context, 'key] t

(** Transient error state. State to use when many temporary or delay states already occurred. Then the pulse component can be switch to a warning state *)
class ['context, 'key] transient_error: ?delay_callback:('a -> float) -> 'context -> 'key -> (<context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);is_visible:bool;switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);switch_to_next_context:(?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);get_url:(unit->string);enter_transient_error_state:(unit->unit);exit_transient_error_state:(unit->unit);manage_success:(string->unit);manage_error:(Dto_t.error->unit);manage_failure:(int->unit);manage_timeout:(unit->unit);..> as 'a) -> ['context, 'key] t

(** Error state *)
class ['context, 'key] error: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);switch_to_state:(?context:'context -> ?key:'key -> ?pre_action:(unit -> unit) -> ?post_action:(unit -> unit) -> unit -> unit);enter_error_state:(unit->unit);exit_error_state:(unit->unit);..> -> ['context, 'key] t

(** Not applicable state *)
class ['context, 'key] not_applicable: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);..> -> ['context, 'key] t

(** Stop state. State to use when a component is removed temporary from the page and all the current actions may be stopped *)
class ['context, 'key] stop: 'context -> 'key -> <context_to_string:('context -> string);key_to_string:('key -> string);add_class:(string -> unit);remove_class:(string -> unit);..> -> ['context, 'key] t
