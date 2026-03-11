// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

var ATSORA_LOCALE_COMPONENT_CATALOG = ATSORA_LOCALE_COMPONENT_CATALOG || { default: {}, fr: {}, de: {} };
var ATSORA_LOCALE_CATALOG = ATSORA_LOCALE_CATALOG || { default: {}, fr: {}, de: {} };

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
  homeBtn: 'Home',
  changebutton: 'Change',
  contactsupport: 'Please contact the support team',
  loadingDots: 'Loading...',
  missingconfiguration: 'Missing configuration',
  errorColon: 'Error: ',
  waitingPath: 'Waiting for path',
  error: {
    emptyPeriod: 'Empty period',
    invalidMachineId: 'Invalid machine-id',
    invalidRange: 'Invalid range',
    missingMotionContext: 'Missing motion context',
    missingParam: 'Missing param',
    missingRange: 'Missing range',
    missingWhen: 'Missing when',
    noMachineOrGroupToDisplay: 'No machine or group to display',
    selectMachine: 'Please select a machine',
    selectMachineGroup: 'Please select a machine or a group of machines',
  },
  checkcurrenttime: {
    syncTime: 'Please synchronize date and time'
  },
  checkserveraccess: {
    errorDatabaseAccess: 'Please check database access',
    errorServerAccess: 'Please check server access'
  },
  checkpath: {
    errorServerAccessOrPath: 'Please check server access (or path)',
    skipWebService: 'Skip web service path'
  },
  currentcncvalue: {
    noDataTooOld: 'N/A'
  },
  currenticoncncalarm: {
    iconTooltip: ' ' // Never used because specific alarm tooltip
  },
  currenticonnextstop: {
    iconTooltip: 'next stop'
  },
  currenticonunansweredreason: {
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
    missing: 'Missing',
    saveSerialNumber: 'Save serial number'
  },
  datetimerange: {
    emptyPeriodError: 'Empty period',
    emptyPeriodMessage: 'Warning! Empty period',
    endAfterMaxError: 'End date/time is after maximum allowed date/time',
    endBeforeMinError: 'End date/time is before minimum allowed date/time',
    endBeforeStartError: 'End date/time is before start date/time',
    endNotValidError: 'End date/time is not valid',
    invalidDatesError: 'Please, input valid dates',
    selectAnd: ' and ',
    selectBetween: 'Select period between ',
    selectFrom: 'Select period from ',
    splitPeriod: 'Split a period',
    selectPeriod: 'Select a period',
    startAfterMaxError: 'Start date/time is after maximum allowed date/time',
    startBeforeMinError: 'Start date/time is before minimum allowed date/time',
    startNotValidError: 'Start date/time is not valid'
  },
  detailedcncvaluesat: {
    true: 'true',
    false: 'false'
  },
  detailedreasonat: {
    seeAllReasons: "Click to see all reasons"
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
    errorMissingGroup: 'Please select at least one group',
    errorMissingMachineInGroup: 'Please select groups including at least one machine',
    groupKey: 'G',
    groupsButton: 'by group',
    machineKey: 'M',
    machinesButton: 'by machine',
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
  performancetarget: {
    target: 'Target'
  },
  periodmanager: {
    today: 'Today'
  },
  periodtoolbar: {
    dialogTitle: 'Setting date/time range',
    dayBtn: 'day',
    shiftBtn: 'shift',
    weekBtn: 'week',
    monthBtn: 'month',
    quarterBtn: 'quarter',
    semesterBtn: 'semester',
    yearBtn: 'year',
    emptyPeriodError: 'Empty period',
    endAfterMaxError: 'End date/time is after maximum allowed date/time',
    endBeforeMinError: 'End date/time is before minimum allowed date/time',
    endBeforeStartError: 'End date/time is before start date/time',
    endNotValidError: 'End date/time is not valid',
    startAfterMaxError: 'Start date/time is after maximum allowed date/time',
    startBeforeMinError: 'Start date/time is before minimum allowed date/time',
    startNotValidError: 'Start date/time is not valid'
  },
  production: {
    actual: 'Actual',
    target: 'Target',
    preposition: 'at'
  },
  productionshiftgoal: {
    productionshiftgoal: 'Production shift goal'
  },
  productionstatelegend: {
    title: 'Production state'
  },
  productiontrackergraph: {
    parts: 'parts'
  },
  productiontrackertable: {
    actual: 'actual',
    capacity: 'capacity',
    cumulative: 'cumulative',
    hourly: 'hourly',
    partsToMachine: 'parts to machine',
    reserveCapacity: 'reserve capacity',
    summary: 'summary',
    target: 'target',

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
    motion: 'Motion',
    allPeriodsClassified: 'All periods are classified',
    noPeriod: 'No selectable period on the specified range',
    sectionTimeRangeTitle: 'Select a time range',
    sectionPeriodTitle: 'Select one or more idle periods',
    sectionReasonTitle: 'Apply a reason on the selected period(s)',
    optionIdentified: 'Show identified idle periods',
    optionRunning: 'Show running periods',
  },
  unansweredreasonnumber: {
    dataToClassified: 'stop to be classified',
    dataToClassifiedPlural: 'stops to be classified',
    pastReasonData: 'Past reason details',
    pastTooltip: 'Look or change past reason details',
  },
  unansweredreasonslotlist: {
    idle: 'Idle',
    motion: 'Motion',
    noPeriod: 'No selectable period on the specified range',
    defineReason: 'Set reason',
    sectionTimeRangeTitle: 'Select a time range',
    sectionPeriodTitle: 'Select one or more idle periods',
    sectionReasonTitle: 'Apply a reason on the selected period(s)',
    optionIdentified: 'Show identified idle periods',
    optionRunning: 'Show running periods',
    advanced: 'Advanced',
    seeAllReasons: 'See all reasons',
  },
  classifiedreasonslotlist: {
    idle: 'Idle',
    motion: 'Motion',
    noPeriod: 'No selectable period on the specified range',
    allPeriodsClassified: 'All stop periods are classified',
    defineReason: 'Set reason',
    advanced: 'Advanced',
    seeUnansweredOnly: 'Unanswered only',
  },
  reportdatetime: {
    invalidGroupDisplayForm: 'Invalid groupDisplayForm',
    invalidGroupName: 'Invalid groupName',
    invalidDataType: 'Invalid dataType',
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
  savescrapreason: {
    submitbutton: 'Submit',
    detailsbutton: 'With details',
    machineColon: 'Machine: ',
    reasonColon: 'Reason: ',
    scrapreasons: 'scrap classification',
    reasonDetailsTitle: 'Reason details',
    errorNoDetails: 'Please add a comment',
    validparts: 'Valid parts'
  },
  scrapclassification: {
    partcount: 'Part count: ',
    scrapcount: 'Scrap count: ',
    unproducedcount: 'Unproduced count: ',
  },
  scrapstatus: {
    shiftscrap: 'Shift scrap',
    scrapDeclaration: 'Scrap Declaration'
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
  stopclassification: {
    title: 'Unplanned Stops',
    options: 'Advanced Options',
  },
  taskslist: {
    Late: 'Late',
    lateTextAfter: 'ago',
    lateTextBefore: '',
    Todo: 'To do',
    todoTextAfter: 'left',
    todoTextBefore: '',
    Upcoming: 'Upcoming',
    upcomingTextAfter: '',
    upcomingTextBefore: 'in '
  },
  task: {
    Late: 'Late',
    Todo: 'To do',
    Upcoming: 'Upcoming',
  },
  toollifemachine: {
    noOperation: 'No operation'
  },
  tr: {
    invalidKey: 'Invalid key',
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
  loadingDots: 'En chargement...',
  missingconfiguration: 'Configuration manquante',
  errorColon: 'Erreur : ',
  waitingPath: 'En attente du chemin',
  homeBtn: 'accueil',
  error: {
    emptyPeriod: 'Période vide',
    invalidMachineId: 'machine-id invalide',
    invalidRange: 'Plage invalide',
    missingMotionContext: 'Attribut motion-context manquant',
    missingParam: 'Attribut param manquant',
    missingRange: 'Période manquante',
    missingWhen: 'Attribut when manquant',
    selectMachine: 'Prière de sélectionner une machine',
    selectMachineGroup: 'Prière de sélectionner une machine ou un groupe de machines',
    noMachineOrGroupToDisplay: 'Pas de machine ou de groupe de machines à afficher'
  },
  checkcurrenttime: {
    syncTime: "Prière de synchroniser la date et l'heure"
  },
  checkpath: {
    errorServerAccessOrPath: "Prière de vérifier l'accès au serveur (ou le chemin)",
    skipWebService: 'Ignorer le chemin du service web'
  },
  checkserveraccess: {
    errorDatabaseAccess: "Prière de vérifier l'accès à la base de données",
    errorServerAccess: "Prière de vérifier l'accès au serveur"
  },
  currentcncvalue: {
    noDataTooOld: 'N/D'
  },
  currenticoncncalarm: {
    iconTooltip: ' ' // Never used because specific alarm tooltip
  },
  currenticonnextstop: {
    iconTooltip: 'prochain arrêt'
  },
  currenticonunansweredreason: {
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
    missing: 'Manquant',
    saveSerialNumber: 'Enregistrer le numéro de série'
  },
  datetimerange: {
    emptyPeriodError: 'Période vide',
    emptyPeriodMessage: "Attention! La période sélectionnée est vide",
    endAfterMaxError: 'La date de fin est postérieure à la date maximum autorisée',
    endBeforeMinError: 'La date de fin est antérieure à la date minimum autorisée',
    endBeforeStartError: 'La date de fin est antérieure à la date de début',
    endNotValidError: 'La date de fin n’est pas valide',
    invalidDatesError: 'Les dates ne sont pas valides',
    selectAnd: ' et ',
    selectBetween: 'Sélectionner la période entre ',
    selectFrom: 'Sélectionner la période après ',
    splitPeriod: 'Couper une période',
    selectPeriod: 'Sélectionner une période',
    startAfterMaxError: 'La date de début est postérieure à la date maximum autorisée',
    startBeforeMinError: 'La date de début est antérieure à la date minimum autorisée',
    startNotValidError: 'La date de début n’est pas valide'
  },
  detailedcncvaluesat: {
    true: 'vrai',
    false: 'faux'
  },
  detailedreasonat: {
    seeAllReasons: "Cliquer pour voir toutes les raisons"
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
    errorMissingGroup: 'Prière de sélectionner au-moins un groupe',
    errorMissingMachineInGroup: 'Prière de sélectionner des groupes qui incluent au-moins une machine',
    groupKey: 'G',
    groupsButton: 'par groupe',
    machineKey: 'M',
    machinesButton: 'par machine',
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
  performancetarget: {
    target: 'Objectif'
  },
  periodmanager: {
    today: 'Aujourd\'hui'
  },
  periodtoolbar: {
    dayBtn: 'journée',
    shiftBtn: 'équipe',
    weekBtn: 'semaine',
    monthBtn: 'mois',
    quarterBtn: 'trimestre',
    semesterBtn: 'semestre',
    yearBtn: 'année',
    dialogTitle: "Entrer l'intervalle de temps",
    emptyPeriodError: 'Période vide',
    endAfterMaxError: 'La date de fin est postérieure à la date maximum autorisée',
    endBeforeMinError: 'La date de fin est antérieure à la date minimum autorisée',
    endBeforeStartError: 'La date de fin est antérieure à la date de début',
    endNotValidError: 'La date de fin n’est pas valide',
    startAfterMaxError: 'La date de début est postérieure à la date maximum autorisée',
    startBeforeMinError: 'La date de début est antérieure à la date minimum autorisée',
    startNotValidError: 'La date de début n’est pas valide'
  },
  production: {
    actual: 'Production',
    target: 'Objectif',
    preposition: 'à'
  },
  productionshiftgoal: {
    productionshiftgoal: 'Objectif fin d\'équipe'
  },
  productionstatelegend: {
    title: 'État de production'
  },
  productiontrackergraph: {
    parts: 'pièces'
  },
  productiontrackertable: {
    actual: 'courant',
    capacity: 'capacité',
    cumulative: 'cumulatif',
    hourly: 'par heure',
    partsToMachine: 'pièces à usiner',
    reserveCapacity: 'capacité de réserve',
    summary: 'résumé',
    target: 'objectif',
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
    motion: 'En mouvement',
    allPeriodsClassified: 'Toutes les périodes sont classifiées',
    noPeriod: 'Pas de période possible sur la place spécifiée',
    sectionTimeRangeTitle: 'Selectionner une période de temps',
    sectionPeriodTitle: 'Selectionner une ou plusieurs périodes',
    sectionReasonTitle: 'Classifier la/les période(s) sélectionnée(s)',
    optionIdentified: 'Montrer les périodes classifiées',
    optionRunning: 'Montrer les périodes actives',
  },
  unansweredreasonnumber: {
    dataToClassified: 'arrêt à classifier',
    dataToClassifiedPlural: 'arrêts à classifier',
    pastReasonData: "Raisons d'arrêt passées",
    pastTooltip: "Consulter ou changer une raison passée",
  },
  unansweredreasonslotlist: {
    idle: 'Arrêtée',
    motion: 'En mouvement',
    noPeriod: 'Pas de période possible sur la place spécifiée',
    defineReason: 'Définir la raison',
    sectionTimeRangeTitle: 'Selectionner une période de temps',
    sectionPeriodTitle: 'Selectionner une ou plusieurs périodes',
    sectionReasonTitle: 'Classifier la/les période(s) sélectionnée(s)',
    optionIdentified: 'Montrer les périodes classifiées',
    optionRunning: 'Montrer les périodes actives',
    advanced: 'Gestion avancé',
    seeAllReasons: 'Voir toutes les raisons',
    seeUnansweredOnly: 'Non classifiées uniquement',
  },
  classifiedreasonslotlist: {
    idle: 'Arrêtée',
    motion: 'En mouvement',
    noPeriod: 'Pas de période possible sur la place spécifiée',
    allPeriodsClassified: 'Toutes les périodes sont classifiées',
    defineReason: 'Définir la raison',
    advanced: 'Gestion avancé',
    seeUnansweredOnly: 'Non classifiées uniquement',
    seeAllReasons: 'Voir toutes les raisons',
  },
  reportdatetime: {
    invalidGroupDisplayForm: 'Attribut groupDisplayForm invalide',
    invalidGroupName: 'Nom de groupe invalide',
    invalidDataType: 'Type de donnée invalide',
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
  savescrapreason: {
    submitbutton: 'Valider',
    detailsbutton: 'Avec commentaires',
    machineColon: 'Machine: ',
    reasonColon: 'Raison: ',
    scrapreasons: 'Classification des rebuts',
    reasonDetailsTitle: 'Détails de la raison',
    errorNoDetails: 'Veuillez ajouter un commentaire',
    validparts: 'Pièces valides'
  },
  scrapclassification: {
    partcount: 'Nombre de pièces : ',
    scrapcount: 'Nombre de rebuts : ',
    unproducedcount: 'Pièces non-produites : ',
  },
  scrapstatus: {
    shiftscrap: 'Rebuts d\'équipe',
    scrapDeclaration: 'Déclarer rebuts'
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
  stopclassification: {
    title: 'Arrêts Non-Planifiés',
    options: 'Options Avancées',
  },
  taskslist: {
    Late: 'En retard',
    lateTextAfter: '',
    lateTextBefore: 'il y a',
    Todo: 'A faire',
    todoTextAfter: '',
    todoTextBefore: 'encore',
    Upcoming: 'À venir',
    upcomingTextAfter: '',
    upcomingTextBefore: 'dans'
  },
  task: {
    Late: 'En retard',
    Todo: 'A faire',
    Upcoming: 'À venir',
  },
  toollifemachine: {
    noOperation: "Pas d'opération"
  },
  tr: {
    invalidKey: "Clé invalide",
  },
  saveworkinfo: {
    WorkInfoTitle: 'Ordre de fabrication / Opération'
  }
};

// - de translation

ATSORA_LOCALE_CATALOG.de.general = {
  title: 'Atsora Tracking',
};

/*
 * Components translations
 */
ATSORA_LOCALE_COMPONENT_CATALOG.de = {
  homeBtn: 'Startseite',
  changebutton: 'Ändern',
  contactsupport: 'Bitte wenden Sie sich an den Support',
  loadingDots: 'Laden...',
  missingconfiguration: 'Konfiguration fehlt',
  errorColon: 'Fehler: ',
  waitingPath: 'Warte auf Pfad',
  error: {
    emptyPeriod: 'Leerer Zeitraum',
    invalidMachineId: 'Ungültige Maschinen-ID',
    invalidRange: 'Ungültiger Bereich',
    missingMotionContext: 'Attribut motion-context fehlt',
    missingParam: 'Parameter fehlt',
    missingRange: 'Zeitraum fehlt',
    missingWhen: 'Attribut when fehlt',
    noMachineOrGroupToDisplay: 'Keine Maschine oder Gruppe anzuzeigen',
    selectMachine: 'Bitte eine Maschine auswählen',
    selectMachineGroup: 'Bitte eine Maschine oder eine Maschinengruppe auswählen',
  },
  checkcurrenttime: {
    syncTime: 'Bitte Datum und Uhrzeit synchronisieren'
  },
  checkserveraccess: {
    errorDatabaseAccess: 'Bitte Datenbankzugriff prüfen',
    errorServerAccess: 'Bitte Serverzugriff prüfen'
  },
  checkpath: {
    errorServerAccessOrPath: 'Bitte Serverzugriff (oder Pfad) prüfen',
    skipWebService: 'Web-Service-Pfad überspringen'
  },
  currentcncvalue: {
    noDataTooOld: 'N/V'
  },
  currenticoncncalarm: {
    iconTooltip: ' ' // Never used because specific alarm tooltip
  },
  currenticonnextstop: {
    iconTooltip: 'nächster Stopp'
  },
  currenticonunansweredreason: {
    iconTooltip: 'Maschinenstatus nicht klassifiziert'
  },
  currenticonworkinformation: {
    iconTooltip: 'Fertigungsauftrag nicht definiert'
  },
  currenttool: {
    noDataTooOld: 'N/V'
  },
  currentsequence: {
    noDataTooOld: '-', // N/A
  },
  cyclesinperiod: {
    missing: 'Fehlend',
    saveSerialNumber: 'Seriennummer speichern'
  },
  datetimerange: {
    emptyPeriodError: 'Leerer Zeitraum',
    emptyPeriodMessage: 'Warnung! Leerer Zeitraum',
    endAfterMaxError: 'Enddatum/-uhrzeit liegt nach dem maximal zulässigen Datum/Uhrzeit',
    endBeforeMinError: 'Enddatum/-uhrzeit liegt vor dem minimal zulässigen Datum/Uhrzeit',
    endBeforeStartError: 'Enddatum/-uhrzeit liegt vor dem Startdatum/-uhrzeit',
    endNotValidError: 'Enddatum/-uhrzeit ist ungültig',
    invalidDatesError: 'Bitte gültige Datumsangaben eingeben',
    selectAnd: ' und ',
    selectBetween: 'Zeitraum auswählen zwischen ',
    selectFrom: 'Zeitraum auswählen ab ',
    splitPeriod: 'Zeitraum aufteilen',
    selectPeriod: 'Zeitraum auswählen',
    startAfterMaxError: 'Startdatum/-uhrzeit liegt nach dem maximal zulässigen Datum/Uhrzeit',
    startBeforeMinError: 'Startdatum/-uhrzeit liegt vor dem minimal zulässigen Datum/Uhrzeit',
    startNotValidError: 'Startdatum/-uhrzeit ist ungültig'
  },
  detailedcncvaluesat: {
    true: 'wahr',
    false: 'falsch'
  },
  detailedreasonat: {
    seeAllReasons: 'Klicken, um alle Gründe anzuzeigen'
  },
  detailsViewSubTitles: {
    reason: 'Stillstandsgrund',
    machinemode: 'Maschinenmodus',
    machinestatetemplate: 'Planungsstatus',
    observationstate: 'Maschinenzustand',
    operationcycle: 'Zyklus',
    productionstate: 'Produktionsstatus',
    shift: 'Schicht',
    cncvalue: 'CNC-Wert',
    cncalarms: 'CNC-Alarme',
    workinfo: 'Fertigungsauftrag',
    sequence: 'Bearbeitungssequenz',
    isofile: 'NC-Programm',
    partgoal: 'Anz. Teile / Ziel'
  },
  groupArray: {
    noMachine: 'Keine Maschine in der Auswahl'
  },
  lastmachinestatetemplate: {
    scheduledStatus: 'Planungsstatus: '
  },
  lastserialnumber: {
    currentserialnumber: 'Seriennummer: ',
    pastserialnumber: 'Vergangene Daten',
    currentTooltip: 'Aktuelle Seriennummer ändern',
    pastTooltip: 'Vergangene Seriennummern',
    save: 'Seriennummer speichern',
    selectPeriod: 'Zeitraum auswählen'
  },
  lastworkinformation: {
    noOperation: ' ',
    pastdata: 'Vergangene Daten',
    pastTooltip: ''
  },
  loginchangepassword: {
    user: 'Benutzer:',
    oldPassword: 'Altes Passwort:',
    newPassword: 'Neues Passwort:',
  },
  loginchangepasswordbutton: {
    changePassword: 'Passwort ändern'
  },
  loginconnection: {
    user: 'Benutzer:',
    connectWith: 'Verbinden mit '
  },
  loginpassword: {
    deniedError: 'Ungültiger Benutzername oder Passwort',
    noRoleError: 'Keine Rolle für diesen Benutzer definiert. Bitte Konfiguration anpassen',
    user: 'Benutzer:',
    password: 'Passwort:',
    stayConnected: 'Angemeldet bleiben',
  },
  loginpasswordbutton: {
    login: 'Anmelden'
  },
  machinedisplay: {
    invalidMachineGroup: 'Ungültige Maschine oder Gruppe'
  },
  machinemodecolorlegend: {
    title: 'Maschinenmodus'
  },
  machinemodelegends: {
    title: 'Maschinenmodus'
  },
  machineselection: {
    clearButton: 'Zurücksetzen',
    dynamicKey: 'DYNAMISCH',
    errorMissingUnique: 'Bitte eine Maschine auswählen',
    errorMissing: 'Bitte mindestens eine Maschine auswählen',
    errorMissingGroup: 'Bitte mindestens eine Gruppe auswählen',
    errorMissingMachineInGroup: 'Bitte Gruppen auswählen, die mindestens eine Maschine enthalten',
    groupKey: 'G',
    groupsButton: 'nach Gruppe',
    machineKey: 'M',
    machinesButton: 'nach Maschine',
    noMachineSelection: 'Keine Maschinenauswahl',
    noSelectedMachine: 'Keine Maschine ausgewählt',
    noSelection: 'Keine Auswahl',
    searchDots: 'Suchen...',
    selectMachine: 'Maschine auswählen',
    selectMachines: 'Maschinen auswählen',
    selectedGroups: 'Ausgewählte Gruppen',
    selectedMachines: 'Ausgewählte Maschinen',
    switchToMachineSelection: 'Zur Maschinenauswahl wechseln'
  },
  milestonesadd: {
    shortDescriptionColon: 'Kurzbeschreibung: ',
    whenColon: 'Zeitpunkt: '
  },
  milestonesmanager: {
    add: 'Meilenstein hinzufügen',
    day: 'Tag',
    description: 'Beschreibung',
    errorRemove: 'Fehler beim Entfernen eines Eintrags',
    machine: 'Maschine'
  },
  performancetarget: {
    target: 'Zielwert'
  },
  periodmanager: {
    today: 'Heute'
  },
  periodtoolbar: {
    dialogTitle: 'Zeitraum einstellen',
    dayBtn: 'Tag',
    shiftBtn: 'Schicht',
    weekBtn: 'Woche',
    monthBtn: 'Monat',
    quarterBtn: 'Quartal',
    semesterBtn: 'Halbjahr',
    yearBtn: 'Jahr',
    emptyPeriodError: 'Leerer Zeitraum',
    endAfterMaxError: 'Enddatum/-uhrzeit liegt nach dem maximal zulässigen Datum/Uhrzeit',
    endBeforeMinError: 'Enddatum/-uhrzeit liegt vor dem minimal zulässigen Datum/Uhrzeit',
    endBeforeStartError: 'Enddatum/-uhrzeit liegt vor dem Startdatum/-uhrzeit',
    endNotValidError: 'Enddatum/-uhrzeit ist ungültig',
    startAfterMaxError: 'Startdatum/-uhrzeit liegt nach dem maximal zulässigen Datum/Uhrzeit',
    startBeforeMinError: 'Startdatum/-uhrzeit liegt vor dem minimal zulässigen Datum/Uhrzeit',
    startNotValidError: 'Startdatum/-uhrzeit ist ungültig'
  },
  production: {
    actual: 'Ist-Produktion',
    target: 'Soll-Produktion',
    preposition: 'um'
  },
  productionshiftgoal: {
    productionshiftgoal: 'Schichtziel'
  },
  productionstatelegend: {
    title: 'Produktionsstatus'
  },
  productiontrackergraph: {
    parts: 'Teile'
  },
  productiontrackertable: {
    actual: 'Ist',
    capacity: 'Kapazität',
    cumulative: 'kumulativ',
    hourly: 'stündlich',
    partsToMachine: 'zu bearbeitende Teile',
    reserveCapacity: 'Reservekapazität',
    summary: 'Zusammenfassung',
    target: 'Soll',
  },
  productionmachiningstatus: {
    notavailable: 'Nicht verfügbar'
  },
  progressbar: {
    processingTitle: 'Verarbeitung läuft...'
  },
  reasongroups: {
    title: 'Stillstandsgrund',
    textidleDefaultValue: 'Stillstand . Kurzstillstand . Stopp'
  },
  reasonslotlist: {
    idle: 'Stillstand',
    motion: 'In Betrieb',
    allPeriodsClassified: 'Alle Zeiträume sind klassifiziert',
    noPeriod: 'Kein auswählbarer Zeitraum im angegebenen Bereich',
    sectionTimeRangeTitle: 'Zeitraum auswählen',
    sectionPeriodTitle: 'Einen oder mehrere Stillstandszeiträume auswählen',
    sectionReasonTitle: 'Einen Grund auf den/die ausgewählten Zeitraum/Zeiträume anwenden',
    optionIdentified: 'Klassifizierte Stillstandszeiträume anzeigen',
    optionRunning: 'Aktive Zeiträume anzeigen',
  },
  unansweredreasonnumber: {
    dataToClassified: 'Stillstand zu klassifizieren',
    dataToClassifiedPlural: 'Stillstände zu klassifizieren',
    pastReasonData: 'Vergangene Stillstandsgründe',
    pastTooltip: 'Vergangene Stillstandsgründe einsehen oder ändern',
  },
  unansweredreasonslotlist: {
    idle: 'Stillstand',
    motion: 'In Betrieb',
    noPeriod: 'Kein auswählbarer Zeitraum im angegebenen Bereich',
    defineReason: 'Grund festlegen',
    sectionTimeRangeTitle: 'Zeitraum auswählen',
    sectionPeriodTitle: 'Einen oder mehrere Stillstandszeiträume auswählen',
    sectionReasonTitle: 'Einen Grund auf den/die ausgewählten Zeitraum/Zeiträume anwenden',
    optionIdentified: 'Klassifizierte Stillstandszeiträume anzeigen',
    optionRunning: 'Aktive Zeiträume anzeigen',
    advanced: 'Erweitert',
    seeAllReasons: 'Alle Gründe anzeigen',
  },
  classifiedreasonslotlist: {
    idle: 'Stillstand',
    motion: 'In Betrieb',
    noPeriod: 'Kein auswählbarer Zeitraum im angegebenen Bereich',
    allPeriodsClassified: 'Alle Stillstandszeiträume sind klassifiziert',
    defineReason: 'Grund festlegen',
    advanced: 'Erweitert',
    seeUnansweredOnly: 'Nur nicht klassifizierte',
    seeAllReasons: 'Alle Gründe anzeigen',
  },
  reportdatetime: {
    invalidGroupDisplayForm: 'Ungültiges Attribut groupDisplayForm',
    invalidGroupName: 'Ungültiger Gruppenname',
    invalidDataType: 'Ungültiger Datentyp',
  },
  runninglegends: {
    title: 'Aktivitätsstatus',
    textidle: 'Stillstand . Kurzstillstand . Stopp',
    textrunning: 'In Betrieb'
  },
  savemachinestatetemplate: {
    changeMachineStateButton: 'Geplanten Zustand ändern',
    changeMachineStateTitle: 'Geplanten Zustand ändern',
    switch: 'Wechseln zu '
  },
  savereason: {
    applicableReasons: 'Anwendbare Gründe',
    apply: 'Anwenden',
    applyWithComment: 'Anwenden mit Kommentar',
    comment: 'Kommentar',
    currentReasonColon: 'Aktueller Grund: ',
    errorNoDetails: 'Bitte einen Kommentar hinzufügen',
    machineColon: 'Maschine: ',
    modesColon: 'Modi: ',
    multiple: 'mehrere',
    noPeriod: 'Kein Zeitraum',
    noSelectedPeriod: 'Kein Zeitraum ausgewählt',
    nSelectedPeriods: 'ausgewählte Zeiträume',
    periodColon: 'Zeitraum: ',
    periods: 'Zeiträume',
    reasonColon: 'Grund: ',
    reasonDetailsTitle: 'Grunddetails',
    resetReasonButton: 'Zurücksetzen',
    saveReasonTitle: 'Grund festlegen',
    selectedPeriodsColon: 'Ausgewählter/Ausgewählte Zeitraum/Zeiträume: ',
    split: 'Aufteilen',
    withComment: 'mit Kommentar'
  },
  savescrapreason: {
    submitbutton: 'Bestätigen',
    detailsbutton: 'Mit Details',
    machineColon: 'Maschine: ',
    reasonColon: 'Grund: ',
    scrapreasons: 'Ausschussklassifizierung',
    reasonDetailsTitle: 'Grunddetails',
    errorNoDetails: 'Bitte einen Kommentar hinzufügen',
    validparts: 'Gutteile'
  },
  scrapclassification: {
    partcount: 'Teileanzahl: ',
    scrapcount: 'Ausschussanzahl: ',
    unproducedcount: 'Nicht produzierte Teile: ',
  },
  scrapstatus: {
    shiftscrap: 'Schichtausschuss',
    scrapDeclaration: 'Ausschuss melden'
  },
  sequencebar: {
    sequence: 'Sequenz '
  },
  setupmachine: {
    noOperation: 'Kein Vorgang',
    setupsince: 'Rüsten seit: ',
    switchTo: 'Wechseln zu ',
    switchToProduction: 'In Produktion wechseln'
  },
  stopclassification: {
    title: 'Ungeplante Stillstände',
    options: 'Erweiterte Optionen',
  },
  taskslist: {
    Late: 'Überfällig',
    lateTextAfter: 'her',
    lateTextBefore: 'vor',
    Todo: 'Ausstehend',
    todoTextAfter: 'verbleibend',
    todoTextBefore: 'noch',
    Upcoming: 'Bevorstehend',
    upcomingTextAfter: '',
    upcomingTextBefore: 'in '
  },
  task: {
    Late: 'Überfällig',
    Todo: 'Ausstehend',
    Upcoming: 'Bevorstehend',
  },
  toollifemachine: {
    noOperation: 'Kein Vorgang'
  },
  tr: {
    invalidKey: 'Ungültiger Schlüssel',
  },
  saveworkinfo: {
    WorkInfoTitle: 'Fertigungsauftrag / Arbeitsgang'
  }
};

// Set the 'default' locale by default
ATSORA_CATALOG = ATSORA_LOCALE_CATALOG.default;
ATSORA_COMPONENT_CATALOG = ATSORA_LOCALE_COMPONENT_CATALOG.default;
