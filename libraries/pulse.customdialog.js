// Copyright (C) 2009-2025 Atsora Solutions
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

  // List of open dialog ids (used to manage blur stacking)
  var _openIds = [];

  // Resolve a string selector or Element to a single Element (used for polymorphic public APIs)
  function _toElement (target) {
    if (target == null) return null;
    if (typeof target === 'string') return document.querySelector(target);
    if (target.nodeType) return target;
    return null;
  }

  var _displayNavigation = function (selector) {
    var id = _dataManager.getId(selector);
    var dialog = document.getElementById('customDialog' + id);
    if (dialog == null) return;
    var data = _dataManager.get(id);

    var currentPage = data['currentPage'];
    var pageCount = data['pageCount'];
    var cancelButton = data['attributes']['cancelButton'];
    var previousButton = data['attributes']['previousButton'];
    var nextButton = data['attributes']['nextButton'];
    var okButton = data['attributes']['okButton'];

    dialog.classList.toggle('customDialogFirstPage', currentPage == 0);
    dialog.classList.toggle('customDialogLastPage', currentPage == pageCount - 1);

    dialog.classList.toggle('customDialogNoCancel', cancelButton == 'hidden');
    dialog.classList.toggle('customDialogNoPrevious', previousButton == 'hidden');
    dialog.classList.toggle('customDialogNoNext', nextButton == 'hidden');
    dialog.classList.toggle('customDialogNoOk', okButton == 'hidden');

    // Collapse button bar when all buttons are hidden (avoids 10px margin gap).
    // Previous/Next are navigation-only — treat undefined as "not needed" (only null = explicitly visible).
    var anyButtonVisible = (cancelButton !== 'hidden') || (okButton !== 'hidden') ||
      (previousButton != null && previousButton !== 'hidden') ||
      (nextButton != null && nextButton !== 'hidden');
    var buttons = dialog.querySelector('.customDialogButtons');
    if (buttons != null) {
      buttons.style.display = anyButtonVisible ? '' : 'none';
      buttons.style.margin = anyButtonVisible ? '' : '0';
    }

    // Set current page
    for (var i = 0; i < pageCount; i++) {
      var page = dialog.querySelector('.customDialogPage' + i);
      if (page != null) page.classList.toggle('customDialogCurrentPage', i == currentPage);
    }
  };

  /*
  * Close a prepared dialog
  * selector: the dialog or a child of it
  */
  var close = function (selector) {
    var id = _dataManager.getId(selector);
    var attributes = _dataManager.get(id)['attributes'];
    var dialog = document.getElementById('customDialog' + id);

    // onClose?
    if (attributes['onClose'] != null) attributes['onClose']();

    if (dialog != null && dialog.open) {
      dialog.close();
    }

    // autoDelete?
    if (attributes['autoDelete'] === true) {
      if (dialog != null) dialog.remove();
      _dataManager.reset(id);
    }

    var index = _openIds.indexOf(id);
    if (index > -1) {
      _openIds.splice(index, 1);

      if (_openIds.length > 0) {
        // Unblur the previous dialog
        var prev = document.getElementById('customDialog' + _openIds[_openIds.length - 1]);
        if (prev != null) prev.style.filter = 'blur(0)';
      }
      else {
        // Unblur behind the first dialog
        var header = document.querySelector('.pulse-header');
        if (header != null) header.style.filter = 'blur(0)';
        var inner = document.getElementById('pulse-inner');
        if (inner != null) inner.style.filter = 'blur(0)';
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
    if (attributes['onCancel'] != null) attributes['onCancel']();

    // autoClose? (or no onCancel: X should still close)
    if ((attributes['autoClose'] === true) || (attributes['onCancel'] == null)) {
      close(selector);
    }
  };

  /*
  * Call "ok" of a dialog
  */
  var ok = function (selector) {
    var id = _dataManager.getId(selector);
    var attributes = _dataManager.get(id)['attributes'];

    // onOk?
    if (attributes['onOk'] != null) attributes['onOk']();

    // autoClose?
    if (attributes['autoClose'] === true) close(selector);
  };

  /*
  * Call "previous" of a dialog
  */
  var previous = function (selector) {
    var id = _dataManager.getId(selector);
    var currentPage = _dataManager.get(id)['currentPage'];
    if (currentPage > 0) _dataManager.set(id, 'currentPage', currentPage - 1);
    _displayNavigation(selector);
  };

  /*
  * Call "next" of a dialog
  */
  var next = function (selector) {
    var id = _dataManager.getId(selector);
    var pageCount = _dataManager.get(id)['pageCount'];
    var currentPage = _dataManager.get(id)['currentPage'];
    if (currentPage < pageCount - 1) _dataManager.set(id, 'currentPage', currentPage + 1);
    _displayNavigation(selector);
  };

  /*
  * Display a defined page of a dialog
  */
  var goToPage = function (selector, nb) {
    var id = _dataManager.getId(selector);
    var pageCount = _dataManager.get(id)['pageCount'];
    if (nb < pageCount && nb >= 0) _dataManager.set(id, 'currentPage', nb);
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
    var className = attributes['className'] ? ('customeDialog-' + attributes['className']) : '';

    var sizeClass = fullSize ? ' fullSize' : (bigSize ? ' bigSize' : (smallSize ? ' smallSize' : ''));
    var phoneClass = fullScreenOnSmartphone ? ' customDialogWindowFullScreenOnSmartphone' : '';

    // Create a native <dialog> (top-layer modal). Escape key handling is wired below.
    var html =
      "<dialog id='" + dialogId + "' class='customDialog " + className + "'>" +
      "<div class='customDialogWindow" + phoneClass + sizeClass + "'>" +
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
      '</dialog>';

    document.body.insertAdjacentHTML('beforeend', html);
    var dialog = document.getElementById(dialogId);
    _dataManager.initializeIdAttribute(dialog, id);

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
    var closeBox = dialog.querySelector('.customDialogCloseBox');
    if (closeBox != null) closeBox.addEventListener('click', function () { cancel('#' + dialogId); });
    dialog.querySelector('.customDialogCancel').addEventListener('click', function () { cancel('#' + dialogId); });
    dialog.querySelector('.customDialogPrevious').addEventListener('click', function () { previous('#' + dialogId); });
    dialog.querySelector('.customDialogNext').addEventListener('click', function () { next('#' + dialogId); });
    dialog.querySelector('.customDialogOk').addEventListener('click', function () { ok('#' + dialogId); });

    // Native <dialog> fires 'cancel' on Escape; route through our cancel() so onCancel callbacks fire.
    // preventDefault stops the native auto-close — our cancel() handles closing itself based on attrs.
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      cancel('#' + dialogId);
    });

    var helpBox = dialog.querySelector('.customDialogHelpBox');
    if (helpBox != null) {
      helpBox.addEventListener('click', function () {
        var pathname = window.location.pathname;
        var pdfPath = pathname.substring(0, pathname.lastIndexOf('/') + 1) + 'help/' + helpName + '.pdf';
        function _fileExists (url) {
          if (!url) return false;
          var req = new XMLHttpRequest();
          req.open('HEAD', url, false); // head is faster than GET
          req.send();
          return req.status == 200;
        }
        if (_fileExists(pdfPath)) {
          window.open(pdfPath, 'resizable,scrollbars');
        }
        else {
          window.alert('File not found !');
        }
      });
    }

    return id;
  };

  /*
   * Add a page to a prepared dialog
   * selector: the div containing the dialog
   * pageSelector: string selector OR Element that will be the new page
   */
  var addPage = function (selector, pageSelector) {
    // Id of the dialog
    var id = _dataManager.getId(selector);

    var pageEl = _toElement(pageSelector);
    if (pageEl == null) {
      throw "addPage: pageSelector '" + pageSelector + "' not found";
    }

    // Number of pages
    var pageCount = _dataManager.get(id)['pageCount'];
    if (pageEl.parentNode != null) pageEl.parentNode.removeChild(pageEl);
    pageEl.classList.add('customDialogPage' + pageCount);

    var contentSlot = document.querySelector('#customDialog' + id + ' .customDialogContent');
    contentSlot.appendChild(pageEl);
    _dataManager.initializeIdAttribute(pageEl, id);

    // Update data
    _dataManager.set(id, 'pageCount', pageCount + 1);

    // Adapt the navigation buttons
    _displayNavigation(selector);
  };

  /* Create a dialog with initialize and addpage
   * Attributes:
   * - title
   * - cancelButton / previousButton / nextButton / okButton: can be set to "hidden"
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
    if (attributes == null) attributes = {};

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
      var titleEl = document.querySelector('#customDialog' + id + ' .customDialogTitle');
      if (titleEl != null) titleEl.innerHTML = value;
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
  * - content is a DOM Element: standard dialog, reopened if already initialized
  * - content is a string selector: same, resolved to Element
  * - content is a string with no leading '#'/'.' / etc.: alert shortcut, attrs.type sets the icon
  *   ('Information' | 'Warning' | 'Error' | 'Question'), attrs.onClose / onOk / onCancel for callbacks
  * attrs: dialog attributes (title, cancelButton, autoClose, autoDelete, onClose, onOk, onCancel, ...)
  */
  var openDialog = function (content, attrs) {
    var dialogContent = content;
    if (attrs == null) attrs = {};

    if (typeof content === 'string') {
      // Heuristic: a CSS selector starts with '#', '.', or matches an existing element.
      // We treat a plain string as an alert message (legacy behavior).
      var type = attrs.type || 'Information';
      var isConfirm = (type === 'Question');
      var elt = document.createElement('x-alertdialog');
      elt.setAttribute('type', type);
      elt.setAttribute('message', content);
      dialogContent = elt;
      attrs = Object.assign({
        title: _defaultAlertTitles[type] ? _defaultAlertTitles[type]() : type,
        cancelButton: isConfirm ? undefined : 'hidden',
        previousButton: 'hidden',
        autoClose: true,
        autoDelete: true
      }, attrs);
    }

    var dialogId;
    var isReuse = false;
    try {
      var id = _dataManager.getId(dialogContent);
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
    var isConfirm = (type === 'Question');
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
  * selector: the dialog (or a child of it)
  * knownDialogId : dialog id if known - else bug: open machine selection page twice => blur
  */
  var open = function (selector, knownDialogId) {
    _displayNavigation(selector);
    var id = _dataManager.getId(selector);
    var attributes = _dataManager.get(id)['attributes'];

    // Back to first page
    if (_dataManager.get(id)['currentPage'] > 0) _dataManager.set(id, 'currentPage', 0);
    _displayNavigation(selector);

    if (attributes['onOpen'] != null) attributes['onOpen']();

    var dialog = document.getElementById('customDialog' + id);
    if (dialog != null && !dialog.open) {
      dialog.showModal();
    }

    // Blur the previous dialog if not already done
    if ('customDialog' + id != knownDialogId) {
      if (_openIds.length > 0) {
        var prev = document.getElementById('customDialog' + _openIds[_openIds.length - 1]);
        if (prev != null) prev.style.filter = 'blur(3px)';
      }
      else {
        // Blur behind the first dialog
        var header = document.querySelector('.pulse-header');
        if (header != null) header.style.filter = 'blur(2px)';
        var inner = document.getElementById('pulse-inner');
        if (inner != null) inner.style.filter = 'blur(2px)';
      }
      _openIds.push(id);
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
    var id;
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
      // not yet created
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

    var dialog = document.getElementById('customDialog' + id);
    if (dialog != null) dialog.classList.add('customDialogButtonRight');

    document.body.insertAdjacentHTML('beforeend',
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
    if (document.getElementById('customDialogLoader') != null) close('#customDialogLoader');
  };

  /*
  * Close all dialogs
  */
  var closeAll = function () {
    var dialogs = document.querySelectorAll('.customDialog');
    for (var i = 0; i < dialogs.length; i++) close('#' + dialogs[i].id);
  };

  /*
  * Close the last dialog
  */
  var closeLast = function () {
    if (_openIds.length > 0) cancel('#customDialog' + _openIds[_openIds.length - 1]);
  };

  // Escape key is handled per-dialog via the native 'cancel' event wired in _createDialog.

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
