// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

var ATSORA_LOCALE_COMPONENT_CATALOG = ATSORA_LOCALE_COMPONENT_CATALOG || { default: {}, fr: {} };
var ATSORA_LOCALE_CATALOG = ATSORA_LOCALE_CATALOG || { default: {}, fr: {} };

var ATSORA_COMPONENT_CATALOG = ATSORA_COMPONENT_CATALOG || {};
var ATSORA_CATALOG = ATSORA_CATALOG || {};

// - Default translation

// App translations - should be completed in app code

ATSORA_LOCALE_CATALOG.default.general = {
  title: 'Atsora Tracking',
};

/* 
 * Components translations
 */
ATSORA_LOCALE_COMPONENT_CATALOG.default = {
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
    emptyPeriodError: 'Empty period',
    emptyPeriodMessage: 'Warning! Empty period',
    endAfterMaxError: 'End date/time is after maximum allowed date/time',
    endBeforeMinError: 'End date/time is before minimum allowed date/time',
    endBeforeStartError: 'End date/time is before start date/time',
    endNotValidError: 'End date/time is not valid',
    selectAnd: ' and ',
    selectBetween: 'Select period between ',
    selectFrom: 'Select period from ',
    splitPeriod: 'Split a period',
    selectPeriod: 'Select a period',
    startAfterMaxError: 'Start date/time is after maximum allowed date/time',
    startBeforeMinError: 'Start date/time is before minimum allowed date/time',
    startNotValidError: 'Start date/time is not valid'
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
    deniedError: 'Invalid user name or password',
    noRoleError: 'No role defined for this login. Please, change configuration',
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
    dialogTitle: 'Setting date/time range',
    emptyPeriodError: 'Empty period',
    endAfterMaxError: 'End date/time is after maximum allowed date/time',
    endBeforeMinError: 'End date/time is before minimum allowed date/time',
    endBeforeStartError: 'End date/time is before start date/time',
    endNotValidError: 'End date/time is not valid',
    startAfterMaxError: 'Start date/time is after maximum allowed date/time',
    startBeforeMinError: 'Start date/time is before minimum allowed date/time',
    startNotValidError: 'Start date/time is not valid'
  },
  productionstatelegend: {
    title: 'Production state'
  },
  productiontrackergraph: {
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
  reasonslotlist: {
    idle: 'Idle',
    loading: 'Loading...',
    motion: 'Motion',
    noPeriod: 'No selectable period on the specified range',
    sectionTimeRangeTitle: 'Select a time range',
    sectionPeriodTitle: 'Select one or more idle periods',
    sectionReasonTitle: 'Apply a reason on the selected period(s)',
    optionIdentified: 'Show identified idle periods',
    optionRunning: 'Show running periods',
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
    applicableReasons: 'Applicable reasons',
    apply: 'Apply',
    applyWithComment: 'Apply with comment',
    comment: 'comment',
    currentReasonColon: 'Current reason:  ',
    errorNoDetails: 'Please add a comment',
    loading: 'Loading...',
    machineColon: 'Machine: ',
    modesColon: 'Modes: ',
    multiple: 'multiple',
    noPeriod: 'No period',
    noSelectedPeriod: 'No period is selected',
    nSelectedPeriods: 'selected periods',
    periodColon: 'Period: ',
    periods: 'periods',
    reasonColon: 'Reason: ',
    reasonDetailsTitle: 'Reason details',
    resetReasonButton: 'Back to default',
    saveReasonTitle: 'Set reason',
    selectedPeriodsColon: 'Selected period(s): ',
    split: 'Split',
    withComment: 'with comment'
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

// - fr translation

ATSORA_LOCALE_CATALOG.fr.general = {
  title: 'Atsora Tracking',
};

/* 
 * Components translations
 */
ATSORA_LOCALE_COMPONENT_CATALOG.fr = {
  changebutton: 'Changer',
  contactsupport: "Prière de consulter l'équipe support",
  missingconfiguration: 'Configuration manquante',
  errorColon: 'Erreur : ',
  error: {
    selectMachine: 'Prière de sélectionner une machine',
    selectMachineGroup: 'Prière de sélectionner une machine ou un groupe de machines',
    noMachineOrGroupToDisplay: 'Pas de machine ou de groupe de machines à afficher'
  },
  checkcurrenttime: {
    syncTime: "Prière de synchroniser la date et l'heure"
  },
  checkpath: {
    errorServerAccessOrPath: "Prière de vérifier l'accès au serveur (ou le chemin)"
  },
  checkserveraccess: {
    errorDatabaseAccess: "Prière de vérifier l'accès à la base de données",
    errorServerAccess: "Prière de vérifier l'accès au serveur"
  },
  currentcncvalue: {
    noDataTooOld: 'N/D'
  },
  currenticoncncalarm: {
    iconTooltip: '' // Never used because specific alarm tooltip
  },
  currenticonnextstop: {
    iconTooltip: 'prochain arrêt'
  },
  currenticonunanserweredreason: {
    iconTooltip: 'état machine non renseigné'
  },
  currenticonworkinformation: {
    iconTooltip: 'ordre de fabrication non défini'
  },
  currenttool: {
    noDataTooOld: 'N/D'
  },
  currentsequence: {
    noDataTooOld: '-', // N/A'
  },
  cyclesinperiod: {
    saveSerialNumber: 'Enregistrer le numéro de série'
  },
  datetimerange: {
    selectAnd: ' et ',
    selectBetween: 'Sélectionner la période entre ',
    selectFrom: 'Sélectionner la période après ',
    splitPeriod: 'Couper une période',
    selectPeriod: 'Sélectionner une période'
  },
  detailsViewSubTitles: {
    reason: "raison d'arrêt",
    machinemode: "mode d'exécution",
    machinestatetemplate: "calendrier de planification",
    observationstate: 'état planifié',
    operationcycle: 'cycle',
    productionstate: 'état de production',
    shift: 'équipe',
    cncvalue: 'donnée cnc',
    cncalarms: 'alarmes cnc',
    workinfo: 'info de fabrication',
    sequence: "séquence d'usinage",
    isofile: "programme d'usinage",
    partgoal: 'nb pièces / objectif'
  },
  groupArray: {
    noMachine: 'Aucune machine dans la sélection'
  },
  lastmachinestatetemplate: {
    scheduledStatus: 'État planifié : '
  },
  lastmachinestatus: {
    reason: "Raison d'arrêt courante : ",
    pastReasonData: "Raisons passées",
    currentTooltip: "Changer la raison d'arrêt courante",
    pastTooltip: "Consulter ou changer une raison passée"
  },
  lastserialnumber: {
    currentserialnumber: 'Numéro de série : ',
    pastserialnumber: 'Données passées',
    currentTooltip: "Changer le numéro de série courant",
    pastTooltip: 'numéros de série passés',
    save: 'Sauver le numéro de série',
    selectPeriod: 'Sélectionner une période'
  },
  lastworkinformation: {
    noOperation: ' ',
    pastdata: 'Données passées',
    pastTooltip: ''
  },
  loginchangepassword: {
    user: 'Utilisateur :',
    oldPassword: 'Ancien mot de passe :',
    newPassword: 'Nouveau mot de passe :',
  },
  loginchangepasswordbutton: {
    changePassword: 'Changer le mot de passe'
  },
  loginconnection: {
    user: 'Utilisateur :',
    connectWith: 'Connecter avec '
  },
  loginpassword: {
    user: 'Utilisateur :',
    password: 'Mot de passe :',
    stayConnected: 'Rester connecté',
  },
  loginpasswordbutton: {
    login: 'Se connecter'
  },
  machinedisplay: {
    invalidMachineGroup: 'Machine ou groupe invalide'
  },
  machinemodecolorlegend: {
    title: 'Mode machine'
  },
  machinemodelegends: {
    title: 'Mode machine'
  },
  machineselection: {
    clearButton: 'Réinitialiser',
    dynamicKey: 'DYNAMIQUE',
    errorMissingUnique: 'Prière de sélectionner une machine',
    errorMissing: 'Prière de sélectionner au-moins une machine',
    errorMissingMachineInGroup: 'Prière de sélectionner des groupes qui incluent au-moins une machine',
    groupKey: 'G',
    groupsButton: 'Groupes',
    machineKey: 'M',
    machinesButton: 'Machines',
    noMachineSelection: 'Pas de sélection de machine',
    noSelectedMachine: 'Pas de machine sélectionnée',
    noSelection: 'Pas de sélection',
    searchDots: 'Rechercher...',
    selectMachine: 'Sélectionner une machine',
    selectMachines: 'Sélectionner des machines',
    selectedGroups: 'Groupes sélectionnés',
    selectedMachines: 'Machines sélectionnées',
    switchToMachineSelection: 'Passer à la sélection de machines'
  },
  milestonesadd: {
    shortDescriptionColon: 'Courte description : ',
    whenColon: 'Quand : '
  },
  milestonesmanager: {
    add: 'Ajouter un jalon',
    day: 'Jour',
    description: 'Description',
    errorRemove: 'Erreur en enlevant un jalon',
    machine: 'Machine'
  },
  periodtoolbar: {
    dialogTitle: "Entrer l'intervalle de temps"
  },
  productionstatelegend: {
    title: 'État de production'
  },
  productiontrackergraph: {
  },
  productiontrackertable: {
    hourly: 'par heure',
    summary: 'résumé',
    actual: 'courant',
    target: 'objectif'
  },
  productionmachiningstatus: {
    notavailable: 'Non disponible'
  },
  progressbar: {
    processingTitle: 'En cours de traitement....'
  },
  reasongroups: {
    title: "Raison d'arrêt",
    textidleDefaultValue: 'Arrêtée'
  },
  reasonslotlist: {
    idle: 'Arrêtée',
    loading: 'En chargement...',
    motion: 'En mouvement',
    noPeriod: 'Pas de période possible sur la place spécifiée',
    sectionTimeRangeTitle: 'Selectionner une période de temps',
    sectionPeriodTitle: 'Selectionner une ou plusieurs périodes',
    sectionReasonTitle: 'Classifier la/les période(s) sélectionnée(s)',
    optionIdentified: 'Montrer les périodes classifiées',
    optionRunning: 'Montrer les périodes actives',
  },
  runninglegends: {
    title: "État d'activité",
    textidle: 'Arrêtée',
    textrunning: 'Active'
  },
  savemachinestatetemplate: {
    changeMachineStateButton: "Changer les états planifiés",
    changeMachineStateTitle: "Changer les états planifiés",
    switch: "Passer à un autre état planifié"
  },
  savereason: {
    applicableReasons: 'Raisons possibles',
    apply: 'Sélectionner',
    applyWithComment: 'Sélectionner avec commentaire',
    comment: 'commentaire',
    currentReasonColon: 'Raison courante : ',
    errorNoDetails: "Prière d'ajouter un commentaire",
    loading: 'en chargement...',
    machineColon: 'Machine : ',
    modesColon: 'Modes : ',
    multiple: 'multiple',
    noPeriod: 'Pas de période',
    nSelectedPeriods: 'périodes sélectionnées',
    noSelectedPeriod: 'Pas de périodes sélectionnées',
    periodColon: 'Période : ',
    periods: 'périodes',
    reasonColon: 'Raison : ',
    reasonDetailsTitle: 'Détails des raisons',
    resetReasonButton: 'Réinitialiser',
    saveReasonTitle: 'Renseigner une raison',
    selectedPeriodsColon: 'Période(s) sélectionnée(s) : ',
    split: 'Couper',
    withComment: 'avec commentaire'
  },
  sequencebar: {
    sequence: 'Séquence '
  },
  setupmachine: {
    noOperation: "Pas d'opération",
    setupsince: "En réglage depuis :",
    switchTo: 'Switch to ',
    switchToProduction: 'Passer en production'
  },
  toollifemachine: {
    noOperation: "Pas d'opération"
  },
  saveworkinfo: {
    WorkInfoTitle: 'Ordre de fabrication / Opération'
  }
};

// Set the 'default' locale by default
ATSORA_CATALOG = ATSORA_LOCALE_CATALOG.default;
ATSORA_COMPONENT_CATALOG = ATSORA_COMPONENT_CATALOG.default;
