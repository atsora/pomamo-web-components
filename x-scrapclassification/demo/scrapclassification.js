var pulseConfig = require('pulseConfig');

require('x-scrapclassification/x-scrapclassification');

pulseConfig.setGlobal('path', 'http://localhost:8082/');

require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPartsInformation');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonScrapSelection');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveReason');




require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonSelection');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveReason');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision')
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetMachine');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/ReasonOnlySlots');


// FROM Save MST
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/MachineStateTemplates');
// TO ADD - 2016 12
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/SaveMachineStateTemplate');
require('node_modules/@atsora/pomamo-web-service-simulation/scripts/GetPendingModificationsFromRevision');