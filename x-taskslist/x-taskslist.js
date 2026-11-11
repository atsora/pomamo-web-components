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
import * as pulseService from 'pulseService';

(function () {

  // Icons of the task types, as in the Vue app (currentColor, to follow the
  // theme). Wrench, book and user: Feather icons (MIT, https://feathericons.com)
  const svgIcon = body => '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" '
    + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  const userIcon = svgIcon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>');
  const TASK_TYPE_ICONS = {
    ITaskTemplateMaintenance: svgIcon('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
    // Ruler
    ITaskTemplateQuality: svgIcon('<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M6 7v4M10 7v3M14 7v4M18 7v3"/>'),
    ITaskTemplateDocAck: svgIcon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    ITaskTemplateShiftChangeAck: userIcon,
    ITaskTemplateShiftChangeMessage: userIcon
  };

  /**
   * `<x-taskslist>` — list of the tasks that are due, sourced from the task
   * GraphQL service of the web service (`<path>/optasks`).
   *
   * Polls `taskInstancesNext(role, machineGroup)` (refresh =
   * `refreshingRate.currentRefreshSeconds`, default 10 s) and renders one
   * `<li>` per due task (late, to do, upcoming) with the icon of its type,
   * its name, machine, role (`show-role`) and timing inside a `.taskslist-content > <ol>`. A due task carries no
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
   * @attr {boolean} show-role       displays the role of each task (by default not: the page lists the tasks of one role)
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
      // Machine names got from the web service, when the page selection does
      // not know them: machine id -> name, and the requests already sent
      self._machineNames = {};
      self._machineNameRequests = new Set();

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
      // A task was completed in the execution dialog: refresh at once
      eventBus.EventBus.addGlobalEventListener(this, 'taskCompleted',
        this.onTaskCompleted.bind(this));

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
     * A task was completed (validated or error) in the execution dialog:
     * switch to the Reload context to query the due tasks now, instead of
     * waiting for the next poll. Only from the polling context, so that the
     * parameter validation or an error state are not bypassed.
     *
     * @param {{ target: { id: string, completion: string } }} event
     */
    onTaskCompleted (event) {
      if (this.stateContext === 'Normal') {
        this.switchToContext('Reload');
      }
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
      const id = String(machineId);
      const machineSelection = document.querySelector('x-machineselection');
      const display = (machineSelection && typeof machineSelection.getDisplay === 'function')
        ? machineSelection.getDisplay(id)
        : '';
      if (display) {
        return display;
      }
      // Not known by the page selection (its names are not loaded yet, or the
      // machine is not in it, e.g. on the machine dashboard): ask the web
      // service once, then display the id meanwhile
      if (this._machineNames[id]) {
        return this._machineNames[id];
      }
      this._requestMachineName(id);
      return id;
    }

    /**
     * Get the name of a machine from the web service (Machine/Name), once per
     * machine, and display it in the tasks of that machine
     * @param {string} machineId
     */
    _requestMachineName(machineId) {
      if (this._machineNameRequests.has(machineId) || !this.path) {
        return;
      }
      this._machineNameRequests.add(machineId);
      const url = this.path + 'Machine/Name?MachineId=' + encodeURIComponent(machineId);
      pulseService.runAjaxSimple(url,
        data => {
          const name = (data && (data.Display || data.Name)) || '';
          if (!name) {
            return;
          }
          this._machineNames[machineId] = name;
          if (this._tasksList) {
            for (const span of this._tasksList.querySelectorAll('.taskslist-group')) {
              if (span.dataset.machineId === machineId) {
                span.innerText = name;
              }
            }
          }
        },
        // Error or failure: the id stays displayed, try again at the next refresh
        () => this._machineNameRequests.delete(machineId),
        () => this._machineNameRequests.delete(machineId));
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
      let timeDisplay;

      if (timeCategory === 'Late') {
        classStatus = 'taskslist-status-late';
        timeDisplay = this._timeText('late', moment(taskInstance.end), now);
      }
      if (timeCategory === 'Todo') {
        classStatus = 'taskslist-status-todo';
        // Without an end, it never becomes late: no time
        timeDisplay = taskInstance.end ? this._timeText('todo', moment(taskInstance.end), now) : '';
      }
      if (timeCategory === 'Upcoming') {
        classStatus = 'taskslist-status-upcoming';
        timeDisplay = this._timeText('upcoming', moment(taskInstance.start), now);
      }

      // Rebuild the content of the <li> while keeping the element itself
      li.innerHTML = '';

      const displayContent = document.createElement('div');
      displayContent.classList.add('taskslist-display');

      const title = document.createElement('span');
      title.classList.add('taskslist-title');
      const typeIcon = this._createTypeIcon(taskInstance.taskTemplate.__typename);
      if (typeIcon) {
        title.appendChild(typeIcon);
      }
      // A long name is truncated: the full name is in the tooltip
      const name = document.createElement('span');
      name.classList.add('taskslist-name');
      name.innerText = taskInstance.taskTemplate.name;
      name.title = taskInstance.taskTemplate.name;
      title.appendChild(name);
      displayContent.appendChild(title);

      // Machine the task is due on (the template applies to a whole group)
      const group = document.createElement('span');
      group.dataset.machineId = String(taskInstance.machineId);
      group.innerText = this._getMachineDisplay(taskInstance.machineId);
      group.classList.add('taskslist-group');
      displayContent.appendChild(group);

      // The page already lists the tasks of one role: its display is an option
      if (this.element.hasAttribute('show-role')) {
        const role = document.createElement('span');
        role.innerText = taskInstance.taskTemplate.role || '(no role)';
        role.classList.add('taskslist-role');
        displayContent.appendChild(role);
      }

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

    /**
     * Text of the time before / since a date, e.g. "in 8 min", "dans 8 min".
     * The words before and after the duration are separated by a space here,
     * so that a translation does not need to carry it.
     *
     * @param {string} prefix late, todo or upcoming (translation keys <prefix>TextBefore / <prefix>TextAfter)
     * @param {moment} date
     * @param {moment} now
     * @returns {string}
     */
    _timeText(prefix, date, now) {
      const defaults = {
        late: ['', 'ago'],
        todo: ['', 'left'],
        upcoming: ['in', '']
      }[prefix];
      const seconds = Math.abs(date.diff(now, 'seconds'));
      return [
        this.getTranslation(prefix + 'TextBefore', defaults[0]),
        pulseUtility.getTextDuration(seconds),
        this.getTranslation(prefix + 'TextAfter', defaults[1])
      ].map(part => String(part || '').trim())
        .filter(part => part !== '')
        .join(' ');
    }

    /**
     * Icon of the type of a task (maintenance, quality...), as in the Vue app
     *
     * @param {string} typename __typename of the task template
     * @returns {HTMLElement|undefined}
     */
    _createTypeIcon(typename) {
      const svg = TASK_TYPE_ICONS[typename];
      if (!svg) {
        return undefined;
      }
      const icon = document.createElement('span');
      icon.classList.add('taskslist-type-icon');
      icon.innerHTML = svg;
      const label = this.getTranslation('type.' + typename, '');
      if (label) {
        icon.title = label;
        icon.setAttribute('aria-label', label);
      }
      return icon;
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
