// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 *
 * @module x-taskslist
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as eventBus from 'eventBus';
import * as pulseConfig from 'pulseConfig';

(function () {

  /**
   * `<x-taskslist>` — list of the tasks that are due, sourced from the task
   * GraphQL service of the web service (`<path>/optasks`).
   *
   * Polls `taskInstancesNext(role, machineGroup)` (refresh =
   * `refreshingRate.currentRefreshSeconds`, default 10 s) and renders one
   * `<li>` per due task (late, to do, upcoming) with its name, machine, role
   * and timing inside a `.taskslist-content > <ol>`. A due task carries no
   * id: it is identified by `<taskTemplateId>-<machineId>`, the key of the
   * Vue execution dialog. Reacts to `machineIdChangeSignal` on
   * `machine-context` (updates `machine-id`).
   *
   * The machines, the `machineGroup` argument, are in this order:
   * `machine-id`, `machine-group`, else with `all-machines` the machines of
   * the page selection (`x-machineselection`, groups resolved into their
   * machines: the service does not accept a group in a list).
   *
   * @element x-taskslist
   * @attr {number}  machine-id      machine whose tasks are listed
   * @attr {string}  machine-group   machine group of the service (a group id, or machine ids separated by ',')
   * @attr {boolean} all-machines    tasks of the machines selected in the page
   * @attr {string}  machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
  class TasksListComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     *
     * @param  {...any} args
     */
    constructor(...args) {
      const self = super(...args);

      self._content = undefined;
      // Machines of the page selection, for all-machines
      self._selectedMachineIds = [];

      return self;
    }

    /**
     * React to attribute changes (machine-id, range)
     */
    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);

      switch (attr) {
        case 'machine-id':
        case 'machine-group':
          this.start();
          break;
        case 'machine-context':
          if (this.isInitialized()) {
            eventBus.EventBus.removeEventListenerBySignal(this, 'machineIdChangeSignal');
            eventBus.EventBus.addEventListener(this,
              'machineIdChangeSignal',
              newVal,
              this.onMachineIdChange.bind(this));
          }
          break;
        default:
          break;
      }
    }

    /**
     * Initialize the component UI (tiles panel, loader, message area)
     */
    initialize() {
      // In case of clone, need to be empty :
      this.element.innerHTML = '';

      // create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('taskslist-content');

      this._tasksList = document.createElement('ol')
      this._content.appendChild(this._tasksList);

      this.element.appendChild(this._content);

      // create DOM - loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';

      let loaderDiv = document.createElement('div');
      loaderDiv.classList.add('pulse-loader-div');
      loaderDiv.appendChild(loader);

      this.element.appendChild(loaderDiv);

      // create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.classList.add('pulse-message');
      this._messageSpan.innerHTML = '';

      let messageDiv = document.createElement('div');
      messageDiv.classList.add('pulse-message-div');
      messageDiv.appendChild(this._messageSpan);

      this.element.appendChild(messageDiv);

      // Follow the current machine published on `machine-context` (e.g. the
      // machine tab selected on machinedashboard/machines). In `all-machines`
      // mode (operationstatus, running) the machines of the page selection.
      if (this.element.hasAttribute('machine-context')) {
        eventBus.EventBus.addEventListener(this,
          'machineIdChangeSignal',
          this.element.getAttribute('machine-context'),
          this.onMachineIdChange.bind(this));
      }
      if (this.element.hasAttribute('all-machines')) {
        // x-machineselection may have emitted machineListChanged before this
        // component was initialized: read its current resolution first
        const machineSelection = document.querySelector('x-machineselection');
        if (machineSelection && typeof machineSelection.getResolvedMachineIds === 'function') {
          this._selectedMachineIds = machineSelection.getResolvedMachineIds().map(String);
        }
        eventBus.EventBus.addGlobalEventListener(this, 'machineListChanged',
          this.onMachineListChanged.bind(this));
      }

      this.switchToNextContext();
      return;
    }

    /**
     * Clear DOM and listeners
     */
    clearInitialization() {
      this.element.innerHTML = '';
      this._messageSpan = undefined;
      this._content = undefined;
      this._taskElements = undefined;
      this._tasksList = undefined;

      super.clearInitialization();
    }

    /**
     * Apply the machine id published on `machine-context` to the `machine-id`
     * attribute (triggers re-validation + refresh via attributeChanged).
     *
     * @param {{ target: { newMachineId: number } }} event
     */
    onMachineIdChange (event) {
      this.element.setAttribute('machine-id', event.target.newMachineId);
    }

    /**
     * all-machines: the page selection changed (resolved machine ids)
     *
     * @param {{ target: { ids: string[] } }} event
     */
    onMachineListChanged (event) {
      const ids = ((event.target && event.target.ids) || event.ids || [])
        .map(id => String(id).trim())
        .filter(id => id !== '');
      if (ids.join(',') === this._selectedMachineIds.join(',')) {
        return;
      }
      this._selectedMachineIds = ids;
      this.start();
    }

    /**
     * machineGroup argument of taskInstancesNext, '' if no machine is known yet
     * @returns {string}
     */
    get machineGroup() {
      if (this.element.hasAttribute('machine-id')) {
        return String(this.element.getAttribute('machine-id')).trim();
      }
      if (this.element.hasAttribute('machine-group')) {
        return String(this.element.getAttribute('machine-group')).trim();
      }
      if (this.element.hasAttribute('all-machines')) {
        return this._selectedMachineIds.join(',');
      }
      return '';
    }

    /**
     * Validate required parameters: a machine, a group or a machine selection
     */
    validateParameters() {
      if (this.machineGroup === '') {
        this.switchToKey('Error', () => this.displayError(this.getTranslation('error.selectMachine', 'Please select a machine')), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    /**
     * Path of the task GraphQL endpoint, appended to the web service path.
     * @returns {string}
     */
    getShortUrl() {
      return 'optasks';
    }

    /**
     * The GraphQL service needs a JSON body: with the default 'text/plain' of
     * postAjax, the web service answers 404 on /optasks
     * @returns {string}
     */
    get postContentType() {
      return 'application/json';
    }

    /**
     * The task GraphQL service answers at `<path>/optasks` (the endpoint of
     * atracking-optasks), which the base class builds from the configured web
     * service path.
     *
     * Setting `mockGraphqlUrl` (config or attribute) points the component at a
     * mock instead, for example atsora-mocks: http://localhost:4000/optasks.
     * Leave it unset outside development.
     */
    get url() {
      const mock = this.getConfigOrAttribute('mockGraphqlUrl', '');
      return mock ? mock : super.url;
    }

    /**
     * Poll interval (ms). Without this getter the base class leaves `refreshRate`
     * undefined, which makes the refresh state schedule the next fetch with
     * `setTimeout(..., undefined)` (≈ 0) — i.e. a tight, ultra-aggressive loop.
     * Mirror x-task: default 10 s, overridable via `refreshingRate.currentRefreshSeconds`.
     */
    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    postData() {
      // The due tasks of the current role (operator, manager…) on the machines.
      // TaskTemplate is a union whose types all implement ITaskTemplate.
      let request = `query ($role: String!, $machineGroup: String!) { taskInstancesNext(role: $role, machineGroup: $machineGroup) { machineId start end taskTemplate { __typename ... on ITaskTemplate { id name role machineGroup } } } }`;
      return {
        query: request,
        variables: {
          role: pulseConfig.getAppContextOrRole(),
          machineGroup: this.machineGroup
        }
      };
    }

    /**
     * Display of a machine: its name in the page selection, else its id
     * @param {string} machineId
     * @returns {string}
     */
    _getMachineDisplay(machineId) {
      const machineSelection = document.querySelector('x-machineselection');
      const display = (machineSelection && typeof machineSelection.getDisplay === 'function')
        ? machineSelection.getDisplay(machineId)
        : '';
      return display || String(machineId);
    }

    /**
     * Render the due tasks
     * @param {*} data
     */
    refresh(data) {
      const now = moment();

      // Group tasks by time category (Late, Todo, Upcoming). A TaskDue is not
      // done yet and has no id: it is identified by task template + machine.
      const pastTasks = [];
      const currentTasks = [];
      const upcomingTasks = [];

      const nowMs = now.valueOf();

      for (const taskDue of data.data.taskInstancesNext) {
        const taskInstance = Object.assign({}, taskDue, {
          id: `${taskDue.taskTemplate.id}-${taskDue.machineId}`
        });
        const endMs = Date.parse(taskInstance.end); // NaN if it never becomes late
        if (endMs < nowMs) {
          pastTasks.push(taskInstance);
        }
        else if (Date.parse(taskInstance.start) > nowMs) {
          upcomingTasks.push(taskInstance);
        }
        else {
          currentTasks.push(taskInstance);
        }
      }

      // Sort lists by ascending end date. If end is missing or invalid, treat as +Infinity
      const endTime = iso => {
        if (!iso) return Infinity;
        const t = Date.parse(iso);
        return isNaN(t) ? Infinity : t;
      };

      pastTasks.sort((a, b) => endTime(a.end) - endTime(b.end));
      currentTasks.sort((a, b) => endTime(a.end) - endTime(b.end));
      upcomingTasks.sort((a, b) => endTime(a.end) - endTime(b.end));

      // Build ordered list (Late, then Todo, then Upcoming)
      const ordered = [];
      pastTasks.forEach(t => ordered.push({ taskInstance: t, timeCategory: 'Late' }));
      currentTasks.forEach(t => ordered.push({ taskInstance: t, timeCategory: 'Todo' }));
      upcomingTasks.forEach(t => ordered.push({ taskInstance: t, timeCategory: 'Upcoming' }));

      // Map of id -> existing <li> element, initialised once
      if (!this._taskElements) {
        this._taskElements = {};
      }

      const newIds = new Set();

      // Reuse existing DOM nodes when possible, update their content and
      // re-append them in the right order. New tasks create new nodes.
      for (const { taskInstance, timeCategory } of ordered) {
        const id = taskInstance.id;
        newIds.add(id);

        let li = this._taskElements[id];
        if (!li) {
          li = this._createTaskDisplay(taskInstance, timeCategory, now);
          this._taskElements[id] = li;
        }
        else {
          this._updateTaskDisplay(li, taskInstance, timeCategory, now);
        }

        // appendChild moves the node if it is already in the list,
        // so the final order matches "ordered"
        this._tasksList.appendChild(li);
      }

      // Remove DOM nodes for instances that disappeared
      for (const id in this._taskElements) {
        if (!newIds.has(id)) {
          const li = this._taskElements[id];
          if (li && li.parentNode === this._tasksList) {
            this._tasksList.removeChild(li);
          }
          delete this._taskElements[id];
        }
      }
    }

    _createTaskDisplay(taskInstance, timeCategory, now) {
      const li = document.createElement('li');
      li.classList.add('taskslist-task-instance');
      // Click → open this task instance in the Vue app (detail view). The Pulse
      // integration (common_page.js) handles the actual navigation.
      const taskId = taskInstance && taskInstance.id;
      if (taskId != null) {
        li.style.cursor = 'pointer';
        li.addEventListener('click', function () {
          eventBus.EventBus.dispatchToAll('openTaskInstance', { id: taskId, mode: 'view' });
        });
      }
      this._updateTaskDisplay(li, taskInstance, timeCategory, now);
      return li;
    }

    _updateTaskDisplay(li, taskInstance, timeCategory, now) {
      let classStatus;
      let textTimeAfter;
      let textTimeBefore;
      let timeTarget;
      let timeDisplay;

      if (timeCategory === 'Late') {
        classStatus = 'taskslist-status-late';
        textTimeAfter = this.getTranslation('lateTextAfter', 'ago ');
        textTimeBefore = this.getTranslation('lateTextBefore', '');
        timeTarget = Math.abs(moment(taskInstance.end).diff(now, 'seconds'));
        timeDisplay = textTimeBefore + pulseUtility.getTextDuration(timeTarget) + ' ' + textTimeAfter;
      }
      if (timeCategory === 'Todo') {
        classStatus = 'taskslist-status-todo';
        textTimeAfter = this.getTranslation('todoTextAfter', 'left');
        textTimeBefore = this.getTranslation('todoTextBefore', '');
        if (taskInstance.end) {
          timeTarget = Math.abs(moment(taskInstance.end).diff(now, 'seconds'));
          timeDisplay = textTimeBefore + pulseUtility.getTextDuration(timeTarget) + ' ' + textTimeAfter;
        }
        else { // It never becomes late
          timeDisplay = '';
        }
      }
      if (timeCategory === 'Upcoming') {
        classStatus = 'taskslist-status-upcoming';
        textTimeAfter = this.getTranslation('upcomingTextAfter', '');
        textTimeBefore = this.getTranslation('upcomingTextBefore', 'in ');
        timeTarget = Math.abs(moment(taskInstance.start).diff(now, 'seconds'));
        timeDisplay = textTimeBefore + pulseUtility.getTextDuration(timeTarget) + ' ' + textTimeAfter;
      }

      // Rebuild the content of the <li> while keeping the element itself
      li.innerHTML = '';

      const displayContent = document.createElement('div');
      displayContent.classList.add('taskslist-display');

      const title = document.createElement('span');
      title.innerText = taskInstance.taskTemplate.name;
      title.classList.add('taskslist-title');
      displayContent.appendChild(title);

      // Machine the task is due on (the template applies to a whole group)
      const group = document.createElement('span');
      group.innerText = this._getMachineDisplay(taskInstance.machineId);
      group.classList.add('taskslist-group');
      displayContent.appendChild(group);

      const role = document.createElement('span');
      role.innerText = taskInstance.taskTemplate.role || '(no role)';
      role.classList.add('taskslist-role');
      displayContent.appendChild(role);

      li.appendChild(displayContent);

      const timeContent = document.createElement('div');
      timeContent.classList.add('taskslist-time-content');

      const status = document.createElement('span');
      status.innerText = this.getTranslation(timeCategory, timeCategory);
      status.classList.add('taskslist-status', classStatus);
      timeContent.appendChild(status);

      const time = document.createElement('span');
      time.innerText = timeDisplay;
      timeContent.appendChild(time);

      li.appendChild(timeContent);
    }


    /** Display a localized error message in the component */
    displayError(message) {
      this._messageSpan.innerHTML = message;
      console.error('x-taskslist: ' + message);
    }

    /** Clear the error area */
    removeError() {
      this._messageSpan.innerHTML = '';
    }
  }

  pulseComponent.registerElement('x-taskslist', TasksListComponent, ['machine-id', 'machine-group', 'machine-context']);
})();
