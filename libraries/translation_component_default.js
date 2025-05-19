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
  errorColon: 'Error: ',
  error: {
    selectMachine: 'Please select a machine',
    selectMachineGroup: 'Please select a machine or a group of machines',
    noMachineOrGroupToDisplay: 'No machine or group to display'
  },
  checkcurrenttime: {
    syncTime: 'Please synchronize date and time'
  },
  checkserveraccess: {
    errorDatabaseAccess: 'Please check database access',
    errorServerAccess: 'Please check server access'
  },
  checkpath: {
    errorServerAccessOrPath: 'Please check server access (or path)'
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
  cyclesinperiod: {
    saveSerialNumber: 'Save serial number'
  },
  datetimerange: {
    selectAnd: ' and ',
    selectBetween: 'Select period between ',
    selectFrom: 'Select period from ',
    splitPeriod: 'Split a period',
    selectPeriod: 'Select a period'
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
  groupArray: {
    noMachine: 'No machine in selection'
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
    pastTooltip: 'past serial number',
    save: 'Save serial number',
    selectPeriod: 'Select a period'
  },
  lastworkinformation: {
    noOperation: ' ',
    pastdata: 'Past data',
    pastTooltip: ''
  },
  loginchangepassword: {
    user: 'User:',
    oldPassword: 'Old password:',
    newPassword: 'New password:',
  },
  loginchangepasswordbutton: {
    changePassword: 'Change password'
  },
  loginconnection: {
    user: 'User: :',
    connectWith: 'Connect with '
  },
  loginpassword: {
    user: 'User:',
    password: 'Password:',
    stayConnected: 'Stay connected',
  },
  loginpasswordbutton: {
    login: 'Login'
  },
  machinedisplay: {
    invalidMachineGroup: 'Invalid machine or group'
  },
  machinemodecolorlegend: {
    title: 'Machine mode'
  },
  machinemodelegends: {
    title: 'Machine mode'
  },
  machineselection: {
    clearButton: 'Clear',
    dynamicKey: 'DYNAMIC',
    errorMissingUnique: 'Please select one machine',
    errorMissing: 'Please select at least one machine',
    errorMissingMachineInGroup: 'Please select groups including at least one machine',
    groupKey: 'G',
    groupsButton: 'Groups',
    machineKey: 'M',
    machinesButton: 'Machines',
    noMachineSelection: 'No machine selection',
    noSelectedMachine: 'No selected machine',
    noSelection: 'No selection',
    searchDots: 'Search...',
    selectMachine: 'Select a machine',
    selectMachines: 'Select machines',
    selectedGroups: 'Selected groups',
    selectedMachines: 'Selected machines',
    switchToMachineSelection: 'Switch to machine selection'
  },
  milestonesadd: {
    shortDescriptionColon: 'Short description: ',
    whenColon: 'When: '
  },
  milestonesmanager: {
    add: 'Add milestone',
    day: 'Day',
    description: 'Description',
    errorRemove: 'Error in removing an item',
    machine: 'Machine'
  },
  periodtoolbar: {
    dialogTitle: 'Setting date/time range'
  },
  productionstatelegend: {
    title: 'Production state'
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
    title: 'Reason',
    textidleDefaultValue: 'Idle . short stop . Stop'
  },
  runninglegends: {
    title: 'Activity state',
    textidle: 'Idle . short stop . Stop',
    textrunning: 'Running'
  },
  savemachinestatetemplate: {
    changeMachineStateButton: 'Change machine state',
    changeMachineStateTitle: 'Change machine state',
    switch: 'Switch to '
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
  },
  saveworkinfo: {
    WorkInfoTitle: 'Work information'
  }
};
