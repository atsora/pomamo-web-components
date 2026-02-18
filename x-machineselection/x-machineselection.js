// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machineselection
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulsecustomdialog
 */
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');
var pulseComponent = require('pulsecomponent');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseLogin = require('pulseLogin');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');

require('x-grouparray/x-grouparray');
require('x-machinedisplay/x-machinedisplay');
require('x-freetext/x-freetext');

(function () {
  class MachineSelectionComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    constructor(...args) {
      const self = super(...args);

      self._configMachines = 'machine';
      self._configGroups = 'group';

      self._groupSelectionArray = [];
      self._machineSelectionArray = [];
      self._useMachineSelection = false;

      self._groups = [];
      self._groupDisplays = new Map();

      self._uniquemachine = false;

      self._dialogPage1 = undefined;
      self._categoryList = undefined;

      self._dialogPage2 = undefined;
      self._machinesSearchDiv = undefined;
      self._machinesList = undefined;
      self._machinesListContainer = undefined;
      self._selectionTitle = undefined;
      self._selectionHeader = undefined;
      self._selectionList = undefined;
      self._selectionListContainer = undefined;
      self._useMachineButton = undefined;
      self._previewHeader = undefined;
      self._previewList = undefined;
      self._previewListContainer = undefined;
      self._messageSpan = undefined;
      self._editbutton = undefined;
      self._summary = undefined;

      self._dialogId = undefined;
      self.methods = {
        'changeMachineSelection': self.changeMachineSelection,
        'fillExternalSummaryDisplay': self.fillExternalSummaryDisplay,
        'getMachinesArray': self.getMachinesArray,
        'getGroupsArray': self.getGroupsArray,
        'getMachinesString': self.getMachinesString,
        'getGroupsString': self.getGroupsString
      };

      if (!this.element.hasAttribute('in-report')) {
        pulseConfig.setGlobal(this._configMachines, '');
        pulseConfig.setGlobal(this._configGroups, '');
      }

      return self;
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'unique-machine': {
          this._uniquemachine = (this.element.hasAttribute('unique-machine')
            && this.element.getAttribute('unique-machine') == 'true');
          this.start();
        } break;
        default:
          break;
      }
    }

    validateParameters() {
      this.switchToNextContext();
    }

    clearInitialization() {
      $(this.element).empty();
      this._editbutton = undefined;
      this._summary = undefined;
      this._messageSpan = undefined;
      super.clearInitialization();
    }

    initParamForReport(divToFill, name, parameterkey, dataType, parameterType,
      defaultValue, value, required, hidden, helptext) {
      $(divToFill).addClass('parameter');
      $(divToFill).append("<input type='hidden' id='name' value='" + name + "' />");
      $(divToFill).append("<input type='hidden' id='parameterkey' value='" + parameterkey + "' />");
      $(divToFill).append("<input type='hidden' id='defaultvalue' value='" + defaultValue + "' />");
      let retInput = $("<input type='hidden' id='value' value='" + value + "' />");
      $(divToFill).append(retInput);
      $(divToFill).append("<input type='hidden' id='datatype' value='" + dataType + "' />");
      $(divToFill).append("<input type='hidden' id='parametertype' value='" + parameterType + "' />");
      $(divToFill).append("<input type='hidden' id='required' value='" + required + "' />");
      $(divToFill).append("<input type='hidden' id='helptext' value='" + helptext + "' />");
      $(divToFill).append("<input type='hidden' id='hidden' value='" + hidden + "' />");
      if (parameterkey == 'WEBAPP') {
        $(divToFill).append("<input type='hidden' id='widget' value='TEXTBOX' />");
        retInput = $("<input type='hidden' id='" + name + "_value' value= />");
        $(divToFill).append(retInput);
      }
      return retInput;
    }

    initialize() {
      this.addClass('pulse-text');

      this._uniquemachine =
        ('true' == this.getConfigOrAttribute('unique-machine', 'false'));

      $(this.element).empty();

      this._editbutton = $('<button title="Change machines" role="button" ></button>')
        .addClass('machineselection-editbutton')
        .html('edit')
        .click(
          function () {
            this.changeMachineSelection();
          }.bind(this)
        );
      this._summary = $('<div></div>')
        .addClass('machineselection-summary');
      $(this.element)
        .append(this._editbutton).append(this._summary);

      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);

      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      if (this.element.hasAttribute('in-report')) {
        let reportDiv = $('<div></div>').addClass('pulse-report-hidden');
        $(this.element).append(reportDiv);

        let groupReportDiv = $('<div></div>').addClass('pulse-report-hidden');
        this.initParamForReport(groupReportDiv,
          'PulseGroups', 'GROUPPOS',
          'STRING',
          'SIMPLE', '', '',
          'false', 'false', '');
        reportDiv.append(groupReportDiv);

        let machineReportDiv = $('<div></div>').addClass('pulse-report-hidden');
        this.initParamForReport(machineReportDiv,
          'PulseMachines', 'MACHINES',
          'STRING',
          'SIMPLE', '', '',
          'false', 'false', '');
        reportDiv.append(machineReportDiv);
      }

      this.switchToNextContext();
    }

    displayError(message) {}

    get isVisible() {
      if (pulseConfig.isLoginPage()) {
        return false;
      }
      if (!this._connected) {
        return false;
      }
      return true;
    }

    getShortUrl() {
      let url = 'Machine/Groups?Zoom=true&MachineList=true';
      return url;
    }

    refresh(data) {
      this._groups = data.GroupCategories;
      this._machinesFromService = data.MachineList;
      this._storeDisplays();
      this._loadSelection();
      this._fillCategoryList();
      this._fillSummaryDisplay();
      this._fillMachinesList();
    }

    changeMachineSelection() {
      this._createDialogIfNotDone();

      if (undefined == this._dialogId)
        return;
      pulseCustomDialog.open(this._dialogPage1, this._dialogId);
    }

    _createDialogIfNotDone() {
      if (undefined != this._dialogId)
        return;

      ////////// //////////
      // Page 1  //////////
      this._dialogPage1 = $('<div></div>').addClass('machineSelectionDialogPart1');
      let page1 = $('<div></div>').addClass('machineselection-page1');
      this._dialogPage1.append(page1);

      let div_buttons = $('<div></div>').addClass('machineselection-buttons');
      this._clearFilters_button = $('<button></button>')
        .addClass('machineselection-button')
        .addClass('machineselection-clearfilters').html(this.getTranslation('clearButton', 'Clear'));
      this._clearFilters_button.click(function () {
        this._clearSelection();
      }.bind(this));
      div_buttons.append(this._clearFilters_button);

      let div_switch_buttons = $('<div></div>').addClass('machineselection-switch-group-machines');
      this._switchToGroups_button = $('<button></button>')
        .addClass('machineselection-button')
        .addClass('machineselection-switch-to-groups').html(this.getTranslation('groupsButton', ' by group'));
      this._switchToGroups_button.click(function () {
        this._groupSelectionArray = [];
        this._machineSelectionArray = [];
        this._switchToGroupSelection();
        this._changeSelectionInCategoryList();
      }.bind(this));
      div_switch_buttons.append(this._switchToGroups_button);

      this._switchToMachines_button = $('<button></button>')
        .addClass('machineselection-button')
        .addClass('machineselection-switch-to-machines').html(this.getTranslation('machinesButton', ' by machine'));
      this._switchToMachines_button.click(function () {
        this._groupSelectionArray = [];
        this._machineSelectionArray = [];
        this._switchToMachineSelection();
        this._changeSelectionInMachineList();
      }.bind(this));
      div_switch_buttons.append(this._switchToMachines_button);

      let div_container_page1 = $('<div></div>')
        .addClass('machineselection-container-page1');

      div_container_page1.append(div_switch_buttons);

      this._categoryList = $('<div></div>').addClass('machineselection-categorylist');
      div_container_page1.append(this._categoryList);

      this._machinesList = $('<div></div>').addClass('machineselection-machines-list');
      this._machinesListContainer = $('<div></div>')
        .addClass('machineselection-machines-list-container')
        .append(this._machinesList);

      this._machinesSearchDiv = $('<div></div>').addClass('machineselection-machines-search-div');

      this._inputSearch = $('<input></input>').addClass('machineselection-machines-search-input')
        .attr('type', 'text').attr('placeholder', this.getTranslation('searchDots', 'Search...'));
      this._machinesSearchDiv.append(this._inputSearch);

      div_container_page1.append(this._machinesSearchDiv).append(this._machinesListContainer);

      $(this._inputSearch).on('input', function () {
        this._showHideMachinesInList();
      }.bind(this));

      div_container_page1.append(div_buttons);
      page1.append(div_container_page1);


      ////////// //////////
      // Page 2  //////////
      this._dialogPage2 = $('<div></div>').addClass('machineSelectionDialogPart2');
      let page2 = $('<div></div>').addClass('machineselection-page2');
      this._dialogPage2.append(page2);

      this._selectionTitle = $('<span></span>').addClass('machineselection-title')
        .html('Selected');
      this._selectionHeader = $('<div></div>').addClass('machineselection-selection-header')
        .append(this._selectionTitle);
      this._selectionList = $('<div></div>').addClass('machineselection-selection-list');
      this._selectionListContainer = $('<div></div>')
        .addClass('machineselection-selection-list-container')
        .append(this._selectionList);

      page2.append(this._selectionHeader).append(this._selectionListContainer);

      let previewTitle = $('<span></span>').addClass('machineselection-preview-title')
        .html('preview machines');
      this._freeTextLastUpdate = pulseUtility.createjQueryElementWithAttribute('x-freetext', {
        'textchange-context': 'machineselection'
      });
      this._useMachineButton = $('<div></div>').addClass('machineselection-usemachines-button')
        .attr('title', this.getTranslation('switchToMachineSelection', 'Switch to machine selection'));
      this._previewHeader = $('<div></div>').addClass('machineselection-preview-header')
        .append(previewTitle).append(this._freeTextLastUpdate).append(this._useMachineButton);
      this._previewList = $('<div></div>').addClass('machineselection-preview-list');
      this._previewListContainer = $('<div></div>')
        .addClass('machineselection-preview-list-container')
        .append(this._previewList);

      page2.append(this._previewHeader).append(this._previewListContainer);

      pulseSvg.inlineBackgroundSvg(this._useMachineButton);

      this._useMachineButton.click(function () {
        let grouparrays = $(this._previewList).find('x-grouparray');
        if (grouparrays.length > 0) {
          let machinesList = grouparrays[0].getMachinesList();
          this._machineSelectionArray = machinesList.split(',');
          this._changeSelectionInMachineList();
        }
        this._switchToMachineSelection();
      }.bind(this));

      this._fillCategoryList();

      // Create a dialog
      this._dialogId = pulseCustomDialog.initialize(this._dialogPage1, {
        title: this._uniquemachine ? this.getTranslation('selectMachine', 'Select a machine') : this.getTranslation('selectMachines', 'Select machines'),
        autoClose: false,
        className: 'machineselection', // Indispensable pour notre CSS
        onOpen: function () {
          this._loadSelection();
        }.bind(this),
        onOk: function () {
          if (this._useMachineSelection) {
            if (this._machineSelectionArray.length == 0) {
              pulseCustomDialog.openError(
                this._uniquemachine
                  ? this.getTranslation('errorMissingUnique', 'Please select one machine')
                  : this.getTranslation('errorMissing', 'Please select at least one machine'));
              return;
            }
          }
          else {
            if (this._groupSelectionArray.length == 0) {
              pulseCustomDialog.openError(
                this.getTranslation('errorMissingGroup', 'Please select at least one group'));
              return;
            }
            if ($(this._previewList).find('.no-machines').length > 0) {
              let staticOnly = true;
              for (let iGroup = 0; iGroup < this._groupSelectionArray.length; iGroup++) {
                let groupId = this._groupSelectionArray[iGroup].toString();
                if (this._groupDisplays.has(groupId)) {
                  let displayClass = this._groupDisplays.get(groupId);
                  if (displayClass.dynamic)
                    staticOnly = false;
                }
              }
              if (staticOnly) {
                pulseCustomDialog.openError(
                  this.getTranslation('errorMissingMachineInGroup', 'Please select groups including at least one machine.'));
                return;
              }
            }
          }
          this._storeSelection();
          this._fillSummaryDisplay();
          pulseCustomDialog.close(this._dialogPage1);
        }.bind(this),
        onCancel: function () {
          pulseCustomDialog.close(this._dialogPage1);
        }.bind(this),
        fullScreenOnSmartphone: true,
        fullSize: true,
        helpName: 'machineselection'
      });

      // CORRECTION VITALE : this._dialogPage1 au lieu de this._dialogId
      pulseCustomDialog.addPage(this._dialogPage1, this._dialogPage2);

      // Ces deux méthodes peuvent de nouveau s'exécuter normalement :
      this._fillMachinesList();
      this._switchToGroupSelection();
    }

    _switchToMachineSelection() {
      this._useMachineSelection = true;

      if (this._machinesListContainer == undefined)
        return;
      this._previewHeader.hide();
      this._previewListContainer.hide();

      this._selectionTitle.html(this.getTranslation('selectedMachines', 'Selected machines'));

      this._machinesSearchDiv.show();
      this._machinesListContainer.show();

      this._groupSelectionArray = [];
      this._changeSelectionInCategoryList();
      this._categoryList.hide();

      this._changeSelectionInMachineList();

      this._switchToMachines_button.addClass('selected');
      this._switchToGroups_button.removeClass('selected');
      this._switchToMachines_button.prop('disabled', true);
      this._switchToGroups_button.prop('disabled', false);
    }

    _switchToGroupSelection() {
      this._useMachineSelection = false;

      if (this._machinesListContainer == undefined)
        return;
      this._previewHeader.show();
      this._previewListContainer.show();

      this._selectionTitle.html(this.getTranslation('selectedGroups', 'Selected groups'));

      this._machinesSearchDiv.hide();
      this._machinesListContainer.hide();

      this._categoryList.show();

      this._switchToMachines_button.removeClass('selected');
      this._switchToGroups_button.addClass('selected');
      this._switchToMachines_button.prop('disabled', false);
      this._switchToGroups_button.prop('disabled', true);
    }

    _addMoveUpDownEvents() {
      var machineselection = this;

      $(this._selectionList).find('.reorderDownButton').click(function () {
        $(this).parent('.machineselection-selection');
        let draggedOrder = parseInt($(this).parent().parent().css('order'));
        let newOrder = draggedOrder + 1;

        if (machineselection._useMachineSelection) {
          if (machineselection._machineSelectionArray.length > 0) {
            let movedItem = machineselection._machineSelectionArray[draggedOrder];
            machineselection._machineSelectionArray.splice(draggedOrder, 1);
            machineselection._machineSelectionArray.splice(newOrder, 0, movedItem);
          }
        }
        else {
          if (machineselection._groupSelectionArray.length > 0) {
            let movedItem = machineselection._groupSelectionArray[draggedOrder];
            machineselection._groupSelectionArray.splice(draggedOrder, 1);
            machineselection._groupSelectionArray.splice(newOrder, 0, movedItem);
          }
        }
        machineselection._fillSelection();
      });

      $(this._selectionList).find('.reorderUpButton').click(function () {
        let draggedOrder = parseInt($(this).parent().parent().css('order'));
        let newOrder = draggedOrder - 1;

        if (machineselection._useMachineSelection) {
          if (machineselection._machineSelectionArray.length > 0) {
            let movedItem = machineselection._machineSelectionArray[draggedOrder];
            machineselection._machineSelectionArray.splice(draggedOrder, 1);
            machineselection._machineSelectionArray.splice(newOrder, 0, movedItem);
          }
        }
        else {
          if (machineselection._groupSelectionArray.length > 0) {
            let movedItem = machineselection._groupSelectionArray[draggedOrder];
            machineselection._groupSelectionArray.splice(draggedOrder, 1);
            machineselection._groupSelectionArray.splice(newOrder, 0, movedItem);
          }
        }
        machineselection._fillSelection();
      });
    }

    _addDragAndDropEvents() {
      var machineselection = this;
      var dragSrcEl = null;

      function handleDragStart(e) {
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
        this.classList.add('dragElem');
      }
      function handleDragOver(e) {
        if (e.preventDefault) {
          e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';

        if (e.clientY - this.getBoundingClientRect().top < this.clientHeight / 2) {
          this.classList.remove('dragOverBottom');
          this.classList.add('dragOverTop');
        }
        else {
          this.classList.remove('dragOverTop');
          this.classList.add('dragOverBottom');
        }
        return false;
      }

      function handleDragEnter(e) { }

      function handleDragLeave(e) {
        this.classList.remove('dragOverTop');
        this.classList.remove('dragOverBottom');
      }

      function handleDrop(e) {
        if (e.stopPropagation) {
          e.stopPropagation();
        }
        if (dragSrcEl != this) {
          let draggedOrder = parseInt($(dragSrcEl).css('order'));
          let dragToTopOrder = undefined;
          let dragToBottomOrder = undefined;

          let toTop = $(this).hasClass('dragOverTop');
          if (toTop) {
            dragToTopOrder = parseInt($(this).css('order'));
          }
          let toBottom = $(this).hasClass('dragOverBottom');
          if (toBottom) {
            dragToBottomOrder = parseInt($(this).css('order'));
            if (dragToTopOrder == undefined)
              dragToTopOrder = dragToBottomOrder + 1;
          }

          if (dragToTopOrder == undefined && dragToBottomOrder == undefined)
            return;

          let newOrder;
          if (dragToTopOrder < draggedOrder) {
            newOrder = dragToTopOrder;
          }
          else {
            newOrder = parseInt(dragToTopOrder) - 1;
          }
          if (machineselection._useMachineSelection) {
            if (machineselection._machineSelectionArray.length > 0) {
              let movedItem = machineselection._machineSelectionArray[draggedOrder];
              machineselection._machineSelectionArray.splice(draggedOrder, 1);
              machineselection._machineSelectionArray.splice(newOrder, 0, movedItem);
            }
          }
          else {
            if (machineselection._groupSelectionArray.length > 0) {
              let movedItem = machineselection._groupSelectionArray[draggedOrder];
              machineselection._groupSelectionArray.splice(draggedOrder, 1);
              machineselection._groupSelectionArray.splice(newOrder, 0, movedItem);
            }
          }
          machineselection._fillSelection();
        }

        return false;
      }

      function handleDragEnd(e) {
        this.classList.remove('dragOverTop');
        this.classList.remove('dragOverBottom');
      }

      let addEvents = function (elem) {
        elem.setAttribute('draggable', true);
        elem.addEventListener('dragstart', handleDragStart, false);
        elem.addEventListener('dragenter', handleDragEnter, false)
        elem.addEventListener('dragover', handleDragOver, false);
        elem.addEventListener('dragleave', handleDragLeave, false);
        elem.addEventListener('drop', handleDrop, false);
        elem.addEventListener('dragend', handleDragEnd, false);
      }

      $(machineselection._selectionList).find('.machineselection-selection').each(function () {
        addEvents(this);
      });
    }

    _fillMachinesList() {
      if (this._machinesList == undefined)
        return;
      $(this._machinesList).empty();

      for (let displayClass of this._groupDisplays) {
        if (displayClass[1].singlemachine) {
          let id = displayClass[0];
          let displayStr = displayClass[1].display;

          let addButton = $('<div></div>').addClass('machineselection-add-machine-button')
            .attr('machine-id', id);
          let removeButton = $('<div></div>').addClass('machineselection-remove-machine-button')
            .attr('machine-id', id);

          let machSpan = $('<span></span>').addClass('machines-display')
            .html(displayStr);
          let machDiv = $('<div></div>').addClass('machines-div')
            .attr('machine-id', id).append(machSpan)
            .append(addButton).append(removeButton);

          if (displayClass[1].sortpriority != undefined)
            machDiv.css('order', displayClass[1].sortpriority);

          $(this._machinesList).append(machDiv);

          pulseSvg.inlineBackgroundSvg(addButton);
          pulseSvg.inlineBackgroundSvg(removeButton);

          machDiv.click(function (machineselection) {
            return function () {
              let machid = $(this).attr('machine-id');

              if ($(this).hasClass('selected')) {
                if (machineselection._machineSelectionArray.includes(machid)) {
                  machineselection._machineSelectionArray =
                    machineselection._machineSelectionArray.filter(
                      function (value, index, arr) {
                        return value != machid;
                      }
                    );
                }
              }
              else {
                if (!machineselection._machineSelectionArray.includes(machid))
                  machineselection._machineSelectionArray.push(machid);
              }
              machineselection._changeSelectionInMachineList();
              machineselection._fillSelection();
            }
          }(this));
        }
      }
    }

    _showHideMachinesInList() {
      let searchString = $(this._inputSearch)[0].value;
      let machinesDiv = $(this._machinesList).find('.machines-div');
      for (let i = 0; i < machinesDiv.length; i++) {
        let machineDisplay = $(machinesDiv[i]).find('.machines-display').html();
        if (machineDisplay.toLowerCase().includes(searchString.toLowerCase())) {
          $(machinesDiv[i]).show();
        }
        else {
          $(machinesDiv[i]).hide();
        }
      }
    }

    _changeSelectionInMachineList() {
      if (this._dialogPage1 == undefined)
        return;
      $(this._machinesList).find('.machines-div.selected').removeClass('selected');
      for (let i = 0; i < this._machineSelectionArray.length; i++) {
        let machid = this._machineSelectionArray[i];
        let machDivs = $(this._machinesList).find('.machines-div[machine-id=' + machid + ']');
        if (machDivs.length > 0) {
          machDivs.addClass('selected');
        }
      }
    }

    _fillSelection() {
      if (this._selectionList == undefined)
        return;
      $(this._selectionList).empty();

      let arrayToDisplay;
      if (false == this._useMachineSelection)
        arrayToDisplay = this._groupSelectionArray;
      else
        arrayToDisplay = this._machineSelectionArray;

      if (arrayToDisplay.length == 0) {
        let noSel = $('<span></span>').addClass('no-selection')
          .html(this.getTranslation('noSelection', 'No selection'));
        this._selectionList.append(noSel);
        this._fillMachinePreview();
        return;
      }

      for (let iGroup = 0; iGroup < arrayToDisplay.length; iGroup++) {
        let groupId = arrayToDisplay[iGroup].toString();

        let selection = $('<div></div>').addClass('machineselection-selection')
          .attr('groupId', groupId);

        if (!this._groupDisplays.has(groupId))
          continue;
        let displayClass = this._groupDisplays.get(groupId);

        let highlight = $('<div></div>').addClass('reorderHighlight');
        let upButton = $('<div></div>').addClass('reorderUpButton');
        let downButton = $('<div></div>').addClass('reorderDownButton');
        let reorderButton = $('<div></div>').addClass('reorderButton');

        let row = $('<div></div>').addClass('selection-position');
        row.append(highlight).append(upButton).append(downButton);

        let leftSide = $('<div></div>').addClass('selection-left-side');
        leftSide.append(reorderButton);
        let spanDisplay = $('<span></span>').addClass('selection-display')
          .html(displayClass.display);
        leftSide.append(spanDisplay);
        if (displayClass.singlemachine) {
          let spanMachine = $('<span></span>').addClass('machineselection-machine-label')
            .html(this.getTranslation('machineKey', 'M'));
          leftSide.append(spanMachine);
        }
        else {
          let spanGroup = $('<span></span>').addClass('machineselection-group-label')
            .html(this.getTranslation('groupKey', 'G'));
          leftSide.append(spanGroup);
        }
        row.append(leftSide);

        let rightSide = $('<div></div>').addClass('selection-right-side');
        if (displayClass.dynamic) {
          let spanDynamic = $('<span></span>').addClass('machineselection-dynamic-label')
            .html(this.getTranslation('dynamicKey', 'DYNAMIC'));
          rightSide.append(spanDynamic);
        }
        let removeButton = $('<div></div>').addClass('remove-button')
          .attr('groupId', groupId);
        rightSide.append(removeButton);
        row.append(rightSide);

        selection.append(row);

        $(selection).css('order', iGroup);
        this._selectionList.append(selection);

        pulseSvg.inlineBackgroundSvg(upButton);
        pulseSvg.inlineBackgroundSvg(downButton);
        pulseSvg.inlineBackgroundSvg(removeButton);

        removeButton.click(function (machineselection) {
          return function () {
            let group = $(this).attr('groupid');

            if (false == machineselection._useMachineSelection) {
              machineselection._groupSelectionArray =
                machineselection._groupSelectionArray.filter(
                  function (value, index, arr) {
                    return value != group;
                  }
                );
              machineselection._changeSelectionInCategoryList();
              let selectedCategory = $(machineselection._dialogPage1).find('input[groupid=' + group + ']');
              let parentsCategories = $(selectedCategory).parents('.machineselection-category');
              for (let iCat = 0; iCat < parentsCategories.length; iCat++)
                machineselection._updateNumberOfSelections(parentsCategories[iCat]);
            }
            else {
              machineselection._machineSelectionArray =
                machineselection._machineSelectionArray.filter(
                  function (value, index, arr) {
                    return value != group;
                  }
                );

              machineselection._changeSelectionInMachineList();
            }
            machineselection._fillSelection();
          }
        }(this));

      }
      this._addDragAndDropEvents();
      this._addMoveUpDownEvents();

      this._fillMachinePreview();
    }

    _fillMachinePreview() {
      this._previewList.empty();
      this._freeTextLastUpdate[0].cleanDisplay();

      if (false == this._useMachineSelection) {
        if (this._groupSelectionArray.length > 0) {
          let singleMachine = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {});
          let toClone = $('<div id=machinetoclone></div').addClass('preview-machine-position').append(singleMachine);
          let hidden = $('<div></div').addClass('hidden-content').append(toClone);
          this._previewList.append(hidden);

          let grouparray = pulseUtility.createjQueryElementWithAttribute('x-grouparray', {
            'templateid': 'machinetoclone',
            'group': this._groupSelectionArray.join(),
            'canUseRowsToSetHeight': false,
            'allowpagerotation': 'false',
            'rotation': 10,
            'row': 999,
            'textchange-context': 'machineselection',
            'donotwarngroupreload': 'true'
          });
          this._previewList.append(grouparray);
        }
      }
    }

    _storeSelection() {
      if (false == this._useMachineSelection) {
        let grouparrays = $(this._previewList).find('x-grouparray');
        if (grouparrays.length > 0) {
          let machinesList = grouparrays[0].getMachinesList();
          this._machineSelectionArray = machinesList.split(',');
        }
        else {
          this._machineSelectionArray = [];
        }
      }
      else {
        this._groupSelectionArray = [].concat(this._machineSelectionArray);
      }

      let joinedMachines = this._machineSelectionArray.join();
      let joinedGroups = this._groupSelectionArray.join();
      if (!this.element.hasAttribute('in-report')) {
        pulseConfig.set(this._configMachines, joinedMachines, true);

        if ((joinedGroups == joinedMachines)
          || (this._groupSelectionArray == []))
          pulseConfig.set(this._configGroups, '', true);
        else
          pulseConfig.set(this._configGroups, joinedGroups, true);

        eventBus.EventBus.dispatchToAll('configChangeEvent',
          { 'config': this._configMachines });
        eventBus.EventBus.dispatchToAll('configChangeEvent',
          { 'config': this._configGroups });

        $('.legend-content').resize();
      }
      else {
        this.element.setAttribute('pulse-machines', joinedMachines);
        this.element.setAttribute('pulse-groups', joinedGroups);
      }
    }

    _getSelectedIndexes(attribute) {
      let arr = [];
      let arrString = this.getConfigOrAttribute(attribute, '')
      if (arrString != '') {
        arr = arrString.split(',');
      }
      return arr;
    }

    _loadSelection() {
      let joinedMachines = "";
      let joinedGroups = "";

      if (!this.element.hasAttribute('in-report')) {
        this._groupSelectionArray = this._getSelectedIndexes(this._configGroups, false);
        this._machineSelectionArray = this._getSelectedIndexes(this._configMachines, false);

        if (this._groupSelectionArray.length == 0) {
          this._groupSelectionArray = [].concat(this._machineSelectionArray);
        }

        joinedMachines = this._machineSelectionArray.join();
        joinedGroups = this._groupSelectionArray.join();
      }
      else {
        if (this.element.hasAttribute('pulse-machines')) {
          joinedMachines = this.element.getAttribute('pulse-machines');
        }
        if (this.element.hasAttribute('pulse-groups')) {
          joinedGroups = this.element.getAttribute('pulse-groups');
        }
        if (joinedGroups == "") {
          joinedGroups = joinedMachines;
        }
        if (joinedGroups == "") {
          this._groupSelectionArray = [];
        }
        else {
          this._groupSelectionArray = joinedGroups.split(',');
        }
        if (joinedMachines == "") {
          this._machineSelectionArray = [];
        }
        else {
          this._machineSelectionArray = joinedMachines.split(',');
        }
      }

      if (joinedGroups == joinedMachines
        && this._machineSelectionArray.length != 0) {
        this._switchToMachineSelection();
        this._changeSelectionInMachineList();
        this._fillSelection();
      }
      else {
        this._switchToGroupSelection();
        this._changeSelectionInCategoryList(true);
        this._changeSelectionInMachineList();
      }
    }

    _clearSelection() {
      $(this._dialogPage1).find('input:checkbox').prop('checked', false);
      this._groupSelectionArray = [];
      this._machineSelectionArray = [];
      this._changeSelectionInCategoryList();
      this._changeSelectionInMachineList();
    }

    _updateNumberOfSelections(mainCategory) {
      let selections = $(mainCategory).find('input:checkbox');
      let nbSel = 0;
      for (let iSel = 0; iSel < selections.length; iSel++) {
        if (selections[iSel].checked) {
          nbSel++;
        }
      }
      if (nbSel == 0) {
        $(mainCategory).children('.machineselection-category-row').find('.number-of-selections').html('');
      }
      else {
        $(mainCategory).children('.machineselection-category-row').find('.number-of-selections').html('(' + nbSel + ')');
      }
    }

    _storeDisplays() {
      this._groupDisplays.clear();

      let storeSubGroups = function (machineselection, groups) {
        for (let iGroup = 0; iGroup < groups.length; iGroup++) {
          if (groups[iGroup].Display != '') {
            machineselection._groupDisplays.set(groups[iGroup].Id.toString(), {
              display: groups[iGroup].Display,
              dynamic: (groups[iGroup].Dynamic == true),
              singlemachine: (groups[iGroup].SingleMachine == true),
              sortpriority: groups[iGroup].SortPriority
            });
            if (!pulseUtility.isNotDefined(groups[iGroup].Zoom)) {
              storeSubGroups(machineselection, groups[iGroup].Zoom);
            }
          }
        }
      }

      for (let catIndex = 0; catIndex < this._groups.length; catIndex++) {
        let groups = this._groups[catIndex].Groups;
        if (groups != null) {
          storeSubGroups(this, groups);
        }
      }

      for (let machIndex = 0; machIndex < this._machinesFromService.length; machIndex++) {
        let mach = this._machinesFromService[machIndex];
        if (!this._groupDisplays.has(mach.Id.toString())) {
          this._groupDisplays.set(mach.Id.toString(), {
            display: mach.Display,
            dynamic: false,
            singlemachine: true,
            sortpriority: mach.DisplayPriority
          });
        }
      }
    }

    _fillCategoryList() {
      if (this._categoryList == undefined)
        return;

      let getSubGroups = function (machineselection, container, groups, isMain) {
        let nbSubGroups = 0;
        for (let i = 0; i < groups.length; i++) {
          if (groups[i].Display != '') {
            let svgShow = $('<div></div>').addClass('show-sub');
            let svgHide = $('<div></div>').addClass('hide-sub');
            let showHide = $('<div></div>').addClass('machineselection-subcategory-visibility')
              .append(svgShow).append(svgHide);
            pulseSvg.inlineBackgroundSvg(svgShow);
            pulseSvg.inlineBackgroundSvg(svgHide);

            let divDisplayGroup = $('<label for="checkbox-' + groups[i].Id + '"></label>').addClass('machineselection-category-display-group');
            let spanDisplay = $('<span></span>').addClass('category-display')
              .html(groups[i].TreeName);
            let nbSel = $('<span></span>').addClass('number-of-selections').html('');
            let checkbox = $('<input id="checkbox-' + groups[i].Id + '" type="checkbox" groupid="' + groups[i].Id + '" dynamic="' + groups[i].Dynamic + '">');
            let divRow = $('<div></div>').addClass('machineselection-category-row');
            divDisplayGroup.append(checkbox).append(spanDisplay).append(nbSel);
            divRow.append(showHide).append(divDisplayGroup);
            if (isMain)
              divRow.addClass('is-main');
            if (groups[i].Dynamic) {
              let spanDynamic = $('<span></span>').addClass('machineselection-dynamic-label')
                .html(machineselection.getTranslation('dynamicKey', 'DYNAMIC'));
              divRow.append(spanDynamic);
            }
            let category = $('<div></div>').addClass('machineselection-category').append(divRow);

            showHide.click(function () {
              if ($(this).hasClass('closed')) {
                $(this).removeClass('closed');
                $(this).addClass('opened');
                $(this).closest('.machineselection-category')
                  .children('.machineselection-category-content').toggle();
              }
              else if ($(this).hasClass('opened')) {
                $(this).removeClass('opened');
                $(this).addClass('closed');
                $(this).closest('.machineselection-category')
                  .children('.machineselection-category-content').toggle();
              }
            });

            checkbox.change(function (machineselection) {
              return function () {
                machineselection._switchToGroupSelection();

                let group = $(this).attr('groupid');
                let isChecked = $(this).is(':checked');
                if (isChecked) {
                  if (!machineselection._groupSelectionArray.includes(group))
                    machineselection._groupSelectionArray.push(group);
                }
                else {
                  machineselection._groupSelectionArray =
                    machineselection._groupSelectionArray.filter(
                      function (value, index, arr) {
                        return value != group;
                      }
                    );
                }
                let changedCategory = $(machineselection._dialogPage1).find('input[groupid=' + group + ']');
                changedCategory.prop('checked', isChecked);

                for (let iChanged = 0; iChanged < changedCategory.length; iChanged++) {
                  let parentsCat = $(changedCategory[iChanged]).parents('.machineselection-category');
                  for (let iParent = 0; iParent < parentsCat.length; iParent++)
                    machineselection._updateNumberOfSelections(parentsCat[iParent]);
                }
                machineselection._fillSelection();
              }
            }(machineselection));

            if (!pulseUtility.isNotDefined(groups[i].Zoom)) {
              let hiddenSubGroup = $('<div></div>').addClass('machineselection-category-content');
              let nbSubSubGroups = getSubGroups(machineselection, hiddenSubGroup, groups[i].Zoom);
              if (nbSubSubGroups > 0) {
                category.append(hiddenSubGroup);
                category.addClass('expandable');
                hiddenSubGroup.css('display', 'none');
                showHide.addClass('closed');
              }
            }
            else {
              showHide.empty();
              showHide.addClass('noChild');
            }

            container.append(category);
            nbSubGroups++;
          }
        }
        return nbSubGroups;
      }

      this._categoryList.empty();
      let fullListToScroll = $('<div></div>').addClass('machineselection-categorylist-full');
      let list = '';
      for (let catIndex = 0; catIndex < this._groups.length; catIndex++) {
        let groups = this._groups[catIndex].Groups;
        let omitCat = this._groups[catIndex].OmitGroupCategory;
        if (groups != null && groups.length > 0) {
          if (!pulseUtility.isNotDefined(omitCat) && omitCat == true
            && groups.length == 1 && groups[0].Display != '') {
            let category = $('<div></div>').addClass('machineselection-category')
              .addClass('main-category');
            let nbSubGroups = getSubGroups(this, category, groups, true);
            if (nbSubGroups == 1)
              fullListToScroll.append(category);

          }
          else {
            let svgShow = $('<div></div>').addClass('show-sub');
            let svgHide = $('<div></div>').addClass('hide-sub');
            let showHide = $('<div></div>').addClass('machineselection-subcategory-visibility')
              .append(svgShow).append(svgHide);
            pulseSvg.inlineBackgroundSvg(svgShow);
            pulseSvg.inlineBackgroundSvg(svgHide);

            let span = $('<span></span>').addClass('category-display')
              .html(this._groups[catIndex].Display);
            let nbSel = $('<span></span>').addClass('number-of-selections').html('');
            let divHeader = $('<div></div>')
              .addClass('machineselection-category-row').addClass('is-main')
              .append(showHide).append(span).append(nbSel);
            let category = $('<div></div>').addClass('machineselection-category')
              .addClass('main-category')
              .append(divHeader);

            showHide.click(function () {
              if ($(this).hasClass('closed')) {
                $(this).removeClass('closed');
                $(this).addClass('opened');
                $(this).closest('.machineselection-category')
                  .children('.machineselection-category-content').toggle();
              }
              else if ($(this).hasClass('opened')) {
                $(this).removeClass('opened');
                $(this).addClass('closed');
                $(this).closest('.machineselection-category')
                  .children('.machineselection-category-content').toggle();
              }
            });

            let hiddenSubGroup = $('<div style="display:none;"></div>').addClass('machineselection-category-content');
            let nbSubGroups = getSubGroups(this, hiddenSubGroup, groups);
            if (nbSubGroups > 0) {
              category.append(hiddenSubGroup);
              category.addClass('expandable');
              showHide.addClass('closed');
            }
            fullListToScroll.append(category);
          }
        }
      }
      fullListToScroll.append(list);
      this._categoryList.append(fullListToScroll);
    }

    _changeSelectionInCategoryList(andOpen) {
      if (this._dialogPage1 == undefined)
        return;

      $(this._dialogPage1).find('input:checkbox').prop('checked', false);

      for (let i = 0; i < this._groupSelectionArray.length; i++) {
        let group = this._groupSelectionArray[i];
        let selectedCategory = $(this._dialogPage1).find('input[groupid=' + group + ']');
        if (selectedCategory.length == 0) {
          console.warn('Check group configuration for ' + group);
          this._groupSelectionArray.splice(i, 1);
          this._changeSelectionInCategoryList(andOpen);
          return;
        }
        else {
          selectedCategory.prop('checked', true);

          for (let iCat = 0; iCat < selectedCategory.length; iCat++) {
            if (andOpen == true) {
              $(selectedCategory[iCat]).parents('.machineselection-category')
                .find('.machineselection-category-content').show();
              $(selectedCategory[iCat]).parents('closed')
                .addClass('opened').removeClass('closed');
            }
          }
        }
      }
      let parentsCat = $(this._dialogPage1).find('.machineselection-category');
      for (let iParent = 0; iParent < parentsCat.length; iParent++)
        this._updateNumberOfSelections(parentsCat[iParent]);

      this._fillSelection();
    }

    _fillSummaryDisplay() {
      if (this._summary == undefined)
        return;
      $(this._summary).empty();

      let ul = $('<div></div>');

      let arrayToDisplay;
      if (false == this._useMachineSelection)
        arrayToDisplay = this._groupSelectionArray;
      else
        arrayToDisplay = this._machineSelectionArray;

      let oneGroupIsAdded = false;
      for (let iGroup = 0; iGroup < arrayToDisplay.length; iGroup++) {
        let groupId = arrayToDisplay[iGroup].toString();
        let display = this.getTranslation('noMachineSelection', 'No machine selection');
        if (this._groupDisplays.has(groupId)) {
          let displayClass = this._groupDisplays.get(groupId);
          display = displayClass.display;
        }
        let li = $('<div></div>');
        let span = $('<span></span>').html(display);
        li.append(span);
        ul.append(li);
        oneGroupIsAdded = true;
      }

      if (!oneGroupIsAdded) {
        this._summary.html(this.getTranslation('noSelectedMachine', 'No selected machine'));
        this._summary.addClass('missing-config');
        $(this.element).parent().addClass('missing-config');
        $(this.element).parent().parent().addClass('missing-config');
      }
      else {
        this._summary.append(ul);
        this._summary.removeClass('missing-config');
        $(this.element).parent().removeClass('missing-config');
        $(this.element).parent().parent().removeClass('missing-config');
      }
    }

    fillExternalSummaryDisplay(summary) {
      if (summary == undefined)
        return;
      $(summary).empty();

      let ul = $('<div></div>');

      let arrayToDisplay;
      if (false == this._useMachineSelection)
        arrayToDisplay = this._groupSelectionArray;
      else
        arrayToDisplay = this._machineSelectionArray;

      let oneGroupIsAdded = false;
      for (let iGroup = 0; iGroup < arrayToDisplay.length; iGroup++) {
        let groupId = arrayToDisplay[iGroup];
        let display = this.getTranslation('noMachineSelection', 'No machine selection');
        if (this._groupDisplays.has(groupId)) {
          let displayClass = this._groupDisplays.get(groupId);
          display = displayClass.display;
        }
        let li = $('<div></div>');
        let span = $('<span></span>').html(display);
        li.append(span);
        ul.append(li);
        oneGroupIsAdded = true;
      }

      if (!oneGroupIsAdded) {
        summary.html(this.getTranslation('noSelectedMachine', 'No selected machine'));
        summary.addClass('missing-config');
      }
      else {
        summary.append(ul);
        summary.removeClass('missing-config');
      }
    }

    getMachinesArray() {
      return ([].concat(this._machineSelectionArray));
    }
    getGroupsArray() {
      return ([].concat(this._groupSelectionArray));
    }
    getMachinesString() {
      return this._machineSelectionArray.join();
    }
    getGroupsString() {
      return this._groupSelectionArray.join();
    }
  }

  pulseComponent.registerElement('x-machineselection', MachineSelectionComponent, ['unique-machine']);
})();
