// Copyright (C) 2025 Atsora Solutions
// SPDX-License-Identifier: Apache-2.0

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseConfig = require('pulseConfig');
var eventBus = require('eventBus');
var state = require('state');

(function () {
  class GroupGridComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    constructor(...args) {
      const self = super(...args);
      self._content = undefined;
      self._machineIdsArray = [];
      self._waitingForEngine = false;
      return self;
    }

    get content() { return this._content; }

    initialize() {
      this.addClass('pulse-groupgrid');
      $(this.element).empty();

      this._content = $('<div></div>').addClass('groupgrid-main');
      $(this.element).append(this._content);

      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').hide();
      $(this._content).append($('<div></div>').addClass('pulse-loader-div').append(loader));
      this._messageSpan = $('<span></span>').addClass('pulse-message');
      $(this._content).append($('<div></div>').addClass('pulse-message-div').append(this._messageSpan));

      // [NOUVEAU] On écoute l'ordre du moteur pour afficher/masquer les tuiles
      if (eventBus.EventBus.addEventListener) {
        eventBus.EventBus.addEventListener(this, 'updateVisibleMachines', 'PAGE', this.onUpdateVisibility);
      }

      this.switchToNextContext();
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      if (attr === 'machine' || attr === 'group') {
        this.start();
      }
    }

    getStartKey(context) {
      switch (context) {
        case 'Loaded': return 'Standard';
        default: return super.getStartKey(context);
      }
    }

    defineState(context, key) {
      switch (context) {
        case 'Loaded': return new state.StaticState(context, key, this);
        default: return super.defineState(context, key);
      }
    }

    getShortUrl() {
      // On ne charge le groupe via AJAX que si aucune machine n'est fournie
      let groups = pulseConfig.getString('group');
      if (!groups || groups === '') return null;
      return 'MachinesFromGroups?GroupIds=' + groups;
    }

    _runAlternateGetData() {
      if (this._waitingForEngine) return true;

      // 1. PRIORITÉ : Config 'machine' (donnée par common_page)
      let machinesStr = pulseConfig.getString('machine');
      if (machinesStr && machinesStr.trim() !== '') {
        this._machineIdsArray = machinesStr.split(',').map(s => s.trim()).filter(s => s !== '');
        this._displayAllMachines(); // On affiche TOUT le monde dans le DOM
        this.switchToContext('Loaded');
        return true;
      }

      // 2. Groupe
      let groups = pulseConfig.getString('group');
      if (groups && groups.trim() !== '') {
        return false; // Launch AJAX
      }

      this._machineIdsArray = [];
      this._displayAllMachines();
      this.switchToContext('Loaded');
      return true;
    }

    manageSuccess(data) {
      this.removeError();
      let allMachineIds = data.MachineIds || [];

      if (pulseConfig.getString('group')) {
        console.log('[DEBUG] x-groupgrid: Group loaded (' + allMachineIds.length + '). Delegating to Engine.');
        this._waitingForEngine = true;

        let payload = { newMachinesList: allMachineIds.join(',') };
        if (eventBus.EventBus.dispatchToAll) eventBus.EventBus.dispatchToAll('groupIsReloaded', payload);
        else if (eventBus.EventBus.dispatch) eventBus.EventBus.dispatch('groupIsReloaded', payload);

        // On vide ici, car on attend que le moteur nous renvoie la liste complète via la config 'machine'
        this._machineIdsArray = [];
        this._displayAllMachines();
      }
      else {
        this._machineIdsArray = allMachineIds;
        this._displayAllMachines();
      }
      this.switchToContext('Loaded');
    }

    // Affiche TOUTES les machines dans le DOM (mais potentiellement cachées par le moteur plus tard)
    _displayAllMachines() {
      let container = $(this._content);
      container.find('.groupgrid-item').remove();

      if (this._machineIdsArray.length > 0) {
        let templateId = this.element.getAttribute('templateid') || 'boxtoclone';

        this._machineIdsArray.forEach(machineId => {
          if (!machineId) return;
          let itemContent = pulseUtility.cloneWithNewMachineId(templateId, machineId);

          let item = $('<div></div>')
            .addClass('groupgrid-item')
            .attr('machine-id', machineId)
            .append(itemContent);

          container.append(item);
        });
        $(this._content).attr('data-count', this._machineIdsArray.length);

        console.log('[DEBUG] x-groupgrid: All items rendered. Signaling Engine.');
        if (eventBus.EventBus.dispatchToAll) eventBus.EventBus.dispatchToAll('groupGridRendered', {});
        else if (eventBus.EventBus.dispatch) eventBus.EventBus.dispatch('groupGridRendered', {});
      }

      console.log('[DEBUG] x-groupgrid: All ' + this._machineIdsArray.length + ' items rendered. Signaling Engine.');

      // Signal au moteur que le DOM est prêt à être manipulé
      if (eventBus.EventBus.dispatchToAll) eventBus.EventBus.dispatchToAll('groupGridRendered', {});
      else if (eventBus.EventBus.dispatch) eventBus.EventBus.dispatch('groupGridRendered', {});
    }

    // [NOUVEAU] C'est ici que la magie JS opère pour le Show/Hide
    onUpdateVisibility(event) {
      let visibleIds = [];
      if (event.target && event.target.machines) visibleIds = event.target.machines;
      else if (event.machines) visibleIds = event.machines;

      let count = visibleIds.length;

      // [NOUVEAU] On injecte le compte directement dans le HTML du composant
      // Cela permet au CSS du composant de réagir tout seul
      $(this._content).attr('data-count', count);

      let items = $(this._content).find('.groupgrid-item');

      items.each(function () {
        let el = $(this);
        let id = el.attr('machine-id');

        if (visibleIds.includes(id)) {
          el.css('display', 'flex');
        } else {
          el.hide();
        }
      });
    }

    onConfigChange(event) {
      if (event.target.config === 'machine') {
        this._waitingForEngine = false;
        this.start();
      }
      else if (event.target.config === 'group') {
        if (pulseConfig.getString('group') !== '') {
          this._waitingForEngine = false;
          this.start();
        }
      }
    }

    validateParameters() { this.switchToNextContext(); }
    displayError(message) { $(this._messageSpan).html(message); }
    removeError() { $(this._messageSpan).html(''); }
  }

  pulseComponent.registerElement('x-groupgrid', GroupGridComponent, ['templateid', 'group', 'machine']);
})();
