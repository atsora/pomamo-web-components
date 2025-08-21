// Copyright (C) 2025 Atsora Solutions

require('x-productiontrackergraph/x-productiontrackergraph');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ProductionTracker');
