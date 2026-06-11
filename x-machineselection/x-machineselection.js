// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-machineselection
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 * @requires module:pulsecustomdialog
 */
import * as pulseUtility from 'pulseUtility';
import * as pulseSvg from 'pulseSvg';
import * as pulseComponent from 'pulsecomponent';
import pulseCustomDialog from 'pulseCustomDialog';
import * as pulseLogin from 'pulseLogin';
import * as pulseConfig from 'pulseConfig';
import * as pulseService from 'pulseService';
import * as eventBus from 'eventBus';

import 'x-machinedisplay/x-machinedisplay';
import 'x-freetext/x-freetext';

(function () {
  /**
   * `<x-machineselection>` — dialog widget for selecting machines and/or groups.
   *
   * Renders an inline summary and an "edit" button that opens a two-page dialog
   * (`pulseCustomDialog`): a category tree of groups or a flat searchable machine
   * list on page 1, the ordered selection plus a live machine preview on page 2.
   * Resolves groups into machine ids internally (locally from the boot
   * `Machine/Groups` fetch, cached, or via `MachinesFromGroups` AJAX) and dedupes
   * the result. The resolution runs once at boot and again on user action or
   * `configChangeEvent`; downstream orchestrators (`x-grouplist`, `x-groupgrid`,
   * `x-grouparray`) own the periodic re-poll for their own dynamic groups.
   *
   * In default mode the selection is persisted to `pulseConfig` (keys `machine`
   * and `group`) and the resolved machine ids are emitted on the global event bus
   * as `machineListChanged`. In `in-report` mode the selection is written to the
   * `pulse-machines` / `pulse-groups` attributes on the element instead.
   *
   * @element x-machineselection
   * @attr {string}  unique-machine     `'true'` restricts selection to a single machine
   * @attr {boolean} in-report          output to attributes instead of `pulseConfig`
   * @attr {string}  pulse-machines     (in-report output) selected machine ids, comma-separated
   * @attr {string}  pulse-groups       (in-report output) selected group ids, comma-separated
   * @fires machineListChanged          `{ ids: string[], source?: 'url'|'url-early'|'user', error?: 'network' }`
   * @method changeMachineSelection     opens the selection dialog
   * @method fillExternalSummaryDisplay writes the current selection summary into a given element
   * @method getMachinesArray           copy of the current machine id selection
   * @method getGroupsArray             copy of the current group id selection
   * @method getMachinesString          current machine ids, comma-separated
   * @method getGroupsString            current group ids, comma-separated
   * @method getResolvedMachineIds      copy of the resolved machine ids (after group → machine)
   * @method isReady                    `true` once the first resolution completed
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
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

      // Single-source-of-truth state for resolved machine list
      self._resolvedMachineIds = [];
      self._isResolvedReady = false;
      self._resolvedGroupCache = new Map();
      self._retryTimer = null;
      // Inflight key for in-progress MachinesFromGroups call (joined GroupIds).
      // Prevents duplicate AJAX when _resolveAndEmit fires twice in a row during boot
      // (synchronous early emit + post-Machine/Groups reconcile).
      self._machinesFromGroupsInflight = null;

      // Dialog preview state (resolved internally)
      self._previewResolvedMachineIds = [];
      self._previewLoading = false;

      self.methods = {
        'changeMachineSelection': self.changeMachineSelection,
        'fillExternalSummaryDisplay': self.fillExternalSummaryDisplay,
        'getMachinesArray': self.getMachinesArray,
        'getGroupsArray': self.getGroupsArray,
        'getMachinesString': self.getMachinesString,
        'getGroupsString': self.getGroupsString,
        'getResolvedMachineIds': self.getResolvedMachineIds,
        'isReady': self.isReady
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
      if (this._retryTimer) {
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
      }
      this.element.replaceChildren();
      this._editbutton = undefined;
      this._summary = undefined;
      this._messageSpan = undefined;
      super.clearInitialization();
    }

    initParamForReport(divToFill, name, parameterkey, dataType, parameterType,
      defaultValue, value, required, hidden, helptext) {
      divToFill.classList.add('parameter');
      let input1 = document.createElement('input');
      input1.type = 'hidden';
      input1.id = 'name';
      input1.value = name;
      divToFill.appendChild(input1);
      let input2 = document.createElement('input');
      input2.type = 'hidden';
      input2.id = 'parameterkey';
      input2.value = parameterkey;
      divToFill.appendChild(input2);
      let input3 = document.createElement('input');
      input3.type = 'hidden';
      input3.id = 'defaultvalue';
      input3.value = defaultValue;
      divToFill.appendChild(input3);
      let retInput = document.createElement('input');
      retInput.type = 'hidden';
      retInput.id = 'value';
      retInput.value = value;
      divToFill.appendChild(retInput);
      let input4 = document.createElement('input');
      input4.type = 'hidden';
      input4.id = 'datatype';
      input4.value = dataType;
      divToFill.appendChild(input4);
      let input5 = document.createElement('input');
      input5.type = 'hidden';
      input5.id = 'parametertype';
      input5.value = parameterType;
      divToFill.appendChild(input5);
      let input6 = document.createElement('input');
      input6.type = 'hidden';
      input6.id = 'required';
      input6.value = required;
      divToFill.appendChild(input6);
      let input7 = document.createElement('input');
      input7.type = 'hidden';
      input7.id = 'helptext';
      input7.value = helptext;
      divToFill.appendChild(input7);
      let input8 = document.createElement('input');
      input8.type = 'hidden';
      input8.id = 'hidden';
      input8.value = hidden;
      divToFill.appendChild(input8);
      if (parameterkey == 'WEBAPP') {
        let input9 = document.createElement('input');
        input9.type = 'hidden';
        input9.id = 'widget';
        input9.value = 'TEXTBOX';
        divToFill.appendChild(input9);
        retInput = document.createElement('input');
        retInput.type = 'hidden';
        retInput.id = name + '_value';
        retInput.value = '';
        divToFill.appendChild(retInput);
      }
      return retInput;
    }

    initialize() {
      this.addClass('pulse-text');

      this._uniquemachine =
        ('true' == this.getConfigOrAttribute('unique-machine', 'false'));

      this.element.replaceChildren();

      this._editbutton = document.createElement('button');
      this._editbutton.title = 'Change machines';
      this._editbutton.setAttribute('role', 'button');
      this._editbutton.classList.add('machineselection-editbutton');
      this._editbutton.textContent = 'edit';
      this._editbutton.addEventListener('click', () => {
        this.changeMachineSelection();
      });

      this._summary = document.createElement('div');
      this._summary.classList.add('machineselection-summary');

      this.element.appendChild(this._editbutton);
      this.element.appendChild(this._summary);

      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.textContent = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);

      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.textContent = '';
      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      if (this.element.hasAttribute('in-report')) {
        let reportDiv = document.createElement('div');
        reportDiv.classList.add('pulse-report-hidden');
        this.element.appendChild(reportDiv);

        let groupReportDiv = document.createElement('div');
        groupReportDiv.classList.add('pulse-report-hidden');
        this.initParamForReport(groupReportDiv,
          'PulseGroups', 'GROUPPOS',
          'STRING',
          'SIMPLE', '', '',
          'false', 'false', '');
        reportDiv.appendChild(groupReportDiv);

        let machineReportDiv = document.createElement('div');
        machineReportDiv.classList.add('pulse-report-hidden');
        this.initParamForReport(machineReportDiv,
          'PulseMachines', 'MACHINES',
          'STRING',
          'SIMPLE', '', '',
          'false', 'false', '');
        reportDiv.appendChild(machineReportDiv);
      }

      // Early emit (machine-only fast path): if pulseConfig already holds a direct
      // machine list, dispatch machineListChanged synchronously here without waiting
      // for the Machine/Groups AJAX. This restores the historical zero-AJAX-blocking
      // behaviour for the most common case (returning user with machine selection).
      // For the group case we can't emit early (path is set by ParamValidation, not
      // yet at initialize()) — refresh() will call _resolveAndEmit('url') normally.
      let machineConfigEarly = pulseConfig.getString(this._configMachines, '');
      if (machineConfigEarly && machineConfigEarly.trim() !== '') {
        let earlyIds = machineConfigEarly.split(',')
          .map(s => s.trim()).filter(s => s !== '');
        this._emitMachineList(earlyIds, 'url-early');
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

    /**
     * REST endpoint: `Machine/Groups?Zoom=true&MachineList=true`.
     *
     * @returns {string} Short URL without base path.
     */
    getShortUrl() {
      return 'Machine/Groups?Zoom=true&MachineList=true';
    }

    /**
     * Populates internal data structures from the REST response, then rebuilds all UI panels.
     *
     * @param {{ GroupCategories: Array, MachineList: Array }} data
     */
    refresh(data) {
      this._groups = data.GroupCategories;
      this._machinesFromService = data.MachineList;
      this._storeDisplays();
      // _fillCategoryList must run before _loadSelection: the latter calls
      // _changeSelectionInCategoryList, which looks up input[groupid=...] in
      // the dialog and splices missing groups out of _groupSelectionArray as
      // self-healing. Without the categories built, the currently-zoomed group
      // gets wrongly evicted from the selection.
      this._fillCategoryList();
      this._fillMachinesList();
      this._loadSelection();
      this._fillSummaryDisplay();
      this._resolveAndEmit('url');
    }

    /** Opens the machine-selection dialog (creates it on first call via `_createDialogIfNotDone`). */
    changeMachineSelection() {
      this._createDialogIfNotDone();

      if (undefined == this._dialogId)
        return;
      pulseCustomDialog.openDialog(this._dialogPage1);
    }

    /**
     * Lazily constructs the two-page selection dialog DOM and registers it with `pulseCustomDialog`.
     * No-op if `_dialogId` is already set.
     */
    _createDialogIfNotDone() {
      if (undefined != this._dialogId)
        return;

      ////////// //////////
      // Page 1  //////////
      this._dialogPage1 = document.createElement('div');
      this._dialogPage1.classList.add('machineSelectionDialogPart1');
      let page1 = document.createElement('div');
      page1.classList.add('machineselection-page1');
      this._dialogPage1.appendChild(page1);

      let div_buttons = document.createElement('div');
      div_buttons.classList.add('machineselection-buttons');
      this._clearFilters_button = document.createElement('button');
      this._clearFilters_button.classList.add('machineselection-button', 'machineselection-clearfilters');
      this._clearFilters_button.textContent = this.getTranslation('clearButton', 'Clear');
      this._clearFilters_button.addEventListener('click', () => {
        this._clearSelection();
      });
      div_buttons.appendChild(this._clearFilters_button);

      let div_switch_buttons = document.createElement('div');
      div_switch_buttons.classList.add('machineselection-switch-group-machines');
      this._switchToGroups_button = document.createElement('button');
      this._switchToGroups_button.classList.add('machineselection-button', 'machineselection-switch-to-groups');
      this._switchToGroups_button.textContent = this.getTranslation('groupsButton', ' by group');
      this._switchToGroups_button.addEventListener('click', () => {
        this._switchToGroupSelection();
        this._changeSelectionInCategoryList();
        this._fillSelection();
      });
      div_switch_buttons.appendChild(this._switchToGroups_button);

      this._switchToMachines_button = document.createElement('button');
      this._switchToMachines_button.classList.add('machineselection-button', 'machineselection-switch-to-machines');
      this._switchToMachines_button.textContent = this.getTranslation('machinesButton', ' by machine');
      this._switchToMachines_button.addEventListener('click', () => {
        this._switchToMachineSelection(false);
        this._changeSelectionInMachineList();
        this._fillSelection();
      });
      div_switch_buttons.appendChild(this._switchToMachines_button);

      let div_container_page1 = document.createElement('div');
      div_container_page1.classList.add('machineselection-container-page1');

      div_container_page1.appendChild(div_switch_buttons);

      this._categoryList = document.createElement('div');
      this._categoryList.classList.add('machineselection-categorylist');
      div_container_page1.appendChild(this._categoryList);

      this._machinesList = document.createElement('div');
      this._machinesList.classList.add('machineselection-machines-list');
      this._machinesListContainer = document.createElement('div');
      this._machinesListContainer.classList.add('machineselection-machines-list-container');
      this._machinesListContainer.appendChild(this._machinesList);

      this._machinesSearchDiv = document.createElement('div');
      this._machinesSearchDiv.classList.add('machineselection-machines-search-div');

      this._inputSearch = document.createElement('input');
      this._inputSearch.classList.add('machineselection-machines-search-input');
      this._inputSearch.type = 'text';
      this._inputSearch.placeholder = this.getTranslation('searchDots', 'Search...');
      this._machinesSearchDiv.appendChild(this._inputSearch);

      div_container_page1.appendChild(this._machinesSearchDiv);
      div_container_page1.appendChild(this._machinesListContainer);

      this._inputSearch.addEventListener('input', () => {
        this._showHideMachinesInList();
      });

      div_container_page1.appendChild(div_buttons);
      page1.appendChild(div_container_page1);


      ////////// //////////
      // Page 2  //////////
      this._dialogPage2 = document.createElement('div');
      this._dialogPage2.classList.add('machineSelectionDialogPart2');
      let page2 = document.createElement('div');
      page2.classList.add('machineselection-page2');
      this._dialogPage2.appendChild(page2);

      this._selectionTitle = document.createElement('span');
      this._selectionTitle.classList.add('machineselection-title');
      this._selectionTitle.textContent = this.getTranslation('selectedTitle', 'Selected');
      this._selectionHeader = document.createElement('div');
      this._selectionHeader.classList.add('machineselection-selection-header');
      this._selectionHeader.appendChild(this._selectionTitle);
      this._selectionList = document.createElement('div');
      this._selectionList.classList.add('machineselection-selection-list');
      this._selectionListContainer = document.createElement('div');
      this._selectionListContainer.classList.add('machineselection-selection-list-container');
      this._selectionListContainer.appendChild(this._selectionList);

      page2.appendChild(this._selectionHeader);
      page2.appendChild(this._selectionListContainer);

      let previewTitle = document.createElement('span');
      previewTitle.classList.add('machineselection-preview-title');
      previewTitle.textContent = 'preview machines';
      this._freeTextLastUpdate = pulseUtility.createElementWithAttribute('x-freetext', {
        'textchange-context': 'machineselection'
      });
      this._useMachineButton = document.createElement('div');
      this._useMachineButton.classList.add('machineselection-usemachines-button');
      this._useMachineButton.setAttribute('title', this.getTranslation('switchToMachineSelection', 'Switch to machine selection'));
      this._previewHeader = document.createElement('div');
      this._previewHeader.classList.add('machineselection-preview-header');
      this._previewHeader.appendChild(previewTitle);
      this._previewHeader.appendChild(this._freeTextLastUpdate);
      this._previewHeader.appendChild(this._useMachineButton);
      this._previewList = document.createElement('div');
      this._previewList.classList.add('machineselection-preview-list');
      this._previewListContainer = document.createElement('div');
      this._previewListContainer.classList.add('machineselection-preview-list-container');
      this._previewListContainer.appendChild(this._previewList);

      page2.appendChild(this._previewHeader);
      page2.appendChild(this._previewListContainer);

      pulseSvg.inlineBackgroundSvg(this._useMachineButton);

      this._useMachineButton.addEventListener('click', () => {
        if (this._previewResolvedMachineIds.length > 0) {
          this._machineSelectionArray = this._previewResolvedMachineIds.slice();
          this._changeSelectionInMachineList();
        }
        this._switchToMachineSelection();
      });

      this._fillCategoryList();

      // Create a dialog
      this._dialogId = pulseCustomDialog.openDialog(this._dialogPage1, {
        title: this._uniquemachine ? this.getTranslation('selectMachine', 'Select a machine') : this.getTranslation('selectMachines', 'Select machines'),
        autoClose: false,
        className: 'machineselection', // Required for our CSS
        onOpen: function () {
          this._loadSelection();
        }.bind(this),
        onOk: function () {
          if (this._useMachineSelection) {
            if (this._machineSelectionArray.length == 0) {
              pulseCustomDialog.openDialog(
                this._uniquemachine
                  ? this.getTranslation('errorMissingUnique', 'Please select one machine')
                  : this.getTranslation('errorMissing', 'Please select at least one machine'),
                { type: 'Error' });
              return;
            }
          }
          else {
            if (this._groupSelectionArray.length == 0) {
              pulseCustomDialog.openDialog(
                this.getTranslation('errorMissingGroup', 'Please select at least one group'),
                { type: 'Error' });
              return;
            }
            if (this._previewList && this._previewList.querySelector('.no-machines')) {
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
                pulseCustomDialog.openDialog(
                  this.getTranslation('errorMissingMachineInGroup', 'Please select groups including at least one machine.'),
                  { type: 'Error' });
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

      // VITAL FIX: this._dialogPage1 instead of this._dialogId
      pulseCustomDialog.addPage(this._dialogPage1, this._dialogPage2);

      // These two methods can now run normally again:
      this._fillMachinesList();
      this._switchToGroupSelection();
    }

    /**
     * Switches the dialog to machine-selection mode: shows the machine list/search, hides the group tree
     * and preview panel, clears `_groupSelectionArray`, and marks the "by machine" button as active.
     */
    _switchToMachineSelection(clearGroups = true) {
      this._useMachineSelection = true;

      if (this._machinesListContainer == undefined)
        return;
      this._previewHeader.style.display = 'none';
      this._previewListContainer.style.display = 'none';

      this._selectionTitle.textContent = this.getTranslation('selectedMachines', 'Selected machines');

      this._machinesSearchDiv.style.display = '';
      this._machinesListContainer.style.display = '';

      if (clearGroups) {
        this._groupSelectionArray = [];
        this._changeSelectionInCategoryList();
      }
      this._categoryList.style.display = 'none';

      this._changeSelectionInMachineList();

      this._switchToMachines_button.classList.add('selected');
      this._switchToGroups_button.classList.remove('selected');
      this._switchToMachines_button.disabled = true;
      this._switchToGroups_button.disabled = false;
    }

    /**
     * Switches the dialog to group-selection mode: shows the category tree and preview panel,
     * hides the machine list/search, and marks the "by group" button as active.
     */
    _switchToGroupSelection() {
      this._useMachineSelection = false;

      if (this._machinesListContainer == undefined)
        return;
      this._previewHeader.style.display = 'flex';
      this._previewListContainer.style.display = '';

      this._selectionTitle.textContent = this.getTranslation('selectedGroups', 'Selected groups');

      this._machinesSearchDiv.style.display = 'none';
      this._machinesListContainer.style.display = 'none';

      this._categoryList.style.display = '';

      this._switchToMachines_button.classList.remove('selected');
      this._switchToGroups_button.classList.add('selected');
      this._switchToMachines_button.disabled = false;
      this._switchToGroups_button.disabled = true;
    }

    /**
     * Attaches click handlers to all `.reorderUpButton` and `.reorderDownButton` elements in
     * `_selectionList`. Each click shifts the item one position in the corresponding selection array
     * and re-renders the list via `_fillSelection()`.
     */
    _addMoveUpDownEvents() {
      var machineselection = this;

      let downButtons = this._selectionList.querySelectorAll('.reorderDownButton');
      downButtons.forEach(btn => {
        btn.addEventListener('click', function () {
          let draggedOrder = parseInt(getComputedStyle(this.parentElement.parentElement).order);
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
      });

      let upButtons = this._selectionList.querySelectorAll('.reorderUpButton');
      upButtons.forEach(btn => {
        btn.addEventListener('click', function () {
          let draggedOrder = parseInt(getComputedStyle(this.parentElement.parentElement).order);
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
      });
    }

    /**
     * Attaches HTML5 drag-and-drop handlers to all `.machineselection-selection` items in `_selectionList`.
     * On drop: computes the new position from drag-over-top/bottom state and reorders the active
     * selection array accordingly, then re-renders via `_fillSelection()`.
     */
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
          let draggedOrder = parseInt(getComputedStyle(dragSrcEl).order);
          let dragToTopOrder = undefined;
          let dragToBottomOrder = undefined;

          let toTop = this.classList.contains('dragOverTop');
          if (toTop) {
            dragToTopOrder = parseInt(getComputedStyle(this).order);
          }
          let toBottom = this.classList.contains('dragOverBottom');
          if (toBottom) {
            dragToBottomOrder = parseInt(getComputedStyle(this).order);
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

      let selectionItems = machineselection._selectionList.querySelectorAll('.machineselection-selection');
      selectionItems.forEach(elem => addEvents(elem));
    }

    /**
     * Populates the flat machine list panel with one clickable `.machines-div` per single machine.
     * Clicking toggles the machine in/out of `_machineSelectionArray` and updates the selection panel.
     */
    _fillMachinesList() {
      if (this._machinesList == undefined)
        return;
      this._machinesList.replaceChildren();

      for (let displayClass of this._groupDisplays) {
        if (displayClass[1].singlemachine) {
          let id = displayClass[0];
          let displayStr = displayClass[1].display;

          let addButton = document.createElement('div');
          addButton.classList.add('machineselection-add-machine-button');
          addButton.setAttribute('machine-id', id);
          let removeButton = document.createElement('div');
          removeButton.classList.add('machineselection-remove-machine-button');
          removeButton.setAttribute('machine-id', id);

          let machSpan = document.createElement('span');
          machSpan.classList.add('machines-display');
          machSpan.textContent = displayStr;
          let machDiv = document.createElement('div');
          machDiv.classList.add('machines-div');
          machDiv.setAttribute('machine-id', id);
          machDiv.appendChild(machSpan);
          machDiv.appendChild(addButton);
          machDiv.appendChild(removeButton);

          if (displayClass[1].sortpriority != undefined)
            machDiv.style.order = displayClass[1].sortpriority;

          this._machinesList.appendChild(machDiv);

          pulseSvg.inlineBackgroundSvg(addButton);
          pulseSvg.inlineBackgroundSvg(removeButton);

          machDiv.addEventListener('click', () => {
            let machid = machDiv.getAttribute('machine-id');

            if (machDiv.classList.contains('selected')) {
              if (this._machineSelectionArray.includes(machid)) {
                this._machineSelectionArray =
                  this._machineSelectionArray.filter(
                    function (value, index, arr) {
                      return value != machid;
                    }
                  );
              }
            }
            else {
              if (!this._machineSelectionArray.includes(machid))
                this._machineSelectionArray.push(machid);
            }
            this._changeSelectionInMachineList();
            this._fillSelection();
          });
        }
      }
    }

    /** Filters the machine list display using the current value of `_inputSearch` (case-insensitive substring match). */
    _showHideMachinesInList() {
      let searchString = this._inputSearch.value;
      let machinesDivs = this._machinesList.querySelectorAll('.machines-div');
      for (let i = 0; i < machinesDivs.length; i++) {
        let machineDisplay = machinesDivs[i].querySelector('.machines-display').textContent;
        if (machineDisplay.toLowerCase().includes(searchString.toLowerCase())) {
          machinesDivs[i].style.display = '';
        }
        else {
          machinesDivs[i].style.display = 'none';
        }
      }
    }

    /** Syncs `.selected` CSS class on machine-list items to match `_machineSelectionArray`. */
    _changeSelectionInMachineList() {
      if (this._dialogPage1 == undefined)
        return;
      let selectedDivs = this._machinesList.querySelectorAll('.machines-div.selected');
      selectedDivs.forEach(div => div.classList.remove('selected'));
      for (let i = 0; i < this._machineSelectionArray.length; i++) {
        let machid = this._machineSelectionArray[i];
        let machDiv = this._machinesList.querySelector('.machines-div[machine-id="' + machid + '"]');
        if (machDiv) {
          machDiv.classList.add('selected');
        }
      }
    }

    /**
     * Builds Pulse's native circular loader (pulse-loader with loadcircle
     * animation). The `pulse-bigdisplay pulse-component-loading` combo is
     * what triggers the circular spinner CSS (cf. common.less:1533+) — the
     * other combos like `pulse-text` give a row of 3 small dots instead.
     * Wrapper required because the dialog is detached from the host element.
     */
    _buildLoadingSpinner() {
      let wrapper = document.createElement('div');
      wrapper.classList.add('machineselection-loading-wrapper');
      let loaderHost = document.createElement('div');
      loaderHost.classList.add('pulse-bigdisplay', 'pulse-component-loading', 'machineselection-loading-spinner-host');
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.textContent = this.getTranslation('loadingDots', 'Loading...');
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      loaderHost.appendChild(loaderDiv);
      wrapper.appendChild(loaderHost);
      return wrapper;
    }

    /**
     * Rebuilds the right-side selection panel from the active selection array
     * (`_groupSelectionArray` or `_machineSelectionArray`).
     * Each item shows display name, a M/G label, an optional DYNAMIC badge, a remove button,
     * and reorder handles. Attaches drag-and-drop and up/down events, then refreshes the preview.
     */
    _fillSelection() {
      if (this._selectionList == undefined)
        return;
      this._selectionList.replaceChildren();

      if (this._machinesFromService === undefined) {
        this._selectionList.appendChild(this._buildLoadingSpinner());
        if (this._categoryList && this._categoryList.querySelectorAll('.machineselection-category').length === 0) {
          this._categoryList.replaceChildren();
          this._categoryList.appendChild(this._buildLoadingSpinner());
        }
        this._renderPreviewLoader();
        return;
      }
      if (this._categoryList) {
        let loaders = this._categoryList.querySelectorAll('.machineselection-loading-svg');
        loaders.forEach(loader => loader.remove());
      }

      let arrayToDisplay;
      if (false == this._useMachineSelection)
        arrayToDisplay = this._groupSelectionArray;
      else
        arrayToDisplay = this._machineSelectionArray;

      if (arrayToDisplay.length == 0) {
        let noSel = document.createElement('span');
        noSel.classList.add('no-selection');
        noSel.textContent = this.getTranslation('noSelection', 'No selection');
        this._selectionList.appendChild(noSel);
        this._fillMachinePreview();
        return;
      }

      for (let iGroup = 0; iGroup < arrayToDisplay.length; iGroup++) {
        let groupId = arrayToDisplay[iGroup].toString();

        let selection = document.createElement('div');
        selection.classList.add('machineselection-selection');
        selection.setAttribute('groupId', groupId);

        if (!this._groupDisplays.has(groupId))
          continue;
        let displayClass = this._groupDisplays.get(groupId);

        let highlight = document.createElement('div');
        highlight.classList.add('reorderHighlight');
        let upButton = document.createElement('div');
        upButton.classList.add('reorderUpButton');
        let downButton = document.createElement('div');
        downButton.classList.add('reorderDownButton');
        let reorderButton = document.createElement('div');
        reorderButton.classList.add('reorderButton');

        let row = document.createElement('div');
        row.classList.add('selection-position');
        row.appendChild(highlight);
        row.appendChild(upButton);
        row.appendChild(downButton);

        let leftSide = document.createElement('div');
        leftSide.classList.add('selection-left-side');
        leftSide.appendChild(reorderButton);
        let spanDisplay = document.createElement('span');
        spanDisplay.classList.add('selection-display');
        spanDisplay.textContent = displayClass.display;
        leftSide.appendChild(spanDisplay);
        if (displayClass.singlemachine) {
          let spanMachine = document.createElement('span');
          spanMachine.classList.add('machineselection-machine-label');
          spanMachine.textContent = this.getTranslation('machineKey', 'M');
          leftSide.appendChild(spanMachine);
        }
        else {
          let spanGroup = document.createElement('span');
          spanGroup.classList.add('machineselection-group-label');
          spanGroup.textContent = this.getTranslation('groupKey', 'G');
          leftSide.appendChild(spanGroup);
        }
        row.appendChild(leftSide);

        let rightSide = document.createElement('div');
        rightSide.classList.add('selection-right-side');
        if (displayClass.dynamic) {
          let spanDynamic = document.createElement('span');
          spanDynamic.classList.add('machineselection-dynamic-label');
          spanDynamic.textContent = this.getTranslation('dynamicKey', 'DYNAMIC');
          rightSide.appendChild(spanDynamic);
        }
        let removeButton = document.createElement('div');
        removeButton.classList.add('remove-button');
        removeButton.setAttribute('groupId', groupId);
        rightSide.appendChild(removeButton);
        row.appendChild(rightSide);

        selection.appendChild(row);

        selection.style.order = iGroup;
        this._selectionList.appendChild(selection);

        pulseSvg.inlineBackgroundSvg(upButton);
        pulseSvg.inlineBackgroundSvg(downButton);
        pulseSvg.inlineBackgroundSvg(removeButton);

        removeButton.addEventListener('click', () => {
          let group = removeButton.getAttribute('groupid');

          if (false == this._useMachineSelection) {
            this._groupSelectionArray =
              this._groupSelectionArray.filter(
                function (value, index, arr) {
                  return value != group;
                }
              );
            this._changeSelectionInCategoryList();
            let selectedCategory = this._dialogPage1.querySelector('input[groupid="' + group + '"]');
            let parentsCategories = selectedCategory ? selectedCategory.closest('.machineselection-category') : null;
            if (parentsCategories) {
              let currentCat = parentsCategories;
              while (currentCat && currentCat.classList.contains('machineselection-category')) {
                this._updateNumberOfSelections(currentCat);
                currentCat = currentCat.parentElement.closest('.machineselection-category');
              }
            }
          }
          else {
            this._machineSelectionArray =
              this._machineSelectionArray.filter(
                function (value, index, arr) {
                  return value != group;
                }
              );

            this._changeSelectionInMachineList();
          }
          this._fillSelection();
        });

      }
      this._addDragAndDropEvents();
      this._addMoveUpDownEvents();

      this._fillMachinePreview();
    }

    /**
     * Rebuilds the preview panel in group-selection mode by resolving the current
     * `_groupSelectionArray` into machine ids and rendering one `<x-machinedisplay>` per machine.
     * Clears the panel when no groups are selected or when in machine-selection mode.
     */
    _fillMachinePreview() {
      if (!this._previewList) return;
      this._previewList.replaceChildren();
      this._freeTextLastUpdate?.cleanDisplay?.();

      if (this._useMachineSelection || this._groupSelectionArray.length === 0) {
        this._previewResolvedMachineIds = [];
        this._previewLoading = false;
        this._updateOkButtonState();
        return;
      }

      this._resolvePreviewMachines();
    }

    /**
     * Resolves the currently selected groups into machine ids for the dialog preview.
     * Reuses the same logic as `_resolveAndEmit` (single-machine local resolution from
     * `_groupDisplays`, static multi-machine via `_resolvedGroupCache`, everything else via
     * a `MachinesFromGroups` AJAX call). The fetched result is cached in `_resolvedGroupCache`
     * (when only one group needed AJAX), benefiting subsequent resolutions including the OK
     * click via `_resolveAndEmit('user')`.
     *
     * Discards stale AJAX responses if the selection changed in the meantime.
     */
    _resolvePreviewMachines() {
      let resolvedIds = [];
      let unresolvedGroups = [];

      // When MULTIPLE groups are selected, the API applies cross-group semantics
      // (e.g. intersection) so we MUST send the full set as a single call —
      // pre-resolving single-machine groups locally would produce a union instead.
      // Local resolution / cache is only safe for a single-group selection.
      const multiGroup = this._groupSelectionArray.length > 1;

      for (let i = 0; i < this._groupSelectionArray.length; i++) {
        let groupId = this._groupSelectionArray[i];
        let display = this._groupDisplays.get(String(groupId));
        if (!multiGroup && display && display.singlemachine && !display.dynamic) {
          let machId = (display.machineid !== undefined) ? String(display.machineid) : String(groupId);
          resolvedIds.push(machId);
        }
        else if (!multiGroup && display && display.dynamic === false) {
          let cached = this._resolvedGroupCache.get(String(groupId));
          if (cached) {
            for (let j = 0; j < cached.length; j++) resolvedIds.push(cached[j]);
          }
          else {
            unresolvedGroups.push(groupId);
          }
        }
        else {
          unresolvedGroups.push(groupId);
        }
      }

      if (unresolvedGroups.length === 0) {
        this._previewResolvedMachineIds = this._dedupePreserveOrder(resolvedIds);
        this._previewLoading = false;
        this._renderPreviewMachines();
        this._updateOkButtonState();
        return;
      }

      // AJAX needed: show loader, disable OK while loading
      this._previewLoading = true;
      this._renderPreviewLoader();
      this._updateOkButtonState();

      let basePath = this.path || '';
      let url = basePath + 'MachinesFromGroups?GroupIds=' + unresolvedGroups.join(',');
      let self = this;
      let groupSnapshot = this._groupSelectionArray.slice();

      pulseService.runAjaxSimple(
        url,
        function (data) {
          if (self._previewSelectionChanged(groupSnapshot)) return;
          let fetched = (data && data.MachineIds) ? data.MachineIds.map(String) : [];
          let isDynamic = (data && data.Dynamic === true);
          if (!isDynamic && unresolvedGroups.length === 1) {
            self._resolvedGroupCache.set(String(unresolvedGroups[0]), fetched);
          }
          let combined = resolvedIds.concat(fetched);
          self._previewResolvedMachineIds = self._dedupePreserveOrder(combined);
          self._previewLoading = false;
          self._renderPreviewMachines();
          self._updateOkButtonState();
        },
        function (errData) {
          if (self._previewSelectionChanged(groupSnapshot)) return;
          console.error('[x-machineselection preview] error', errData);
          self._previewResolvedMachineIds = [];
          self._previewLoading = false;
          self._renderPreviewError();
          self._updateOkButtonState();
        },
        function (failedUrl, isTimeout, status) {
          if (self._previewSelectionChanged(groupSnapshot)) return;
          console.error('[x-machineselection preview] ' + (isTimeout ? 'timeout' : 'failure (status ' + status + ')'), failedUrl);
          self._previewResolvedMachineIds = [];
          self._previewLoading = false;
          self._renderPreviewError();
          self._updateOkButtonState();
        }
      );
    }

    /** True if the selection changed since the snapshot was captured (stale AJAX detector). */
    _previewSelectionChanged(snapshot) {
      if (snapshot.length !== this._groupSelectionArray.length) return true;
      for (let i = 0; i < snapshot.length; i++) {
        if (String(snapshot[i]) !== String(this._groupSelectionArray[i])) return true;
      }
      return false;
    }

    _renderPreviewMachines() {
      if (!this._previewList) return;
      this._previewList.replaceChildren();
      this._previewList.classList.remove('pulse-component-loading');
      if (this._previewResolvedMachineIds.length === 0) {
        let noMachine = document.createElement('div');
        noMachine.classList.add('no-machines');
        noMachine.textContent = this.getTranslation('groupArray.noMachine', 'No machine in selection');
        this._previewList.appendChild(noMachine);
        return;
      }
      for (let i = 0; i < this._previewResolvedMachineIds.length; i++) {
        let machId = this._previewResolvedMachineIds[i];
        let xdisp = pulseUtility.createElementWithAttribute('x-machinedisplay', {
          'machine-id': machId
        });
        let row = document.createElement('div');
        row.classList.add('preview-machine-position');
        row.appendChild(xdisp);
        this._previewList.appendChild(row);
      }
    }

    _renderPreviewLoader() {
      if (!this._previewList) return;
      this._previewList.replaceChildren();
      this._previewList.classList.add('pulse-component-loading');
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.textContent = this.getTranslation('loadingDots', 'Loading...');
      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);
      this._previewList.appendChild(loaderDiv);
    }

    _renderPreviewError() {
      if (!this._previewList) return;
      this._previewList.replaceChildren();
      this._previewList.classList.remove('pulse-component-loading');
      let err = document.createElement('div');
      err.classList.add('preview-error');
      err.textContent = this.getTranslation('serverUnreachable', 'Server unreachable');
      this._previewList.appendChild(err);
    }

    /** Disables the dialog OK button while the preview is resolving asynchronously. */
    _updateOkButtonState() {
      if (!this._dialogId) return;
      let okBtn = document.querySelector('#' + this._dialogId + ' .customDialogOk');
      if (!okBtn) return;
      if (this._previewLoading) {
        okBtn.disabled = true;
        okBtn.classList.add('disabled');
      } else {
        okBtn.disabled = false;
        okBtn.classList.remove('disabled');
      }
    }

    /**
     * Persists the current selection to `pulseConfig` (keys `machine` and `group`) and dispatches
     * `configChangeEvent` for both keys. In `in-report` mode, writes to element attributes instead.
     * In group mode, the actual machine list comes from `_previewResolvedMachineIds`
     * (resolved internally by `_resolvePreviewMachines`).
     */
    _storeSelection() {
      if (false == this._useMachineSelection) {
        if (this._groupSelectionArray.length > 1) {
          // Multi-group: the backend applies cross-group semantics (intersection)
          // on MachinesFromGroups?GroupIds=A,B,... — _previewResolvedMachineIds
          // already holds that resolved set. Reconstructing the list from
          // single-machine groups would yield a UNION instead, which is wrong
          // whenever the intersection is smaller. Trust the preview directly.
          this._machineSelectionArray = this._previewResolvedMachineIds
            .filter(id => id !== '')
            .slice();
        }
        else {
          // Single-group: safe to use the stored MachineId for a single-machine
          // group, or the preview-resolved list for a multi-machine group.
          const groupId = this._groupSelectionArray[0];
          const display = groupId !== undefined ? this._groupDisplays.get(groupId.toString()) : undefined;
          if (display && display.singlemachine) {
            const machId = display.machineid !== undefined ? display.machineid.toString() : groupId.toString();
            this._machineSelectionArray = [machId];
          }
          else {
            this._machineSelectionArray = this._previewResolvedMachineIds
              .filter(id => id !== '')
              .slice();
          }
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

        // Selection change resets the navigation chain entirely: rewrite the
        // URL with the new group/machine and drop every ancestor param, then
        // hard-reload. Without rewriting the URL, the old params still win over
        // localStorage (pulseConfig.get prioritizes URL), so the new selection
        // would be ignored after reload.
        let url = window.location.href;
        url = pulseUtility.removeURLParameter(url, 'group');
        url = pulseUtility.removeURLParameter(url, 'machine');
        url = pulseUtility.removeURLParameterContaining(url, 'ancestor');
        let separator = url.includes('?') ? '&' : '?';
        if (joinedGroups && joinedGroups !== joinedMachines) {
          url += separator + 'group=' + joinedGroups;
          separator = '&';
        }
        if (joinedMachines) {
          url += separator + 'machine=' + joinedMachines;
        }

        let legendContent = document.querySelector('.legend-content');
        if (legendContent) {
          legendContent.dispatchEvent(new Event('resize'));
        }
        window.location.href = url;
        return;
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

    /**
     * Restores `_groupSelectionArray` and `_machineSelectionArray` from `pulseConfig` (or element
     * attributes in `in-report` mode) and switches the dialog to the appropriate mode.
     */
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

    /** Unchecks all checkboxes in the dialog and clears both selection arrays. */
    _clearSelection() {
      let checkboxes = this._dialogPage1.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
      this._groupSelectionArray = [];
      this._machineSelectionArray = [];
      this._changeSelectionInCategoryList();
      this._changeSelectionInMachineList();
    }

    /**
     * Updates the `(N)` selection count badge in a category row header.
     * Counts checked checkboxes within `mainCategory` and displays the count, or hides it when zero.
     *
     * @param {HTMLElement} mainCategory - `.machineselection-category` DOM element.
     */
    _updateNumberOfSelections(mainCategory) {
      let selections = mainCategory.querySelectorAll('input[type="checkbox"]');
      let nbSel = 0;
      for (let iSel = 0; iSel < selections.length; iSel++) {
        if (selections[iSel].checked) {
          nbSel++;
        }
      }
      let categoryRow = mainCategory.querySelector(':scope > .machineselection-category-row');
      let numSpan = categoryRow ? categoryRow.querySelector('.number-of-selections') : null;
      if (numSpan) {
        numSpan.textContent = (nbSel == 0) ? '' : ('(' + nbSel + ')');
      }
    }

    /**
     * Builds `_groupDisplays` (Map keyed by group/machine id string) from the REST response data.
     * Recursively processes `Zoom` sub-groups. Individual machines from `MachineList` are added
     * with `singlemachine: true` if not already present.
     */
    _storeDisplays() {
      this._groupDisplays.clear();

      let storeSubGroups = function (machineselection, groups) {
        for (let iGroup = 0; iGroup < groups.length; iGroup++) {
          if (groups[iGroup].Display != '') {
            machineselection._groupDisplays.set(groups[iGroup].Id.toString(), {
              display: groups[iGroup].Display,
              dynamic: (groups[iGroup].Dynamic == true),
              singlemachine: (groups[iGroup].SingleMachine == true),
              sortpriority: groups[iGroup].SortPriority,
              machineid: groups[iGroup].MachineId
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

    /**
     * Populates the group category tree in the dialog page 1.
     * Each category becomes a collapsible section with labeled checkboxes per group/sub-group.
     * Checking a box toggles the group in `_groupSelectionArray` and updates the selection panel.
     */
    _fillCategoryList() {
      if (this._categoryList == undefined)
        return;

      let getSubGroups = function (machineselection, container, groups, isMain) {
        let nbSubGroups = 0;
        for (let i = 0; i < groups.length; i++) {
          if (groups[i].Display != '') {
            let svgShow = document.createElement('div');
            svgShow.classList.add('show-sub');
            let svgHide = document.createElement('div');
            svgHide.classList.add('hide-sub');
            let showHide = document.createElement('div');
            showHide.classList.add('machineselection-subcategory-visibility');
            showHide.appendChild(svgShow);
            showHide.appendChild(svgHide);
            pulseSvg.inlineBackgroundSvg(svgShow);
            pulseSvg.inlineBackgroundSvg(svgHide);

            let divDisplayGroup = document.createElement('label');
            divDisplayGroup.htmlFor = 'checkbox-' + groups[i].Id;
            divDisplayGroup.classList.add('machineselection-category-display-group');
            let spanDisplay = document.createElement('span');
            spanDisplay.classList.add('category-display');
            spanDisplay.textContent = groups[i].TreeName;
            let nbSel = document.createElement('span');
            nbSel.classList.add('number-of-selections');
            nbSel.textContent = '';
            let checkbox = document.createElement('input');
            checkbox.id = 'checkbox-' + groups[i].Id;
            checkbox.type = 'checkbox';
            checkbox.setAttribute('groupid', groups[i].Id);
            checkbox.setAttribute('dynamic', groups[i].Dynamic);
            let divRow = document.createElement('div');
            divRow.classList.add('machineselection-category-row');
            divDisplayGroup.appendChild(checkbox);
            divDisplayGroup.appendChild(spanDisplay);
            divDisplayGroup.appendChild(nbSel);
            divRow.appendChild(showHide);
            divRow.appendChild(divDisplayGroup);
            if (isMain)
              divRow.classList.add('is-main');
            if (groups[i].Dynamic) {
              let spanDynamic = document.createElement('span');
              spanDynamic.classList.add('machineselection-dynamic-label');
              spanDynamic.textContent = machineselection.getTranslation('dynamicKey', 'DYNAMIC');
              divRow.appendChild(spanDynamic);
            }
            let category = document.createElement('div');
            category.classList.add('machineselection-category');
            category.appendChild(divRow);

            showHide.addEventListener('click', function () {
              if (this.classList.contains('closed')) {
                this.classList.remove('closed');
                this.classList.add('opened');
                let content = this.closest('.machineselection-category')
                  .querySelector('.machineselection-category-content');
                if (content) content.style.display = '';
              }
              else if (this.classList.contains('opened')) {
                this.classList.remove('opened');
                this.classList.add('closed');
                let content = this.closest('.machineselection-category')
                  .querySelector('.machineselection-category-content');
                if (content) content.style.display = 'none';
              }
            });

            checkbox.addEventListener('change', function () {
              machineselection._switchToGroupSelection();

              let group = checkbox.getAttribute('groupid');
              let isChecked = checkbox.checked;
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
              let changedCategory = machineselection._dialogPage1.querySelectorAll('input[groupid="' + group + '"]');
              changedCategory.forEach(cb => cb.checked = isChecked);

              let categoriesToUpdate = new Set();
              changedCategory.forEach(cb => {
                let parent = cb.closest('.machineselection-category');
                while (parent && parent.classList.contains('machineselection-category')) {
                  categoriesToUpdate.add(parent);
                  parent = parent.parentElement.closest('.machineselection-category');
                }
              });
              categoriesToUpdate.forEach(cat => machineselection._updateNumberOfSelections(cat));
              machineselection._fillSelection();
            });

            if (!pulseUtility.isNotDefined(groups[i].Zoom)) {
              let hiddenSubGroup = document.createElement('div');
              hiddenSubGroup.classList.add('machineselection-category-content');
              let nbSubSubGroups = getSubGroups(machineselection, hiddenSubGroup, groups[i].Zoom);
              if (nbSubSubGroups > 0) {
                category.appendChild(hiddenSubGroup);
                category.classList.add('expandable');
                hiddenSubGroup.style.display = 'none';
                showHide.classList.add('closed');
              }
            }
            else {
              showHide.replaceChildren();
              showHide.classList.add('noChild');
            }

            container.appendChild(category);
            nbSubGroups++;
          }
        }
        return nbSubGroups;
      }

      this._categoryList.replaceChildren();
      let fullListToScroll = document.createElement('div');
      fullListToScroll.classList.add('machineselection-categorylist-full');
      let list = '';
      for (let catIndex = 0; catIndex < this._groups.length; catIndex++) {
        let groups = this._groups[catIndex].Groups;
        let omitCat = this._groups[catIndex].OmitGroupCategory;
        if (groups != null && groups.length > 0) {
          if (!pulseUtility.isNotDefined(omitCat) && omitCat == true
            && groups.length == 1 && groups[0].Display != '') {
            let category = document.createElement('div');
            category.classList.add('machineselection-category', 'main-category');
            let nbSubGroups = getSubGroups(this, category, groups, true);
            if (nbSubGroups == 1)
              fullListToScroll.appendChild(category);

          }
          else {
            let svgShow = document.createElement('div');
            svgShow.classList.add('show-sub');
            let svgHide = document.createElement('div');
            svgHide.classList.add('hide-sub');
            let showHide = document.createElement('div');
            showHide.classList.add('machineselection-subcategory-visibility');
            showHide.appendChild(svgShow);
            showHide.appendChild(svgHide);
            pulseSvg.inlineBackgroundSvg(svgShow);
            pulseSvg.inlineBackgroundSvg(svgHide);

            let span = document.createElement('span');
            span.classList.add('category-display');
            span.textContent = this._groups[catIndex].Display;
            let nbSel = document.createElement('span');
            nbSel.classList.add('number-of-selections');
            nbSel.textContent = '';
            let divHeader = document.createElement('div');
            divHeader.classList.add('machineselection-category-row', 'is-main');
            divHeader.appendChild(showHide);
            divHeader.appendChild(span);
            divHeader.appendChild(nbSel);
            let category = document.createElement('div');
            category.classList.add('machineselection-category', 'main-category');
            category.appendChild(divHeader);

            showHide.addEventListener('click', function () {
              if (this.classList.contains('closed')) {
                this.classList.remove('closed');
                this.classList.add('opened');
                let content = this.closest('.machineselection-category')
                  .querySelector('.machineselection-category-content');
                if (content) content.style.display = '';
              }
              else if (this.classList.contains('opened')) {
                this.classList.remove('opened');
                this.classList.add('closed');
                let content = this.closest('.machineselection-category')
                  .querySelector('.machineselection-category-content');
                if (content) content.style.display = 'none';
              }
            });

            let hiddenSubGroup = document.createElement('div');
            hiddenSubGroup.classList.add('machineselection-category-content');
            hiddenSubGroup.style.display = 'none';
            let nbSubGroups = getSubGroups(this, hiddenSubGroup, groups);
            if (nbSubGroups > 0) {
              category.appendChild(hiddenSubGroup);
              category.classList.add('expandable');
              showHide.classList.add('closed');
            }
            fullListToScroll.appendChild(category);
          }
        }
      }
      this._categoryList.appendChild(fullListToScroll);
    }

    /**
     * Syncs all category-tree checkboxes to match `_groupSelectionArray`.
     * When `andOpen` is `true`, also expands the category sections containing selected groups.
     * Updates category selection count badges via `_updateNumberOfSelections()`.
     *
     * @param {boolean} [andOpen] - When `true`, expands parent category sections of selected groups.
     */
    _changeSelectionInCategoryList(andOpen) {
      if (this._dialogPage1 == undefined)
        return;

      let allCheckboxes = this._dialogPage1.querySelectorAll('input[type="checkbox"]');
      allCheckboxes.forEach(cb => cb.checked = false);

      for (let i = 0; i < this._groupSelectionArray.length; i++) {
        let group = this._groupSelectionArray[i];
        let selectedCategories = this._dialogPage1.querySelectorAll('input[groupid="' + group + '"]');
        if (selectedCategories.length == 0) {
          console.warn('Check group configuration for ' + group);
          this._groupSelectionArray.splice(i, 1);
          this._changeSelectionInCategoryList(andOpen);
          return;
        }
        else {
          selectedCategories.forEach(cb => cb.checked = true);

          if (andOpen == true) {
            selectedCategories.forEach(cb => {
              let parent = cb.closest('.machineselection-category');
              while (parent && parent.classList.contains('machineselection-category')) {
                let content = parent.querySelector('.machineselection-category-content');
                if (content) content.style.display = '';
                let visibility = parent.querySelector('.machineselection-subcategory-visibility');
                if (visibility && visibility.classList.contains('closed')) {
                  visibility.classList.remove('closed');
                  visibility.classList.add('opened');
                }
                parent = parent.parentElement.closest('.machineselection-category');
              }
            });
          }
        }
      }
      let parentsCat = this._dialogPage1.querySelectorAll('.machineselection-category');
      parentsCat.forEach(cat => this._updateNumberOfSelections(cat));

      this._fillSelection();
    }

    /**
     * Rebuilds `_summary` with the display names of the currently selected groups/machines.
     * Adds `missing-config` class to ancestor elements when no selection is present.
     */
    _fillSummaryDisplay() {
      if (this._summary == undefined)
        return;
      this._summary.replaceChildren();

      let ul = document.createElement('div');

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
        let li = document.createElement('div');
        let span = document.createElement('span');
        span.textContent = display;
        li.appendChild(span);
        ul.appendChild(li);
        oneGroupIsAdded = true;
      }

      if (!oneGroupIsAdded) {
        this._summary.textContent = this.getTranslation('noSelectedMachine', 'No selected machine');
        this._summary.classList.add('missing-config');
        if (this.element.parentElement) this.element.parentElement.classList.add('missing-config');
        if (this.element.parentElement && this.element.parentElement.parentElement)
          this.element.parentElement.parentElement.classList.add('missing-config');
      }
      else {
        this._summary.appendChild(ul);
        this._summary.classList.remove('missing-config');
        if (this.element.parentElement) this.element.parentElement.classList.remove('missing-config');
        if (this.element.parentElement && this.element.parentElement.parentElement)
          this.element.parentElement.parentElement.classList.remove('missing-config');
      }
    }

    /**
     * Fills an external DOM element with the same display names as `_fillSummaryDisplay()`.
     *
     * @param {jQuery|HTMLElement} summary - Target container to fill.
     */
    fillExternalSummaryDisplay(summary) {
      if (summary == undefined)
        return;
      if (summary instanceof Element) {
        summary.replaceChildren();
      } else {
        return;
      }

      let ul = document.createElement('div');

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
        let li = document.createElement('div');
        let span = document.createElement('span');
        span.textContent = display;
        li.appendChild(span);
        ul.appendChild(li);
        oneGroupIsAdded = true;
      }

      if (!oneGroupIsAdded) {
        summary.textContent = this.getTranslation('noSelectedMachine', 'No selected machine');
        summary.classList.add('missing-config');
      }
      else {
        summary.appendChild(ul);
        summary.classList.remove('missing-config');
      }
    }

    /** @returns {string[]} A copy of the current machine id selection array. */
    getMachinesArray() {
      return ([].concat(this._machineSelectionArray));
    }
    /** @returns {string[]} A copy of the current group id selection array. */
    getGroupsArray() {
      return ([].concat(this._groupSelectionArray));
    }
    /** @returns {string} Comma-separated machine ids from the current selection. */
    getMachinesString() {
      return this._machineSelectionArray.join();
    }
    /** @returns {string} Comma-separated group ids from the current selection. */
    getGroupsString() {
      return this._groupSelectionArray.join();
    }

    /**
     * Single-source-of-truth API: returns the currently resolved machine id list
     * (after group→machine resolution).
     *
     * @returns {string[]} A copy of the resolved machine id list.
     */
    getResolvedMachineIds() {
      return ([].concat(this._resolvedMachineIds));
    }

    /** @returns {boolean} True once the first resolution has completed and an event was emitted. */
    isReady() {
      return this._isResolvedReady;
    }

    /**
     * Reads `pulseConfig` (machine + group), resolves any group ids to machine ids
     * (locally for single-machine groups, via REST `MachinesFromGroups` for the rest),
     * dedupes preserving order, then dispatches a single `machineListChanged` event.
     *
     * Runs once at boot and again on user action / config change. Downstream
     * orchestrators handle their own periodic re-poll for dynamic groups.
     *
     * @param {'url'|'user'} source - origin of the resolution
     */
    _resolveAndEmit(source) {
      let machineConfig = pulseConfig.getString(this._configMachines, '');
      let groupConfig = pulseConfig.getString(this._configGroups, '');

      // 1) Direct machine list — takes precedence
      if (machineConfig && machineConfig.trim() !== '') {
        let ids = machineConfig.split(',').map(s => s.trim()).filter(s => s !== '');
        this._emitMachineList(ids, source);
        return;
      }

      // 2) Empty
      if (!groupConfig || groupConfig.trim() === '') {
        this._emitMachineList([], source);
        return;
      }

      // 3) Group resolution
      let groupIds = groupConfig.split(',').map(s => s.trim()).filter(s => s !== '');
      let resolvedIds = [];
      let unresolvedGroups = [];
      let hasDynamic = false;

      // When MULTIPLE groups are selected, the backend applies cross-group semantics
      // (e.g. intersection) on the combined `MachinesFromGroups?GroupIds=A,B,...` call,
      // so pre-resolving single-machine groups locally would yield a different (union)
      // result. Local / cache resolution is only safe for a single-group selection.
      const multiGroup = groupIds.length > 1;

      for (let i = 0; i < groupIds.length; i++) {
        let groupId = groupIds[i];
        let display = this._groupDisplays.get(String(groupId));
        if (!multiGroup && display && display.singlemachine && !display.dynamic) {
          // Static single-machine group: resolve locally from boot cache
          let machId = (display.machineid !== undefined) ? String(display.machineid) : String(groupId);
          resolvedIds.push(machId);
        }
        else if (!multiGroup && display && display.dynamic === false) {
          // Static multi-machine group: cache lookup, AJAX once if unknown
          let cached = this._resolvedGroupCache.get(String(groupId));
          if (cached) {
            for (let j = 0; j < cached.length; j++) resolvedIds.push(cached[j]);
          }
          else {
            unresolvedGroups.push(groupId);
          }
        }
        else {
          // Dynamic group (single or multi) OR unknown — must AJAX every time
          // (single-machine dynamic groups can change identity between polls,
          // so the boot-time machineid is not reliable)
          unresolvedGroups.push(groupId);
          hasDynamic = true;
        }
      }

      if (unresolvedGroups.length === 0) {
        this._emitMachineList(this._dedupePreserveOrder(resolvedIds), source);
        return;
      }

      // 4) AJAX needed
      let basePath = this.path || '';
      let inflightKey = unresolvedGroups.join(',');
      // Skip if the same query is already in flight (prevents duplicate calls when
      // _resolveAndEmit is invoked twice during boot — early emit + Machine/Groups reconcile).
      if (this._machinesFromGroupsInflight === inflightKey) return;
      this._machinesFromGroupsInflight = inflightKey;
      let url = basePath + 'MachinesFromGroups?GroupIds=' + inflightKey;
      let self = this;
      pulseService.runAjaxSimple(
        url,
        function (data) {
          self._machinesFromGroupsInflight = null;
          // Cancel any pending error retry — server is back
          if (self._retryTimer) {
            clearTimeout(self._retryTimer);
            self._retryTimer = null;
          }
          let fetched = (data && data.MachineIds) ? data.MachineIds.map(String) : [];
          let isDynamic = (data && data.Dynamic === true) || hasDynamic;
          if (!isDynamic) {
            // Cache only when static and only a single group was unresolved
            // (we can't split the response across multiple groups without per-group info)
            if (unresolvedGroups.length === 1) {
              self._resolvedGroupCache.set(String(unresolvedGroups[0]), fetched);
            }
          }
          let combined = resolvedIds.concat(fetched);
          self._emitMachineList(self._dedupePreserveOrder(combined), source);
        },
        function (errData) {
          self._machinesFromGroupsInflight = null;
          console.error('[x-machineselection] MachinesFromGroups error', errData);
          self._scheduleErrorRetry(source);
          eventBus.EventBus.dispatchToAll('machineListChanged', { ids: [], error: 'network' });
        },
        function (failedUrl, isTimeout, status) {
          self._machinesFromGroupsInflight = null;
          console.error('[x-machineselection] MachinesFromGroups ' + (isTimeout ? 'timeout' : 'failure (status ' + status + ')'), failedUrl);
          self._scheduleErrorRetry(source);
          eventBus.EventBus.dispatchToAll('machineListChanged', { ids: [], error: 'network' });
        }
      );
    }

    _dedupePreserveOrder(arr) {
      let seen = new Set();
      let out = [];
      for (let i = 0; i < arr.length; i++) {
        let s = String(arr[i]);
        if (s !== '' && !seen.has(s)) {
          seen.add(s);
          out.push(s);
        }
      }
      return out;
    }

    _emitMachineList(ids, source) {
      // Dedupe identical re-emits.
      // Boot sequence: initialize() does an early-emit (synchronous, source='url-early')
      // and refresh() emits again after the Machine/Groups AJAX returns (source='url').
      // For the machine config case both produce the same id list — the second emit would
      // trigger another _buildItems() pass in renderers, re-appending DOM items and forcing
      // disconnect/reconnect on every sub-component (visible as duplicated AJAX, double
      // bar rendering on x-barstack-based pages, etc.).
      // Skip when the list is unchanged. Real changes (group poll, dialog OK) still go through.
      if (this._isResolvedReady
          && this._resolvedMachineIds.length === ids.length
          && this._resolvedMachineIds.every((v, i) => String(v) === String(ids[i]))) {
        return;
      }
      this._resolvedMachineIds = ids;
      this._isResolvedReady = true;
      eventBus.EventBus.dispatchToAll('machineListChanged', {
        ids: [].concat(ids),
        source: source
      });
    }

    _scheduleErrorRetry(source) {
      if (this._retryTimer) {
        clearTimeout(this._retryTimer);
        this._retryTimer = null;
      }
      let self = this;
      let delay = pulseConfig.getInt('serverRetrySeconds', 15) * 1000;
      if (delay < 5000) delay = 5000;
      this._retryTimer = setTimeout(function () {
        self._retryTimer = null;
        console.warn('[x-machineselection] retrying MachinesFromGroups after server error');
        self._resolveAndEmit(source);
      }, delay);
    }

  }

  pulseComponent.registerElement('x-machineselection', MachineSelectionComponent, ['unique-machine']);
})();
