(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

type t = [`A | `B] [@@deriving sexp]

let a = `A;;

Printf.printf "Human:%s\n" (Sexplib.Sexp.to_string_hum (sexp_of_t a));;
Printf.printf "Machine:%s\n" (Sexplib.Sexp.to_string (sexp_of_t a));;
