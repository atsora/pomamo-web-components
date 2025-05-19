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

    // Create a dialog
    $('body').append(
      "<div id='" + dialogId + "' class='customDialog'>" +
      "<div class='customDialogShadow'></div>" +
      "<div class='customDialogWindow" + (fullScreenOnSmartphone ? ' customDialogWindowFullScreenOnSmartphone' : '') +
      (fullSize ? ' fullSize' : (bigSize ? ' bigSize' : (smallSize ? ' smallSize' : ''))) + "'>" +
      "<div class='customDialogHeader'>" +
      (closeButton ? "<div class='customDialogCloseBox' title='Close dialog'></div>" : '') +
      (helpName ? "<div class='customDialogHelpBox' title='Help file' helpname='" + helpName + "'></div>" : '') +
      "<div class='customDialogTitle'>" + attributes['title'] + '</div>' +
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
      function _fileExists (url) {
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

    // Max height or height of the dialog
    if (attributes['fixedHeight'] == true) {
      $(window).on('resize', function () {
        $('#' + dialogId + ' .customDialogContent > div').css('height', (($(this).height() - 70) * (fullSize ? 0.99 : (bigSize ? 0.75 : 0.6))) + 'px');
      });
    }
    else {
      $(window).on('resize', function () {
        $('#' + dialogId + ' .customDialogContent > div').css('max-height', (($(this).height() - 70) * (fullSize ? 0.99 : (bigSize ? 0.75 : 0.6))) + 'px');
      });
    }

    // Vertical position of the dialog
    $(window).on('resize', function () {
      $('#' + dialogId + ' .customDialogWindow').css('top', (($(this).height() - $('#' + dialogId + ' .customDialogWindow').height()) * 0.3) + 'px');
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

    // Dimensions of a page
    $('#customDialog' + id + ' .customDialogContent > div').css('width', (100 / (pageCount + 1)) + '%');
    var attributes = _dataManager.get(id)['attributes'];
    var bigSize = (attributes['bigSize'] == true);
    var fullSize = (attributes['fullSize'] == true);
    if (attributes['fixedHeight'] == true)
      $('#customDialog' + id + ' .customDialogContent > div')
        .css('height', (($(window).height() - 70) * (fullSize ? 0.99 : (bigSize ? 0.75 : 0.6))) + 'px');
    else
      $('#customDialog' + id + ' .customDialogContent > div')
        .css('max-height', (($(window).height() - 70) * (fullSize ? 0.99 : (bigSize ? 0.75 : 0.6))) + 'px');

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
   * - fixedHeight: true / false (default), force "full" height otherwise can be smaller
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

  // Open common dialogs (info, warning, error, question)
  var _addCommonPage = function (id, message, icon) {
    var dialogId = 'customDialog' + id;
    var pageId = dialogId + 'content';
    $('body').append(
      "<div id='" + pageId + "'>" +
      "<div class='customDialogIcon customDialogIcon" + icon + "'></div>" +
      "<div class='customDialogMessage'>" + message + '</div>' +
      '</div>');
    addPage('#' + dialogId, '#' + pageId);

    // Keep after addPage to kkep color
    pulseSvg.inlineBackgroundSvg('#' + pageId + ' .customDialogIcon');
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

    // Adapt the position
    $('#customDialog' + id + ' .customDialogWindow').css('top', (($('#customDialog' + id + ' .customDialogShadow').height() - $('#customDialog' + id + ' .customDialogWindow').height()) * 0.3) + 'px');

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

  /*
  * Open an info dialog.
  * It could be $.prompt BUT this one use Pomamo design.
  * message: message inside the window
  * title: title of the window
  * onClose: callback when the window is closed (ok or cancel)
  */
  var openInfo = function (message, title, onClose) {
    var id = _createDialog({
      title: (title == null ? pulseConfig.pulseTranslate ('dialog.information', 'Information') : title),
      cancelButton: 'hidden',
      previousButton: 'hidden',
      autoClose: true,
      autoDelete: true,
      onClose: onClose
    });
    _addCommonPage(id, message, 'Information');
    open('#customDialog' + id);

    return 'customDialog' + id;
  };

  /*
  * Open a warning dialog
  * message: message inside the window
  * title: title of the window
  * onClose: callback when the window is closed (ok or cancel)
  */
  var openWarning = function (message, title, onClose) {
    var id = _createDialog({
      title: (title == null ? pulseConfig.pulseTranslate ('dialog.warning', 'Warning') : title),
      cancelButton: 'hidden',
      previousButton: 'hidden',
      autoClose: true,
      autoDelete: true,
      onClose: onClose
    });
    _addCommonPage(id, message, 'Warning');
    open('#customDialog' + id);
  };

  /*
  * Open an error dialog
  * message: message inside the window
  * title: title of the window
  * onClose: callback when the window is closed (ok or cancel)
  */
  var openError = function (message, title, onClose) {
    var id = _createDialog({
      title: (title == null ? pulseConfig.pulseTranslate ('dialog.error', 'Error') : title),
      cancelButton: 'hidden',
      previousButton: 'hidden',
      autoClose: true,
      autoDelete: true,
      onClose: onClose
    });
    _addCommonPage(id, message, 'Error');
    open('#customDialog' + id);
  };

  /*
  * Open a confirm dialog
  * message: message inside the window
  * title: title of the window
  * onOk: callback when "ok" is clicked
  * onCancel: callback when "cancel" is clicked
  */
  var openConfirm = function (message, title, onOk, onCancel) {
    var id = _createDialog({
      title: (title == null ? pulseConfig.pulseTranslate ('dialog.confirmation', 'Confirmation') : title),
      autoClose: true,
      autoDelete: true,
      onOk: onOk,
      onCancel: onCancel
    });
    _addCommonPage(id, message, 'Question');
    open('#customDialog' + id);
  };

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
        title: pulseConfig.pulseTranslate ('dialog.wait', 'Please wait...'),
        cancelButton: 'hidden',
        previousButton: 'hidden',
        okButton: 'hidden',
        nextButton: 'hidden',
        closeButton: 'hidden',
        autoClose: true,
        autoDelete: true
      }) : _createDialog({
        title: pulseConfig.pulseTranslate ('dialog.wait', 'Please wait...'),
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