(*
 * Copyright (C) 2009-2023 Lemoine Automation Technologies
 *
 * SPDX-License-Identifier: Apache-2.0
 *)

Ajax.add_url ~time:0.010 ~content:" {
  \"Items\": [
  { 
    \"Id\": 1,
    \"Display\":\"InactiveA\"
  },{ 
    \"Id\": 2,
    \"Display\":\"Active\"
  },{ 
    \"Id\": 3,
    \"Display\":\"Error\"
  },{ 
    \"Id\": 4,
    \"Display\":\"UNKNOWN\"
  },{ 
    \"Id\": 5,
    \"Display\":\"ECO\"
  },{ 
    \"Id\": 99,
    \"Display\":\"???\"
  }]
}" "http://localhost:8082/MachineModeCategoryLegend"
;;

include X_ml
