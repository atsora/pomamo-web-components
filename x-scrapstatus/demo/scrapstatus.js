var pulseConfig = require('pulseConfig');

require('x-scrapstatus/x-scrapstatus');

pulseConfig.setGlobal('path', 'http://localhost:8082/');

require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPartsInformation');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonScrapSelection');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveReason');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
