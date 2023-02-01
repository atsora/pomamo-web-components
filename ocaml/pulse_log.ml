(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

let error m =
  Firebug.console##error (Js.string m)
;;

let debug m =
  Firebug.console##debug (Js.string m)
;;

let debug_f fmt = Printf.ksprintf debug fmt

let error_f fmt = Printf.ksprintf error fmt
