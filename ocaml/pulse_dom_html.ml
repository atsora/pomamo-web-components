(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

module Log = Pulse_log

let is_visible element =
  (* Do it for now like jQuery 1.3.2: check offsetWidth or offsetHeight is greater than 0 *)
  (0 < element##.offsetWidth) || (0 < element##.offsetHeight);;

let is_block element =
  let style =  Dom_html.window##getComputedStyle element in
  match Js.to_string style##.display with
  | "block" -> true
  | _ -> false
