(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** Module to register a new x-tag *)

(** Type of the object to create to register a new X-tag
    Note the name of the methods with the _callback suffix match the W3C specification draft of the custom elements
 *)
type t = <connected_callback: (unit -> unit); disconnected_callback: (unit -> unit); attribute_changed_callback: (attr_name:string -> old_value:string option -> new_value:string -> unit); event_bus_callback: (data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit)>

val restrict_create: (Dom_html.element Js.t -> <connected_callback: (unit -> unit); disconnected_callback: (unit -> unit); attribute_changed_callback: (attr_name:string -> old_value:string option -> new_value:string -> unit); event_bus_callback: (data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit); ..>) -> Dom_html.element Js.t -> t

(** Register a new x-tag, with element name tag and with the specified create function. 
    Note the name of the methods with the _callback suffix match the W3C specification draft of the custom elements
*)
val register: tag:string -> create:(Dom_html.element Js.t -> <connected_callback: (unit -> unit); disconnected_callback: (unit -> unit); attribute_changed_callback: (attr_name:string -> old_value:string option -> new_value:string -> unit); event_bus_callback: (data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit); ..>) -> unit
