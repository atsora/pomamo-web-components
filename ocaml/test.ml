(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

open Pulse_component;;

class test s element =
  let _ = element##innerHTML <- (Js.string "create") in
  object (self)
    inherit pulse_component element as super

    method connected_callback () =
      super#connected_callback ();
      element##.innerHTML := (Js.string s)
    method disconnected_callback () =
      super#disconnected ();
      ()
    method attribute_changed_callback (attr_name:string) (old_value:string option) (new_value:string) =
      super#attribute_changed_callback attr_name old_value new_value;
      ()
  end
    
let create = function elem ->
  elem##.innerHTML := (Js.string "test");
  new test "test" elem
;;
 
Xtag.register "x-test" create;;
Xtag.register "x-foo" (new test "foo");;
Xtag.register "x-poi" (Xtag.restrict_create (fun elem -> new test "poi" elem));;
