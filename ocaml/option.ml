(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

exception No_value

let get = function
| None -> raise No_value
| Some x -> x
