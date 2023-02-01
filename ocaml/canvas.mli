(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** Utility methods to draw figures on a canvas *)

(** Draw a circle *)
val draw_circle : canvas:Dom_html.canvasElement Js.t -> center:float * float -> radius:float -> color:string -> unit

(** Draw an image *)
val draw_image : canvas:Dom_html.canvasElement Js.t -> image_url:string -> coordinates:float * float -> unit Lwt.t
