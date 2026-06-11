// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

// config - common for all apps
//require('config_component_default.js'); - not possible HERE !

// translation - common 
//require('translation_component_default.js'); - not possible HERE !

// For fast tests
import 'x-clock/x-clock';

// check and login
import 'x-checkcurrenttime/x-checkcurrenttime';
import 'x-checkpath/x-checkpath';
import 'x-checkversion/x-checkversion';
import 'x-checkconfigupdate/x-checkconfigupdate';
import 'x-checklogin/x-checklogin';
import 'x-logindisplay/x-logindisplay';
import 'x-checkserveraccess/x-checkserveraccess';

import 'x-markdowntext/x-markdowntext';
import 'x-message/x-message';
import 'x-modificationmanager/x-modificationmanager'; // Is it useful ? -- RR 2023

import 'x-machineselection/x-machineselection';
/* machineselection already includes :
import 'x-machinedisplay/x-machinedisplay';
import 'x-freetext/x-freetext';
*/

// Displays
import 'x-reportdatetime/x-reportdatetime';
import 'x-datetimepicker/x-datetimepicker';
import 'x-datepicker/x-datepicker';
