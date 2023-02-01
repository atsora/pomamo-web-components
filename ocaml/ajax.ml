(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

open XmlHttpRequest

module Log = Pulse_log

type mock_response =
  {
    response_time : float;
    response_code: int;
    response_text: string;
  }

exception Mock_invalid;;

let mocks = ref [];;

let add_mock f =
  mocks := (!mocks) @ (f::[])

let add_regex ?time:(time=0.) ?code:(code=200) ?content:(content="") regex =
  let f u =
    Log.debug ("regex VS " ^ u);
    let m = Regexp.string_match regex u 0 in
    match m with
    | None ->
      begin
        Log.debug "Mock invalid";
        raise Mock_invalid
      end
    | _ -> {response_time = time; response_code = code; response_text = content}
  in
  add_mock f

let add_regex_string ?time:(time=0.) ?code:(code=200) ?content:(content="") regex_string =
  add_regex ~time ~code ~content (Regexp.regexp_case_fold regex_string)

let add_url ?time:(time=0.) ?code:(code=200) ?content:(content="") url =
  Log.debug ("add_url regex=" ^ (Regexp.quote url));
  add_regex ~time ~code ~content (Regexp.regexp_string_case_fold url)

let create_response ?headers url code response =
  match headers with
  | None -> {XmlHttpRequest.url = url; XmlHttpRequest.code = code; XmlHttpRequest.headers = (fun _ -> None); XmlHttpRequest.content = response; 
             XmlHttpRequest.content_xml = (fun () -> None) }
  | Some h -> {XmlHttpRequest.url = url; XmlHttpRequest.code = code; XmlHttpRequest.headers = h; XmlHttpRequest.content = response; 
               XmlHttpRequest.content_xml = (fun () -> None) }

let apply_mock f url =
  Log.debug ("Try to apply mock for url " ^ url);
  let r = f url in
  Log.debug ("apply mock for url " ^ url);
  let%lwt _ = Lwt_js.sleep r.response_time in
  Lwt.return (create_response url r.response_code r.response_text)

let perform_raw_url ?headers ?content_type ?get_args ?check_headers ?progress ?upload_progress ?override_mime_type ?override_method ?with_credentials url =
  Log.debug ("perform_raw_url. Number of mocks: " ^ (string_of_int (List.length !mocks)));
  let rec process_mocks = function
    | [] ->
      begin
        Log.debug ("Send request " ^ url);
        XmlHttpRequest.perform_raw_url ?headers ?content_type ?get_args ?check_headers ?progress ?upload_progress ?override_mime_type ?override_method ?with_credentials url
      end
    | f::tail ->
      try apply_mock f url with
        Mock_invalid -> process_mocks tail
      | ex ->
        begin
          Log.error ("perform_raw_url. Unexpected error in apply_mock " ^ (Printexc.to_string ex));
          process_mocks tail
        end in
  process_mocks (!mocks)
