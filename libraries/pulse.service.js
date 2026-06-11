// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @file Access web/asp services (vanilla fetch + AbortController)
 */

/**
* @module pulseService
* @requires pulseLogin
*/

import * as pulseLogin from 'pulseLogin';

var DEFAULT_TIMEOUT = 4 * 60 * 1000; // 4 minutes

function _resolveTimeout (timeout) {
  if (timeout == null || !Number.isInteger(timeout)) return DEFAULT_TIMEOUT;
  return timeout;
}

// Internal: perform a fetch with timeout via AbortController.
// Resolves with one of:
//   { ok: true, data: <json> }
//   { ok: false, status: <number>, isTimeout: <boolean>, error?: Error, kind?: <string> }
function _doFetch (url, init, timeoutMs) {
  let timedOut = false;
  let controller = new AbortController();
  let id = setTimeout(function () {
    timedOut = true;
    controller.abort();
  }, _resolveTimeout(timeoutMs));

  return fetch(url, Object.assign({ signal: controller.signal }, init))
    .then(function (response) {
      clearTimeout(id);
      if (!response.ok) {
        return { ok: false, status: response.status, isTimeout: false, kind: 'http' };
      }
      // 204 No Content / 205 Reset Content / 304 Not Modified have empty bodies —
      // `response.json()` would throw `SyntaxError: Unexpected end of JSON input`.
      // Match jQuery's behaviour: treat them as success with undefined data.
      if (response.status === 204 || response.status === 205 || response.status === 304) {
        return { ok: true, data: undefined };
      }
      return response.text().then(function (text) {
        if (text === '' || text == null) {
          // Empty body on 2xx — same fallback as above.
          return { ok: true, data: undefined };
        }
        try {
          return { ok: true, data: JSON.parse(text) };
        } catch (e) {
          return { ok: false, status: response.status, isTimeout: false, error: e, kind: 'parse' };
        }
      });
    })
    .catch(function (err) {
      clearTimeout(id);
      // Distinguish abort from network/CORS errors so the warning carries
      // enough context to debug. `timedOut` is true only when OUR setTimeout
      // fired and called controller.abort(); any other AbortError is external
      // (e.g., page unload, document detach).
      //
      // Browser quirk: when a request is in flight and its issuing element is
      // removed from the DOM, browsers cancel the fetch — but they report it
      // inconsistently. Chrome throws `TypeError: Failed to fetch`, Firefox
      // throws `TypeError: NetworkError when attempting to fetch resource.`.
      // Neither carries `name === 'AbortError'`. We detect these heuristically
      // and classify them as `abort` so they're logged at debug level rather
      // than spamming the console as "network failures". This is expected
      // noise from x-groupgrid rotation (which detaches per-machine items).
      let kind = 'network';
      if (err && err.name === 'AbortError') {
        kind = timedOut ? 'timeout' : 'abort';
      }
      else if (err && err.name === 'TypeError' && err.message
        && (err.message.indexOf('NetworkError') !== -1
          || err.message.indexOf('Failed to fetch') !== -1
          || err.message.indexOf('Load failed') !== -1)) {
        // Treat browser-initiated cancellation (DOM detach, navigation) as abort.
        kind = timedOut ? 'timeout' : 'abort';
      }
      return { ok: false, status: 0, isTimeout: timedOut, error: err, kind: kind };
    });
}

function _buildGetInit (withToken) {
  let init = {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'same-origin'
  };
  if (withToken) {
    init.headers = { 'Authorization': 'Bearer ' + pulseLogin.getAccessToken() };
  }
  return init;
}

function _buildPostInit (jsonData, withToken) {
  let init = {
    method: 'POST',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'same-origin',
    // 'text/plain' kept to match the legacy jQuery $.ajax contentType — the server-side parser
    // doesn't accept 'application/json' (cf. original comment in the legacy file).
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(jsonData)
  };
  if (withToken) {
    init.headers['Authorization'] = 'Bearer ' + pulseLogin.getAccessToken();
  }
  return init;
}

/**
 * Method to call an Ajax request (without token)
 */
export function runAjaxSimple (url, success, error, fail, timeout) {
  if (typeof url === 'undefined') {
    console.error('runAjaxSimple: no valid url');
    if (fail) fail(url, false, null);
    return;
  }
  let withToken = ("" != pulseLogin.getAccessToken());
  _doFetch(url, _buildGetInit(withToken), timeout).then(function (result) {
    if (result.ok) {
      if (result.data && result.data.ErrorMessage) {
        console.warn(`runAjax: error, url=${url} message=${result.data.ErrorMessage}`);
        if (error) error(result.data);
      }
      else {
        console.log(`runAjax: success, url=${url}`);
        if (success) success(result.data);
      }
    }
    else {
      // External aborts (page unload, document detach) are expected noise —
      // log them at debug level instead of warn. Real failures stay as warn.
      if (result.kind === 'abort') {
        console.debug(`runAjax: aborted, url=${url}`);
      }
      else {
        console.warn(`runAjax: failure, url=${url} status=${result.status} timeout=${result.isTimeout} kind=${result.kind || 'unknown'}${result.error ? ' err=' + result.error.name + ':' + result.error.message : ''}`);
      }
      if (fail) fail(url, result.isTimeout, result.status);
    }
  });
};

/**
 * Utility method to call an Ajax request (with token)
 */
export function runAjax (token, url, timeout, success, error, fail) {
  if (typeof url === 'undefined') {
    console.warn(`runAjax(${token}): no valid url`);
    if (fail) fail(token, url, false, null);
    return;
  }
  let withToken = ("" != pulseLogin.getAccessToken());
  _doFetch(url, _buildGetInit(withToken), timeout).then(function (result) {
    if (result.ok) {
      if (result.data && result.data.ErrorMessage) {
        console.warn(`runAjax(${token}): error, url=${url} message=${result.data.ErrorMessage}`);
        if (error) error(token, result.data);
      }
      else {
        console.log(`runAjax(${token}): success, url=${url}`);
        if (success) success(token, result.data);
      }
    }
    else {
      if (result.kind === 'abort') {
        console.debug(`runAjax(${token}): aborted, url=${url}`);
      }
      else {
        console.warn(`runAjax(${token}): failure, url=${url} status=${result.status} timeout=${result.isTimeout} kind=${result.kind || 'unknown'}${result.error ? ' err=' + result.error.name + ':' + result.error.message : ''}`);
      }
      if (fail) fail(token, url, result.isTimeout, result.status);
    }
  });
};

/**
 * Utility method to get Ajax message for user display
 */
export function getAjaxErrorMessage (xhrStatus) {
  if (typeof xhrStatus === 'undefined') {
    return 'Empty XHR status';
  }
  let statusMessageMap = {
    '0': 'Not connected, check the network',
    '400': 'Bad request',
    '401': 'Unauthorised access',
    '403': 'Forbidden resource, cannot be accessed',
    '404': 'Requested page not found',
    '500': 'Internal Server Error',
    '501': 'Not implemented',
    '502': 'Bad Gateway or Proxy Error',
    '503': 'Service Unavailable',
    '504': 'Gateway Timeout',
    '520': 'Unknown Error'
  };
  let message = statusMessageMap[xhrStatus];
  if (typeof message === 'undefined') {
    message = `unknown status ${xhrStatus}`;
  }
  return message;
};

/**
 * Utility method to call a POST Ajax request
 */
export function postAjax (token, url, jsonData, timeout, success, error, fail) {
  if (typeof url === 'undefined') {
    console.error(`postAjax(${token}): no valid url`);
    if (fail) fail(token, url, false, null);
    return;
  }
  let withToken = ("" != pulseLogin.getAccessToken());
  _doFetch(url, _buildPostInit(jsonData, withToken), timeout).then(function (result) {
    if (result.ok) {
      if (result.data && result.data.ErrorMessage) {
        console.error(`postAjax(${token}): error, url=${url} message=${result.data.ErrorMessage}`);
        if (error) error(token, result.data);
      }
      else {
        console.log(`postAjax(${token}): success, url=${url}`);
        if (success) success(token, result.data);
      }
    }
    else {
      if (result.kind === 'abort') {
        console.debug(`postAjax(${token}): aborted, url=${url}`);
      }
      else {
        console.error(`postAjax(${token}): failure, url=${url} status=${result.status} timeout=${result.isTimeout} kind=${result.kind || 'unknown'}${result.error ? ' err=' + result.error.name + ':' + result.error.message : ''}`);
      }
      if (fail) fail(token, url, result.isTimeout, result.status);
    }
  });
};
