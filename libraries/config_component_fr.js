// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

var PULSE_DEFAULT_CONFIG = PULSE_DEFAULT_CONFIG || {};

/* 
 * ** Please keep this comment ** *
 * Global configuration : each next line overload previous ones
* tagConfig... see below
 * PULSE_DEFAULT_CONFIG.general
 * PULSE_DEFAULT_CONFIG.pages
 * PULSE_DEFAULT_CONFIG.roles
 * PULSE_DEFAULT_CONFIG.rolespages
 * 
 */

/* ********** ********** ********** ********** */
// general : Default configuration, common to ALL APPS (PWA, reporting...
// additional data will be added for each app
/* ********** ********** ********** ********** */
PULSE_DEFAULT_CONFIG.general = {
  useLogin: 'false',
  theme: 'dark',

  // for x-production, x-partproductionstatuspie, x-productionmachiningstatus...
  thresholdunitispart: true,
  thresholdorangeproduction: 0,
  thresholdredproduction: 0,

  /* The following def are BELOW in tagConfig :
    reportpath: 'http://lctr:8080/pulsereporting/',
    pulsewebapppath: '', // 'http://lctr:8080/pulsewebapp', // Value usefull for reporting links
    mainpath: '', //Warning '/' needed at the end - SHOULD BE EMPTY when INSTALL
  */
  /* Roles with the associated configuration
   *
   * role: the key of the role
   * display : role display
   */
  roles: [ // Used ONLY to know list of roles -> maybe use translation...
    {
      role: 'operator',
      display: 'Opérateur'
      //firstPage: 'running'
    },
    {
      role: 'manager',
      display: 'Responsable'
    },
    {
      role: 'live', // Not a role, but AppContext - keep here
      display: 'Live',
      //firstPage: 'operationstatus',
      noAccess: true
    },
    // Invible role / App Context
    { // support == idem manager + live + reports
      role: 'support',
      display: 'Support',
      noAccess: true
    },
    {
      role: 'dev',
      display: null,
      noAccess: true
    },
    {
      role: 'liveadmin',
      display: 'Live'
      //,noAccess: true
    }/*,
    {
      role: 'reportAdmin',
      display: 'Reports'
      //,noAccess: true
    }*/
    /*,
    {
      role: 'ITGuy',
      display: null,
      noAccess: true
    }*/
  ]
};

/* ********** ********** ********** ********** */
/* roles config - for all apps */
/* ********** ********** ********** ********** */
PULSE_DEFAULT_CONFIG.roles = {
  operator: {
    displayedApps: [
      'PulseWebApp'
    ],
  },
  manager: {
    displayedApps: [
      'PulseWebApp',
      'Reports'
    ]
  },
  support: { // == idem manager + live + reports
    displayedApps: [
      'PulseWebApp',
      'Live',   // AppContext = live in URL
      'Reports' // use reportpath = 'http://lctr:8080/pulsereporting/'
    ]
  },
  live: { // Special for LIVE pages. These config will overload role config
    //displayedApps Never defined here. It is not a role ! -> will use role config
  },
  dev: {
    displayedApps: [ // ALL
      'PulseWebApp',
      'Live',   // AppContext = live in URL
      'Reports' // use reportpath = 'http://lctr:8080/pulsereporting/'
      //,'OperationWebApp' // for next version
    ]
  },
  liveadmin: {
    displayedApps: [ // Live Only
      'Live'    // AppContext = live in URL
    ]
  }/*,
  reportAdmin: {
    displayedApps: [ // Reports Only
      'Reports'  // use reportpath = 'http://lctr:8080/pulsereporting/'
    ]
  }*/
  /*,
  ITGuy: {
    displayedApps: [ // ???
      //'PulseWebApp',
      //'Live',   // AppContext= live in URL
      //'Reports' // use reportpath = 'http://lctr:8080/pulsereporting/'
      //,'OperationWebApp' // for next version
    ]
  }*/
  //live.displayedApps Never defined. It is not a role ! -> will use role config
};

/* ********** ********** ********** ********** */
// All default values for x-XXX are defined HERE 
// please use the same in x-tag 
/* ********** ********** ********** ********** */
var tagConfig = {
  // The 3 following def could be in PULSE_DEFAULT_CONFIG - Keep here or change install + doc
  reportpath: 'http://lctr:8080/atrackingreporting/', // Done - "/" is mandatory for Ford
  pulsewebapppath: '', // 'http://lctr:8080/atrackingwebapp', // Value usefull for reporting links
  mainpath: '', //Warning '/' needed at the end - SHOULD BE EMPTY when INSTALL
  skipWebServiceAddress: false,

  // COMMON CONFIG
  refreshingRate: { // replace updateSeconds
    currentRefreshSeconds: 10,
    barDailyRefreshSeconds: 60,
    barMinimumRefreshSeconds: 10,
    barPastFixedDataRefreshMinutes: 60,
    barPastChangingDataRefreshMinutes: 5,
    barSlowUpdateMinutes: 5 // Shift, mst, performance...
  },
  //freezedisplayminutes: 5, // To remove
  stopRefreshingRate: {
    freezeMinutes: 3, // == Time Before bar disappear (transient)  
    pastDataFreezeMinutes: 60 // == Time Before bar disappear (transient) for past data  
  },

  /* EXAMPLE : can be overloaded this way :
  cncvaluebar: { 
    refreshingRate:{ // replace updateSeconds
      barDailyRefreshSeconds: 4
    }
  },*/

  // COMMON COMPONENTS
  // For cycleprogressbar / cycleprogresspie / currenticonnextstop / partproductionstatuspie
  threshold1: 600, // seconds
  threshold2: 180, // seconds

  // REAL COMPONENTS (alphabetic order)
  checkconfigupdate: {
    refreshSeconds: 300, // 5 minutes
  },
  currenticoncncalarm: {
    showAlarmBelowIcon: false,
    showUnknownAlarm: true,
    showIgnoredAlarm: false
  },
  detailedalarmsat: { // idem currenticoncncalarm
    showUnknownAlarm: true,
    showIgnoredAlarm: false
  },
  detailedreasonat: {
    hideChangeReasonButton: false, //
    showAutoReasonsWhenMotion: false
  },
  loginchangepasswordbutton:{
    changepasswordallowed: true
  },
  productiontrackertable: {
    showreservecapacity: false
  },
  reasonslotbar: {
    showoverwriterequired: 'true',
    cancelHorizontalSplitInBar: 'false'
  },
  toollifemachine: {
    toollabelsselections: [
      {
        name: 'exp',
        display: 'seulement expirés',
        labels: [],
        showexpiredonly: true // To show tools expired only
        //mandatorygroup: 'ET0'
      },
      // FYI : a group can be created using labels: [], showexpiredonly: false 
      // to show expired AND tools in warning with NO expirationdatetime
      {
        name: 'in1h',
        display: "expirés dans l'heure",
        labels: [5, 15, 30, 60],
        showexpiredonly: false
        //mandatorygroup: 'ET1'
      },
      {
        name: 'in2h',
        display: "expirés les 2 prochaines heures",
        labels: [15, 30, 60, 120],
        showexpiredonly: false
        //mandatorygroup: 'ET2'
      },
      {
        name: 'in4h',
        display: "expirés les 4 prochaines heures",
        labels: [30, 60, 120, 240],
        showexpiredonly: false
        //mandatorygroup: 'ET4'
      },
      {
        name: 'in8h',
        display: "expirés les 8 prochaines heures",
        labels: [60, 120, 240, 480],
        showexpiredonly: false
        //mandatorygroup: 'ET8'
      },
      {
        name: 'in12h',
        display: "expirés les 12 prochaines heures",
        labels: [60, 180, 360, 720],
        showexpiredonly: false
        //mandatorygroup: 'ET12'
      }
    ],
    toollabelname: 'in1h',
    toolReport: 'Tool/CurrentTools',
    displayremainingcyclesbelowtool: 'false'
    // mandatorygroupgroup: 'ET'-> in toollife page
  }
};
