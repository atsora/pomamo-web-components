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
    emptyPeriodError: 'Période vide',
    emptyPeriodMessage: "Attention! La période sélectionnée est vide",
    endAfterMaxError: 'La date de fin est postérieure à la date maximum autorisée',
    endBeforeMinError: 'La date de fin est antérieure à la date minimum autorisée',
    endBeforeStartError: 'La date de fin est antérieure à la date de début',
    endNotValidError: 'La date de fin n’est pas valide',
    selectAnd: ' et ',
    selectBetween: 'Sélectionner la période entre ',
    selectFrom: 'Sélectionner la période après ',
    splitPeriod: 'Couper une période',
    selectPeriod: 'Sélectionner une période',
    startAfterMaxError: 'La date de début est postérieure à la date maximum autorisée',
    startBeforeMinError: 'La date de début est antérieure à la date minimum autorisée',
    startNotValidError: 'La date de début n’est pas valide'
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
    clearButton: 'Effacer',
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
    searchDots: 'Chercher...',
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
  productionstatelegend: {
    title: 'État de production'
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
    comment: 'commentaire',
    comment2dots: 'Commentaire :',
    errorNoDetails: "Prière d'ajouter un commentaire",
    noPeriod: 'Pas de période',
    periods: 'périodes',
    reason2dots: 'Raison :',
    reasonDetailsTitle: 'Détails des raisons',
    saveReasonTitle: 'Renseigner une raison',
    split: 'Couper'
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

// Force the 'fr' locale
ATSORA_CATALOG = ATSORA_LOCALE_CATALOG.fr;
ATSORA_COMPONENT_CATALOG = ATSORA_LOCALE_COMPONENT_CATALOG.fr;
