// Copyright (C) 2025 Atsora Solutions

PULSE.DEFAULT_CONFIG.general.roles =
 [
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
  ];

tagConfig.toollifemachine.toollabelsselections.display =
 [
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
    ];
