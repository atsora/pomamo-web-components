var pulseConfig = require('pulseConfig');

require('x-savescrapreason/x-savescrapreason');

pulseConfig.setGlobal('path', 'http://localhost:8082/');

require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonScrapSelection');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveReason');