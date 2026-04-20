// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
* @module pulseCustomDialog
* @requires pulseUtility
* @requires pulseSvg
*/

var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseConfig = require('pulseConfig');

require('x-alertdialog/x-alertdialog');

var pulseCustomDialog = function () {
  // Convenient object to store and get data attached to a dialog
  var _dataManager = pulseUtility.createDataManager('customDialogId');

  // List of open dialogs
  var _openIds = [];

  var _displayNavigation = function (selector) {
    var id = _dataManager.getId(selector);
    var dialogId = 'customDialog' + id;
    var data = _dataManager.get(id);

    // Extract parameters defining the element visibility
    var currentPage = data['currentPage'];
    var pageCount = data['pageCount'];
    var cancelButton = data['attributes']['cancelButton']; // can be null, "hidden"
    var previousButton = data['attributes']['previousButton']; // can be null, "hidden"
    var nextButton = data['attributes']['nextButton']; // can be null, "hidden"
    var okButton = data['attributes']['okButton']; // can be null, "hidden"
    var multiPage = data['attributes']['multiPage']; // can be "auto" / null, "on", "off"

    // First and/or last page?
    $('#' + dialogId).toggleClass('customDialogFirstPage', currentPage == 0);
    $('#' + dialogId).toggleClass('customDialogLastPage', currentPage == pageCount - 1);

    // Hidden buttons?
    $('#' + dialogId).toggleClass('customDialogNoCancel', cancelButton == 'hidden');
    $('#' + dialogId).toggleClass('customDialogNoPrevious', previousButton == 'hidden');
    $('#' + dialogId).toggleClass('customDialogNoNext', nextButton == 'hidden');
    $('#' + dialogId).toggleClass('customDialogNoOk', okButton == 'hidden');

    // Collapse button bar when all buttons are hidden (avoids 10px margin gap).
    // Previous/Next are navigation-only — treat undefined as "not needed" (only null = explicitly visible).
    let anyButtonVisible = (cancelButton !== 'hidden') || (okButton !== 'hidden') ||
      (previousButton != null && previousButton !== 'hidden') ||
      (nextButton != null && nextButton !== 'hidden');
    $('#' + dialogId + ' .customDialogButtons').css({
      display: anyButtonVisible ? '' : 'none',
      margin: anyButtonVisible ? '' : '0'
    });

    // Multipage state
    $('#' + dialogId).toggleClass('customDialogMultiPageOn', multiPage == 'on');
    $('#' + dialogId).toggleClass('customDialogMultiPageOff', multiPage == 'off');

    // Set current page
    for (var i = 0; i < pageCount; i++)
      $('#' + dialogId + ' .customDialogPage' + i).toggleClass('customDialogCurrentPage', i == currentPage);
  };

  /*
  * Close a prepared dialog
  * selector: the div containing the dialog
  */
  var close = function (selector) {
    var id = _dataManager.getId(selector);
    var attributes = _dataManager.get(id)['attributes'];

    var dialogId = 'customDialog' + id;

    // onClose?
    if (attributes['onClose'] != null)
      attributes['onClose']();

    $('#' + dialogId).removeClass('customDialogEnabled');

    // autoDelete?
    if (attributes['autoDelete'] != null && attributes['autoDelete'] == true) {
      $('#' + dialogId).remove();
      _dataManager.reset(id);
    }

    var index = _openIds.indexOf(id);
    if (index > -1) {
      _openIds.splice(index, 1)

      if (_openIds.length > 0) {
        // Unblur the previous dialog
        $('#customDialog' + _openIds[_openIds.length - 1]).css('filter', 'blur(0)');
      }
      else {
        // Unblur behind the first dialog
        $('.pulse-header').css('filter', 'blur(0)');
        $('#pulse-inner').css('filter', 'blur(0)');
      }
    }
  };

  /*
  * Call "cancel" of a dialog
  */
  var cancel = function (selector) {
    var id = _dataManager.getId(selector);
    var attributes = _dataManager.get(id)['attributes'];

    // onCancel?
    if (attributes['onCancel'] != null)
      attributes['onCancel']();

    // autoClose?
    if ((attributes['autoClose'] != null && attributes['autoClose'] == true) || (attributes['onCancel'] == null)) // If no autoClose AND no method Cancel : X should close dialog
      close(selector);
  };

  /*
  * Call "ok" of a dialog
  */
  var ok = function (selector) {
    var id = _dataManager.getId(selector);
    var attributes = _dataManager.get(id)['attributes'];

    // onOk?
    if (attributes['onOk'] != null)
      attributes['onOk']();

    // autoClose?
    if (attributes['autoClose'] != null && attributes['autoClose'] == true)
      close(selector);
  };

  /*
  * Call "previous" of a dialog
  */
  var previous = function (selector) {
    var id = _dataManager.getId(selector);
    var currentPage = _dataManager.get(id)['currentPage'];
    if (currentPage > 0)
      _dataManager.set(id, 'currentPage', currentPage - 1);
    _displayNavigation(selector);
  };

  /*
  * Call "next" of a dialog
  */
  var next = function (selector) {
    var id = _dataManager.getId(selector);
    var pageCount = _dataManager.get(id)['pageCount'];
    var currentPage = _dataManager.get(id)['currentPage'];
    if (currentPage < pageCount - 1)
      _dataManager.set(id, 'currentPage', currentPage + 1);
    _displayNavigation(selector);
  };

  /*
  * Display a defined page of a dialog
  */
  var goToPage = function (selector, nb) {
    var id = _dataManager.getId(selector);
    var pageCount = _dataManager.get(id)['pageCount'];
    if (nb < pageCount && nb >= 0)
      _dataManager.set(id, 'currentPage', nb);
    _displayNavigation(selector);
  };

  var _createDialog = function (attributes) {
    // Create an id
    var id = _dataManager.createNewId();
    var dialogId = 'customDialog' + id;

    // Options
    var closeButton = (attributes['closeButton'] != 'hidden');
    var fullScreenOnSmartphone = (attributes['fullScreenOnSmartphone'] == true);
    var bigSize = (attributes['bigSize'] == true);
    var fullSize = (attributes['fullSize'] == true);
    var smallSize = (attributes['smallSize'] == true);
    var helpName = attributes['helpName'];
    if (attributes['className']) {
      var className = 'customeDialog-' + attributes['className'];
    }
    else {
      var className = '';
    }

    // Create a dialog
    $('body').append(
      "<div id='" + dialogId + "' class='customDialog " + className + "'>" +
      "<div class='customDialogShadow'></div>" +
      "<div class='customDialogWindow" + (fullScreenOnSmartphone ? ' customDialogWindowFullScreenOnSmartphone' : '') +
      (fullSize ? ' fullSize' : (bigSize ? ' bigSize' : (smallSize ? ' smallSize' : ''))) + "'>" +
      "<div class='customDialogHeader'>" +
      "<div class='customDialogTitle'>" + attributes['title'] + '</div>' +
      (helpName ? "<div class='customDialogHelpBox' title='Help file' helpname='" + helpName + "'></div>" : '') +
      (closeButton ? "<div class='customDialogCloseBox' title='Close dialog'></div>" : '') +
      '</div>' +
      "<div class='customDialogContent'></div>" +
      "<div class='customDialogButtons'>" +
      "<button class='customDialogCancel buttonDialog' title='Cancel' role='button'></button>" +
      "<button class='customDialogPrevious buttonDialog' title='Previous' role='button'></button>" +
      "<button class='customDialogNext buttonDialog' title='Next' role='button'></button>" +
      "<button class='customDialogOk buttonDialog' title='Ok' role='button'></button>" +
      '</div>' +
      '</div>' +
      '</div>');
    _dataManager.initializeIdAttribute('#' + dialogId, id);

    pulseSvg.inlineBackgroundSvg('#' + dialogId + ' .customDialogCancel');
    pulseSvg.inlineBackgroundSvg('#' + dialogId + ' .customDialogPrevious');
    pulseSvg.inlineBackgroundSvg('#' + dialogId + ' .customDialogNext');
    pulseSvg.inlineBackgroundSvg('#' + dialogId + ' .customDialogOk');
    pulseSvg.inlineBackgroundSvg('#' + dialogId + ' .customDialogCloseBox');
    pulseSvg.inlineBackgroundSvg('#' + dialogId + ' .customDialogHelpBox');

    // Number of pages
    _dataManager.set(id, 'attributes', attributes);
    _dataManager.set(id, 'currentPage', 0);
    _dataManager.set(id, 'pageCount', 0);

    // Add callbacks
    $('#' + dialogId + ' .customDialogCloseBox').click(function () { cancel('#' + dialogId); });
    $('#' + dialogId + ' .customDialogCancel').click(function () { cancel('#' + dialogId); });
    $('#' + dialogId + ' .customDialogPrevious').click(function () { previous('#' + dialogId); });
    $('#' + dialogId + ' .customDialogNext').click(function () { next('#' + dialogId); });
    $('#' + dialogId + ' .customDialogOk').click(function () { ok('#' + dialogId); });

    $('.customDialogHelpBox').click(function () {
      //let helpName = this.getAttribute('helpname');
      let pathname = window.location.pathname;
      let pdfPath = pathname.substring(0, pathname.lastIndexOf('/') + 1) + 'help/' + helpName + '.pdf';
      // Open help file (if exists)
      function _fileExists(url) {
        if (url) {
          var req = new XMLHttpRequest();
          req.open('HEAD', url, false); // head is faster than GET
          req.send();
          return req.status == 200;
        } else {
          return false;
        }
      }
      if (_fileExists(pdfPath)) {
        window.open(pdfPath, 'resizable,scrollbars');
      }
      else {
        //pulseCustomDialog.openInfo('File not found !'); // impossible in dialog :(
        window.alert('File not found !');
      }
    });


    return id;
  };

  /*
   * Add a page to a prepared dialog
   * selector: the div containing the dialog
   * pageSelector: the div that will be the new page
   */
  var addPage = function (selector, pageSelector) {
    // Id of the dialog
    var id = _dataManager.getId(selector);

    // Number of pages
    var pageCount = _dataManager.get(id)['pageCount'];
    var blockToInsert = $(pageSelector).detach().addClass('customDialogPage' + pageCount);
    blockToInsert.appendTo('#customDialog' + id + ' .customDialogContent');
    _dataManager.initializeIdAttribute(pageSelector, id);

    // Update data
    _dataManager.set(id, 'pageCount', pageCount + 1);

    // Adapte the navigation buttons
    _displayNavigation(selector);
  };

  /* Create a dialog with initialize and addpage
   * Attributes:
   * - title
   * - cancelButton / previousButton / nextButton / okButton: can be set to "hidden"
   * - multipage: can be set to "auto" (default), "on", "off"
   * - onOpen, onOk, onCancel, onClose: functions that can be triggered
   * - autoClose: true / false (default), close automatically the dialog
   * - autoDelete: true / false (default), remove automatically the html associated to the dialog
   * - fixedHeight: true / false (default), force "full" height otherwise can be smaller deleted
   * - bigSize: true / false (default), width 90% on big screen
   * - fullSize: true / false (default), width 99% on big screen
   * - fullScreenOnSmartphone: true / false (default), activate the full screen on smartphone
   *
   * Return the div name of the dialog
   */
  var initialize = function (selector, attributes) {
    if (attributes == null)
      attributes = {};

    // Create a new dialog
    var id = _createDialog(attributes);

    // Add a page
    addPage('#customDialog' + id, selector);

    return 'customDialog' + id;
  };

  var setAttribute = function (selector, key, value) {
    // Id of the dialog
    var id = _dataManager.getId(selector);

    // Update data
    var attributes = _dataManager.get(id)['attributes'];
    attributes[key] = value;
    _dataManager.set(id, 'attributes', attributes);

    // Possibly update the title
    if (key == 'title') {
      $('#customDialog' + id + ' .customDialogTitle').html(value);
    }
  };

  var _defaultAlertTitles = {
    'Information': function () { return pulseConfig.pulseTranslate('dialog.information', 'Information'); },
    'Warning': function () { return pulseConfig.pulseTranslate('dialog.warning', 'Warning'); },
    'Error': function () { return pulseConfig.pulseTranslate('dialog.error', 'Error'); },
    'Question': function () { return pulseConfig.pulseTranslate('dialog.confirmation', 'Confirmation'); }
  };

  /*
  * Open a dialog.
  * - content is a DOM/jQuery element: standard dialog, reopened if already initialized
  * - content is a string: alert shortcut, attrs.type sets the icon
  *   ('Information' | 'Warning' | 'Error' | 'Question'), attrs.onClose / onOk / onCancel for callbacks
  * attrs: dialog attributes (title, cancelButton, autoClose, autoDelete, onClose, onOk, onCancel, ...)
  */
  var openDialog = function (content, attrs) {
    let dialogContent = content;
    if (attrs == null) attrs = {};

    if (typeof content === 'string') {
      let type = attrs.type || 'Information';
      let isConfirm = (type === 'Question');
      let elt = document.createElement('x-alertdialog');
      elt.setAttribute('type', type);
      elt.setAttribute('message', content);
      dialogContent = $(elt);
      attrs = Object.assign({
        title: _defaultAlertTitles[type] ? _defaultAlertTitles[type]() : type,
        cancelButton: isConfirm ? undefined : 'hidden',
        previousButton: 'hidden',
        autoClose: true,
        autoDelete: true
      }, attrs);
    }

    let dialogId;
    let isReuse = false;
    try {
      let id = _dataManager.getId(dialogContent);
      dialogId = 'customDialog' + id;
      isReuse = true;
    }
    catch (e) {
      dialogId = initialize(dialogContent, attrs);
    }
    open('#' + dialogId, isReuse ? dialogId : undefined);
    return dialogId;
  };

  // Backward-compatible aliases
  var openAlert = function (message, type, title, onClose, onOk, onCancel) {
    let isConfirm = (type === 'Question');
    return openDialog(message, {
      type: type,
      title: title,
      onClose: isConfirm ? undefined : onClose,
      onOk: isConfirm ? onOk : undefined,
      onCancel: isConfirm ? onCancel : undefined
    });
  };

  /*
  * Open a prepared dialog
  * selector: the div containing the dialog
  * knownDialogId : dialog id if known - else bug: open machine selection page twice => blur
  */
  var open = function (selector, knownDialogId) {
    _displayNavigation(selector);
    var id = _dataManager.getId(selector);
    var attributes = _dataManager.get(id)['attributes'];

    // Back to first page
    if (_dataManager.get(id)['currentPage'] > 0)
      _dataManager.set(id, 'currentPage', 0);
    _displayNavigation(selector);

    if (attributes['onOpen'] != null)
      attributes['onOpen']();
    $('#customDialog' + id).addClass('customDialogEnabled');

    // Blur the previous dialog if not already done
    if ('customDialog' + id != knownDialogId) {
      if (_openIds.length > 0) {
        $('#customDialog' + _openIds[_openIds.length - 1]).css('filter', 'blur(3px)');
      }
      else {
        // Blur behind the first dialog
        $('.pulse-header').css('filter', 'blur(2px)');
        $('#pulse-inner').css('filter', 'blur(2px)');
      }
      _openIds[_openIds.length] = id;
    }
  };

  // Backward-compatible aliases
  var openInfo = function (message, title, onClose) { return openDialog(message, { type: 'Information', title: title, onClose: onClose }); };
  var openWarning = function (message, title, onClose) { openDialog(message, { type: 'Warning', title: title, onClose: onClose }); };
  var openError = function (message, title, onClose) { openDialog(message, { type: 'Error', title: title, onClose: onClose }); };
  var openConfirm = function (message, title, onOk, onCancel) { openDialog(message, { type: 'Question', title: title, onOk: onOk, onCancel: onCancel }); };

  /*
  * Open a loader
  * abortFunction: if set, the user can abort and this function is executed
  */
  var openLoader = function (abortFunction) {
    // Loader already open?
    var id; // To define id only once
    try {
      id = _dataManager.getId('#customDialogLoader');
      var dialogId = 'customDialog' + id;

      // Already open, just change the abort function
      var attributes = _dataManager.get(id)['attributes'];
      attributes['onCancel'] = abortFunction;
      attributes['cancelButton'] = (abortFunction == null ? 'hidden' : '');
      _dataManager.set(id, 'attributes', attributes);
      _displayNavigation('#' + dialogId);
      return;
    }
    catch (e) {
      //
    }

    // Create a new dialog with possibly a cancel button
    id = (abortFunction == null) ?
      _createDialog({
        title: pulseConfig.pulseTranslate('dialog.wait', 'Please wait...'),
        cancelButton: 'hidden',
        previousButton: 'hidden',
        okButton: 'hidden',
        nextButton: 'hidden',
        closeButton: 'hidden',
        autoClose: true,
        autoDelete: true
      }) : _createDialog({
        title: pulseConfig.pulseTranslate('dialog.wait', 'Please wait...'),
        previousButton: 'hidden',
        okButton: 'hidden',
        nextButton: 'hidden',
        closeButton: 'hidden',
        onCancel: abortFunction,
        autoClose: true,
        autoDelete: true
      });

    // Add a special class to this dialog
    $('#customDialog' + id).addClass('customDialogButtonRight');

    // Add content
    $('body').append(
      "<div id='customDialogLoader'>" +
      "<div class='customProgress' style='margin: 20px 10px'>" +
      "<div data-effect='slide-left' class='customProgressBar' role='progressbar' aria-valuenow='100' aria-valuemin='0' aria-valuemax='100' style='width: 100%; transition: all 0.7s ease-in-out 0s;'></div>" +
      '</div>' +
      '</div>');
    addPage('#customDialog' + id, '#customDialogLoader');

    // Open it
    open('#customDialog' + id);
  };

  /*
  * Close the loader
  */
  var closeLoader = function () {
    if ($('#customDialogLoader').length)
      close('#customDialogLoader');
  };

  /*
  * Close all dialogs
  */
  var closeAll = function () {
    $('.customDialog').each(function () { close('#' + this.id); });
  };

  /*
  * Close the last dialog
  */
  var closeLast = function () {
    if (_openIds.length > 0)
      cancel('#customDialog' + _openIds[_openIds.length - 1]);
  };

  // Connect the key "escape"
  $(document).keyup(function (e) {
    if (e.keyCode == 27)
      closeLast();
  });

  // List of exported functions
  return {
    cancel: cancel,
    close: close,
    ok: ok,
    previous: previous,
    next: next,
    goToPage: goToPage,
    addPage: addPage,
    initialize: initialize,
    setAttribute: setAttribute,
    open: open,
    openDialog: openDialog,
    openAlert: openAlert,
    openInfo: openInfo,
    openWarning: openWarning,
    openError: openError,
    openConfirm: openConfirm,
    openLoader: openLoader,
    closeLoader: closeLoader,
    closeAll: closeAll,
    closeLast: closeLast
  }
};

// Singleton: define global.singletonPulseCustomDialog if not set and return it in the exports
global.singletonPulseCustomDialog = global.singletonPulseCustomDialog || pulseCustomDialog();
module.exports = global.singletonPulseCustomDialog;
