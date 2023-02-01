(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

module Js_object = struct
  exception Not_found

  let get o s =
    let r = Js.Unsafe.get o (Js.string s) in
    if Js.Optdef.test r
    then r
    else raise Not_found

  let rec walk_js source = function
      [] -> invalid_arg "source"
    | t::[] -> get source t
    | t::q -> walk_js (get source t) q

  let unsafe_to_js_string s : Js.js_string Js.t =
    s
end

module Translation = struct
  include Js_object

  let get_js_translation ?default:(d="") key =
    try unsafe_to_js_string (walk_js (get Js.Unsafe.global "translation") key)
    with Not_found -> Js.string d
end

module Config = struct
  include Js_object

  let get_component_string_config ?default:(default="") key =
    try Js.to_string (unsafe_to_js_string (walk_js (get Js.Unsafe.global "tagConfig") key))
    with Not_found -> default

  let get_component_string_config_call ?success:(success=fun s -> ()) ?failure:(failure=fun () -> ()) key =
    try
      let v = Js.to_string (unsafe_to_js_string (walk_js (get Js.Unsafe.global "tagConfig") key)) in
      success v
    with Not_found -> failure ()

  let get ?default:(default_value="") key =
    let js_get (key:Js.js_string Js.t) (default_value:Js.js_string Js.t) : Js.js_string Js.t =
      Js.Unsafe.fun_call (Js.Unsafe.js_expr "ocaml_pulseConfig_get") [|Js.Unsafe.inject key;Js.Unsafe.inject default_value|]
    in
    Js.to_string (js_get (Js.string key) (Js.string default_value))

end
