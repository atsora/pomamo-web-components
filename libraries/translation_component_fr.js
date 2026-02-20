// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

moment.locale('fr');

var ATSORA_LOCALE_COMPONENT_CATALOG = ATSORA_LOCALE_COMPONENT_CATALOG || { default: {}, fr: {} };
var ATSORA_LOCALE_CATALOG = ATSORA_LOCALE_CATALOG || { default: {}, fr: {} };

var ATSORA_COMPONENT_CATALOG = ATSORA_COMPONENT_CATALOG || {};
var ATSORA_CATALOG = ATSORA_CATALOG || {};

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
    missing: 'Missing',
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
    partgoal: 'Objectif de production de pieces'
  },
  groupArray: {
    noMachine: 'Aucune machine dans la sélection'
  },
  lastmachinestatetemplate: {
    scheduledStatus: 'État planifié : '
  },
  lastmachinestatus: {
    currentReasonColon: "Raison d'arrêt courante : ",
    pastReasonData: "Raisons d'arrêt passées",
    dataToClassified: 'arrêt à classifier',
    dataToClassifiedPlural: 'arrêts à classifier',
    currentTooltip: "Changer la raison d'arrêt courante",
    loading: 'En chargement...',
    pastTooltip: "Consulter ou changer une raison passée",
    tooOld: 'Donnée trop vieille'
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
    deniedError: 'Utilisateur ou mot de passe invalide',
    noRoleError: 'Aucune rôle de défini pour ce login. Prière de changer la configuration',
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
    loading: 'En chargement...',
    motion: 'En mouvement',
    noPeriod: 'Pas de période possible sur la place spécifiée',
    sectionTimeRangeTitle: 'Selectionner une période de temps',
    sectionPeriodTitle: 'Selectionner une ou plusieurs périodes',
    sectionReasonTitle: 'Classifier la/les période(s) sélectionnée(s)',
    optionIdentified: 'Montrer les périodes classifiées',
    optionRunning: 'Montrer les périodes actives',
  },
    unansweredreasonslotlist: {
    idle: 'Arrêtée',
    loading: 'En chargement...',
    motion: 'En mouvement',
    noPeriod: 'Pas de période possible sur la place spécifiée',
    defineReason: 'Définir la raison',
    sectionTimeRangeTitle: 'Selectionner une période de temps',
    sectionPeriodTitle: 'Selectionner une ou plusieurs périodes',
    sectionReasonTitle: 'Classifier la/les période(s) sélectionnée(s)',
    optionIdentified: 'Montrer les périodes classifiées',
    optionRunning: 'Montrer les périodes actives',
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
    scrapDeclaration: 'Déclarer Rebuts'
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
    invalidKey: "Clé invalide"
  },
  saveworkinfo: {
    WorkInfoTitle: 'Ordre de fabrication / Opération'
  }
};

// Force the 'fr' locale
ATSORA_CATALOG = ATSORA_LOCALE_CATALOG.fr;
ATSORA_COMPONENT_CATALOG = ATSORA_LOCALE_COMPONENT_CATALOG.fr;
