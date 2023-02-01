(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** Check an element is visible. If false is returned, please note this is only reliable if the element is a block or an inline block *)
val is_visible : #Dom_html.element Js.t -> bool

(** Check an element is a block or an inline block *)
val is_block : #Dom_html.element Js.t -> bool
