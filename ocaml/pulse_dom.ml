(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

module Log = Pulse_log

module NodeList =
struct
  let iter f nodes =
    let rec iter_aux f nodes i =
      let length = nodes##.length in
      if i < length
      then
        begin
          let opt_node = nodes##(item i) in
          Js.Opt.iter opt_node f;
          let new_length = nodes##.length in
          if new_length = length then iter_aux f nodes (i+1)
          else if (new_length + 1) = length then iter_aux f nodes i (* the item was removed *)
          else failwith "unexpected length change"
        end
    in
    iter_aux f nodes 0

    let iter_rev f nodes =
      let rec iter_aux f nodes i =
        if 0 <= i
        then
          begin
            let opt_node = nodes##(item i) in
            Js.Opt.iter opt_node f;
            iter_aux f nodes (i-1)
          end
      in
      match nodes##.length with
      | 0 -> ()
      | l -> iter_aux f nodes (l - 1)
  
  end
