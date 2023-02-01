(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** Utility functions to get some configurations *)

(** Module to get some translation values *)
module Translation:
  sig
    (** Get a translation. An optional default value can be set *)
    val get_js_translation: ?default:string -> string list -> Js.js_string Js.t
  end

(** Module to get the values of some configuration keys *)
module Config:
  sig
    (** Get a component string configuration. An option default value can be set. Else if the configuration key is not found, an empty string is returned *)
    val get_component_string_config: ?default:string -> string list -> string

    (** Get a component string configuration and apply one of the callback according if the configuration key was found or not *)
    val get_component_string_config_call: ?success:(string -> unit) -> ?failure:(unit -> unit) -> string list -> unit

    (** Get a configuration given its key and a default value *)
    val get: ?default:string -> string -> string
  end
