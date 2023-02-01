(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

(** Module to run an Ajax request, with some optional mocks *)

(** Response type of a mock *)
type mock_response = {
  response_time : float;
  response_code : int;
  response_text : string;
}

(** Add a function mock *)
val add_mock : (string -> mock_response) -> unit

(** Add a mock for all the URLs that match the specified regex *)
val add_regex :
  ?time:float -> ?code:int -> ?content:string -> Regexp.regexp -> unit

(** Add a mock for all the URLs that match the specified regex *)
val add_regex_string :
  ?time:float -> ?code:int -> ?content:string -> string -> unit

(** Add a mock for a specific URL *)
val add_url : ?time:float -> ?code:int -> ?content:string -> string -> unit

(** Perform an Ajax request *)
val perform_raw_url :
  ?headers:(string * string) list ->
  ?content_type:string ->
  ?get_args:(string * string) list ->
  ?check_headers:(int -> (string -> string option) -> bool) ->
  ?progress:(int -> int -> unit) ->
  ?upload_progress:(int -> int -> unit) ->
  ?override_mime_type:string ->
  ?override_method:[< `DELETE
                    | `GET
                    | `HEAD
                    | `OPTIONS
                    | `PATCH
                    | `POST
                    | `PUT ] ->
  ?with_credentials:bool -> string -> XmlHttpRequest.http_frame Lwt.t
