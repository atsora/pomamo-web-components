(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

type t = <connected_callback: (unit -> unit); disconnected_callback: (unit -> unit); attribute_changed_callback: (attr_name:string -> old_value:string option -> new_value:string -> unit); event_bus_callback: (data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit)>

let js_of_string_option s = function
  | None -> Js.null
  | Some s -> Js.some (Js.string s)

let js_to_string_option jss = match Js.Opt.to_option jss with
  | None -> None
  | Some s -> Some (Js.to_string s)

let js_of_t (a:<connected_callback: (unit -> unit); disconnected_callback: (unit -> unit); attribute_changed_callback: (attr_name:string -> old_value:string option -> new_value:string -> unit); event_bus_callback: (data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit);..>) =
  let cast_attribute_changed name old_value new_value = a#attribute_changed_callback (Js.to_string name) (js_to_string_option old_value) (Js.to_string new_value) in
  let cast_event_bus_callback data signal name = a#event_bus_callback data (Js.to_string signal) (Js.to_string name) in
  Js.Unsafe.obj [|
      ("connectedCallback", Js.Unsafe.inject (Js.wrap_callback a#connected_callback));
      (* Of type (Dom_html.element, unit -> unit) Js.meth_callback *)
      ("disconnectedCallback", Js.Unsafe.inject (Js.wrap_callback a#disconnected_callback));
      ("attributeChangedCallback", Js.Unsafe.inject (Js.wrap_callback cast_attribute_changed));
      ("eventBusCallback", Js.Unsafe.inject (Js.wrap_callback cast_event_bus_callback))
    |]

let restrict_create create =
  fun elem -> ((create elem) :> t)

let register ~tag ~create =
  let cast_tag = Js.Unsafe.inject (Js.string tag)
  and cast_create = Js.Unsafe.inject (fun a -> js_of_t (create a)) in
  let _ = Js.Unsafe.fun_call (Js.Unsafe.js_expr "registerElement") [|cast_tag;cast_create|] in
  ()
