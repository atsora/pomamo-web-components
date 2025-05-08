// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-grouparray
 * @requires module:pulseComponent
 * @requires module:pulseRange
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseLogin = require('pulseLogin');
var pulseConfig = require('pulseConfig');
var state = require('state');
var eventBus = require('eventBus');

/*
 ** Attributes :
 - templateid
 - machine
 - group
 - column (getConfigOrAttribute)
 - row (getConfigOrAttribute)
 - canUseRowsToSetHeight
 - allowpagerotation : bool true to start page rotation
 - rotation (getConfigOrAttribute) = rotation delay
 - refreshrate (ELSE rotation*nbPages ELSE 1hr)
 */
(function () {

  class GroupComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // Default
      self._lastUpdateDate = undefined;

      // DOM -> never in contructor
      self._content = undefined;
      self._dynamic = false;
      self._currentDisplayedPage = 1;
      self._nbPagesTotal = 1;
      self._showHideTimer = null;

      self._machineIdsArray = [];
      self.methods = {
        'getMachinesList': self.getMachinesList
      };

      return self;
    }

    // Overload to always refresh value
    get isVisible () {
      if (!this._connected) { // == is connected
        return false;
      }
      return true;
    }

    /** Get list of machines as string
     */
    getMachinesList () {
      return this._machineIdsArray.join();
    }

    get content () {
      return this._content;
    }

    _displayOrUpdateMachineList () {
      //$(this._content).empty(); No !

      if ((false == this._dynamic)
        && (this._machineIdsArray.length == 0)) {
        let noMachines = $('<div></div>').addClass('no-machines')
          .html('No machine in selection');// I18N ?
        $(this._content).append(noMachines);
      }
      else {
        $(this._content).find('.no-machines').remove();
      }

      // init possible rotation
      this._currentDisplayedPage = 1;

      // Get the box to clone element from DOM
      let boxtocloneid = this.element.getAttribute('templateid');
      if (pulseUtility.isNotDefined(boxtocloneid))
        boxtocloneid = 'boxtoclone';

      // Calculate width for multi-column (and height)
      let column_width = null;
      let row_height = null;
      let nbColumnToDisplay = this.getConfigOrAttribute('column');
      let nbRowToDisplay = this.getConfigOrAttribute('row', 2);
      let canUseRowsToSetHeight = this.getConfigOrAttribute('canUseRowsToSetHeight', 'false');
      let allowpagerotation = this.getConfigOrAttribute('allowpagerotation', 'false');

      if (!pulseUtility.isNotDefined(nbColumnToDisplay)) {
        column_width = 100.0 / nbColumnToDisplay + '%';
        if (allowpagerotation == 'true') { // No page rotation == auto-size
          if ((canUseRowsToSetHeight == 'true') || (canUseRowsToSetHeight == true)) {
            if (!pulseUtility.isNotDefined(nbRowToDisplay)) {
              row_height = 100.0 / nbRowToDisplay + '%';
            }
          }
        }
      }

      // Update the component with data returned by the web service
      function machineIdIsInList (machineId, List) {
        for (let i = 0; i < List.length; i++) {
          if (Number(machineId) == Number(List[i]))
            return true;
        }
        return false;
      }

      // REMOVE machine not in list anymore
      let self = this;
      $(this.element).find('.group-single').each(function () {
        let machineId = $(this).attr('machine-id'); // this = group-single
        if (false == machineIdIsInList(machineId, self._machineIdsArray)) { // self = x-grouparray
          $(this).remove(); // this = group-single
        }
        else {
          $(this).find('*').addClass('disableDeleteWhenDisconnect');
          /* DO NOT used this.element : not defined here ! this == '.group-single' */
        }
      });

      // Reset pages
      for (let i = 1; i <= this._nbPagesTotal; i++) {
        let page_class = 'li-page-' + i;
        $(this.element).find('.' + page_class).removeClass(page_class);
      }

      //$(this.element).find('*').addClass('disableDeleteWhenDisconnect');

      // Update list of machines - Add ROWS
      for (let i = 0; i < this._machineIdsArray.length; i++) {
        let singleid = this._machineIdsArray[i];
        let li;

        // Find if already exists
        let machineRow = $(this._content).find(".group-single[machine-id='" + singleid + "']");
        // NO remove ELSE display can become not smooth enough
        if (machineRow.length != 0) { // if exists
          // disableDeleteWhenDisconnect
          //machineRow[0].find ('*').addClass('disableDeleteWhenDisconnect');

          // Move at end of the list to order all
          //$(this._content).append(machineRow[0]);
          li = machineRow[0];
        }
        else {
          // Else Create NEW = copy the element and its child nodes
          let copy = pulseUtility.cloneWithNewMachineId(boxtocloneid, singleid);
          /*let copy = $('#' + boxtocloneid).clone(true);
          $(copy).removeAttr('id');
          $(copy).attr('machine-id', singleid);
          $(copy).find('*').attr('machine-id', singleid);*/

          // Append the cloned element to the list
          li = $('<li></li>').addClass('group-single');
          li.attr('machine-id', singleid);
          li.append(copy);
        }

        if (nbColumnToDisplay != 0 && nbRowToDisplay != 0) {
          // Add page class to ease page rotation
          let page_class = 'li-page-' + Math.ceil((i + 1) / (nbColumnToDisplay * nbRowToDisplay));
          $(li).addClass(page_class);

          // Set height / width
          if (null != column_width)
            $(li).css({
              'width': column_width
            });
          if (null != row_height)
            $(li).css({
              'height': row_height
            });
        }

        $(this._content).append(li);

        /*if (machineRow.length != 0) { // if exists
          // restoreDeleteWhenDisconnect 
          machineRow[0].find ('*').removeClass('disableDeleteWhenDisconnect');
        }*/
      }
      //$(this.element).find('.disableDeleteWhenDisconnect').removeClass('disableDeleteWhenDisconnect'); // too early

      // Warn fieldlegend : machine list has changed
      if ('false' == this.getConfigOrAttribute('donotwarngroupreload', 'false')) {
        eventBus.EventBus.dispatchToAll('groupIsReloaded', {
          newMachinesList: this._machineIdsArray.join(',')
        });
      }

      this._dealWithRotation();

      // TIMEOUT to be sure that all is cleared
      // (else the mecanism is not working as it should)
      let rotationDelay = Number(this.getConfigOrAttribute('rotation', '90'));
      setTimeout(this._removeDisable.bind(this),
        rotationDelay / 2 * 1000);

    } // _displayOrUpdateMachineList

    _removeDisable () {
      $(this.element).find('.disableDeleteWhenDisconnect')
        .removeClass('disableDeleteWhenDisconnect');
    }

    _dealWithRotation () {
      let nbColumnToDisplay = Number(this.getConfigOrAttribute('column', '3'));
      let nbRowToDisplay = Number(this.getConfigOrAttribute('row', '2'));

      this._currentDisplayedPage = 1; //re-init

      let allowpagerotation = this.getConfigOrAttribute('allowpagerotation', 'false');
      if (allowpagerotation == 'true' &&
        nbColumnToDisplay > 0 &&
        nbRowToDisplay > 0) {

        //this._currentDisplayedPage = 1; //re-init
        let nbMachine = this._machineIdsArray.length;
        this._nbPagesTotal = Math.ceil(nbMachine / (nbColumnToDisplay * nbRowToDisplay));
        if (this._nbPagesTotal == 0)
          this._nbPagesTotal = 1; // To avoid too log refresh rate
      }
      else { // NO rotation
        this._nbPagesTotal = 1;
      }
      this._rotationAndProgressDisplay();
    }

    _rotationAndProgressDisplay () {
      // Clear timer if exist ! To avoid many living timers
      if (this._showHideTimer) {
        clearTimeout(this._showHideTimer);
        this._showHideTimer = null;
      }

      let allowpagerotation = this.getConfigOrAttribute('allowpagerotation', 'false');
      if (allowpagerotation == 'true') {
        this._showHidePages();

        if (this._nbPagesTotal > 1) {
          let rotationDelay = Number(this.getConfigOrAttribute('rotation', '90'));

          // Display pagination and progress line
          $('.pulse-header-rotation-progress').html('<span style="width:0"></span>'); // Initialisation a 0px line
          $('.pulse-header-rotation-progress > span').animate({
            width: '100%'
          }, rotationDelay * 1000, 'linear'); // Increase its width until 100%
          $('#pulse-pagination').html((this._currentDisplayedPage) + ' / ' + this._nbPagesTotal);

          // Prepare next page rotation
          this._currentDisplayedPage++;
          if (this._currentDisplayedPage > this._nbPagesTotal) {
            this._currentDisplayedPage = 1;
          }
          this._showHideTimer = setTimeout(function () {
            this._rotationAndProgressDisplay();
          }.bind(this), rotationDelay * 1000);
        }
        else { // 1 page only
          // Reset rotation
          $('.pulse-header-rotation-progress').html('');
          $('#pulse-pagination').html('');
        }
      }
    }

    _showHidePages () {
      // Hide or show pages
      for (let index_page = 1; index_page <= this._nbPagesTotal; index_page++) {
        let page_class = '.li-page-' + index_page.toString();
        let li = $(this.element).find(page_class);
        if (index_page == this._currentDisplayedPage) {
          // $(li).css('display', 'inline-block'); //NO ! Because of ManagerWiew Page
          $(li).show();
          $(li).find('x-datetimegraduation').load(); // datetimegraduation can not manage 'width' when hidden
          // a best solution is to manage onShow Event.. once it exists
        }
        else {
          $(li).hide();
        }
      } // end for
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
        case 'Loaded': // == No Refresh until click on button 'Start'
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
        case 'machine':
        case 'column':
        case 'row':
        case 'canUseRowsToSetHeight':
        case 'allowpagerotation':
          //case 'rotation':
          //case 'refreshrate':
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

      // Empty display if already filled
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<ol></ol>').addClass('group-main');
      $(this.element)
        .addClass('group')
        .append(this._content);
      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
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
      // STOP timer
      if (this._showHideTimer) {
        clearTimeout(this._showHideTimer);
        this._showHideTimer = null;
      }

      // Parameters
      // DOM
      $(this.element).empty();

      this.removeError();
      this._messageSpan = undefined;
      this._content = undefined;

      super.clearInitialization();
    }

    /*reset () { // Optional implementation - REMOVED else too many refreshs on LCTR and memory grows endlessly
      // Code here to clean the component when the component has been initialized for example after a parameter change
      /*this.removeError();
      // Empty this._content
      $(this.content).empty();

      // STOP timer
      if (this._showHideTimer) {
        clearTimeout(this._showHideTimer);
        this._showHideTimer = null;
      }

      this.switchToNextContext();
    }*/

    /**
     * Validate the (event) parameters
     */
    validateParameters () {
      let groups = this.getConfigOrAttribute('group');
      let machines = this.getConfigOrAttribute('machine');
      if ((groups == null || groups == '') &&
        (machines == null || machines == '')) {
        /*missingConfigs.push({
          selector: 'x-machineselection, #editmachines',
          message: 'Please select at least one machine before launching the page.'
        }); */
        console.warn('missing attribute groups or machines in x-grouparray');
        // Delayed display :
        //this.setError(this.getTranslation('error.selectMachine', 'Please select a machine')); // delayed error message
        // Immediat display :
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')), () => this.removeError());
        return;
      }

      // Additional checks with attribute param

      this.switchToNextContext();
    }

    displayError (message) {
      $(this._messageSpan).html(message);

      $('.grouparray-dependant').addClass('grouparray-in-error'); //).hide();

      // STOP timer
      if (this._showHideTimer) {
        clearTimeout(this._showHideTimer);
        this._showHideTimer = null;
      }
    }

    removeError () {
      $(this._messageSpan).html('');

      $('.grouparray-dependant').removeClass('grouparray-in-error'); //.show();
    }

    get refreshRate () {
      // Return here the refresh rate in ms.
      if (this._nbPagesTotal >= 1) {
        let rotationDelay = Number(this.getConfigOrAttribute('rotation', '90'));
        return rotationDelay * this._nbPagesTotal * 1000;
      }
      else if (this.element.hasAttribute('refreshrate')) {
        return 1000 * this.element.getAttribute('refreshrate');
      }
      else {
        return 1000 * 60 * 60; // 1 hr
      }
    }

    /*
      Replace _runAjaxWhenIsVisible when NO url should be called
      return true if something is done, false if _runAjaxWhenIsVisible should be called
    */
    _runAlternateGetData () {
      let groups = this.getConfigOrAttribute('group'); //this.element.getAttribute('groups');
      if ((pulseUtility.isNotDefined(groups)) ||
        (groups == '')) {

        this.removeError();

        this._dynamic = false;
        // Manage list of machines NOW
        let machines = this.getConfigOrAttribute('machine');
        this._machineIdsArray = machines.split(',');
        this._displayOrUpdateMachineList();

        this._lastUpdateDate = Date();
        if (this.element.hasAttribute('textchange-context')) {
          // Send empty string
          eventBus.EventBus.dispatchToContext('textChangeEvent',
            this.element.getAttribute('textchange-context'),
            { text: '' });
        }

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
      let groups = this.getConfigOrAttribute('group');
      let url = 'MachinesFromGroups?GroupIds=' + groups;
      // Login is set in global service call
      return url;
    }

    refresh (data) {
      this._displayOrUpdateMachineList();
    }

    manageSuccess (data) {
      /* public List<int> MachineIds { get; set; }
      public int? SortKind { get; set; }
      public string SortKindTip { get; set; }*/
      this.removeError();

      this._machineIdsArray = data.MachineIds;
      this._dynamic = data.Dynamic;
      if (this.getConfigOrAttribute('forcestaticlist') == 'true' ||
        this.getConfigOrAttribute('forcestaticlist') == true) {
        this._dynamic = false;
      }
      this._lastUpdateDate = Date();
      if (this.element.hasAttribute('textchange-context')) {
        let textToSend = '';
        if (this._dynamic) {
          // Format Date and send
          let _lastMoment = pulseUtility.convertDateToMoment(this._lastUpdateDate);
          textToSend = _lastMoment.format('LTS')
        }
        eventBus.EventBus.dispatchToContext('textChangeEvent',
          this.element.getAttribute('textchange-context'),
          { text: textToSend });
      }

      if (false == this._dynamic) {
        this._displayOrUpdateMachineList();

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
        this.start();
      }
      if ((event.target.config == 'row')
        || (event.target.config == 'column')) {
        this._displayOrUpdateMachineList();
      }
      if (event.target.config == 'rotation') {
        this._currentDisplayedPage = 1;
        this._rotationAndProgressDisplay();
      }
    }

  }

  pulseComponent.registerElement('x-grouparray', GroupComponent, ['templateid', 'group', 'machine', 'column', 'row', 'canUseRowsToSetHeight', 'allowpagerotation']);
})();
