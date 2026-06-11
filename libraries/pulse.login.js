// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @file access login features.
 */

/**
* @module pulseLogin
* @requires pulseUtility
* NEVER ADD : pulseConfig here. pulseConfig can use pulseLogin.
*/
import * as pulseUtility from 'pulseUtility';
import * as eventBus from 'eventBus';

////////// ////////// ////////// //////////
// is login page = see in pulseConfig    //
////////// ////////// ////////// //////////

////////// ////////// //////////
// Access = get               //
////////// ////////// //////////

//var getLogin = 
export function getLogin () {
  let login = pulseUtility.readCookie('PulseLogin');
  // Normal
  /*let name = 'PulseLogin=';
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }*/
  if (login == null)
    return '';
  else
    return login;
}

export function getLoginDisplay () {
  let login = pulseUtility.readCookie('PulseUserDisplay');
  if (login == null)
    return '';
  else
    return login;
}

export function getLoginForWebService () {
  let login = pulseUtility.readCookie('PulseLogin');
  if ((login == null)
    || (login == 'dev') || (login == 'support')
    || (login == 'Dev') || (login == 'Support'))
    return '';
  else
    return login;
}

//var getRole = 
export function getRole () {
  // Find role in URL-> REMOVED !!!
  let role = pulseUtility.readCookie('PulseRole');
  if (role == null)
    return '';
  else
    return role;
}

export function getAccessToken () {
  let token = pulseUtility.readCookie('PulseAccessToken');
  if (token == null)
    return '';
  else
    return token;
}
export function getAccessTokenExpiration () {
  let token = pulseUtility.readCookie('PulseAccessTokenExpiredAt');
  if (token == null)
    return '';
  else
    return token;
}
export function getRefreshToken () {
  let token = pulseUtility.readCookie('PulseRefreshToken');
  if (token == null)
    return '';
  else
    return token;
}
export function getRefreshTokenExpiration () {
  let token = pulseUtility.readCookie('PulseRefreshTokenExpiredAt');
  if (token == null)
    return '';
  else
    return token;
}

////////// ////////// //////////
// Storage                    //
////////// ////////// //////////

export var setAccessToken = function (access_token, expiredat) {
  if (access_token != null && access_token != '') {
    pulseUtility.createCookie('PulseAccessToken', access_token, 1);
    pulseUtility.createCookie('PulseAccessTokenExpiredAt', expiredat, 1);

    let target = {
      //url: url,
      //source: this.element.tagName,
      kind: 'AccessToken'
    };
    eventBus.EventBus.dispatchToAll('TokenHasChangedEvent', target);
  }
  else {
    pulseUtility.eraseCookie('PulseAccessToken');
    pulseUtility.eraseCookie('PulseAccessTokenExpiredAt');

    // No dispatch here, because goToPageLogin is always called just after
  }
}

export var setRefreshToken = function (refresh_token, expiredat) {
  if (refresh_token != null && refresh_token != '') {
    pulseUtility.createCookie('PulseRefreshToken', refresh_token, 1);
    pulseUtility.createCookie('PulseRefreshTokenExpiredAt', expiredat, 1);

    let target = {
      //url: url,
      //source: this.element.tagName,
      kind: 'RefreshToken'
    };
    eventBus.EventBus.dispatchToAll('TokenHasChangedEvent', target);
  }
  else {
    pulseUtility.eraseCookie('PulseRefreshToken');
    pulseUtility.eraseCookie('PulseRefreshTokenExpiredAt');

    // No dispatch here, because goToPageLogin is always called just after
  }
}

export function storeRole (role) {
  pulseUtility.createCookie('PulseRole', role, 90);
  //document.cookie = 'PulseRole=' + role + ';path=/';
}

export var storeLoginRole = function (login, role, display, access_token, refresh_token,
    access_token_expiredat, refresh_token_expiredat, sessionOnly) {
    pulseUtility.createCookie('PulseLogin', login, sessionOnly?0:1);
    pulseUtility.createCookie('PulseRole', role, sessionOnly?0:1);
    //document.cookie = 'PulseLogin=' + login + ';path=/';
    //document.cookie = 'PulseRole=' + role + ';path=/'; // == storeRole(role);
    pulseUtility.createCookie('PulseUserDisplay', display, sessionOnly?0:1);

    setAccessToken(access_token, access_token_expiredat);
    setRefreshToken(refresh_token, refresh_token_expiredat);
  }

export function storeLoginRoleFromRefreshDTO (data, sessionOnly) {
  let login = data.Login;
  let role = data.Role;
  role = role.toLowerCase();
  let display = data.UserDisplay; // from v 12
  if ( pulseUtility.isNotDefined(display) ) {
    display = data.UserName;
  }
  let access_token = data.AccessToken;
  // data.CompanyId
  let access_token_expiredat = data.ExpiresAt;
  let refresh_token = data.RefreshToken;
  let refresh_token_expiredat = data.RefreshTokenExpiresAt;

  storeLoginRole(login, role, display, access_token, refresh_token,
    access_token_expiredat, refresh_token_expiredat, sessionOnly);
}

////////// ////////// //////////
// Clean storage              //
////////// ////////// //////////

// goToPageLogin is always called just after
export function cleanLoginRole () {
  pulseUtility.eraseCookie('PulseLogin');
  pulseUtility.eraseCookie('PulseRole');
  //document.cookie = 'PulseLogin=' + ';path=/';
  //document.cookie = 'PulseRole=' + ';path=/';
  pulseUtility.eraseCookie('PulseUserDisplay');
  setAccessToken('');
  setRefreshToken('');
}

////////// ////////// //////////
// Expiration                 //
////////// ////////// //////////

export function isTokenExpired () {
  let refresh_token_expiration = pulseUtility.readCookie('PulseAccessTokenExpiredAt');
  if (refresh_token_expiration == null) {
    return true;
  }
  else {
    let m_expir = moment(refresh_token_expiration);
    let now = moment();
    if (now.isAfter(m_expir)) {
      return true;
    }
    else {
      return false;
    }
  }
}

/* Nearly expired */
export var tokenNeedRefresh = function () {
  let refresh_token_expiration = pulseUtility.readCookie('PulseAccessTokenExpiredAt');
  if (refresh_token_expiration == null) {
    return false;
  }
  else {
    let m_expir = moment(refresh_token_expiration);
    let inXmin = moment().add(5, 'minutes');

    if (inXmin.isAfter(m_expir)) {
      return true;
    }
    else {
      return false;
    }
  }
}

////////// ////////// //////////
// Renew token = refresh      //
////////// ////////// //////////

export var refreshToken = function () {
  let target = {
    //url: url,
    //source: this.element.tagName,
    message: 'Authentication Error. Please retry'
  };
  eventBus.EventBus.dispatchToAll('AuthorizationErrorEvent', target);
}

export function refreshTokenIfNeeded () {
  if (tokenNeedRefresh()) {
    refreshToken();
  }
}

////////// ////////// //////////
// Authentication / Validate  //
////////// ////////// //////////

export function cleanAuthentication () {
  pulseUtility.eraseCookie('AuthenticationKind');
  pulseUtility.eraseCookie('AuthenticationName');
  pulseUtility.eraseCookie('AuthenticationLogin');
  pulseUtility.eraseCookie('AuthenticationState');
}

export function storeAuthentication (AuthenticationKind,
  AuthenticationName, StateRequired, login) {
  pulseUtility.createCookie('AuthenticationKind', AuthenticationKind, 1);
  pulseUtility.createCookie('AuthenticationName', AuthenticationName, 1);
  pulseUtility.createCookie('AuthenticationLogin', login, 1);
  if ("true" == StateRequired) {
    let max = 4000000000; // max integer
    let state = Math.floor(Math.random() * max);
    pulseUtility.createCookie('AuthenticationState', state, 1);
  }
  else {
    pulseUtility.createCookie('AuthenticationState', '', 1);
  }
}

export function getAuthenticationKind () {
  let auth = pulseUtility.readCookie('AuthenticationKind');
  if (auth == null)
    return '';
  else
    return auth;
}

export function getAuthenticationName () {
  let auth = pulseUtility.readCookie('AuthenticationName');
  if (auth == null)
    return '';
  else
    return auth;
}

export function getAuthenticationLogin () {
  let auth = pulseUtility.readCookie('AuthenticationLogin');
  if (auth == null)
    return '';
  else
    return auth;
}

export function getAuthenticationState () {
  let auth = pulseUtility.readCookie('AuthenticationState');
  if (auth == null)
    return '';
  else
    return auth;
}

////////// ////////// //////////
// END                        //
////////// ////////// //////////

