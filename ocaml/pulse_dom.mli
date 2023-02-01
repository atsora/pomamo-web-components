(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** Utility methods to visit the DOM structure *)

(** Module to iter in a DOM node list *)
module NodeList :
sig
  (** Iterator on the DOM node list *)
  val iter :
    ('node Js.t -> unit) ->
    'node Dom.nodeList Js.t -> unit
  (** Reverse iterator on the DOM node list *)
  val iter_rev :
    ('node Js.t -> unit) ->
    'node Dom.nodeList Js.t -> unit
end
