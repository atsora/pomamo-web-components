// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

// config - common for all apps
//require('config_component_default.js'); - not possible HERE !

// translation - common 
//require('translation_component_default.js'); - not possible HERE !

// For fast tests
require('x-clock/x-clock');

// check and login
require('x-checkcurrenttime/x-checkcurrenttime');
require('x-checkpath/x-checkpath');
require('x-checkversion/x-checkversion');
require('x-checkconfigupdate/x-checkconfigupdate');
require('x-checklogin/x-checklogin');
require('x-logindisplay/x-logindisplay');
require('x-checkserveraccess/x-checkserveraccess');

require('x-markdowntext/x-markdowntext');
require('x-message/x-message');
require('x-modificationmanager/x-modificationmanager'); // Is it useful ? -- RR 2023

require('x-machineselection/x-machineselection');
/* machineselection already includes :
require('x-grouparray/x-grouparray');
require('x-machinedisplay/x-machinedisplay');
require('x-freetext/x-freetext');
*/

// Displays
require('x-reportdatetime/x-reportdatetime');
require('x-datetimepicker/x-datetimepicker');
require('x-datepicker/x-datepicker');
