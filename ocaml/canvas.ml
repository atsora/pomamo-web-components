(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

open Tyxml_js;;
open Tyxml_js.Html;;

let pi = 4. *. atan 1.

let draw_circle ~canvas ~center:((x:float),(y:float)) ~radius ~color =
  let context = canvas##(getContext Dom_html._2d_) in
  context##save;
  context##beginPath;
  context##(arc x y radius 0. (2.*.pi) Js._true);
  context##.fillStyle := (Js.string color);
  context##fill;
  context##restore;
  ()

let draw_image ~canvas ~image_url ~coordinates:(x,y) =
  (*TODO: image cache ?*)
  let context = canvas##(getContext Dom_html._2d_) in
  let%html img =
    {|
     <img src="|}image_url{|" alt="|}image_url{|"/>
     |} in
  let img_dom = Tyxml_js.To_dom.of_img img in
  let%lwt _ = Lwt_js_events.load img_dom in  
  context##save;
  context##(drawImage img_dom x y);
  context##restore;
  Lwt.return ()
