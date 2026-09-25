// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

var PULSE_DEFAULT_CONFIG = PULSE_DEFAULT_CONFIG || {};

/* ********** ********** ********** ********** ********** ********** */
// general : Specific pulse web app - prepare use lem* module
/* ********** ********** ********** ********** ********** ********** */
var LEM_CONFIG_DEFAULT = LEM_CONFIG_DEFAULT || {};
LEM_CONFIG_DEFAULT.appName = "Demo";

/* 
 * DEMO configuration
 */
PULSE_DEFAULT_CONFIG.general.pulsewebapppath = 'http://lctr:8080/pulsewebapp';
PULSE_DEFAULT_CONFIG.general.reportpath = 'http://lctr:8080/pulsereporting/';
PULSE_DEFAULT_CONFIG.general.mainpath = ''; //Warning '/' needed at the end

tagConfig.refreshingRate.currentRefreshSeconds = 10;
tagConfig.refreshingRate.barDailyRefreshSeconds = 60;
tagConfig.refreshingRate.barMinimumRefreshSeconds = 10;
tagConfig.refreshingRate.barPastFixedDataRefreshMinutes = 60;
tagConfig.refreshingRate.barPastChangingDataRefreshMinutes = 5;
tagConfig.refreshingRate.barSlowUpdateMinutes = 5;

tagConfig.stopRefreshingRate.freezeMinutes = 1; // For Lionel tests
tagConfig.stopRefreshingRate.pastDataFreezeMinutes = 2; // For Lionel tests

// tagConfig.displayedPages (left navigation) is not defined here: build/demos-prep.mjs
// generates it from the links of index.html and appends it to the published copy of
// this file. Add a demo to index.html and it appears in the navigation too.
