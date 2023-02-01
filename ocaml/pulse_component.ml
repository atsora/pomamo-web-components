(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

open Pulse_config

module Log = Pulse_log

exception Found_attribute of string*string

class virtual pulse_component element =
  object (self)
    val element:Dom_html.element Js.t = element
    method element = element

    val mutable connected = false
    method connected = connected

    val mutable connected_once = false
    method connected_once = connected_once

    method connected_callback () =
      connected <- true;
      connected_once <- true;
      ()

    method disconnected_callback () =
      connected <- false;
      ()

    method attribute_changed_when_connected_once ~attr_name:(attr_name:string) ~old_value:(old_value:string option) ~new_value:(new_value:string) =
      ()

    method attribute_changed_callback ~attr_name:(attr_name:string) ~old_value:(old_value:string option) ~new_value:(new_value:string) =
      if connected_once
      then self#attribute_changed_when_connected_once ~attr_name ~old_value ~new_value

    method event_bus_callback ~data:(data:Js.Unsafe.any Js.t) ~signal ~name =
      Log.debug_f "event_bus_callback signal:%s name:%s" signal name;
      ()

    method get_info () =
      let s = ref (Js.to_string element##.tagName) in
      if (Js.to_bool (element##hasAttribute (Js.string "id")))
      then
        begin
          match Js.Opt.to_option (element##getAttribute (Js.string "id")) with
          | None -> ()
          | Some attr -> s := (!s) ^ (Printf.sprintf !"[id:%{Js}]" attr)
        end;
      if (Js.to_bool (element##hasAttribute (Js.string "class")))
      then
        begin
          match Js.Opt.to_option (element##getAttribute (Js.string "class")) with
          | None -> ()
          | Some attr -> s := (!s) ^ (Printf.sprintf !"[class:%{Js}]" attr)
        end;
      !s

    method add_class css_class =
      element##.classList##add (Js.string css_class)

    method remove_class css_class =
      let js_css_class = Js.string css_class in
      if Js.to_bool (element##.classList##contains (js_css_class))
      then element##.classList##remove (js_css_class);
      ()

    method get_config_or_attribute ?default:(default_value="") key  =
      let keys = BatString.split_on_char '.' key in
      try
        begin
          match keys with
          | a::b::q ->
            begin
              let x_tag_from_key = "x-" ^ (String.lowercase a) in
              let tag_name = String.lowercase (Js.to_string element##.tagName) in
              if x_tag_from_key = tag_name
              then
                begin
                  match Js.Opt.to_option (element##getAttribute (Js.string b)) with
                  | None -> ()
                  | Some attr -> raise (Found_attribute (b,Js.to_string attr))
                end
            end
          | _ -> ()
        end;
        match Js.Opt.to_option (element##getAttribute (Js.string key)) with
        | None -> Config.get ~default:default_value key
        | Some attr -> (Js.to_string attr)
      with
      | Found_attribute (_,v) -> v

    method add_listener (signal:string) (name:string) =
      Log.debug_f "add_listener %s %s" signal name;
      let _ = 
        Js.Unsafe.meth_call (Js.Unsafe.inject self#element) "addOcamlListener"
          [|
            Js.Unsafe.inject (Js.string signal);
            Js.Unsafe.inject (Js.string name)
          |]
      in
      ()
  end


let to_string c = c#get_info ();;
