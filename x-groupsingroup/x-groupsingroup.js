// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-groupsingroup
 * @requires module:pulseComponent
 * @requires module:pulseRange
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
//var pulseLogin = require('pulseLogin');
//var pulseConfig = require('pulseConfig');
var state = require('state');
var eventBus = require('eventBus');

/*
 ** Attributes :
 - templateid
 - group
 */
(function () {

  class GroupsInGroupComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Default
      self._dynamic = true;
      self._groupIdsArray = [];
      self._groupsDetails = [];
      self._ignoreAncestors = false;

      // DOM -> never in contructor
      self._content = undefined;
      self._dynamic = false;

      return self;
    }

    /*get content () {
      return this._content;
    }*/

    _displayOrUpdateGroupsList () {
      //$(this._content).empty(); No !

      // Get the box to clone element from DOM
      let boxtocloneid = undefined;
      if (this.element.hasAttribute('templateid'))
        boxtocloneid = this.element.getAttribute('templateid');
      if (pulseUtility.isNotDefined(boxtocloneid))
        boxtocloneid = 'boxtoclone';

      // Calculate height to fit container
      let row_height = null;
      let nbRowToDisplay = 1;
      if (this._groupIdsArray.length > 0) {
        nbRowToDisplay = Math.trunc(Math.sqrt(this._groupIdsArray.length));
        if (3 == this._groupIdsArray.length) {
          nbRowToDisplay = 2;  // To display 2 on first row when total = 3
        }
        row_height = 100.0 / nbRowToDisplay + '%';
      }
      let column_width = null; // defined below
      let minColumns = Math.trunc(this._groupIdsArray.length / nbRowToDisplay);
      let maxColumns = Math.ceil(this._groupIdsArray.length / nbRowToDisplay)
      let nbOfMaxSizedRows = this._groupIdsArray.length % minColumns;
      if (3 == this._groupIdsArray.length) {
        nbOfMaxSizedRows = 1;
      }

      // Update the component with data returned by the web service
      function groupIdIsInList (groupId, List) {
        for (let i = 0; i < List.length; i++) {
          if (Number(groupId) == Number(List[i]))
            return true;
        }
        return false;
      }

      // REMOVE group not in list anymore
      let self = this;
      $(this.element).find('.groupsingroup-subgroup').each(function () {
        let groupId = $(this).attr('group'); // this = group-single
        if (false == groupIdIsInList(groupId, self._groupIdsArray)) { // self = x-groupsingroup
          $(this).remove(); // this = groupsingroup-subgroup
        }
        else {
          $(this).find('*').addClass('disableDeleteWhenDisconnect');
          /* DO NOT used this.element : not defined here ! this == '.groupsingroup-subgroup' */
        }
      });

      //$(this.element).find('*').addClass('disableDeleteWhenDisconnect');

      if (0 == this._groupIdsArray.length) {
        //$(this._messageSpan).html('No machines or group to display');

        console.warn('No machines or group to display in x-groupsingroup');
        // Delayed display :
        //this.setError(this.getTranslation('error.noMachineOrGroupToDisplay', 'No machine or group to display')); // delayed error message
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.noMachineOrGroupToDisplay', 'No machine or group to display')), () => this.removeError());
      }
      else {
        $(this._messageSpan).html('');

        // Update list of groups - Add ROWS
        for (let i = 0; i < this._groupIdsArray.length; i++) {
          let singleid = this._groupIdsArray[i];
          let singledetails = this._groupsDetails[i]; // WARNING ! Maybe remove (bug in web service) --201907
          let isMachine = singledetails.SingleMachine; // WARNING ! Maybe remove (bug in web service) --201907
          //let isMachine = pulseUtility.isInteger(singleid); // WARNING ! Maybe ADD (bug in web service) --201907

          //singledetails.Display --> long name
          //singledetails.TreeName --> short name
          //singledetails.SingleMachine == bool == is machine ?
          let li;

          // Find if already exists
          let machineRow = $(this._content).find(".groupsingroup-subgroup[group='" + singleid + "']");
          // NO remove ELSE display can become not smooth enough
          if (machineRow.length != 0) { // if exists
            // Move at end of the list to order all
            li = machineRow[0];
          }
          else {
            // Else Create NEW = copy the element and its child nodes
            let copy = pulseUtility.cloneWithNewGroupId(boxtocloneid,
              singleid, isMachine);

            // Append the cloned element to the list
            li = $('<li></li>').addClass('groupsingroup-subgroup');
            li.attr('group', singleid);
            if (isMachine == true) {
              li.addClass('subgroup-single-machine');
            }
            else {
              // Allow click and different display
              li.addClass('subgroup-group-not-machine');
            }
            li.append(copy);
          }

          // Set height / width
          let nbColumnToDisplay = minColumns;
          if (i < nbOfMaxSizedRows * maxColumns)
            nbColumnToDisplay = maxColumns;
          column_width = 100.0 / nbColumnToDisplay + '%';

          // Version 'bourrin' = format table
          //column_width = 100.0 / maxColumns + '%';

          if (null != column_width)
            $(li).css({
              'width': column_width
            });
          if (null != row_height)
            $(li).css({
              'height': row_height
            });
          $(this._content).append(li);
        }
      }
      //$(this.element).find('.disableDeleteWhenDisconnect').removeClass('disableDeleteWhenDisconnect'); // too early

      // Warn fieldlegend : machine list has changed
      if ('false' == this.getConfigOrAttribute('donotwarngroupreload', 'false')) {
        eventBus.EventBus.dispatchToAll('groupIsReloaded', {
          newGroupsList: this._groupIdsArray.join(',')
        });
      }

      // TIMEOUT to be sure that all is cleared
      // (else the mecanism is not working as it should)
      setTimeout(this._removeDisable.bind(this),
        this.refreshRate / 2 * 1000);

    } // _displayOrUpdateGroupsList

    _removeDisable () {
      $(this.element).find('.disableDeleteWhenDisconnect')
        .removeClass('disableDeleteWhenDisconnect');
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @return {!string} key
     */
    getStartKey (context) {
      switch (context) {
        case 'Loaded':
          return 'Standard';
        default:
          return super.getStartKey(context);
      }
    }

    /**
     * @override
     * 
     * @param {!string} context - Context
     * @param {!string} key - Key
     * @returns {!State} Created states
     */
    defineState (context, key) {
      switch (context) {
        case 'Loaded': // == No Refresh until click on button 'Start' or change config
          return new state.StaticState(context, key, this);
        default:
          return super.defineState(context, key);
      }
    }

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'templateid':
        case 'group':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize () {
      this.addClass('pulse-bigdisplay');

      // Update here some internal parameters

      // listeners

      // Create DOM - Content
      this._content = $('<ol></ol>').addClass('groupsingroup-main');
      if (this.element.hasAttribute('fixed-size')
        && this.element.getAttribute('fixed-size') == true) {
        this._content.addClass('fixed-size');
      }
      $(this.element)
        .addClass('group')
        .append(this._content);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html(this.getTranslation('loadingDots', 'Loading...')).css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this._content).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this._content).append(messageDiv);

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    clearInitialization () {
      // Parameters
      // DOM
      $(this.element).empty();

      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    reset () { // Optional implementation
      // Code here to clean the component when the component has been initialized for example after a parameter change
      this.removeError();
      // Empty this._content
      //$(this._content).empty();

      this.switchToNextContext();
    }

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      let groups = this.getConfigOrAttribute('group');
      if (pulseUtility.isNotDefined(groups) || groups == '') {
        // list of machines is defined ?
        let machines = this.getConfigOrAttribute('machine', '');
        if (pulseUtility.isNotDefined(machines) || machines == '') {
          console.warn('missing attribute group or machine in x-groupsingroup');
          // Delayed display :
          //this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
          // Immediat display :
          this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')), () => this.removeError());

          return;
        }
        else {
          this.removeError('');
        }
      }
      else {
        this.removeError('');
      }

      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);
    }

    removeError () {
      $(this._messageSpan).html('');
    }

    get refreshRate () {
      // Return here the refresh rate in ms.
      if (this.element.hasAttribute('refreshrate')) {
        return 1000 * this.element.getAttribute('refreshrate');
      }
      else {
        return 1000 * 30; // 30 sec
      }
    }

    /*
      Replace _runAjaxWhenIsVisible when NO url should be called
      return true if something is done, false if _runAjaxWhenIsVisible should be called
    */
    _runAlternateGetData () {
      let groups = this.getConfigOrAttribute('group');

      // Multi-groups -> create many sub x-groupsingroup
      if (groups.includes(',')) {
        //console.warn('multiple groups x-groupsingroup');
        this._dynamic = false;

        this._groupIdsArray = groups.split(',');
        this._groupsDetails = [];
        for (let i = 0; i < this._groupIdsArray.length; i++) {
          this._groupsDetails.push({ SingleMachine: false });
        }
        this._displayOrUpdateGroupsList();

        // STOP calling Ajax request
        this.switchToContext('Loaded');
        return true;
      }

      // No groups, display machines
      if ((pulseUtility.isNotDefined(groups)) || (groups == '')) {
        this._dynamic = false;
        // Manage list of machines NOW
        let machines = this.getConfigOrAttribute('machine');
        this._groupIdsArray = machines.split(',');
        this._groupsDetails = [];
        for (let i = 0; i < this._groupIdsArray.length; i++) {
          this._groupsDetails.push({ SingleMachine: true });
        }
        this._displayOrUpdateGroupsList();
        // BECAUSE this._dynamic == false; // STOP calling Ajax request
        this.switchToContext('Loaded');
        // AND NOT this.switchToNextContext();
        return true;
      }

      // if group and NO ancestor ->display group(s)
      let href = window.location.href;
      let ancestor = pulseUtility.getURLParameterValues(href, 'ancestor1');
      if (0 < ancestor.length && this._ignoreAncestors) {
        this._ignoreAncestors = true;
        ancestor = [];

        href = pulseUtility.removeURLParameterContaining(href, 'ancestor');
        // Re-load whole page
        window.location.href = href;

        return;
      }
      if (0 == ancestor.length) { // == href includes 'ancestor'
        this._dynamic = false;
        this._groupIdsArray = groups.split(',');
        this._groupsDetails = [];
        for (let i = 0; i < this._groupIdsArray.length; i++) {
          this._groupsDetails.push({ SingleMachine: false });
        }
        this._displayOrUpdateGroupsList();
        // BECAUSE this._dynamic == false; // STOP calling Ajax request
        this.switchToContext('Loaded');
        // AND NOT this.switchToNextContext();
        return true;
      }

      // else Call WebService
      return false;
    }

    getShortUrl () {
      // Return the Web Service URL here without path
      let group = this.getConfigOrAttribute('group');
      let url = 'Machine/GroupZoomIn?GroupId=' + group;
      url += '&Details=true'; // WARNING ! Maybe remove (bug in web service) --201907
      // Login is set in global service call
      return url;
    }

    refresh (data) {
      this._displayOrUpdateGroupsList();
    }

    manageSuccess (data) {
      this._dynamic = data.Dynamic;
      this._groupIdsArray = data.Children;
      this._groupsDetails = data.ChildrenDetails; // WARNING ! Maybe remove (bug in web service) --201907

      //this._groupsDetails[i].Display --> long name
      //this._groupsDetails[i].TreeName --> short name
      //this._groupsDetails[i].SingleMachine --> bool == is machine

      if (false == this._dynamic) {
        this._displayOrUpdateGroupsList();

        // STOP calling Ajax request
        this.switchToContext('Loaded');
      }
      else {
        // Success:
        super.manageSuccess(data);
        // or this.switchToNextContext(() => this.refresh(data));
      }
    }

    // Callback events

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      if ((event.target.config == 'machine')
        || (event.target.config == 'group')) {
        // Clean ancestors
        this._ignoreAncestors = true;
        // Re-load
        this.start();
      }
    }

  }

  pulseComponent.registerElement('x-groupsingroup', GroupsInGroupComponent, ['templateid', 'group']);
})();
