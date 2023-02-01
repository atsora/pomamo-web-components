// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @file Access web/asp services
 */

/**
* @module pulseService
* @requires pulseUtility
* @requires pulseLogin
*/

var pulseLogin = require('pulseLogin');

/**
 * Method to call an Ajax request (without token)
 *
 * @memberof module:pulseService
 *
 * @function runAjaxSimple
 * 
 * == without token
 *
 * @param {string} url url used by ajax request
 * @param {function} success callback function called if the request is successful and returns a valid data
 * @param {function} error callback function called if the request is completed but an error data is returned
 * @param {function} fail callback function called in case of request failure. First argument is the URL, second argument is if it is because of a timeout, third argument is the status
 * @param {Number} timeout Timeout in ms
 */
exports.runAjaxSimple = function (url, success, error, fail, timeout) {
  if (typeof url === 'undefined') {
    console.error('runAjaxSimple: no valid url');
    if (fail) {
      fail(url, false, null);
    }
    return;
  }
  $.support.cors = true;
  if ("" != pulseLogin.getAccessToken()) {
    $.ajax(
      {
        crossDomain: true,
        cache: false, /* for IE */
        type: 'GET',
        url: url,
        timeout: ((timeout == undefined) || (timeout == null) || (!isInteger(timeout))) ? 4 * 60 * 1000 : timeout, // default timeout = 4 min
        dataType: 'json',
        headers: {
          'Authorization': 'Bearer ' + pulseLogin.getAccessToken()
        }
      }
    )
      .done(function (data, textStatus, jqXHR) {
        if (data.ErrorMessage) {
          console.error(`runAjax: error, url=${url} message=${data.ErrorMessage}`);
          if (error) {
            error(data);
          }
        }
        else {
          console.log(`runAjax: success, url=${url}`);
          if (success) {
            success(data);
          }
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error(`runAjax: failure, url=${url} textStatus=${textStatus}`);
        if (fail) {
          if (textStatus == 'timeout') {
            fail(url, true, jqXHR.status);
          }
          else {
            fail(url, false, jqXHR.status);
          }
        }
      });
  }
  else {
    $.ajax(
      {
        crossDomain: true,
        cache: false, /* for IE */
        type: 'GET',
        url: url,
        timeout: ((timeout == undefined) || (timeout == null) || (!isInteger(timeout))) ? 4 * 60 * 1000 : timeout, // default timeout = 4 min
        dataType: 'json'
      }
    )
      .done(function (data, textStatus, jqXHR) {
        if (data.ErrorMessage) {
          console.error(`runAjax: error, url=${url} message=${data.ErrorMessage}`);
          if (error) {
            error(data);
          }
        }
        else {
          console.log(`runAjax: success, url=${url}`);
          if (success) {
            success(data);
          }
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error(`runAjax: failure, url=${url} textStatus=${textStatus}`);
        if (fail) {
          if (textStatus == 'timeout') {
            fail(url, true, jqXHR.status);
          }
          else {
            fail(url, false, jqXHR.status);
          }
        }
      });
  }
} // runAjaxSimple


/**
 * Utility method to call an Ajax request
 *
 * @memberof module:pulseService
 *
 * @function runAjax
 *
 * @param {Number} token Token to check a callback corresponds to the request
 * @param {string} url url used by ajax request
 * @param {Number} timeout Timeout in ms
 * @param {function} success callback function called if the request is successful and returns a valid data
 * @param {function} error callback function called if the request is completed but an error data is returned
 * @param {function} fail callback function called in case of request failure. First argument is the URL, second argument is if it is because of a timeout, third argument is the status
 */
exports.runAjax = function (token, url, timeout, success, error, fail) {
  if (typeof url === 'undefined') {
    console.error(`runAjax(${token}): no valid url`);
    if (fail) {
      fail(token, url, false, null);
    }
    return;
  }
  $.support.cors = true;
  if ("" != pulseLogin.getAccessToken()) {
    $.ajax(
      {
        crossDomain: true,
        cache: false, /* for IE */
        type: 'GET',
        url: url,
        timeout: ((timeout == undefined) || (timeout == null) || (!isInteger(timeout))) ? 4 * 60 * 1000 : timeout, // default timeout = 4 min
        dataType: 'json',
        headers: {
          'Authorization': 'Bearer ' + pulseLogin.getAccessToken()
        }
      }
    )
      .done(function (data, textStatus, jqXHR) {
        if (data.ErrorMessage) {
          console.error(`runAjax(${token}): error, url=${url} message=${data.ErrorMessage}`);
          if (error) {
            error(token, data);
          }
        }
        else {
          console.log(`runAjax(${token}): success, url=${url}`);
          if (success) {
            success(token, data);
          }
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error(`runAjax(${token}): failure, url=${url} textStatus=${textStatus}`);
        if (fail) {
          if (textStatus == 'timeout') {
            fail(token, url, true, jqXHR.status);
          }
          else {
            fail(token, url, false, jqXHR.status);
          }
        }
      });
  }
  else {
    $.ajax(
      {
        crossDomain: true,
        cache: false, /* for IE */
        type: 'GET',
        url: url,
        timeout: ((timeout == undefined) || (timeout == null) || (!isInteger(timeout))) ? 4 * 60 * 1000 : timeout, // default timeout = 4 min
        dataType: 'json'
      }
    )
      .done(function (data, textStatus, jqXHR) {
        if (data.ErrorMessage) {
          console.error(`runAjax(${token}): error, url=${url} message=${data.ErrorMessage}`);
          if (error) {
            error(token, data);
          }
        }
        else {
          console.log(`runAjax(${token}): success, url=${url}`);
          if (success) {
            success(token, data);
          }
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error(`runAjax(${token}): failure, url=${url} textStatus=${textStatus}`);
        if (fail) {
          if (textStatus == 'timeout') {
            fail(token, url, true, jqXHR.status);
          }
          else {
            fail(token, url, false, jqXHR.status);
          }
        }
      });
  }
}

/**
 * Utility method to get Ajax message for user display
 *
 * @memberof module:pulseService
 *
 * @function getAjaxErrorMessage
 *
 * @param {Number} xhrStatus xhrStatus (cf run or post Ajax for details)
 * @return {String} message to be displayed
 */
exports.getAjaxErrorMessage = function (xhrStatus) {
  if (typeof xhrStatus === 'undefined') {
    return 'Empty XHR status';
  }
  else {
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
  }
}

/**
 * Utility method to call an Ajax request
 *
 * @memberof module:pulseService
 *
 * @function postAjax
 *
 * @param {Number} token Token to check a callback corresponds to the request
 * @param {string} url url used by ajax request
 * @param {json} jsonData jsonData to post
 * @param {Number} timeout Timeout in ms
 * @param {function} success callback function called if the request is successful and returns a valid data
 * @param {function} error callback function called if the request is completed but an error data is returned
 * @param {function} fail callback function called in case of request failure. First argument is the URL, second argument is if it is because of a timeout, third argument is the status
 */
exports.postAjax = function (token, url, jsonData, timeout, success, error, fail) {
  if (typeof url === 'undefined') {
    console.error(`postAjax(${token}): no valid url`);
    if (fail) {
      fail(token, url, false, null);
    }
    return;
  }
  $.support.cors = true;
  if ("" != pulseLogin.getAccessToken()) {
    $.ajax({
      crossDomain: true,
      cache: false, /* for IE */
      type: 'POST',
      url: url,
      timeout: ((timeout == undefined) || (timeout == null) || (!isInteger(timeout))) ? 4 * 60 * 1000 : timeout, // default timeout = 4 min
      contentType: 'text/plain', // should be 'application/json' but do not work at all
      dataType: 'json',
      data: JSON.stringify(jsonData),
      headers: {
        'Authorization': 'Bearer ' + pulseLogin.getAccessToken()
      }
    })
      .done(function (data, textStatus, jqXHR) {
        if (data.ErrorMessage) {
          console.error(`postAjax(${token}): error, url=${url} message=${data.ErrorMessage}`);
          if (error) {
            error(token, data);
          }
        }
        else {
          console.log(`postAjax(${token}): success, url=${url}`);
          if (success) {
            success(token, data);
          }
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error(`postAjax(${token}): failure, url=${url} textStatus=${textStatus}`);
        if (fail) {
          if (textStatus == 'timeout') {
            fail(token, url, true, jqXHR.status);
          }
          else {
            fail(token, url, false, jqXHR.status);
          }
        }
      });
  }
  else {
    $.ajax({
      crossDomain: true,
      cache: false, /* for IE */
      type: 'POST',
      url: url,
      timeout: ((timeout == undefined) || (timeout == null) || (!isInteger(timeout))) ? 4 * 60 * 1000 : timeout, // default timeout = 4 min
      contentType: 'text/plain', // should be 'application/json' but do not work at all
      dataType: 'json',
      data: JSON.stringify(jsonData)
    })
      .done(function (data, textStatus, jqXHR) {
        if (data.ErrorMessage) {
          console.error(`postAjax(${token}): error, url=${url} message=${data.ErrorMessage}`);
          if (error) {
            error(token, data);
          }
        }
        else {
          console.log(`postAjax(${token}): success, url=${url}`);
          if (success) {
            success(token, data);
          }
        }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error(`postAjax(${token}): failure, url=${url} textStatus=${textStatus}`);
        if (fail) {
          if (textStatus == 'timeout') {
            fail(token, url, true, jqXHR.status);
          }
          else {
            fail(token, url, false, jqXHR.status);
          }
        }
      });
  }
}

