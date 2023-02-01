// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @file access configuration.
 */

/**
* @module pulseConfig
* @requires pulseUtility
* @requires pulseLogin
*/
var pulseUtility = require('pulseUtility');
var pulseLogin = require('pulseLogin');


////////// ////////// //////////
// TRANSLATION                //
////////// ////////// //////////

/**
 * function called to find a translation
 * @param {String} key Key linked to a translation 
 * @param {String} defaultTranslation Translation returned if the key is not found
 * @return {String} string to display
 */
exports.pulseTranslate = function (key, defaultTranslation) {
  let result = defaultTranslation;

  // Translations accessible?
  if (!pulseUtility.isNotDefined(PULSE_TRANSLATION)) {
    let translation = PULSE_TRANSLATION;
    let listOfKeys = key.split('.');
    for (let i = 0; i < listOfKeys.length; i++) {
      translation = translation[listOfKeys[i]];
      if ((pulseUtility.isNotDefined(translation)) || ('' === translation))
        break;
      if (i == (listOfKeys.length - 1))
        result = translation;
    }
  }

  return result;
};

////////// ////////// //////////
// Local Functions            //
////////// ////////// //////////

var getAppName = function () {
  /* This could be found in URL - BUT can not, because of hardcoded script in template.html (case sensitive, other app...) 
  More : in we read app name in URL, it will be more difficult to share data between app, for exemple machines 
  */
  return LEM_CONFIG_DEFAULT.appName;
}

var getPageName = exports.getPageName = function () {
  let href = window.location.href; // ".../pagename.html"
  var posReq = href.lastIndexOf('?');
  if (posReq != -1) {
    href = href.slice(0, posReq); // To ignore all after ?
  }
  var posPt = href.lastIndexOf('.');
  var posSlash = href.lastIndexOf('/');
  let pageName = '';
  if ((posPt != -1) && (posSlash != -1)) { // Found both
    pageName = href.slice(posSlash + 1, posPt);
  }

  return pageName;
};


//var isCurrentApp = 
exports.isCurrentApp = function (appName) {
  // Find app name
  let app = getAppName();
  if (app == appName) {
    return true;
  }
  return false;
};

var getAppContextOnly = exports.getAppContextOnly = function () {
  // get AppContext in URL
  let appCtxConfig = getURLConfig('AppContext');
  if (appCtxConfig.found) {
    return appCtxConfig.value;
  }

  return '';
}

var getAppContextOrRole = exports.getAppContextOrRole = function () {
  // get AppContext in URL
  let appCtxConfig = getURLConfig('AppContext');
  if (appCtxConfig.found) {
    return appCtxConfig.value;
  }

  // If not found, get role
  return pulseLogin.getRole();
}

var getLoginAppContextOrRole = exports.getLoginAppContextOrRole = function () {
  let login = pulseLogin.getLogin();
  if (login != '') {
    return login;
  }

  // get AppContext in URL
  let appCtxConfig = getURLConfig('AppContext');
  if (appCtxConfig.found) {
    return appCtxConfig.value;
  }

  // If not found, get role
  return pulseLogin.getRole();
}

////////// ////////// //////////
// "SEARCH IN CONFIG" METHODS //
////////// ////////// //////////

var getURLConfig = function (key) {
  let retVal = { found: false, value: '' };
  let href = window.location.href;
  // To find config LIKE production.thresholdNbOfPieces, SPLIT
  let listOfKeys = key.split('.');
  if (listOfKeys.length >= 1) {
    let lastKey = listOfKeys[listOfKeys.length - 1];
    let allValues;
    if ('machine' == lastKey) {
      allValues = pulseUtility.getALLMachineIdParameterValue(href); // For Compatibility
    }
    else {
      allValues = pulseUtility.getURLParameterValues(href, lastKey);
    }
    if (allValues != null && allValues.length != 0) {
      if (allValues.length == 1) {
        retVal.value = allValues[0];
        retVal.found = true;
      }
      else {
        retVal.value = allValues;
        retVal.found = true;
      }
    }
  }
  return retVal;
};

var getLocalConfig = function (key, login, pageName) {
  let retVal = { found: false, value: '' };
  if (key == 'path') {
    if (typeof sessionStorage != 'undefined') {
      let item = sessionStorage.getItem(key);
      if (item != null) {
        retVal.value = JSON.parse(item);
        if (Array.isArray(retVal.value)) {
          // reset
          retVal.value = '';
          // Remove from local storage error
          console.warn('Config Strange array for key=' + key);
        }
        else {
          retVal.found = true;
          return retVal;
        }
      }
    }
  }
  if (typeof localStorage == 'undefined') {
    console.warn('Config can not read local storage ');
  }
  else {
    // Find app name
    let app = getAppName();

    // Get GLOBAL
    let keyString = 'PULSE.' + app + '.' + key;
    let item = localStorage.getItem(keyString);
    if (item != null) {
      retVal.value = JSON.parse(item);
      if (Array.isArray(retVal.value)) {
        // reset
        retVal.value = '';
        // Remove from local storage error
        console.warn('Config remove array ' + keyString);
        //reset(keyString);
        localStorage.removeItem(keyString);
      }
      else {
        retVal.found = true;
        return retVal;
      }
    }
    // Get by login + page
    keyString = 'PULSE.' + app + '.' + login + '.' + pageName + '.' + key;
    item = localStorage.getItem(keyString);
    if (item != null) {
      retVal.value = JSON.parse(item); // Parse is not mandatory. But can be done
      if (Array.isArray(retVal.value)) {
        // reset
        retVal.value = '';
        // Remove from local storage error
        console.warn('Config remove array ' + keyString);
        //reset(keyString);
        localStorage.removeItem(keyString);
      }
      else {
        retVal.found = true;
        return retVal;
      }
    }
    // Get by login only (was role)
    keyString = 'PULSE.' + app + '.' + login + '.' + key;
    item = localStorage.getItem(keyString);
    if (item != null) {
      retVal.value = JSON.parse(item); // Parse is not mandatory. But can be done
      if (Array.isArray(retVal.value)) {
        // reset
        retVal.value = '';
        // Remove from local storage error
        console.warn('Config remove array ' + keyString);
        //reset(keyString);
        localStorage.removeItem(keyString);
      }
      else {
        retVal.found = true;
        return retVal;
      }
    }
  }
  return retVal;
};

var getRolePageConfig = function (key, role, pageName) {
  let retVal = { found: false, value: '' };
  if ((!pulseUtility.isNotDefined(role)) && (role != '')
    && (!pulseUtility.isNotDefined(pageName)) && (pageName != '')) {
    // Get New config (old is removed 2018-11)
    if (typeof PULSE_DEFAULT_CONFIG == 'undefined') {
      console.warn('PULSE_DEFAULT_CONFIG is undefined');
      return retVal;
    }
    // SEARCH in NEW role CONFIG
    if ((typeof PULSE_DEFAULT_CONFIG.rolespages != 'undefined')
      && (PULSE_DEFAULT_CONFIG.rolespages !== undefined)) {
      if ((typeof PULSE_DEFAULT_CONFIG.rolespages[role] != 'undefined')
        && (PULSE_DEFAULT_CONFIG.rolespages[role] !== undefined)) {
        let cfg = PULSE_DEFAULT_CONFIG.rolespages[role][pageName];
        if (!pulseUtility.isNotDefined(cfg)) {
          let listOfKeys = key.split('.');
          for (let i = 0; i < listOfKeys.length; i++) {
            cfg = cfg[listOfKeys[i]];
            if ((pulseUtility.isNotDefined(cfg)) || ('' === cfg)) {
              break; // To exit for
            }
            if (i == (listOfKeys.length - 1)) {
              retVal.found = true;
              retVal.value = cfg;
              return retVal;
            }
          }
        }
      }
    }
  }

  return retVal;
};

var getRoleConfig = function (key, role, pageName) {
  let retVal = { found: false, value: '' };
  if (typeof PULSE_DEFAULT_CONFIG == 'undefined') {
    console.warn('PULSE_DEFAULT_CONFIG is undefined - normal for docs');
    return retVal;
  }

  if ((!pulseUtility.isNotDefined(role)) && (role != '')) {
    // SEARCH in NEW role CONFIG
    if ((typeof PULSE_DEFAULT_CONFIG.roles != 'undefined')
      && (PULSE_DEFAULT_CONFIG.roles !== undefined)) {
      let cfg = PULSE_DEFAULT_CONFIG.roles[role];
      if (!pulseUtility.isNotDefined(cfg)) {
        let listOfKeys = key.split('.');
        for (let i = 0; i < listOfKeys.length; i++) {
          cfg = cfg[listOfKeys[i]];
          if ((pulseUtility.isNotDefined(cfg)) || ('' === cfg)) {
            break; // To exit for
          }
          if (i == (listOfKeys.length - 1)) {
            retVal.found = true;
            retVal.value = cfg;
            return retVal;
          }
        }
      }
    }
  }
  return retVal;
}

var getPageConfig = function (key, role, pageName) {
  let retVal = { found: false, value: '' };
  if (typeof PULSE_DEFAULT_CONFIG == 'undefined') {
    console.warn('PULSE_DEFAULT_CONFIG is undefined');
    return retVal;
  }

  if ((!pulseUtility.isNotDefined(pageName)) && (pageName != '')) {
    // Search the key for the current pages
    if ((typeof PULSE_DEFAULT_CONFIG.pages != 'undefined')
      && (PULSE_DEFAULT_CONFIG.pages !== undefined)) {
      let cfg = PULSE_DEFAULT_CONFIG.pages[pageName];
      if (!pulseUtility.isNotDefined(cfg)) {
        let listOfKeys = key.split('.');
        for (let i = 0; i < listOfKeys.length; i++) {
          cfg = cfg[listOfKeys[i]];
          if ((pulseUtility.isNotDefined(cfg)) || ('' === cfg)) {
            break; // To exit for
          }
          if (i == (listOfKeys.length - 1)) {
            retVal.found = true;
            retVal.value = cfg;
            return retVal;
          }
        }
      }
    }
  }
  return retVal;
};

var getAppConfig = function (key, role, pageName) {
  let retVal = { found: false, value: '' };
  if (typeof PULSE_DEFAULT_CONFIG == 'undefined') {
    console.warn('PULSE_DEFAULT_CONFIG is undefined');
    return retVal;
  }

  // Search the key in the global section
  if ((typeof PULSE_DEFAULT_CONFIG != 'undefined')
    && (PULSE_DEFAULT_CONFIG !== undefined)) {
    let cfg = PULSE_DEFAULT_CONFIG.general;
    if (!pulseUtility.isNotDefined(cfg)) {
      let listOfKeys = key.split('.');
      for (let i = 0; i < listOfKeys.length; i++) {
        cfg = cfg[listOfKeys[i]];
        if (pulseUtility.isNotDefined(cfg)) {
          return retVal;
        }
        if ('' === cfg) {
          return retVal;
        }
        if (i == (listOfKeys.length - 1)) {
          retVal.found = true;
          retVal.value = cfg;
          return retVal;
        }
      }
    }
  }
  return retVal;
}

/** Get configuration using all paramaters
 * 
 * @memberof module:pulseConfig
 * @function getComponentDefaultConfig
 * @param key key to check
 * @return {String} configuration to use
 */
var getComponentDefaultConfig = function (key) {
  let retVal = { found: false, value: '' };
  if ((pulseUtility.isNotDefined(key)) || (key === '')) {
    // LOG ERROR here
    return retVal;
  }
  let cfg = tagConfig;
  if (!pulseUtility.isNotDefined(cfg)) {
    let listOfKeys = key.split('.');
    for (let i = 0; i < listOfKeys.length; i++) {
      cfg = cfg[listOfKeys[i]];
      if ((pulseUtility.isNotDefined(cfg)) || (cfg === '')) {
        return retVal;
      }
    }
    retVal.found = true;
    retVal.value = cfg;
    return retVal;
  }
  return retVal;
};
////////// ////////// //////////
// END of Local Functions     //
////////// ////////// //////////


/** Get configuration using all paramaters
 * 
 * @memberof module:pulseConfig
 * @function getFullConfig
 * @param key key to check
 * @param defaultValue default Value
 * @param onlyDefault - if true, don't take into account the overrides (url or localstorage)
 * @param {String} pageName - specific page, if needed
 * @param {String} role - hidden param, role if should be used
 * @return {String} configuration to use
 */
var getFullConfig = function (key, defaultValue, onlyDefault, pageName, role) {
  // Find role
  if (role == null)
    role = getAppContextOrRole(); // WAS getRole(); //LATER : maybe use login if exist ?

  let login = getLoginAppContextOrRole();

  let config = { found: false, value: defaultValue };

  // Find page name
  if (pageName == null)
    pageName = getPageName();

  // Are the overrides taken into account?
  if (onlyDefault == null || onlyDefault == false) {
    try {
      // Search the value in the current URL
      config = getURLConfig(key);
      if (config.found) { return config; }
    }
    catch (error) {
      console.error('getFullConfig - getURLConfig error for key=' + key + ' Default=' + defaultValue);
    }

    try {
      // Search the value in the localstorage, related to the current app
      config = getLocalConfig(key, login, pageName);
      if (config.found) { return config; }
    }
    catch (error) {
      console.error('getFullConfig - getLocalConfig error for key=' + key + ' Default=' + defaultValue);
    }
  }

  try {
    // Search role/page config
    config = getRolePageConfig(key, role, pageName);
    if (config.found) { return config; }
  }
  catch (error) {
    console.error('getFullConfig - getRolePageConfig error for key=' + key + ' Default=' + defaultValue);
  }

  try {
    // Search role config
    config = getRoleConfig(key, role, pageName);
    if (config.found) { return config; }
  }
  catch (error) {
    console.error('getFullConfig - getRoleConfig error for key=' + key + ' Default=' + defaultValue);
  }

  try {
    // Search page config
    config = getPageConfig(key, role, pageName);
    if (config.found) { return config; }
  }
  catch (error) {
    console.error('getFullConfig - getPageConfig error for key=' + key + ' Default=' + defaultValue);
  }

  try {
    // Search App config (general)
    config = getAppConfig(key, role, pageName);
    if (config.found) { return config; }
  }
  catch (error) {
    console.error('getFullConfig - getAppConfig error for key=' + key + ' Default=' + defaultValue);
  }

  try {
    // Return default (tagConfig = PWC config)
    config = getComponentDefaultConfig(key);
    if (config.found) { return config; }
  }
  catch (error) {
    console.error('getFullConfig - getComponentDefaultConfig error for key=' + key + ' Default=' + defaultValue);
  }

  //if NOT found (probably for AppContext), search in role
  let realRole = pulseLogin.getRole();
  if (role != realRole)
    return getFullConfig(key, defaultValue, onlyDefault, pageName, realRole);

  // Default = not found
  return config;
};

/** Get a configuration with no specific type, read in this order:
 * - in the url
 * - in localStorage of the web page
 * - in role+page configuration
 * - in role configuration
 * - in page configuration
 * - global default value - tagConfig
 * - value specified in the argument "defaultValue"
 * 
 *  /!\ Use it only for complex objects /!\
 * 
 * @memberof module:pulseConfig
 * @function get
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 * @param {String} page - specific page, if needed
 */
var get = exports.get = function (key, defaultValue, page) {
  // Get config
  let listOfKeys = key.split('.'); // Ex: 'ANY_tagName.realKey'
  if (listOfKeys.length > 1) { // Find overload first
    let lastKey = listOfKeys[listOfKeys.length - 1];
    let config = getFullConfig(lastKey, defaultValue, false, page);
    if (config.found)
      return config.value;
  }

  // FULL tag.key to find default component config
  let config = getFullConfig(key, defaultValue, false, page);
  if (config.found)
    return config.value;

  return defaultValue;
};

/** Get a configuration returned as a BOOLEAN
 * 
 * @memberof module:pulseConfig
 * @function getBool
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 * @param {String} page - specific page, if needed
 */
exports.getBool = function (key, defaultValue, page) {
  let tmp = get(key, defaultValue, page);
  return (tmp == true || tmp == 'true' || tmp == '1' || tmp == 1);
};

/** Get a configuration returned as an INTEGER
 * 
 * @memberof module:pulseConfig
 * @function getInt
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 * @param {String} page - specific page, if needed
 */
exports.getInt = function (key, defaultValue, page) {
  let tmp = get(key, defaultValue, page);
  return parseInt(tmp, 10);
}

/** Get a configuration returned as an FLOAT
 * 
 * @memberof module:pulseConfig
 * @function getFloat
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 * @param {String} page - specific page, if needed
 */
exports.getFloat = function (key, defaultValue, page) {
  let tmp = get(key, defaultValue, page);
  return parseFloat(tmp);
}

/** Get a configuration returned as a STRING
 * 
 * @memberof module:pulseConfig
 * @function getString
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 * @param {String} page - specific page, if needed
 */
var getString = exports.getString = function (key, defaultValue, page) {
  let tmp = get(key, defaultValue, page);
  if (tmp == undefined || tmp == null)
    tmp = '';
  return String(tmp);
}

/** Get a configuration returned as an ARRAY
 * 
 * @memberof module:pulseConfig
 * @function getArray
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 * @param {String} page - specific page, if needed
 */
var getArray =
  exports.getArray = function (key, defaultValue, page) {
    let tmp = get(key, defaultValue, page);
    if (tmp == null)
      return [];

    if (!Array.isArray(tmp)) {
      if (typeof tmp == 'string')
        return tmp.split(',');

      return [tmp];
    }
    // OK for roles in config file / KO for localstorage
    console.log('pulseConfig.get found ARRAY for key=' + key);
    return tmp;
  }

/** Get the defualt value with no specific type, read in this order
 * - in custom local definition (depending on the role first)
 * - default value for the current page
 * - global default value
 * - value specified in the argument "defaultValue"
 * 
 *  /!\ Use it only for complex objects /!\
 * 
 * @memberof module:pulseConfig
 * @function getDefault
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 */
var getDefault = exports.getDefault = function (key, defaultValue) {
  // Get config
  let listOfKeys = key.split('.'); // Ex: 'ANY_tagName.realKey'
  if (listOfKeys.length > 1) { // Find overload first
    let lastKey = listOfKeys[listOfKeys.length - 1];
    let config = getFullConfig(lastKey, defaultValue, true);
    if (config.found) {
      return config.value;
    }
  }
  // FULL tag.key to find default component config
  let config = getFullConfig(key, defaultValue, true);
  if (config.found) {
    return config.value;
  }
  return defaultValue;
};

/** Get a default configuration returned as a BOOLEAN
 * 
 * @memberof module:pulseConfig
 * @function getDefaultBool
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 */
exports.getDefaultBool = function (key, defaultValue) {
  let tmp = getDefault(key, defaultValue);
  return (tmp == true || tmp == 'true' || tmp == '1' || tmp == 1);
};

/** Get a default configuration returned as an INTEGER
 * 
 * @memberof module:pulseConfig
 * @function getDefaultInt
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 */
exports.getDefaultInt = function (key, defaultValue) {
  let tmp = getDefault(key, defaultValue);
  return parseInt(tmp, 10);
}

/** Get a default configuration returned as an FLOAT
 * 
 * @memberof module:pulseConfig
 * @function getDefaultFloat
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 */
exports.getDefaultFloat = function getDefaultFloat (key, defaultValue) {
  let tmp = getDefault(key, defaultValue);
  return parseFloat(tmp);
}

/** Get a default configuration returned as a STRING
 * 
 * @memberof module:pulseConfig
 * @function getDefaultString
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 */
exports.getDefaultString = function (key, defaultValue) {
  let tmp = getDefault(key, defaultValue);
  if (tmp == undefined || tmp == null)
    tmp = '';
  return String(tmp);
}

/** Get a default configuration returned as an ARRAY
 * 
 * @memberof module:pulseConfig
 * @function getDefaultArray
 * @param {!String} key - key to check
 * @param {String} defaultValue - default Value
 */
exports.getDefaultArray = function (key, defaultValue) {
  let tmp = getDefault(key, defaultValue);
  if (tmp == null)
    return [];
  if (!Array.isArray(tmp))
    return [tmp];
  return tmp;
}


/** Set GLOBAL configuration for the WHOLE app
 * For example : role, theme, machine...
 * Special session storage for path
 * 
 * @memberof module:pulseConfig
 * @function setGlobal (no role, no page)
 * @param key - key to fill
 * @param value - value associated to the key
 */
var setGlobal = exports.setGlobal = function (key, value) {
  // Find app name
  let app = getAppName();

  // STORE
  if (key == 'path') {
    // STORE
    if (typeof sessionStorage != 'undefined') {
      if (value === '') { // Keep '===' because '==' fails when false
        sessionStorage.removeItem(key);
      }
      else {
        sessionStorage.setItem(key, JSON.stringify(value));
      }
    }
    return;
  }

  if (typeof localStorage != 'undefined') {
    let keyString = 'PULSE.' + app + '.' + key;
    if (value === '') { // Keep '===' because '==' fails when false
      localStorage.removeItem(keyString);
    }
    else {
      if (Array.isArray(value)) { // Avoid array in local storage to keep compatibility with url / attributes == string
        let str = value.join();
        localStorage.setItem(keyString, JSON.stringify(str));
      }
      else {
        localStorage.setItem(keyString, JSON.stringify(value));
      }
    }
  }
  else {
    console.warn('Config can not set local storage (' + key + ')');
  }
}

/** Set configuration (in local storage)
 * 
 * @memberof module:pulseConfig
 * @function set
 * @param key - key to fill
 * @param value - value associated to the key
 * @param ignorePageName - if true, we should store by role only (default false)
 * @param global - if true, the configuration will be global for all pages
 */
var set = exports.set = function (key, value, ignorePageName) {
  /* TODO : probably add an error for role, theme, path */
  if (key == 'role' || key == 'theme' || key == 'path') {
    console.error(`Config.set should not be call with key = ${key}`);
    setGlobal(key, value);
    return;
  }

  // STORE
  if (typeof localStorage != 'undefined') {
    // Find app name / role / page
    let app = getAppName();
    //let role = getAppContextOrRole(); // WAS getRole();
    let login = getLoginAppContextOrRole();

    let keyString;
    if (ignorePageName) {
      // Determine the prefix
      keyString = 'PULSE.' + app + '.' + login + '.' + key;
    }
    else {
      let pageName = getPageName();
      // Determine the prefix
      keyString = 'PULSE.' + app + '.' + login + '.' + pageName + '.' + key;
    }

    if (value === '') { // Keep '===' because '==' fails when false
      localStorage.removeItem(keyString);
    }
    else {
      if (Array.isArray(value)) { // Avoid array in local storage to keep compatibility with url / attributes == string
        let str = value.join();
        localStorage.setItem(keyString, JSON.stringify(str));
      }
      else {
        localStorage.setItem(keyString, JSON.stringify(value));
      }
    }
  }
  else {
    console.warn('Config can not set value in local storage  (' + key + ')');
  }
}

/** Clear local configuration
 * 
 * @memberof module:pulseConfig
 * @function reset
 * @param key - key to clear
 */
exports.reset = function (key) {
  // Local
  set(key, '');
  // by role
  setGlobal(key, '', true);
  // Global
  setGlobal(key, '');
}

////////// ////////// //////////
// is login page              //
////////// ////////// //////////

exports.isLoginPage = function () {
  if ('login' == getPageName()) {
    return true;
  }
  if ('validate' == getPageName()) {
    return true;
  }
  return false;
}

/** Clear local configuration
 * 
 * @memberof module:pulseConfig
 * @function goToPageLogin
 */
exports.goToPageLogin = function () {
  let pwa_path = getString('pulsewebapppath', '');
  let newfullURL = window.location.href;
  if ('' == pwa_path) {
    newfullURL = pulseUtility.changePageName(window.location.href, 'login');
  }
  else {
    newfullURL = pwa_path + '/login.html';

    // Add 'path' if exists in url :
    let tmpPath = pulseUtility.getURLParameterValues(window.location.href, 'path');
    if (tmpPath.length > 0) {
      newfullURL = pulseUtility.changeURLParameter(newfullURL, 'path', tmpPath[0]);
    }
    let tmpMainPath = pulseUtility.getURLParameterValues(window.location.href, 'mainpath');
    if (tmpMainPath.length > 0) {
      newfullURL = pulseUtility.changeURLParameter(newfullURL, 'mainpath', tmpMainPath[0]);
    }
    // Remove Code if exists (validate page)
    let tmpCode = pulseUtility.getURLParameterValues(window.location.href, 'code');
    if (tmpCode.length > 0) {
      newfullURL = pulseUtility.removeURLParameter(newfullURL, 'code');
    }
  }

  window.location.href = newfullURL;
}

/** Clear local configuration
 * 
 * @memberof module:pulseConfig
 * @function goToPageLogin
 */
exports.goToFirstPage = function (role) {
  // Go to firstPage (if defined)
  let roles = getArray('roles');

  // Browse all roles
  for (let iRole = 0; iRole < roles.length; iRole++) {
    let aRole = roles[iRole];
    if (role == aRole.role) {
      // role found == aRole.display;
      if (pulseUtility.isNotDefined(aRole.firstPage)) { // Maybe add soon
        // go to home
        let fullURL = window.location.pathname;
        let newfullURL = fullURL.substring(0, fullURL.lastIndexOf('/') + 1) + 'home.html';

        // Add 'path' if exists in url :
        let tmpPath = pulseUtility.getURLParameterValues(window.location.href, 'path');
        if (tmpPath.length > 0) {
          newfullURL = pulseUtility.changeURLParameter(newfullURL, 'path', tmpPath[0]);
        }
        let tmpMainPath = pulseUtility.getURLParameterValues(window.location.href, 'mainpath');
        if (tmpMainPath.length > 0) {
          newfullURL = pulseUtility.changeURLParameter(newfullURL, 'mainpath', tmpMainPath[0]);
        }

        window.location.href = newfullURL;
      }
      else { // go to firstPage
        let firstPage = aRole.firstPage;
        //let fullURL = window.location.pathname;
        //let newfullURL = fullURL.substring(0, fullURL.lastIndexOf('/') + 1) + firstPage + '.html';
        let newfullURL = pulseUtility.changePageName(window.location.pathname, firstPage);

        // Add 'path' if exists in url :
        let tmpPath = pulseUtility.getURLParameterValues(window.location.href, 'path');
        if (tmpPath.length > 0) {
          newfullURL = pulseUtility.changeURLParameter(newfullURL, 'path', tmpPath[0]);
        }
        let tmpMainPath = pulseUtility.getURLParameterValues(window.location.href, 'mainpath');
        if (tmpMainPath.length > 0) {
          newfullURL = pulseUtility.changeURLParameter(newfullURL, 'mainpath', tmpMainPath[0]);
        }

        window.location.href = newfullURL;
      }
    }
  }
}


////////// ////////// //////////
// login / user / context     //
////////// ////////// //////////

//var currentRoleOrAppContextIsDefined = 
exports.currentRoleOrAppContextIsDefined = function () {
  let roles = getArray('roles');
  let currentRole = getAppContextOrRole(); // WAS getRole();
  for (let i = 0; i < roles.length; i++) {
    if (roles[i].role == currentRole) {
      return true;
    }
  }
  return false;
}

// get login / role or appContext display according to what is available
//var getCurrentUserDisplay = 
exports.getCurrentUserDisplay = function () {
  let roles = getArray('roles');

  // App Context
  let appContext = getAppContextOnly();
  if (appContext != '') {
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].role == appContext) {
        if (roles[i].display != null) {
          return roles[i].display;
        }
        else {
          break;
        }
      }
    }
  }

  // Or login
  let login = pulseLogin.getLoginDisplay();
  if (login != '') {
    return login;
  }

  // Or role
  let currentRole = pulseLogin.getRole();
  for (let i = 0; i < roles.length; i++) {
    if (roles[i].role == currentRole) {
      if (roles[i].display != null) {
        return roles[i].display;
      }
      else {
        break;
      }
    }
  }

  return '';
}

////////// ////////// //////////
//                            //
////////// ////////// //////////