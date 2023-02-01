(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

open Dto_t;;

let json = "{\"Items\":[{\"Id\":3,\"Display\":\"Error\"},{\"Id\":1,\"Display\":\"Inactive\"},{\"Id\":5,\"Display\":\"Eco\"},{\"Id\":2,\"Display\":\"Active\"},{\"Id\":4,\"Display\":\"Unknown\"}]}"

let category_legend = Dto_j.machine_mode_category_legend_of_string json
