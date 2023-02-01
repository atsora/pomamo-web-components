// Copyright (C) 2009-2023 Lemoine Automation Technologies
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

tagConfig.displayedPages = [
  {
    pageName: 'ancestors',
    title: 'Groups',
    subTitle: ''
  },
  {
    pageName: 'bartimeselection',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'clock',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'cncalarmbar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'cncvaluebar',
    title: 'Colored bars',
    subTitle: ''
  },
  /*{
    pageName: 'currencncvalue',
    title: 'Basic displays',
    subTitle: ''
  },*/
  {
    pageName: 'cycleprogresspie',
    title: 'Pie / Gauge / Light',
    subTitle: ''
  },
  {
    pageName: 'cycleprogressbar',
    title: 'Other bars',
    subTitle: ''
  },
  {
    pageName: 'cyclesinperiod',
    title: 'Other bars',
    subTitle: ''
  },
  {
    pageName: 'datetimegraduation',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'datepicker',
    title: 'Date time',
    subTitle: ''
  },
  {
    pageName: 'datetimepicker',
    title: 'Date time',
    subTitle: ''
  },
  {
    pageName: 'datetimerange',
    title: 'Date time',
    subTitle: ''
  },
  // datetimerangeselection ?
  {
    pageName: 'defaultpie',
    title: 'Pie / Gauge / Light',
    subTitle: ''
  },
  {
    pageName: 'detailedalarmsat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedcncvaluesat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedisofileat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedmachinestateat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedoperationcycleat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedpartsat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedproductionstateat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedreasonat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedsequenceat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedshiftat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'detailedworkinfoat',
    title: 'Details',
    subTitle: ''
  },
  {
    pageName: 'fieldlegends',
    title: 'Legends',
    subTitle: ''
  },
  {
    pageName: 'grouparray',
    title: 'Groups',
    subTitle: ''
  },
  {
    pageName: 'groupsingroup',
    title: 'Groups',
    subTitle: ''
  },
  /*{
    pageName: 'highlightperiodbar',
    title: 'Colored bars',
    subTitle: ''
  },*/
  {
    pageName: 'isofileslotbar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'lastmachinestatetemplate',
    title: 'Current bars (LastXXX)',
    subTitle: ''
  },
  {
    pageName: 'lastmachinestatus',
    title: 'Current bars (LastXXX)',
    subTitle: ''
  },
  {
    pageName: 'lastserialnumber',
    title: 'Current bars (LastXXX)',
    subTitle: ''
  },
  {
    pageName: 'lastworkinformation',
    title: 'Current bars (LastXXX)',
    subTitle: ''
  },
  {
    pageName: 'loginconnection',
    title: 'Login',
    subTitle: ''
  },
  {
    pageName: 'loginchangepassword',
    title: 'Login',
    subTitle: ''
  },
  {
    pageName: 'loginchangepasswordbutton',
    title: 'Login',
    subTitle: ''
  },
  {
    pageName: 'machinedisplay',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'machinemodecolorlegends',
    title: 'Legends',
    subTitle: ''
  },
  {
    pageName: 'machinemodelegends',
    title: 'Legends',
    subTitle: ''
  },
  {
    pageName: 'machineselection',
    title: 'Machines',
    subTitle: ''
  },
  {
    pageName: 'machineselector',
    title: 'Machines',
    subTitle: ''
  },
  {
    pageName: 'machinestatebar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'machinetab',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'markdowntext',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'milestonesadd',
    title: 'Milestones',
    subTitle: ''
  },
  {
    pageName: 'milestonesmanager',
    title: 'Milestones',
    subTitle: ''
  },
  {
    pageName: 'motionpercentage',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'motiontime',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'operationcyclebar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'observationstatebar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'operationslotbar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'partproductionstatuspie',
    title: 'Pie / Gauge / Light',
    subTitle: ''
  },
  {
    pageName: 'performancebar',
    title: 'Other bars',
    subTitle: ''
  },
  {
    pageName: 'performancegauge',
    title: 'Pie / Gauge / Light',
    subTitle: ''
  },
  {
    pageName: 'periodmanager',
    title: 'Date time',
    subTitle: ''
  },
  {
    pageName: 'periodtoolbar',
    title: 'Date time',
    subTitle: ''
  },
  {
    pageName: 'productionmachiningstatus',
    title: 'Other bars',
    subTitle: ''
  },
  {
    pageName: 'productionstatebar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'productionstatelegends',
    title: 'Legends',
    subTitle: ''
  },
  {
    pageName: 'productiontrackertable',
    title: 'report table',
    subTitle: ''
  },
  {
    pageName: 'reasonbutton',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'reasongroups',
    title: 'Legends',
    subTitle: ''
  },
  {
    pageName: 'reasonslotbar',
    title: 'Colored bars',
    subTitle: 'ReasonSlotBar (+ bartimeselection)'
  },
  {
    pageName: 'reasonslotlist',
    title: 'Save',
    subTitle: ''
  },
  {
    pageName: 'reasonslotpie',
    title: 'Pie / Gauge / Light',
    subTitle: ''
  },
  {
    pageName: 'redstacklightbar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'revisionprogress',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'runningbutton',
    title: 'Basic displays',
    subTitle: ''
  },
  {
    pageName: 'runninglegends',
    title: 'Legends',
    subTitle: ''
  },
  {
    pageName: 'runningslotbar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'runningslotpie',
    title: 'Pie / Gauge / Light',
    subTitle: ''
  },
  {
    pageName: 'savemachinestatetemplate',
    title: 'Save',
    subTitle: ''
  },
  {
    pageName: 'savereason',
    title: 'Save',
    subTitle: ''
  },
  {
    pageName: 'saveserialnumber',
    title: 'Save',
    subTitle: ''
  },
  {
    pageName: 'sequencebar',
    title: 'Other bars',
    subTitle: ''
  },
  {
    pageName: 'setupmachine',
    title: 'Other bars',
    subTitle: ''
  },
  {
    pageName: 'shiftslotbar',
    title: 'Colored bars',
    subTitle: ''
  },
  {
    pageName: 'stacklight',
    title: 'Pie / Gauge / Light',
    subTitle: ''
  },
  {
    pageName: 'toollifemachine',
    title: 'Other bars',
    subTitle: ''
  }
];
/* Possible TITLES :
Basic displays
Date time
Legends
Colored bars
Current bars (LastXXX)
Other bars
Pie / Gauge / Light
Save
Trees
Details
*/
