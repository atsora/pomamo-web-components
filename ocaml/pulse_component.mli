(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** Main module to create web components with js_of_ocaml and x-tag *)

(** Super-class of all the pulse components

    @param element Associated custom element
*)
class virtual pulse_component :
  Dom_html.element Js.t ->
  object
    (** Add a CSS class to the custom element *)
    method add_class : string -> unit

    (** Event bus callback *)
    method event_bus_callback: data:Js.Unsafe.any Js.t -> signal:string -> name:string -> unit

    (** attribute changed callback for the custom element *)
    method attribute_changed_callback : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** attribute changed callback for the custom element when the component has already been connected once *)
    method attribute_changed_when_connected_once : attr_name:string -> old_value:string option -> new_value:string -> unit

    (** Callback that is called  when the custom element is connected to the DOM document *)
    method connected_callback : unit -> unit

    (** Callback that is called when the custom element is disconnected from the DOM document *)
    method disconnected_callback : unit -> unit

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

    (** Get a config or an attribute given a config key and a default value *)
    method get_config_or_attribute : ?default:string -> string -> string

    (** Add an event listener given a signal, a name *)
    method add_listener: string -> string -> unit
  end

  
(** Convert a Pulse component to a string for debugging purpose for example *)
val to_string: <get_info:(unit->string);..> -> string
