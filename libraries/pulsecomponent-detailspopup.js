// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
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

function _fadeOutPopupBlocks () {
  let blocks = document.querySelectorAll('.popup-block');
  for (let i = 0; i < blocks.length; i++) pulseUtility.fadeOut(blocks[i]);
}

/**
 * @module PulseComponentFunctions -> detailspopup AND change
 */

/**
 * Open a dialog with Details for a machine at a specific time
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

  let machineid = component.element.getAttribute('machine-id');

  let dialog = pulseUtility.createElementWithAttribute('x-detailsatdialog', {
    'machine-id': machineid,
    'when': d_clickTime.toISOString(),
    'range': fullRange.toString(d => d.toISOString())
  });

  pulseCustomDialog.openDialog(dialog, {
    title: pulseConfig.pulseTranslate('dialog.details', 'Details'),
    okButton: 'hidden',
    onOk: function () { },
    onClose: function () {
      // Special for popup on a dialog (Reason '+2' display) :
      _fadeOutPopupBlocks();
    }.bind(component),
    autoClose: true,
    autoDelete: true,
    bigSize: true,
    helpName: 'details'
  });
}

/**
 * Open a popup with fillMethod
 */
var openGenericPopup = exports.openGenericPopup = function (fillMethod, evt) {
  // Find or create the popup block
  let popup = document.querySelector('.popup-block');
  if (popup == null) {
    popup = document.createElement('div');
    popup.className = 'popup-block';
    document.body.appendChild(popup);
    // Delegated click on #pulse-inner -> fade out the popup
    document.body.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('#pulse-inner')) {
        _fadeOutPopupBlocks();
      }
    });
  }
  // Special for popup on a dialog (Reason '+2' display) - always, even for 2nd open
  let contents = document.querySelectorAll('.customDialogContent');
  for (let i = 0; i < contents.length; i++) {
    contents[i].addEventListener('click', _fadeOutPopupBlocks);
  }

  // Clear popup
  popup.replaceChildren();

  // Fill popup
  fillMethod(popup);

  // Manage position
  let w = window.innerWidth;
  let h = window.innerHeight;
  let cs = window.getComputedStyle(popup);
  let borderPadding = parseInt(cs.borderRightWidth || 0) +
    parseInt(cs.paddingRight || 0) +
    parseInt(cs.borderLeftWidth || 0) +
    parseInt(cs.paddingLeft || 0);
  // Init popup width
  let popupWidth = w / 3.5 - borderPadding;
  let maxPositionBeforeLeftDisplay = w -
    (popupWidth > (w / 3)) ? popupWidth : (w / 3);
  let leftPosition = (evt.clientX < maxPositionBeforeLeftDisplay) ?
    evt.clientX :
    (evt.clientX - popupWidth - borderPadding);

  pulseUtility.fadeIn(popup);
  popup.style.width = popupWidth + 'px';
  popup.style.left = leftPosition + 'px';
  if (evt.clientY < h / 2) {
    popup.style.top = evt.clientY + 'px';
    popup.style.bottom = 'auto';
  }
  else {
    let bottomPosition = h - evt.clientY;
    popup.style.top = 'auto';
    popup.style.bottom = bottomPosition + 'px';
  }

  if (typeof evt.stopPropagation === 'function')
    evt.stopPropagation(); // Stop for ALL propagations
}

/**
 * Open a popup with Details for a machine at a specific time
 */
var openPopup = exports.openPopup = function (component, fullRange, cellRange, evt) {
  // Get datetime at clicked position
  let e = evt.target;
  let dim = e.getBoundingClientRect();
  let x = evt.clientX - dim.left;

  let d_clickTime = new Date(cellRange.lower.getTime());
  if (dim.width > 0) {
    let duration = cellRange.upper.getTime() - cellRange.lower.getTime();
    d_clickTime = new Date(cellRange.lower.getTime() + (duration) * x / dim.width);
  }

  if ((new Date()).getTime() < d_clickTime.getTime()) {
    _fadeOutPopupBlocks();
    return; //  Do not display future data
  }

  let fillMethod = function (popup, component, d_clickTime, fullRange) {
    // Fill popup
    let configArray = pulseConfig.getArray('showcoloredbar.showpopup');
    if (configArray.length == 0) {
      console.warn('No popup content defined');
    }
    else {
      for (let iConfig = 0; iConfig < configArray.length; iConfig++) {
        popup.appendChild(
          pulseUtility.createElementWithAttribute(
            configArray[iConfig],
            {
              'machine-id': component.element.getAttribute('machine-id'),
              'when': d_clickTime.toISOString(),
              'range': '[' + fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString() + ')',
              'period-context': 'details'
            }));
      }
    }
  }

  openGenericPopup((popup => fillMethod(popup, component, d_clickTime, fullRange)), evt);
}

/**
 * Open a change work info (job, component...) dialog for a machine and a specific range
 */
exports.openChangeWorkInfoDialog = function (component, dtRange) {
  if (document.querySelector('.dialog-saveworkinfo') != null) {
    return;
  }

  // PAGE 1
  let dialog = document.createElement('div');
  dialog.className = 'dialog-saveworkinfo';

  let machid = component.element.getAttribute('machine-id');
  let rangeString = dtRange.toString(d => d.toISOString());
  let xworkinfoslotlist = pulseUtility.createElementWithAttribute('x-workinfoslotlist', {
    'machine-id': machid,
    'range': rangeString
  });
  dialog.appendChild(xworkinfoslotlist);

  let saveDialogId = pulseCustomDialog.openDialog(dialog, {
    title: component.getTranslation('saveworkinfo.WorkInfoTitle', 'Work information'),
    onClose: function () {
      _fadeOutPopupBlocks();
    }.bind(component),
    autoClose: false,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    bigSize: true
  });

  // PAGE 2 -> in WISL ? - Not ended yet 2019-05 Maybe later when needed
  let xMachine = pulseUtility.createElementWithAttribute('x-machinedisplay', {
    'machine-id': machid
  });
  let titleEl = document.querySelector('#' + saveDialogId + ' .customDialogTitle');
  if (titleEl != null) titleEl.appendChild(xMachine);
}

/**
 * Open a change reason dialog for a machine and a specific range
 */
var openChangeReasonDialog = exports.openChangeReasonDialog = function (component, dtRange, skip1periodlist, forceDetails, displayMode) {
  if (document.querySelector('.dialog-savereason') != null) {
    return;
  }

  // PAGE 1
  let dialog = document.createElement('div');
  dialog.className = 'dialog-savereason';

  let machid = component.element.getAttribute('machine-id');
  let rangeString = dtRange.toString(d => d.toISOString());
  let useUnanswered = pulseConfig.getBool('detailspopup.useUnansweredReasonSlotList', false);
  let reasonslotlistTag = (useUnanswered && !forceDetails) ? 'x-unansweredreasonslotlist' : 'x-reasonslotlist';

  // Determine displayMode if not provided
  let effectiveDisplayMode = displayMode;
  if (!effectiveDisplayMode && reasonslotlistTag === 'x-reasonslotlist') {
    effectiveDisplayMode = 'only-overwrite-required';
  }

  let xreasonslotlist = pulseUtility.createElementWithAttribute(reasonslotlistTag, {
    'machine-id': machid,
    'range': rangeString,
    'skip1periodlist': skip1periodlist
  });
  if (effectiveDisplayMode) {
    xreasonslotlist.setAttribute('display-mode', effectiveDisplayMode);
  }
  dialog.appendChild(xreasonslotlist);

  let saveDialogId = pulseCustomDialog.openDialog(dialog, {
    title: component.getTranslation('savereason.saveReasonTitle', 'Set reason'),
    onClose: function () {
      _fadeOutPopupBlocks();
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
  let xMachine = pulseUtility.createElementWithAttribute('x-machinedisplay', {
    'machine-id': machid
  });
  let titleEl = document.querySelector('#' + saveDialogId + ' .customDialogTitle');
  if (titleEl != null) titleEl.appendChild(xMachine);
}

/**
 * Open a change scrap classification dialog for a machine
 */
var openChangeScrapClassificationDialog = exports.openChangeScrapClassificationDialog = function (component) {
  if (document.querySelector('.dialog-scrapclassification') != null) {
    return;
  }

  // PAGE 1
  let dialog = document.createElement('div');
  dialog.className = 'dialog-scrapclassification';

  let machid = component.element.getAttribute('machine-id');
  let xscrapclassification = pulseUtility.createElementWithAttribute('x-scrapclassification', {
    'machine-id': machid,
  });
  dialog.appendChild(xscrapclassification);

  pulseCustomDialog.openDialog(dialog, {
    title: component.getTranslation('scrapclassification.title', 'Declare scrap'),
    onClose: function () {
      _fadeOutPopupBlocks();
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
 */
var openChangeStopClassificationDialog = exports.openChangeStopClassificationDialog = function (component, dtRange, options) {
  if (document.querySelector('.dialog-stopclassification') != null) {
    return;
  }

  const useClickedRange = options && options.useClickedRange === true;

  // PAGE 1
  let dialog = document.createElement('div');
  dialog.className = 'dialog-stopclassification';

  let machid = component.element.getAttribute('machine-id');
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
    let xstopclassification = pulseUtility.createElementWithAttribute('x-stopclassification', attrs);
    dialog.appendChild(xstopclassification);

    if (options && options.closeAfterSave && xstopclassification.closeAfterSave) {
      xstopclassification.closeAfterSave(true);
    }
  }
  else {
    let xstopperiods = pulseUtility.createElementWithAttribute('x-stopperiods', {
      'machine-id': machid,
      'range': rangeString,
      'autocreate-stopclassification': true
    });
    dialog.appendChild(xstopperiods);
  }

  pulseCustomDialog.openDialog(dialog, {
    title: component.getTranslation('stopclassification.title', 'Stops'),
    onClose: function () {
      _fadeOutPopupBlocks();
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
 */
var openReasonCommentDialog = exports.openReasonCommentDialog = function (component, classificationId, reasonName, rangeStr, detailsRequired, reasonData, onSave) {
  let machid = component.element.getAttribute('machine-id');

  let rcdlg = pulseUtility.createElementWithAttribute('x-reasoncommentdialog', {
    'machine-id': machid,
    'range': rangeStr,
    'reason-name': reasonName,
    'details-required': detailsRequired ? 'true' : 'false'
  });

  let dialogId = pulseCustomDialog.openDialog(rcdlg, {
    title: component.getTranslation('reasonDetailsTitle', 'Reason details'),
    onOk: function () {
      // Trim so a whitespace-only comment counts as empty for both the
      // required-details check and the value handed to onSave.
      let details = (rcdlg.getDetails ? rcdlg.getDetails() : '').trim();
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
 */
exports.clickOnBar = function (component, fullRange, cellRange, event, callerName) {
  let barClick = pulseConfig.getString('showcoloredbar.click.' + callerName); // individual for THIS bar
  if (pulseUtility.isNotDefined(barClick) || barClick == '') {
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
 * Open the running dialog for a group
 */
exports.openRunningDialog = function (groupId) {
  let dialog = pulseUtility.createElementWithAttribute('x-runningdialog', {
    'group': groupId
  });

  pulseCustomDialog.openDialog(dialog, {
    title: pulseConfig.pulseTranslate('pages.running.title', ''),
    onClose: function () {
      _fadeOutPopupBlocks();
    },
    autoClose: true,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    fullSize: true
  });
}
