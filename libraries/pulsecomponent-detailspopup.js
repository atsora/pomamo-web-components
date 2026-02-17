// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

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
require('x-grouparray/x-grouparray');
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

  // Create Dialog
  let dialog = $('<div></div>').addClass('click-on-bar-details-dialog');
  let title = $('<div></div>').addClass('click-on-bar-details-title');
  let content = $('<div></div>').addClass('click-on-bar-details-content');

  let machineid = $(component.element).attr('machine-id');

  let xMachine = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
    'machine-id': machineid
  });

  let tmpDateRange = pulseRange.createDateRangeDefaultInclusivity(d_clickTime.toISOString(), d_clickTime.toISOString());
  let atDisplay = pulseUtility.displayDateRange(tmpDateRange, true);

  let spanAt = $('<span></span>').addClass('detailed-at-subtitle')
    .html(atDisplay);
  let xPeriodBar = pulseUtility.createjQueryElementWithAttribute('x-datetimerange', {
    'period-context': 'details',
    'range': fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString(), // old range
    'datetime-context': 'details', // force center on red line
    'when': d_clickTime.toISOString()
  });
  title.append(xMachine).append(spanAt).append(xPeriodBar);
  dialog.append(title).append(content);

  // next lines AFTER dialog.append(title) to display the right width
  let xGraduation = pulseUtility.createjQueryElementWithAttribute('x-datetimegraduation', {
    'period-context': 'details',
    'range': fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString()
  });
  let barHeight = 30;
  let xReasonBar = pulseUtility.createjQueryElementWithAttribute('x-reasonslotbar', {
    'machine-id': machineid,
    'period-context': 'details',
    'height': barHeight,
    'range': fullRange.toString(d => d.toISOString()),
    'showoverwriterequired': false, // forced to overload config
    //'click': 'none', // Automatic because click is on bartimeselection
    //'datetime-context': 'details' // force refresh details on click
  });
  let middlebar = $('<div></div>').addClass('pulse-bar-div').append(xReasonBar);

  let configArray = pulseConfig.getArray('showcoloredbar.showdetails');
  if (configArray.length == 0) {
    console.warn('No details defined');
  }
  else {
    for (let iConfig = 0; iConfig < configArray.length; iConfig++) {
      if (configArray[iConfig] == 'x-cncalarmbar') { // WAS 'x-detailedalarmsat') { // DISPLAY ALARM ?
        let xAlarmBar = pulseUtility.createjQueryElementWithAttribute('x-cncalarmbar', {
          'machine-id': machineid,
          'period-context': 'details',
          'range': fullRange.toString(d => d.toISOString()),
          //'click': 'none', // Automatic because click is on bartimeselection
          //'datetime-context': 'details' // force refresh details on click
        });
        middlebar.append(xAlarmBar);
      }
      else if (configArray[iConfig] == 'x-redstacklightbar') { // WAS x-detailedcncvaluesat') { // DISPLAY Cncvalue <-> stacklight
        let xRedStackLightBar = pulseUtility.createjQueryElementWithAttribute('x-redstacklightbar', {
          'machine-id': machineid,
          'period-context': 'details',
          'range': fullRange.toString(d => d.toISOString()),
          //'click': 'none', // Automatic because click is on bartimeselection
          //'datetime-context': 'details' // force refresh details on click
        });
        middlebar.append(xRedStackLightBar);
      }
      else {
        content.append(
          pulseUtility.createjQueryElementWithAttribute(configArray[iConfig], {
            'machine-id': machineid,
            'when': d_clickTime.toISOString(),
            'datetime-context': 'details',
            'range': fullRange.toString(d => d.toISOString()),
            'period-context': 'details'
          }));
      }
    }
  }

  let xSelBar = pulseUtility.createjQueryElementWithAttribute('x-bartimeselection', {
    'height': barHeight,
    'range': fullRange.lower.toISOString() + ';' + fullRange.upper.toISOString(),
    'period-context': 'details',
    'datetime-context': 'details', // force refresh details on click
    'when': d_clickTime.toISOString()
  });
  middlebar.append(xSelBar);
  title.append(xGraduation).append(middlebar);

  let dialogId = pulseCustomDialog.initialize(dialog, {
    title: pulseConfig.pulseTranslate ('dialog.details', 'Details'),
    onOk: function () { // Validate
    },
    onClose: function () {
      // Special for popup on a dialog (Reason '+2' display) :
      $('.popup-block').fadeOut();
    }.bind(component),
    autoClose: true,
    autoDelete: true,
    bigSize: true,
    fixedHeight: true,
    helpName: 'details'
  });
  pulseCustomDialog.open('#' + dialogId);
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
  let saveDialogId = pulseCustomDialog.initialize(dialog, {
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
    fixedHeight: true,
    bigSize: true
  });

  let machid = $(component.element).attr('machine-id');
  let rangeString = dtRange.toString(d => d.toISOString());
  let xworkinfoslotlist = pulseUtility.createjQueryElementWithAttribute('x-workinfoslotlist', {
    'machine-id': machid,
    //'only-overwrite-required': true, //component.requiredReason,
    'range': rangeString
    //'skip1periodlist': skip1periodlist
  });
  dialog.append(xworkinfoslotlist);

  // PAGE 2 -> in WISL ? - Not ended yet 2019-05 Maybe later when needed
  pulseCustomDialog.open('#' + saveDialogId);

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
 *
 */
var openChangeReasonDialog = exports.openChangeReasonDialog = function (component, dtRange, skip1periodlist) {
  if ($('.dialog-savereason').length > 0) {
    return;
  }

  // PAGE 1
  let dialog = $('<div></div>').addClass('dialog-savereason');
  let saveDialogId = pulseCustomDialog.initialize(dialog, {
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
    fixedHeight: true,
    bigSize: true,
    helpName: 'savereason'
  });
  let machid = $(component.element).attr('machine-id');
  let rangeString = dtRange.toString(d => d.toISOString());
  let role = pulseConfig.getAppContextOrRole && pulseConfig.getAppContextOrRole();
  let reasonslotlistTag = (role === 'operator') ? 'x-unansweredreasonslotlist' : 'x-reasonslotlist';
  let xreasonslotlist = pulseUtility.createjQueryElementWithAttribute(reasonslotlistTag, {
    'machine-id': machid,
    'only-overwrite-required': true, //component.requiredReason,
    'range': rangeString,
    'skip1periodlist': skip1periodlist
  });
  dialog.append(xreasonslotlist);

  // PAGE 2 -> in RSL ?
  pulseCustomDialog.open('#' + saveDialogId);

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
  let scrapClassificationDialogId = pulseCustomDialog.initialize(dialog, {
    title: component.getTranslation('scrapClassification.title', 'Declare scrap'),
    onClose: function () {
      $('.popup-block').fadeOut();
    }.bind(component),
    autoClose: false,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    fixedHeight: true,
    fullSize: true,
    helpName: 'savereason',
    className: 'scrapclassification'
  });
  let machid = $(component.element).attr('machine-id');
  // Use a provider that fetches ReasonOnlySlots and builds the classifier
  let xscrapclassification = pulseUtility.createjQueryElementWithAttribute('x-scrapclassification', {
    'machine-id': machid,
  });
  dialog.append(xscrapclassification);

  pulseCustomDialog.open('#' + scrapClassificationDialogId);
}

/**
 * Open a change reason dialog for a machine and a specific range
 *
 * @memberof module:PulseComponentFunctions
 * @function openChangeStopClassificationDialog
 *
 * @param {Object} component - component calling openChangeStopClassificationDialog -> must define following attributes : machine-id
 * @param {Range} dtRange - date range
 *
 */
var openChangeStopClassificationDialog = exports.openChangeStopClassificationDialog = function (component, dtRange, options) {
  if ($('.dialog-stopclassification').length > 0) {
    return;
  }

  const useClickedRange = options && options.useClickedRange === true;

  // PAGE 1
  let dialog = $('<div></div>').addClass('dialog-stopclassification');
  let stopClassificationDialogId = pulseCustomDialog.initialize(dialog, {
    title: component.getTranslation('stopclassification.title', 'Unplanned stops'),
    onClose: function () {
      $('.popup-block').fadeOut();
    }.bind(component),
    autoClose: false,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    fixedHeight: true,
    bigSize: true,
    helpName: 'savereason',
    className: 'stopclassification'
  });
  let machid = $(component.element).attr('machine-id');
  let rangeString = dtRange.toString(d => d.toISOString());
  if (useClickedRange) {
    let fullRangeString = rangeString;
    if (options && options.fullRange) {
      fullRangeString = options.fullRange.toString(d => d.toISOString());
    }
    let xstopclassification = pulseUtility.createjQueryElementWithAttribute('x-stopclassification', {
      'machine-id': machid,
      'range': rangeString,
      'fullRange': fullRangeString
    });
    dialog.append(xstopclassification);
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

  pulseCustomDialog.open('#' + stopClassificationDialogId);
}

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
  let pageName = 'running';
  // CREATE Dialog
  let dialog = $('<div></div>').addClass('dialog-running');
  let dialogId = pulseCustomDialog.initialize(dialog, {
    title: pulseConfig.pulseTranslate('pages.' + pageName + '.title', ''),
    onClose: function () {
      // Special for popup on a dialog (Reason '+2' display) :
      $('.popup-block').fadeOut();
    },
    autoClose: true,
    autoDelete: true,
    okButton: 'hidden',
    cancelButton: 'hidden',
    fullScreenOnSmartphone: true,
    fixedHeight: true,
    fullSize: true
  });

  // FILL Dialog
  let hiddenRunningDivContent = $('<div class="one_machine_cell" id="boxtocloneRunning"> \
  <div class="div-machine"> \
    <x-machinedisplay></x-machinedisplay> \
    <div class="div-current"> \
      <div class="div-current-left"> \
        <x-reasonbutton></x-reasonbutton> \
      </div> \
      <div class="div-current-right"> \
        <x-productionmachiningstatus bar-style="false"></x-productionmachiningstatus> \
        <x-lastworkinformation cancel-bar-style="true"></x-lastworkinformation> \
        <x-lastshift></x-lastshift> \
        <x-currentcncvalue></x-currentcncvalue> \
      </div> \
    </div> \
  </div> \
  <div class="div-bar"> \
    <div class="pulse-bar-div"> \
      <div class="top-bar"> \
        <x-shiftslotbar period-context="runningdialog"></x-shiftslotbar> \
        <x-machinestatebar period-context="runningdialog"></x-machinestatebar> \
        <x-observationstatebar period-context="runningdialog"></x-observationstatebar> \
      </div> \
      <div class="middle-bar"> \
        <x-operationcyclebar period-context="runningdialog"></x-operationcyclebar> \
        <x-operationslotbar period-context="runningdialog"></x-operationslotbar> \
        <x-isofileslotbar period-context="runningdialog"></x-isofileslotbar> \
        <x-reasonslotbar motion-context="motion_machine" period-context="runningdialog"> \
        </x-reasonslotbar> \
        <x-cncalarmbar period-context="runningdialog"></x-cncalarmbar> \
        <x-redstacklightbar period-context="runningdialog"></x-redstacklightbar> \
        <x-cncvaluebar period-context="runningdialog"></x-cncvaluebar> \
      </div> \
      <div class="bottom-bar"></div> \
    </div> \
  </div> \
  <div class="div-percent"> \
    <x-motionpercentage motion-context="motion_machine" period-context="runningdialog"></x-motionpercentage> \
    <x-motiontime motion-context="motion_machine" period-context="runningdialog"></x-motiontime> \
  </div> \
</div>');
  let hiddenRunningDiv = $('<div class="hidden-content"></div>')
    .append(hiddenRunningDivContent);

  let mainPageDivContent = $(
    '<div class="main-table running-page"> \
      <div class="one_machine_cell top_cell"> \
        <div class="div-machine"> \
          <div class="div-current"> \
            <label class="label-current">Current:</label> \
            <x-clock display-seconds=false></x-clock> \
          </div> \
        </div> \
        <div class="div-bar"> \
          <x-periodtoolbar period-context="runningdialog"></x-periodtoolbar> \
        </div> \
        <div class="div-percent"></div> \
      </div> \
    </div> \
    <div class= "main-table tile running-page" > \
      <div class="one_machine_cell"> \
        <div class="div-machine"></div> \
        <div class="div-bar"> \
          <x-datetimegraduation period-context="runningdialog"></x-datetimegraduation> \
        </div> \
        <div class="div-percent"></div> \
      </div> \
      <x-grouparray templateid="boxtocloneRunning" column=1 group='
    + groupId
    + '></x-grouparray >\
    </div>');
  let mainPageDiv = $('<div class="pulse-mainarea"></div>').append(mainPageDivContent);

  dialog.append(hiddenRunningDiv).append(mainPageDiv);


  let addProductionMachining = pulseConfig.getBool('currentdisplay.displayjobshiftpartcount', false);
  let displayJob = pulseConfig.getBool('currentdisplay.displayjob', true);
  let displayShift = pulseConfig.getBool('currentdisplay.displayshift', true);
  let displayCNCValue = pulseConfig.getBool('currentdisplay.displaycncvalue', true);

  if (addProductionMachining) {
    $(dialog).find('x-productionmachiningstatus').show();
  }
  else {
    $(dialog).find('x-productionmachiningstatus').hide();
  }
  if (displayJob) { // == LastWorkinformation
    $(dialog).find('x-lastworkinformation').show();
  }
  else {
    $(dialog).find('x-lastworkinformation').hide();
  }
  if (displayShift) {
    $(dialog).find('x-lastShift').show();
  }
  else {
    $(dialog).find('x-lastShift').hide();
  }
  if (displayCNCValue) {
    $(dialog).find('x-currentcncvalue').show();
  }
  else {
    $(dialog).find('x-currentcncvalue').hide();
  }

  // OPEN Dialog
  pulseCustomDialog.open('#' + dialogId);
}
