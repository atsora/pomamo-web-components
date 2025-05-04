// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

var ATSORA_COMPONENT_CATALOG = ATSORA_COMPONENT_CATALOG || {};
var ATSORA_CATALOG = ATSORA_CATALOG || {};

// App translations - should be completed in app code

ATSORA_CATALOG.general = {
  title: 'Atsora Tracking',
};

/* 
 * Components translations
 */
var ATSORA_COMPONENT_CATALOG = {
  changebutton: 'Change',
  contactsupport: 'Please contact the support team',
  missingconfiguration: 'Missing configuration',
  error2dots: 'Error: ', // TODO : use it!!!
  check: {
    PleaseSyncTime: 'Please synchonize date and time ',
    PleaseCheckServerOrPath :'Please check server access (or path)',
    PleaseCheckServer: 'Please check server access',
    PleaseDatabaseAccess: 'Please check database access'

  },
  currentcncvalue: {
    noDataTooOld: 'N/A'
  },
  currenticoncncalarm: {
    iconTooltip: '' // Never used because specific alarm tooltip
  },
  currenticonnextstop: {
    iconTooltip: 'next stop'
  },
  currenticonunanserweredreason: {
    iconTooltip: 'unanswered machine status'
  },
  currenticonworkinformation: {
    iconTooltip: 'undefined job or operation'
  },
  currenttool: {
    noDataTooOld: 'N/A'
  },
  currentsequence: {
    noDataTooOld: '-', // N/A'
  },
  detailsViewSubTitles: {
    reason: 'motion status',
    machinemode: 'machine mode',
    machinestatetemplate: 'scheduled status',
    observationstate: 'machine state',
    operationcycle: 'cycle',
    productionstate: 'production state',
    shift: 'shift',
    cncvalue: 'cnc value',
    cncalarms: 'cnc alarms',
    workinfo: 'job',
    sequence: 'machining sequence',
    isofile: 'NC program',
    partgoal: 'Nb pieces'
  },
  lastmachinestatetemplate: {
    scheduledStatus: 'Scheduled status:'
  },
  lastmachinestatus: {
    reason: 'Currrent motion status: ',
    pastReasonData: 'Past motion status details',
    currentTooltip: 'Change current motion status',
    pastTooltip: 'Look or change past motion status'
  },
  lastserialnumber: {
    currentserialnumber: 'Serial Number: ',
    pastserialnumber: 'Past data',
    currentTooltip: 'change current serial number',
    pastTooltip: 'past serial number'
  },
  lastworkinformation: {
    noOperation: ' ',
    pastdata: 'Past data',
    pastTooltip: ''
  },
  loginpassword: {
    User: 'User:',
    Password: 'Password:',
    OldPassword: 'Old password:',
    NewPassword: 'New password:',
    StayConnected: 'Stay connected',
    ConnectWith: 'Connect with '
  },
  productiontrackertable: {
    hourly: 'hourly',
    summary: 'summary',
    actual: 'actual',
    target: 'target'
  },
  productionmachiningstatus: {
    notavailable: 'Not Available'
  },
  progressbar: {
    processingTitle: 'Processing...'
  },
  reasongroups: {
    textidleDefaultValue: 'Idle . short stop . Stop'
  },
  runninglegends: {
    textidle: 'Idle . short stop . Stop',
    textrunning: 'Running'
  },
  savemachinestatetemplate: {
    changeMachineStateButton: 'Change machine state',
    changeMachineStateTitle: 'Change machine state'
  },
  savereason: {
    comment: 'comment',
    comment2dots: 'Comment:',
    errorNoDetails: 'Please add a comment',
    noPeriod: 'No period',
    periods: 'periods',
    reason2dots: 'Reason:',
    reasonDetailsTitle: 'Reason details',
    saveReasonTitle: 'Set reason',
    split: 'Split'
  },
  sequencebar: {
    'sequence': 'Sequence '
  },
  setupmachine: {
    noOperation: 'No operation',
    setupsince: 'setup since: ',
    switchTo: 'Switch to ',
    switchToProduction: 'Switch to production'
  },
  toollifemachine: {
    noOperation: 'No operation'
    //,tool: 'tool', tools: 'tools'
    //, nextexpiration: 'Tool Expiring in' --REMOVED
  },
  saveworkinfo: {
    WorkInfoTitle: 'Work information'
  }
};
