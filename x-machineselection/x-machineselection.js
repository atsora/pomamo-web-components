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


/**
 * Build a custom tag <x-machineselection>
 * CAN BE Used by report web app OR pulse web app
 * 
 * Attributes :
 * unique-machine : bool if single machine is mandatory (rarely used)
 * 
 * // Special for reports
 * in-report = present if report version is enabled
 * groupDisplayForm = MACHINESGROUPS
 * groupName. ex = 
 * pulse-machines (storage in localstorage using pulseConfig for pulsewebapp)
 * pulse-groups (storage in localstorage using pulseConfig for pulsewebapp)
 */

(function () {
  class MachineSelectionComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Linked to config :
      self._configMachines = 'machine';
      self._configGroups = 'group';

      // current SELECTION storage (in config or local, before click on OK)
      self._groupSelectionArray = [];
      self._machineSelectionArray = [];
      self._useMachineSelection = false; // machine OR group

      // == data. from web service
      self._groups = [];

      // Map [id] = group or machine display
      // How to use map : https://www.zendevs.xyz/les-nouveaux-objets-set-et-map-en-javascript-es6/
      self._groupDisplays = new Map(); // == from data in web services = [id] displayed
      // Attention, la key de la map est une string, donc has(integer) ne fonctionne pas

      // Page capabilities
      self._uniquemachine = false; // ignored, only for error message

      // DOM default
      self._dialogPage1 = undefined;
      self._categoryList = undefined; // == group selection

      self._dialogPage2 = undefined;
      // Machine selection
      self._machinesSearchDiv = undefined;
      self._machinesList = undefined;
      self._machinesListContainer = undefined;
      // Selection
      self._selectionTitle = undefined;
      self._selectionHeader = undefined;
      self._selectionList = undefined;
      self._selectionListContainer = undefined;
      // Preview
      self._useMachineButton = undefined;
      self._previewHeader = undefined;
      self._previewList = undefined;
      self._previewListContainer = undefined;

      // Error
      self._messageSpan = undefined;
      // DOM : Display in main page, right panel config
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
        // Clean old storage 2020-12 (can be removed later)
        pulseConfig.setGlobal(this._configMachines, '');
        pulseConfig.setGlobal(this._configGroups, '');
      }

      return self;
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        //case 'enableGroups': // Probably in config -> always
        case 'unique-machine': {
          this._uniquemachine = (this.element.hasAttribute('unique-machine')
            && this.element.getAttribute('unique-machine') == 'true');
          this.start();
        } break;
        default:
          break;
      }
    }

    validateParameters () {
      this.switchToNextContext();
    }

    clearInitialization () {
      $(this.element).empty();

      this._editbutton = undefined;
      this._summary = undefined;
      this._messageSpan = undefined;

      super.clearInitialization();
    }

    // return value input - maybe define this function in a common lib
    initParamForReport (divToFill, name, parameterkey, dataType, parameterType,
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

    // Creation of the component (empty)
    initialize () {
      this.addClass('pulse-text'); // Mandatory for loader

      // Parameters
      this._uniquemachine =
        ('true' == this.getConfigOrAttribute('unique-machine', 'false'));

      // In case of clone, need to be empty :
      $(this.element).empty();

      // Create DOM - Content - By default, button enabled
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

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);


      if (this.element.hasAttribute('in-report')) {
        // Hidden div for report
        let reportDiv = $('<div></div>').addClass('pulse-report-hidden');
        $(this.element).append(reportDiv);

        let groupReportDiv = $('<div></div>').addClass('pulse-report-hidden');
        this.initParamForReport(groupReportDiv,
          'PulseGroups', 'GROUPPOS', // name, parameterkey
          'STRING', // dataType = 'STRING'
          'SIMPLE', '', '', // , parameterType, defaultValue, value, 
          'false', 'false', ''); // required, hidden, helptext
        reportDiv.append(groupReportDiv);

        let machineReportDiv = $('<div></div>').addClass('pulse-report-hidden');
        this.initParamForReport(machineReportDiv,
          'PulseMachines', 'MACHINES', // not 'MACHINEPOS', because of history compatibility // name, parameterkey
          'STRING', // dataType = 'STRING'
          'SIMPLE', '', '', // parameterType, defaultValue, value, 
          'false', 'false', ''); // required, hidden, helptext
        reportDiv.append(machineReportDiv);
      }

      this.switchToNextContext();
    }

    displayError (message) {
      //this._disable(message);
    }

    // Overload to always refresh value
    get isVisible () {
      // Si page login = Hidden = Do not call web service
      if (pulseConfig.isLoginPage()) {
        return false;
      }
      // Normal behavior
      if (!this._connected) { // == is connected
        return false;
      }
      return true;
    }

    // Return the Web Service URL here
    getShortUrl () {
      let url = 'Machine/Groups?Zoom=true&MachineList=true';
      // Login is set in global service call
      return url;
    }

    // Update the component with data which is returned by the web service in case of success
    refresh (data) {
      // Store lists of available categories (=groups)
      this._groups = data.GroupCategories;
      this._machinesFromService = data.MachineList;
      this._storeDisplays();

      // Load current selections
      this._loadSelection();

      // Fill categories list (left panel)
      this._fillCategoryList();
      // Fill summary
      this._fillSummaryDisplay();

      // Fill list of machines 
      this._fillMachinesList();
    } // end refresh

    ///////////////////////////////////////////////////////////////
    // public FUNCTIONS FOR UPDATING THE SELECTION = open dialog //
    ///////////////////////////////////////////////////////////////
    changeMachineSelection () {
      this._createDialogIfNotDone();

      // open Dialog
      if (undefined == this._dialogId)
        return;
      pulseCustomDialog.open(this._dialogPage1, this._dialogId);
    }

    //////////////////////////////////////////
    // FUNCTIONS FOR DIALOG                 //
    //////////////////////////////////////////
    _createDialogIfNotDone () {
      if (undefined != this._dialogId)
        return;

      ////////// //////////
      // Page 1  //////////
      this._dialogPage1 = $('<div></div>').addClass('machineSelectionDialogPart1');
      let page1 = $('<div></div>').addClass('machineselection-page1');
      this._dialogPage1.append(page1);

      // FIRST div - for buttons CLEAR - Switch to machien selection
      let div_buttons = $('<div></div>').addClass('machineselection-buttons'); // = main
      // Button CLEAR
      this._clearFilters_button = $('<button></button>')
        .addClass('machineselection-button')
        .addClass('machineselection-clearfilters').html(this.getTranslation('clearButton', 'Clear'));
      this._clearFilters_button.click(function () {
        this._clearSelection();
      }.bind(this));
      div_buttons.append(this._clearFilters_button);
      // Button switch to group or machine selection ( = with empty selection)
      let div_switch_buttons = $('<div></div>').addClass('machineselection-switch-group-machines');
      // G
      this._switchToGroups_button = $('<button></button>')
        .addClass('machineselection-button')
        .addClass('machineselection-switch-to-groups').html(this.getTranslation('groupsButton', 'Groups'));
      this._switchToGroups_button.click(function () {
        this._groupSelectionArray = [];
        this._machineSelectionArray = [];
        this._switchToGroupSelection();
        this._changeSelectionInCategoryList();
      }.bind(this));
      div_switch_buttons.append(this._switchToGroups_button);
      // M
      this._switchToMachines_button = $('<button></button>')
        .addClass('machineselection-button')
        .addClass('machineselection-switch-to-machines').html(this.getTranslation('machinesButton', 'Machines'));
      this._switchToMachines_button.click(function () {
        this._groupSelectionArray = [];
        this._machineSelectionArray = [];
        this._switchToMachineSelection();
        this._changeSelectionInMachineList();
      }.bind(this));
      div_switch_buttons.append(this._switchToMachines_button);
      // append buttons
      div_buttons.append(div_switch_buttons);
      page1.append(div_buttons);
      // END - FIRST div - for buttons

      // GROUPS
      this._categoryList = $('<div></div>').addClass('machineselection-categorylist');
      page1.append(this._categoryList);

      // MACHINES
      this._machinesList = $('<div></div>').addClass('machineselection-machines-list');
      this._machinesListContainer = $('<div></div>')
        .addClass('machineselection-machines-list-container') // For scroll
        .append(this._machinesList);

      this._machinesSearchDiv = $('<div></div>').addClass('machineselection-machines-search-div');

      this._clearSearchButton = $('<button title="Clear search" role="button"></button>')
        .addClass('buttonDialog')
        .addClass('machineselection-clear-search');
      this._machinesSearchDiv.append(this._clearSearchButton);

      this._inputSearch = $('<input></input>').addClass('machineselection-machines-search-input')
        .attr('type', 'text').attr('placeholder', this.getTranslation('searchDots', 'Search...'));
      this._machinesSearchDiv.append(this._inputSearch);

      // FILL must be one AFTER dialog creation to display icons 
      //this._fillMachinesList();

      page1.append(this._machinesListContainer).append(this._machinesSearchDiv);

      // Use filter
      $(this._inputSearch).on('input', function () {
        this._showHideMachinesInList();
      }.bind(this));

      // Clear filter
      $(this._clearSearchButton).click(function () {
        $(this._inputSearch).val('');
        this._showHideMachinesInList();
      }.bind(this));


      ////////// //////////
      // Page 2  //////////
      this._dialogPage2 = $('<div></div>').addClass('machineSelectionDialogPart2');
      let page2 = $('<div></div>').addClass('machineselection-page2');
      this._dialogPage2.append(page2);

      // SELECTION
      this._selectionTitle = $('<span></span>').addClass('machineselection-title')
        .html('Selected');
      this._selectionHeader = $('<div></div>').addClass('machineselection-selection-header')
        .append(this._selectionTitle);
      this._selectionList = $('<div></div>').addClass('machineselection-selection-list');
      this._selectionListContainer = $('<div></div>')
        .addClass('machineselection-selection-list-container') // For scroll
        .append(this._selectionList);

      page2.append(this._selectionHeader).append(this._selectionListContainer);

      // PREVIEW
      let previewTitle = $('<span></span>').addClass('machineselection-preview-title')
        .html('preview machines');
      this._freeTextLastUpdate = pulseUtility.createjQueryElementWithAttribute('x-freetext', {
        'textchange-context': 'machineselection'
      });
      this._useMachineButton = $('<div></div>').addClass('machineselection-usemachines-button')
        .attr('title', this.getTranslation('switchToMachineSelection','Switch to machine selection'));
      this._previewHeader = $('<div></div>').addClass('machineselection-preview-header')
        .append(previewTitle).append(this._freeTextLastUpdate).append(this._useMachineButton);
      this._previewList = $('<div></div>').addClass('machineselection-preview-list');
      this._previewListContainer = $('<div></div>')
        .addClass('machineselection-preview-list-container') // For scroll
        .append(this._previewList);

      page2.append(this._previewHeader).append(this._previewListContainer);

      pulseSvg.inlineBackgroundSvg(this._useMachineButton);

      this._useMachineButton.click(function () {
        let grouparrays = $(this._previewList).find('x-grouparray');
        if (grouparrays.length > 0) {
          let machinesList = grouparrays[0].getMachinesList();
          //this._groupSelectionArray = machinesList.split(','); // was [];
          this._machineSelectionArray = machinesList.split(',');
          // Change selection on left display
          this._changeSelectionInMachineList();
          //this._changeSelectionInCategoryList();

          //this._fillSelection(); == done in _switchToMachineSelection
        }
        this._switchToMachineSelection();
      }.bind(this));

      this._fillCategoryList();

      // Create a dialog
      this._dialogId = pulseCustomDialog.initialize(this._dialogPage1, {
        title: this._uniquemachine ? this.getTranslation('selectMachine', 'Select a machine') : this.getTranslation('selectMachines', 'Select machines'),
        autoClose: false,
        onOpen: function () {
          // Reinitialize selection and view
          // If it can be changed anywhere else :
          // Load current selections
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
                'Please select at least one group');
              return;
            }
            // If 'no machine' in static groups
            if ($(this._previewList).find('.no-machines').length > 0) {
              // Find if static only
              let staticOnly = true;
              for (let iGroup = 0; iGroup < this._groupSelectionArray.length; iGroup++) {
                let groupId = this._groupSelectionArray[iGroup].toString();
                if (this._groupDisplays.has(groupId)) {
                  let displayClass = this._groupDisplays.get(groupId);
                  if (displayClass.dynamic)
                    staticOnly = false;
                }
              } // end for

              if (staticOnly) {
                pulseCustomDialog.openError(
                  this.getTranslation('errorMissingMachineInGroup', 'Please select groups including at least one machine.'));
                return;
              }
            }
          }
          // Store the new displayed parameters in CONFIG
          this._storeSelection();

          // Update summary from selection
          this._fillSummaryDisplay();

          pulseCustomDialog.close(this._dialogPage1);
        }.bind(this),
        onCancel: function () {
          pulseCustomDialog.close(this._dialogPage1);
        }.bind(this),
        fullScreenOnSmartphone: true,
        fixedHeight: true,
        fullSize: true,
        helpName: 'machineselection'
      });
      pulseCustomDialog.addPage(this._dialogPage1, this._dialogPage2);
      // this._addDragAndDropEvents(); No. Not here !

      // FILL must be one AFTER dialog creation to display icons 
      this._fillMachinesList();

      // Default = useGroupSelection -> list of machines == hidden
      this._switchToGroupSelection();
    }


    ////////////////////////////////////////////////
    // Toggle between machine and group selection //
    ////////////////////////////////////////////////
    _switchToMachineSelection () {
      this._useMachineSelection = true;

      if (this._machinesListContainer == undefined)
        return;
      this._previewHeader.hide();
      this._previewListContainer.hide();

      this._selectionTitle.html(this.getTranslation('selectedMachines','Selected machines'));

      this._machinesSearchDiv.show();
      this._machinesListContainer.show();

      this._groupSelectionArray = []; // CLEAR GROUPS !
      // Update check boxes in left panel including _fillSelection, including Clear preview
      this._changeSelectionInCategoryList();
      this._categoryList.hide();

      this._changeSelectionInMachineList();

      this._switchToMachines_button.addClass('selected');
      this._switchToGroups_button.removeClass('selected');
      this._switchToMachines_button.prop('disabled', true);
      this._switchToGroups_button.prop('disabled', false);
    }

    _switchToGroupSelection () {
      this._useMachineSelection = false;

      if (this._machinesListContainer == undefined)
        return;
      this._previewHeader.show();
      this._previewListContainer.show();

      this._selectionTitle.html(this.getTranslation('selectedGroups','Selected groups'));

      this._machinesSearchDiv.hide();
      this._machinesListContainer.hide();

      this._categoryList.show();

      this._switchToMachines_button.removeClass('selected');
      this._switchToGroups_button.addClass('selected');
      this._switchToMachines_button.prop('disabled', false);
      this._switchToGroups_button.prop('disabled', true);
    }

    ////////////////
    // ADD EVENTS //
    ////////////////
    _addMoveUpDownEvents () {
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
        // Change order in display
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
        // Change order in display
        machineselection._fillSelection();
      });
    }

    _addDragAndDropEvents () {
      var machineselection = this;
      var dragSrcEl = null;

      function handleDragStart (e) {
        // Target (this) element is the source node.
        dragSrcEl = this;

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);

        this.classList.add('dragElem');
      }
      function handleDragOver (e) {
        if (e.preventDefault) {
          e.preventDefault(); // Necessary. Allows us to drop.
        }
        e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

        if (e.clientY - this.getBoundingClientRect().top < this.clientHeight / 2) {
          // Insert above
          this.classList.remove('dragOverBottom');
          this.classList.add('dragOverTop');
        }
        else {
          // Insert below
          this.classList.remove('dragOverTop');
          this.classList.add('dragOverBottom');
        }
        return false;
      }

      function handleDragEnter (e) {
        // this / e.target is the current hover target.
      }

      function handleDragLeave (e) {
        // this / e.target is previous target element.
        this.classList.remove('dragOverTop');
        this.classList.remove('dragOverBottom');
      }

      function handleDrop (e) {
        // this/e.target is current target element.

        if (e.stopPropagation) {
          e.stopPropagation(); // Stops some browsers from redirecting.
        }
        // Don't do anything if dropping the same column we're dragging.
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
            return; // Never

          // Check top / bottom & unify
          let newOrder;
          if (dragToTopOrder < draggedOrder) { // Move to Top
            newOrder = dragToTopOrder;
          }
          else { // Move To Bottom
            newOrder = parseInt(dragToTopOrder) - 1; //dragToBottomOrder;
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
          // Change order in display
          machineselection._fillSelection();
        }

        return false;
      }

      function handleDragEnd (e) {
        // this/e.target is the source node.
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

    ////////////////////////////////////////////////////////////////////////
    // FUNCTIONS FOR UPDATING Machine List AND show/hide machines in list //
    ////////////////////////////////////////////////////////////////////////

    // Fill machines list
    _fillMachinesList () {
      if (this._machinesList == undefined)
        return;
      $(this._machinesList).empty();

      for (let displayClass of this._groupDisplays) {
        if (displayClass[1].singlemachine) {
          let id = displayClass[0];
          let displayStr = displayClass[1].display;

          // Button to add 
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

          machDiv.click(function (machineselection) { // to avoid closure
            return function () {
              let machid = $(this).attr('machine-id');

              if ($(this).hasClass('selected')) {
                // REMOVE MACHINE
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
                // ADD MACHINE
                if (!machineselection._machineSelectionArray.includes(machid))
                  machineselection._machineSelectionArray.push(machid);
              }

              // Always
              // Update left panel
              machineselection._changeSelectionInMachineList();
              // Update right panel
              machineselection._fillSelection();
            }
          }(this));
          //selected ?
          /*
                    addButton.click(function (machineselection) { // to avoid closure
                      return function () {
                        let machid = $(this).attr('machine-id');
                        // ADD MACHINE
                        if (!machineselection._machineSelectionArray.includes(machid))
                          machineselection._machineSelectionArray.push(machid);
          
                        // Update left panel
                        machineselection._changeSelectionInMachineList();
                        // Update right panel
                        machineselection._fillSelection();
                      }
                    }(this));
          
          
                    removeButton.click(function (machineselection) { // to avoid closure
                      return function () {
                        let machid = $(this).attr('machine-id');
                        // REMOVE MACHINE
                        if (machineselection._machineSelectionArray.includes(machid)) {
                          machineselection._machineSelectionArray =
                            machineselection._machineSelectionArray.filter(
                              function (value, index, arr) {
                                return value != machid;
                              }
                            );
                        }
          
                        // Update left panel
                        machineselection._changeSelectionInMachineList();
                        // Update right panel
                        machineselection._fillSelection();
                      }
                    }(this));
                    */
        }
      }
    }

    _showHideMachinesInList () {
      let searchString = $(this._inputSearch)[0].value;
      // Use as filter

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

    _changeSelectionInMachineList () {
      if (this._dialogPage1 == undefined)
        return;

      // Remove all selections
      $(this._machinesList).find('.machines-div.selected').removeClass('selected');

      // Add current selection
      for (let i = 0; i < this._machineSelectionArray.length; i++) {
        let machid = this._machineSelectionArray[i];

        let machDivs = $(this._machinesList).find('.machines-div[machine-id=' + machid + ']');
        if (machDivs.length > 0) {// Always
          machDivs.addClass('selected');
        }
      }

      // Change preview in right panel
      //this._fillSelection();
    }

    ///////////////////////////////////////////////////////////////
    // FUNCTIONS FOR UPDATING THE SELECTION : storage -> display //
    ///////////////////////////////////////////////////////////////

    _fillSelection () {// -> to fill right panel (Warning ! Change _fillSummaryDisplay accordingly)
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
          .html(this.getTranslation('noSelection','No selection'));
        this._selectionList.append(noSel);

        // Update preview = empty
        this._fillMachinePreview();
        return;
      }

      for (let iGroup = 0; iGroup < arrayToDisplay.length; iGroup++) {
        let groupId = arrayToDisplay[iGroup].toString();

        let selection = $('<div></div>').addClass('machineselection-selection')
          .attr('groupId', groupId);

        if (!this._groupDisplays.has(groupId))
          continue; // Probably error when loading
        let displayClass = this._groupDisplays.get(groupId);

        let highlight = $('<div></div>').addClass('reorderHighlight');
        let upButton = $('<div></div>').addClass('reorderUpButton');         // smartphone ?
        let downButton = $('<div></div>').addClass('reorderDownButton');     // smartphone ?
        let reorderButton = $('<div></div>').addClass('reorderButton');

        let row = $('<div></div>').addClass('selection-position');
        row.append(highlight).append(upButton).append(downButton)
          .append(reorderButton);

        let spanDisplay = $('<span></span>').addClass('selection-display')
          .html(displayClass.display);
        let removeButton = $('<div></div>').addClass('remove-button')
          .attr('groupId', groupId);
        row.append(spanDisplay).append(removeButton);
        if (displayClass.singlemachine) {
          let spanMachine = $('<span></span>').addClass('machineselection-machine-label')
            .html(this.getTranslation('machineKey','M'));
          row.append(spanMachine);
        }
        else {
          let spanGroup = $('<span></span>').addClass('machineselection-group-label')
            .html(this.getTranslation('groupKey','G'));
          row.append(spanGroup);
        }
        if (displayClass.dynamic) {
          let spanDynamic = $('<span></span>').addClass('machineselection-dynamic-label')
            .html(this.getTranslation('dynamicKey','DYNAMIC'));
          row.append(spanDynamic);
        }
        selection.append(row);

        $(selection).css('order', iGroup);
        this._selectionList.append(selection);

        pulseSvg.inlineBackgroundSvg(upButton);
        pulseSvg.inlineBackgroundSvg(downButton);
        //pulseSvg.inlineBackgroundSvg(reorderButton); // Is PNG... not possible for the moment

        pulseSvg.inlineBackgroundSvg(removeButton);

        removeButton.click(function (machineselection) { // to avoid closure
          return function () {
            let group = $(this).attr('groupid');

            if (false == machineselection._useMachineSelection) {
              // remove group
              machineselection._groupSelectionArray =
                machineselection._groupSelectionArray.filter(
                  function (value, index, arr) {
                    return value != group;
                  }
                );
              // Change selection on left display
              machineselection._changeSelectionInCategoryList();
              // Update (nb of selection) -> useful when unchecked !
              let selectedCategory = $(machineselection._dialogPage1).find('input[groupid=' + group + ']');
              let parentsCategories = $(selectedCategory).parents('.machineselection-category');
              for (let iCat = 0; iCat < parentsCategories.length; iCat++)
                machineselection._updateNumberOfSelections(parentsCategories[iCat]);
            }
            else {
              // remove machine
              machineselection._machineSelectionArray =
                machineselection._machineSelectionArray.filter(
                  function (value, index, arr) {
                    return value != group;
                  }
                );

              machineselection._changeSelectionInMachineList();
            }
            // Update right panel
            machineselection._fillSelection();
          }
        }(this));

      } // and for 
      this._addDragAndDropEvents();
      this._addMoveUpDownEvents();

      this._fillMachinePreview();
    }

    _fillMachinePreview () {
      this._previewList.empty();
      this._freeTextLastUpdate[0].cleanDisplay();

      if (false == this._useMachineSelection) {
        // and REAL fill
        if (this._groupSelectionArray.length > 0) {
          // .hidden-content
          let singleMachine = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {});
          let toClone = $('<div id=machinetoclone></div').addClass('preview-machine-position').append(singleMachine);
          let hidden = $('<div></div').addClass('hidden-content').append(toClone);
          this._previewList.append(hidden);

          // group to display many times hidden content
          let grouparray = pulseUtility.createjQueryElementWithAttribute('x-grouparray', {
            'templateid': 'machinetoclone',
            'group': this._groupSelectionArray.join(),
            //'machine': this._machineSelectionArray.join(), -> No NEVER !
            'canUseRowsToSetHeight': false,
            'allowpagerotation': 'false',
            'rotation': 10, // sec = refreshrate
            'row': 999, // To avoid displaying only some rows
            'textchange-context': 'machineselection',
            'donotwarngroupreload': 'true' // to avoid unwanted field legend reload
          });
          this._previewList.append(grouparray);
        }
      }
    }

    ///////////////////////////////////////////////////////
    // FUNCTIONS FOR UPDATING THE SELECTION : attributes //
    ///////////////////////////////////////////////////////

    // Array -> CONFIG
    _storeSelection () {
      if (false == this._useMachineSelection) {
        // Update machines list
        let grouparrays = $(this._previewList).find('x-grouparray');
        if (grouparrays.length > 0) {
          let machinesList = grouparrays[0].getMachinesList();
          this._machineSelectionArray = machinesList.split(',');
        }
        else {
          this._machineSelectionArray = [];
        }
      }
      else { // Store machines only
        // Warning ! Do not copy using '=' !
        this._groupSelectionArray = [].concat(this._machineSelectionArray);
      }


      let joinedMachines = this._machineSelectionArray.join();
      let joinedGroups = this._groupSelectionArray.join();
      if (!this.element.hasAttribute('in-report')) {
        // store machines
        pulseConfig.set(this._configMachines, joinedMachines, true);

        // Store groups
        if ((joinedGroups == joinedMachines)
          || (this._groupSelectionArray == []))
          pulseConfig.set(this._configGroups, '', true);
        else
          pulseConfig.set(this._configGroups, joinedGroups, true);

        // Config changed : warn xtags
        eventBus.EventBus.dispatchToAll('configChangeEvent',
          { 'config': this._configMachines });
        // Do nearly the same as previous line
        eventBus.EventBus.dispatchToAll('configChangeEvent',
          { 'config': this._configGroups });

        // Check LEGEND display - should be somewhere else, but where ?
        $('.legend-content').resize();
      }
      else {
        // For report only. But can be always
        this.element.setAttribute('pulse-machines', joinedMachines);
        this.element.setAttribute('pulse-groups', joinedGroups);
      }
    }

    _getSelectedIndexes (attribute) {
      let arr = [];
      let arrString = this.getConfigOrAttribute(attribute, '')
      if (arrString != '') {
        arr = arrString.split(',');
      }
      return arr;
    }

    // CONFIG -> this._groupSelectionArray / this._machineSelectionArray
    _loadSelection () {
      let joinedMachines = "";
      let joinedGroups = "";

      if (!this.element.hasAttribute('in-report')) {
        // get CONFIG + store here - PWA version
        this._groupSelectionArray = this._getSelectedIndexes(this._configGroups, false);
        this._machineSelectionArray = this._getSelectedIndexes(this._configMachines, false);

        if (this._groupSelectionArray.length == 0) {
          // Warning ! Do not copy using = !
          this._groupSelectionArray = [].concat(this._machineSelectionArray);
        }

        joinedMachines = this._machineSelectionArray.join();
        joinedGroups = this._groupSelectionArray.join();
      }
      else {
        // load initial data - for report use
        if (this.element.hasAttribute('pulse-machines')) {
          joinedMachines = this.element.getAttribute('pulse-machines');
        }
        if (this.element.hasAttribute('pulse-groups')) {
          joinedGroups = this.element.getAttribute('pulse-groups');
        }

        if (joinedGroups == "") {
          // Copy
          joinedGroups = joinedMachines;
        }

        if (joinedGroups == "") {
          // Empty
          this._groupSelectionArray = [];
        }
        else {
          this._groupSelectionArray = joinedGroups.split(',');
        }

        if (joinedMachines == "") {
          // Empty
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

        // Update check boxes in left panel including _fillSelection
        this._changeSelectionInCategoryList(true);
        this._changeSelectionInMachineList();
      }
    }

    _clearSelection () {
      $(this._dialogPage1).find('input:checkbox').prop('checked', false);
      //this._switchToGroupSelection(); // Show / Hide -> Not anymore

      this._groupSelectionArray = [];
      this._machineSelectionArray = [];

      // Update check boxes in left panel including _fillSelection
      this._changeSelectionInCategoryList();
      // And selection in machine list
      this._changeSelectionInMachineList();
    }

    _updateNumberOfSelections (mainCategory) {
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

    ///////////////////////////////////////////////////////////////////////
    _storeDisplays () {
      this._groupDisplays.clear();

      let storeSubGroups = function (machineselection, groups) {
        for (let iGroup = 0; iGroup < groups.length; iGroup++) {
          if (groups[iGroup].Display != '') {
            machineselection._groupDisplays.set(groups[iGroup].Id.toString(), {
              display: groups[iGroup].Display,
              dynamic: (groups[iGroup].Dynamic == true), // unknown => false
              singlemachine: (groups[iGroup].SingleMachine == true),
              sortpriority: groups[iGroup].SortPriority
            });

            // Add Sub Sub groups
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

      // Check in this._machinesFromService = data.MachineList if machines are missing
      for (let machIndex = 0; machIndex < this._machinesFromService.length; machIndex++) {
        let mach = this._machinesFromService[machIndex];
        if (!this._groupDisplays.has(mach.Id.toString())) {
          // if not exists - ADD (Should rarely happen)
          this._groupDisplays.set(mach.Id.toString(), {
            display: mach.Display,
            dynamic: false,
            singlemachine: true,
            sortpriority: mach.DisplayPriority
          });
          console.warn('x-machineselection : machine '
            + mach.Display + ' is not in groups');
        }
      }

    }

    ///////////////////////////////////////////////////////////////////////
    // FUNCTIONS FOR DISPLAYING groups and selection in left panel       //
    ///////////////////////////////////////////////////////////////////////
    _fillCategoryList () {
      if (this._categoryList == undefined)
        return; // Can happen before dialog creation

      let getSubGroups = function (machineselection, container, groups, isMain) {

        let nbSubGroups = 0;
        for (let i = 0; i < groups.length; i++) {
          if (groups[i].Display != '') {
            // Show / Hide Icon
            let svgShow = $('<div></div>').addClass('show-sub');
            let svgHide = $('<div></div>').addClass('hide-sub');
            let showHide = $('<div></div>').addClass('machineselection-subcategory-visibility')
              //.addClass('closed') not here
              .append(svgShow).append(svgHide);
            pulseSvg.inlineBackgroundSvg(svgShow);
            pulseSvg.inlineBackgroundSvg(svgHide);

            // display / (x) / check / showHide / isSub
            let spanDisplay = $('<span></span>').addClass('category-display')
              .html(groups[i].TreeName);
            let nbSel = $('<span></span>').addClass('number-of-selections').html('');
            let checkbox = $('<input type="checkbox" groupid="' + groups[i].Id + '" dynamic="' + groups[i].Dynamic + '">');
            let divRow = $('<div></div>').addClass('machineselection-category-row')
              .append(spanDisplay).append(nbSel);
            if (isMain)
              divRow.addClass('is-main');
            divRow.append(showHide).append(checkbox);
            if (groups[i].Dynamic) {
              let spanDynamic = $('<span></span>').addClass('machineselection-dynamic-label')
                .html(this.getTranslation('dynamicKey','DYNAMIC'));
              divRow.append(spanDynamic);
            }
            let category = $('<div></div>').addClass('machineselection-category').append(divRow);

            // Collapse / Expand machine categories
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

            // click on checkbox
            checkbox.change(function (machineselection) { // to avoid closure
              return function () {
                machineselection._switchToGroupSelection();

                let group = $(this).attr('groupid');
                let isChecked = $(this).is(':checked');
                if (isChecked) {
                  // add group if not exists
                  if (!machineselection._groupSelectionArray.includes(group))
                    machineselection._groupSelectionArray.push(group);
                }
                else {
                  // remove group
                  machineselection._groupSelectionArray =
                    machineselection._groupSelectionArray.filter(
                      function (value, index, arr) {
                        return value != group;
                      }
                    );
                }
                // Find all displays for groupid
                let changedCategory = $(machineselection._dialogPage1).find('input[groupid=' + group + ']');
                // Check/Uncheck similar groups
                changedCategory.prop('checked', isChecked);

                for (let iChanged = 0; iChanged < changedCategory.length; iChanged++) {
                  // Update (nb of selection) here AND in parents
                  let parentsCat = $(changedCategory[iChanged]).parents('.machineselection-category');
                  for (let iParent = 0; iParent < parentsCat.length; iParent++)
                    machineselection._updateNumberOfSelections(parentsCat[iParent]);
                }
                // Update right panel
                machineselection._fillSelection();
              }
            }(machineselection));

            // Add Sub Sub groups in li
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

      // Real list
      let fullListToScroll = $('<div></div>').addClass('machineselection-categorylist-full');
      let list = '';
      for (let catIndex = 0; catIndex < this._groups.length; catIndex++) {
        let groups = this._groups[catIndex].Groups;
        let omitCat = this._groups[catIndex].OmitGroupCategory;
        if (groups != null && groups.length > 0) {
          if (!pulseUtility.isNotDefined(omitCat) && omitCat == true
            && groups.length == 1 && groups[0].Display != '') {
            // Ignore ONE LEVEL
            let category = $('<div></div>').addClass('machineselection-category');
            let nbSubGroups = getSubGroups(this, category, groups, true);
            if (nbSubGroups == 1)
              fullListToScroll.append(category);

          }
          else {
            // Show / Hide Icon
            let svgShow = $('<div></div>').addClass('show-sub');
            let svgHide = $('<div></div>').addClass('hide-sub');
            let showHide = $('<div></div>').addClass('machineselection-subcategory-visibility')
              //.addClass('closed') Not here
              .append(svgShow).append(svgHide);
            pulseSvg.inlineBackgroundSvg(svgShow);
            pulseSvg.inlineBackgroundSvg(svgHide);

            //
            let span = $('<span></span>').addClass('category-display')
              .html(this._groups[catIndex].Display); // TreeName = not defined
            let nbSel = $('<span></span>').addClass('number-of-selections').html('');
            let divHeader = $('<div></div>')
              .addClass('machineselection-category-row').addClass('is-main')
              .append(span).append(nbSel).append(showHide);
            let category = $('<div></div>').addClass('machineselection-category')
              .append(divHeader);

            // Collapse / Expand machine categories
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

    // _groupSelectionArray -> fill check boxes accordingly
    // (andOpen == true) -> open selection
    _changeSelectionInCategoryList (andOpen) {
      if (this._dialogPage1 == undefined)
        return;

      // Remove all checks
      $(this._dialogPage1).find('input:checkbox').prop('checked', false);

      // Add current selection
      for (let i = 0; i < this._groupSelectionArray.length; i++) {
        let group = this._groupSelectionArray[i];
        let selectedCategory = $(this._dialogPage1).find('input[groupid=' + group + ']');
        if (selectedCategory.length == 0) {
          // Error in config ! -> 
          console.warn('Check group configuration for ' + group);
          // Remove group from selection
          this._groupSelectionArray.splice(i, 1);
          // Re-start this method
          this._changeSelectionInCategoryList(andOpen);
          // Exit
          return;
        }
        else {
          selectedCategory.prop('checked', true);

          for (let iCat = 0; iCat < selectedCategory.length; iCat++) {
            if (andOpen == true) {
              // Open parent
              $(selectedCategory[iCat]).parents('.machineselection-category')
                .find('.machineselection-category-content').show();
              // Change ShowHide icon
              $(selectedCategory[iCat]).parents('closed')
                .addClass('opened').removeClass('closed');
            }
          }
        }
      }
      // Update (nb of selection) for ALL categories
      let parentsCat = $(this._dialogPage1).find('.machineselection-category');
      for (let iParent = 0; iParent < parentsCat.length; iParent++)
        this._updateNumberOfSelections(parentsCat[iParent]);

      // Change preview in right panel
      this._fillSelection();
    }

    /////////////////////////////////////////////////////////
    // FUNCTIONS FOR DISPLAYING selected machines / groups //
    /////////////////////////////////////////////////////////
    _fillSummaryDisplay () {
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

      // Missing config or not :
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

    /////////////////////////////////////////////////////////////
    // EXTERNAL FUNCTION TO DISPLAY selected machines / groups //
    /////////////////////////////////////////////////////////////
    fillExternalSummaryDisplay (summary) {
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
        let display = this.getTranslation('noMachineSelection','No machine selection');
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

      // Missing config or not :
      if (!oneGroupIsAdded) {
        summary.html(this.getTranslation('noSelectedMachine','No selected machine'));
        summary.addClass('missing-config');
      }
      else {
        summary.append(ul);
        summary.removeClass('missing-config');
      }
    }

    /////////////////////////////////////////////////////////////
    // EXTERNAL FUNCTIONS TO get selected machines / groups    //
    /////////////////////////////////////////////////////////////
    getMachinesArray () {
      return ([].concat(this._machineSelectionArray));
    }
    getGroupsArray () {
      return ([].concat(this._groupSelectionArray));
    }
    getMachinesString () {
      return this._machineSelectionArray.join();
    }
    getGroupsString () {
      return this._groupSelectionArray.join();
    }

  }

  pulseComponent.registerElement('x-machineselection', MachineSelectionComponent, ['unique-machine']);
})();
