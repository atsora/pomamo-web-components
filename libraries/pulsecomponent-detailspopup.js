// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
review la construction de cette page : le dialog savereason
devrait pas avoir à etre initialisé ici : il devrait seulement etre appelé
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/


/**
 * @file Various functions.
 */

var pulseUtility = require('pulseUtility');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseRange = require('pulseRange');
var pulseConfig = require('pulseConfig');

require('x-machinedisplay/x-machinedisplay');

// Note: insert here all the possible blocks of data you want to be able to insert in the popup or the details page
require('x-detailedreasonat/x-detailedreasonat');
require('x-detailedmachinestateat/x-detailedmachinestateat');
require('x-detailedobservationstateat/x-detailedobservationstateat');
require('x-detailedproductionstateat/x-detailedproductionstateat');
require('x-detailedshiftat/x-detailedshiftat');
require('x-detailedalarmsat/x-detailedalarmsat');
require('x-detailedcncvaluesat/x-detailedcncvaluesat');
require('x-detailedworkinfoat/x-detailedworkinfoat');
require('x-detailedsequenceat/x-detailedsequenceat');
require('x-detailedisofileat/x-detailedisofileat');
require('x-detailedpartsat/x-detailedpartsat');
require('x-detailedoperationcycleat/x-detailedoperationcycleat');

// period + bar (reason + workinfo)
require('x-datetimerange/x-datetimerange');
require('x-datetimegraduation/x-datetimegraduation');
require('x-bartimeselection/x-bartimeselection');
// reason change
require('x-reasonslotbar/x-reasonslotbar');
require('x-unansweredreasonslotlist/x-unansweredreasonslotlist');
// workinfo display
require('x-operationcyclebar/x-operationcyclebar');
require('x-operationslotbar/x-operationslotbar');
require('x-workinfoslotlist/x-workinfoslotlist');


//openRunningDialog = SAME AS running view
require('x-machinedisplay/x-machinedisplay');
require('x-productionmachiningstatus/x-productionmachiningstatus');
require('x-lastworkinformation/x-lastworkinformation');
require('x-currentcncvalue/x-currentcncvalue');
require('x-lastshift/x-lastshift');
/* Replace x-RCB */
require('x-datetimegraduation/x-datetimegraduation');
require('x-shiftslotbar/x-shiftslotbar');
require('x-machinestatebar/x-machinestatebar');
require('x-observationstatebar/x-observationstatebar');
require('x-operationcyclebar/x-operationcyclebar');
require('x-operationslotbar/x-operationslotbar');
require('x-productionstatebar/x-productionstatebar');
require('x-reasonslotbar/x-reasonslotbar');
require('x-cncalarmbar/x-cncalarmbar');
require('x-redstacklightbar/x-redstacklightbar');
require('x-cncvaluebar/x-cncvaluebar');
require('x-isofileslotbar/x-isofileslotbar');
/* end replace RCB */
require('x-motionpercentage/x-motionpercentage');
require('x-motiontime/x-motiontime');
require('x-periodtoolbar/x-periodtoolbar');
require('x-reasonbutton/x-reasonbutton');
require('x-clock/x-clock');
require('x-reasongroups/x-reasongroups');
require('x-fieldlegends/x-fieldlegends');
require('x-machinemodelegends/x-machinemodelegends');
require('x-stopperiods/x-stopperiods');
require('x-reasoncommentdialog/x-reasoncommentdialog');
require('x-detailsatdialog/x-detailsatdialog');
require('x-runningdialog/x-runningdialog');

/**
 * @module PulseComponentFunctions -> detailspopup AND change
 */

/**
 * Open a dialog with Details for a machine at a specific time
 *
 * @memberof module:PulseComponentFunctions
 * @function openDetails
 *
 * @param {Object} component - component calling openDetails -> must define following attributes : machine-id (showcoloredbar.showdetails must be filled in config)
 * @param {Range} fullRange - full date range of the component
 * @param {Range} cellRange - date range of the clicked cell
 * @param {Object} evt - evt to get click position
 */
var openDetails = exports.openDetails = function (component, fullRange, cellRange, evt) {
  // Get datetime at clicked position
  let e = evt.target;
  let dim = e.getBoundingClientRect();
  let x = evt.clientX - dim.left; // position = (click position) - (left of svg)

  let d_clickTime = new Date(cellRange.lower.getTime());
  if (dim.width > 0) {
    let duration = cellRange.upper.getTime() - cellRange.lower.getTime();
    d_clickTime = new Date(cellRange.lower.getTime() + (duration) * x / dim.width);
  }

  if ((new Date()).getTime() < d_clickTime.getTime()) {
    return; //  Do not display future data
  }

  let machineid = $(component.element).attr('machine-id');

  let dialog = pulseUtility.createjQueryElementWithAttribute('x-detailsatdialog', {
    'machine-id': machineid,
    'when': d_clickTime.toISOString(),
    'range': fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString()
  });

  pulseCustomDialog.openDialog(dialog, {
    title: pulseConfig.pulseTranslate('dialog.details', 'Details'),
    onOk: function () { },
    onClose: function () {
      // Special for popup on a dialog (Reason '+2' display) :
      $('.popup-block').fadeOut();
    }.bind(component),
    autoClose: true,
    autoDelete: true,
    bigSize: true,
    helpName: 'details'
  });
}

/**
 * Open a popup with fillMethod
 *
 * @memberof module:PulseComponentFunctions
 * @function openGenericPopup
 *
 * @param {Function} fillMethod - method to fill the popup
 * @param {Object} evt - evt to get click position
 */
var openGenericPopup = exports.openGenericPopup = function (fillMethod, evt) {
  // Find the popup block first
  let popups = document.getElementsByClassName('popup-block');
  let popup;
  if (popups.length == 0) { // Create it if it does not exist !
    popup = $('<div></div>').addClass('popup-block');
    $('body').append(popup);
    $('body').on('click', '#pulse-inner', () => $('.popup-block').fadeOut());
  }
  else {
    popup = $(popups[0]);
  }
  // Special for popup on a dialog (Reason '+2' display) - always, even for 2nd open
  $('.customDialogContent').click(
    () => $('.popup-block').fadeOut());

  // Clear popup
  $(popup).empty();

  // Fill popup
  fillMethod(popup);

  // Manage position
  let w = $(window).width();
  let h = $(window).height();
  let borderPadding = parseInt($(popup).css('border-right-width')) +
    parseInt($(popup).css('padding-right')) +
    parseInt($(popup).css('border-left-width')) +
    parseInt($(popup).css('padding-left'));
  // Init popup width
  let popupWidth = w / 3.5 - borderPadding;
  let maxPositionBeforeLeftDisplay = w -
    (popupWidth > (w / 3)) ? popupWidth : (w / 3);
  let leftPosition = (evt.clientX < maxPositionBeforeLeftDisplay) ?
    evt.clientX :
    (evt.clientX - popupWidth - borderPadding);
  if (evt.clientY < h / 2) { // } - (popupWidth + borderPadding)) {
    $(popup).fadeIn()
      .css({
        'width': popupWidth + 'px', //Number(300),
        'top': evt.clientY + 'px',
        'bottom': 'auto', // To remove previous definition
        'left': leftPosition
      });
  }
  else {
    let bottomPosition = h - evt.clientY;
    $(popup).fadeIn()
      .css({
        'width': popupWidth + 'px', //Number(300),
        'top': 'auto', // To remove previous definition
        'bottom': bottomPosition + 'px',
        'left': leftPosition
      });
  }

  if (typeof evt.stopPropagation === 'function')
    evt.stopPropagation(); // Stop for ALL propagations
}

/**
 * Open a popup with Details for a machine at a specific time
 *
 * @memberof module:PulseComponentFunctions
 * @function openPopup
 *
 * @param {Object} component - component calling openDetails -> must define following attributes : machine-id (showpopup must be filled in config)
 * @param {Range} fullRange - full date range of the component
 * @param {Range} cellRange - date range of the clicked cell
 * @param {Object} evt - evt to get click position
 */
var openPopup = exports.openPopup = function (component, fullRange, cellRange, evt) {
  // Get datetime at clicked position
  let e = evt.target;
  let dim = e.getBoundingClientRect();
  let x = evt.clientX - dim.left; // position = (click position) - (left of svg)

  let d_clickTime = new Date(cellRange.lower.getTime());
  if (dim.width > 0) {
    let duration = cellRange.upper.getTime() - cellRange.lower.getTime();
    d_clickTime = new Date(cellRange.lower.getTime() + (duration) * x / dim.width);
  }

  if ((new Date()).getTime() < d_clickTime.getTime()) {
    $('.popup-block').fadeOut();
    return; //  Do not display future data
  }

  let fillMethod = function (popup, component, d_clickTime, fullRange) {
    // Fill popup
    let configArray = pulseConfig.getArray('showcoloredbar.showpopup');
    if (configArray.length == 0) {
      console.warn('No popup content defined');
    }
    else {
      //let configArray = $(component.element).attr('click-popup').split(',');
      for (let iConfig = 0; iConfig < configArray.length; iConfig++) {
        $(popup).append(
          pulseUtility.createjQueryElementWithAttribute(
            configArray[iConfig],
            {
              'machine-id': $(component.element).attr('machine-id'),
              'when': d_clickTime.toISOString(),
              //'datetime-context': 'details', //un-used in popup, no bar displayed
              'range': '[' + fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString() + ')', // for x_detailedreasonat and x-detailedpartat
              'period-context': 'details'
            }));
      }
    }
  }

  openGenericPopup((popup => fillMethod(popup, component, d_clickTime, fullRange)), evt);
}

/**
 * Open a change work info (job, component...) dialog for a machine and a specific range
 *
 * @memberof module:PulseComponentFunctions
 * @function openChangeWorkInfoDialog
 *
 * @param {Object} component - component calling openChangeWorkInfoDialog -> must define following attributes : machine-id
 * @param {Range} range - date range
 *
 */
exports.openChangeWorkInfoDialog = function (component, dtRange) {
  if ($('.dialog-saveworkinfo').length > 0) {
    return;
  }

  // PAGE 1
  let dialog = $('<div></div>').addClass('dialog-saveworkinfo');

  let machid = $(component.element).attr('machine-id');
  let rangeString = dtRange.toString(d => d.toISOString());
  let xworkinfoslotlist = pulseUtility.createjQueryElementWithAttribute('x-workinfoslotlist', {
    'machine-id': machid,
    //'only-overwrite-required': true, //component.requiredReason,
    'range': rangeString
    //'skip1periodlist': skip1periodlist
  });
  dialog.append(xworkinfoslotlist);

  let saveDialogId = pulseCustomDialog.openDialog(dialog, {
    title: component.getTranslation('saveworkinfo.WorkInfoTitle', 'Work information'),
    /*onCancel: function () { == default behavior
      pulseCustomDialog.close('.dialog-saveworkinfo');
    }.bind(component),*/
    onClose: function () {
      $('.popup-block').fadeOut();
    }.bind(component),
    autoClose: false,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    bigSize: true
  });

  // PAGE 2 -> in WISL ? - Not ended yet 2019-05 Maybe later when needed
  let xMachine = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
    'machine-id': machid
  });
  $('#' + saveDialogId + ' .customDialogTitle').append(xMachine);
}

/**
 * Open a change reason dialog for a machine and a specific range
 *
 * @memberof module:PulseComponentFunctions
 * @function openChangeReasonDialog
 *
 * @param {Object} component - component calling openChangeReasonDialog -> must define following attributes : machine-id
 * @param {Range} dtRange - date range
 * @param {Bool} skip1periodlist - true if 1 item list should display 2nd page
 * @param {Bool} forceDetails - true to force x-reasonslotlist even for operator
 * @param {String} displayMode - display mode for x-reasonslotlist: "only-overwrite-required" (show only non-classified), "force-all" (show all), or undefined (default user control)
 *
 */
var openChangeReasonDialog = exports.openChangeReasonDialog = function (component, dtRange, skip1periodlist, forceDetails, displayMode) {
  if ($('.dialog-savereason').length > 0) {
    return;
  }

  // PAGE 1
  let dialog = $('<div></div>').addClass('dialog-savereason');

  let machid = $(component.element).attr('machine-id');
  let rangeString = dtRange.toString(d => d.toISOString());
  let useUnanswered = pulseConfig.getBool('detailspopup.useUnansweredReasonSlotList', false);
  let reasonslotlistTag = (useUnanswered && !forceDetails) ? 'x-unansweredreasonslotlist' : 'x-reasonslotlist';

  // Determine displayMode if not provided
  let effectiveDisplayMode = displayMode;
  if (!effectiveDisplayMode && reasonslotlistTag === 'x-reasonslotlist') {
    effectiveDisplayMode = 'only-overwrite-required';
  }

  let xreasonslotlist = pulseUtility.createjQueryElementWithAttribute(reasonslotlistTag, {
    'machine-id': machid,
    'range': rangeString,
    'skip1periodlist': skip1periodlist
  });
  if (effectiveDisplayMode) {
    xreasonslotlist.attr('display-mode', effectiveDisplayMode);
  }
  dialog.append(xreasonslotlist);

  let saveDialogId = pulseCustomDialog.openDialog(dialog, {
    title: component.getTranslation('savereason.saveReasonTitle', 'Set reason'),
    /*onCancel: function () { == default
      pulseCustomDialog.close('.dialog-savereason');
    }.bind(component),*/
    onClose: function () {
      // Special for popup on a dialog (Reason '+2' display) :
      $('.popup-block').fadeOut();
    }.bind(component),
    autoClose: false,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    bigSize: true,
    helpName: 'savereason'
  });

  // PAGE 2 -> in RSL ?
  let xMachine = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
    'machine-id': machid
  });
  $('#' + saveDialogId + ' .customDialogTitle').append(xMachine);
}

/**
 * Open a change scrap classification dialog for a machine
 *
 * @memberof module:PulseComponentFunctions
 * @function openChangeScrapClassificationDialog
 *
 * @param {Object} component - component calling openChangeScrapClassificationDialog -> must define following attributes : machine-id
 * @param {Range} dtRange - date range
 *
 */
var openChangeScrapClassificationDialog = exports.openChangeScrapClassificationDialog = function (component) {
  if ($('.dialog-scrapclassification').length > 0) {
    return;
  }

  // PAGE 1
  let dialog = $('<div></div>').addClass('dialog-scrapclassification');

  let machid = $(component.element).attr('machine-id');
  // Use a provider that fetches ReasonOnlySlots and builds the classifier
  let xscrapclassification = pulseUtility.createjQueryElementWithAttribute('x-scrapclassification', {
    'machine-id': machid,
  });
  dialog.append(xscrapclassification);

  pulseCustomDialog.openDialog(dialog, {
    title: component.getTranslation('scrapclassification.title', 'Declare scrap'),
    onClose: function () {
      $('.popup-block').fadeOut();
    }.bind(component),
    autoClose: false,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    fullSize: true,
    helpName: 'savereason',
    className: 'scrapclassification'
  });
}

/**
 * Open a change reason dialog for a machine and a specific range
 *
 * @memberof module:PulseComponentFunctions
 * @function openChangeStopClassificationDialog
 *
 * @param {Object} component - component calling openChangeStopClassificationDialog -> must define following attributes : machine-id
 * @param {Range} dtRange - date range
 * @param {Object} [options]
 * @param {boolean} [options.useClickedRange] - if true, build x-stopclassification directly from dtRange; else go through x-stopperiods
 * @param {Range} [options.fullRange] - parent range (defaults to dtRange)
 * @param {Array<Range>} [options.ranges] - multi-range selection forwarded as the `ranges` attribute (joined by &)
 * @param {boolean} [options.noadvanced] - hide the advanced options tile in x-stopclassification
 * @param {boolean} [options.closeAfterSave] - auto-close the dialog after a successful save
 * @param {Function} [options.onCloseExtra] - called after the default onClose, with `component` as `this`
 */
var openChangeStopClassificationDialog = exports.openChangeStopClassificationDialog = function (component, dtRange, options) {
  if ($('.dialog-stopclassification').length > 0) {
    return;
  }

  const useClickedRange = options && options.useClickedRange === true;

  // PAGE 1
  let dialog = $('<div></div>').addClass('dialog-stopclassification');

  let machid = $(component.element).attr('machine-id');
  let rangeString = dtRange.toString(d => d.toISOString());
  if (useClickedRange) {
    let fullRangeString = rangeString;
    if (options && options.fullRange) {
      fullRangeString = options.fullRange.toString(d => d.toISOString());
    }
    let attrs = {
      'machine-id': machid,
      'range': rangeString,
      'fullRange': fullRangeString
    };
    if (options && options.ranges && options.ranges.length > 0) {
      attrs.ranges = options.ranges.map(r => r.toString(d => d.toISOString())).join('&');
    }
    if (options && options.noadvanced) {
      attrs.noadvanced = true;
    }
    let xstopclassification = pulseUtility.createjQueryElementWithAttribute('x-stopclassification', attrs);
    dialog.append(xstopclassification);

    if (options && options.closeAfterSave && xstopclassification[0] && xstopclassification[0].closeAfterSave) {
      xstopclassification[0].closeAfterSave(true);
    }
  }
  else {
    // Use a provider that fetches ReasonOnlySlots and builds the classifier
    let xstopperiods = pulseUtility.createjQueryElementWithAttribute('x-stopperiods', {
      'machine-id': machid,
      'range': rangeString,
      'autocreate-stopclassification': true
    });
    dialog.append(xstopperiods);
  }

  pulseCustomDialog.openDialog(dialog, {
    title: component.getTranslation('stopclassification.title', 'Stops'),
    onClose: function () {
      $('.popup-block').fadeOut();
      if (options && typeof options.onCloseExtra === 'function') {
        options.onCloseExtra.call(component);
      }
    }.bind(component),
    autoClose: false,
    autoDelete: true,
    okButton: 'hidden',
    fullScreenOnSmartphone: true,
    bigSize: true,
    helpName: 'savereason',
    className: 'stopclassification'
  });
}

/**
 * Shared dialog for entering a reason comment (optional or required).
 * Used by x-savereason, x-stopclassification, and any component needing
 * a machine + period + reason + textarea dialog before saving.
 *
 * @memberof module:PulseComponentFunctions
 * @function openReasonCommentDialog
 *
 * @param {Object} component       - calling component (provides machine-id + getTranslation)
 * @param {number} classificationId
 * @param {string} reasonName
 * @param {string} rangeStr        - ISO range string
 * @param {boolean} detailsRequired - if true, OK is disabled until textarea has content
 * @param {Object} [reasonData]
 * @param {Function} onSave        - callback(classificationId, comment, reasonData)
 */
var openReasonCommentDialog = exports.openReasonCommentDialog = function (component, classificationId, reasonName, rangeStr, detailsRequired, reasonData, onSave) {
  let machid = component.element.getAttribute('machine-id');

  let rcdlg = pulseUtility.createjQueryElementWithAttribute('x-reasoncommentdialog', {
    'machine-id': machid,
    'range': rangeStr,
    'reason-name': reasonName,
    'details-required': detailsRequired ? 'true' : 'false'
  });

  let dialogId = pulseCustomDialog.openDialog(rcdlg, {
    title: component.getTranslation('reasonDetailsTitle', 'Reason details'),
    onOk: function () {
      let details = rcdlg[0].getDetails ? rcdlg[0].getDetails() : '';
      if (details === '' && detailsRequired) {
        pulseCustomDialog.openDialog(component.getTranslation('errorNoDetails', 'Please add a comment'), { type: 'Error' });
      } else {
        onSave(classificationId, details || undefined, reasonData);
        pulseCustomDialog.close('#' + dialogId);
      }
    },
    autoClose: false,
    autoDelete: true,
    helpName: 'savereason'
  });
};

/**
 * Click on a bar (Open popup / details / change...)
 *
 * @memberof module:PulseComponentFunctions
 * @function clickOnBar
 *
 * @param {Object} component - component calling openDetails -> must define following attributes : machine-id (showpopup must be filled in config)
 * @param {Range} fullRange - full date range of the component
 * @param {Range} cellRange - date range of the clicked cell
 * @param {Object} event - evt to get click position
 * @param {String} callerName - 'reason' for example
 */
exports.clickOnBar = function (component, fullRange, cellRange, event, callerName) {
  let barClick = pulseConfig.getString('showcoloredbar.click.' + callerName); // individual for THIS bar
  if ( pulseUtility.isNotDefined(barClick) || barClick == '') {
    barClick = pulseConfig.getString('showcoloredbar.click.allbars'); // For ALL bars
  }
  switch (barClick) {
    case 'details':
      openDetails(component, fullRange, cellRange, event);
      break;
    case 'popup':
      openPopup(component, fullRange, cellRange, event);
      break;
    case 'change':
      if (('cncalarm' == callerName) ||
        ('reason' == callerName) ||
        ('redstacklight' == callerName))
        openChangeReasonDialog(component, cellRange, true);
      break;
    case 'stopclassification':
      if ('reason' == callerName) {
        openChangeStopClassificationDialog(component, cellRange, { useClickedRange: true, fullRange: fullRange });
      }
      break;
    default:
      break;
  }
}

/**
 * Click on a bar (Open popup / details / change...)
 *
 * @memberof module:PulseComponentFunctions
 * @function openRunningDialog
 *
 * @param {Integer} groupId - group id
 */
exports.openRunningDialog = function (groupId) {
  let dialog = pulseUtility.createjQueryElementWithAttribute('x-runningdialog', {
    'group': groupId
  });

  pulseCustomDialog.openDialog(dialog, {
    title: pulseConfig.pulseTranslate('pages.running.title', ''),
    onClose: function () {
      // Special for popup on a dialog (Reason '+2' display) :
      $('.popup-block').fadeOut();
    },
    autoClose: true,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    fullSize: true
  });
}
