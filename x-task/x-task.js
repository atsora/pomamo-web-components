// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * 
 * @module x-task
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

(function () {

  /**
   * 
   */
  class TaskComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM
      self._content = undefined;
      self._messageSpan = undefined;
      self._mainTaskTimer = undefined;
      self._mainTaskTitleSpan = undefined;
      self._mainTaskCategoryIcon = undefined;
      self._mainTaskStateSpan = undefined;
      self._mainTaskStateDiv = undefined;
      self._mainTaskDiv = undefined;
      self._taskTabsContainer = undefined;

      // Data
      self._mainTaskInstance = null;
      self._numberOfTasks = 3;
      self._orderedPendingTasks = [];
      self._selectedTaskId = null;

      // Tabs
      self._taskTabTaskIds = [];

      // Resize observer
      self._mainTaskResizeObserver = null;
      self._mainTaskLastWidth = null;
      self._tabWidth = null;

      // Timers
      self._mainTaskTimerRefreshTimer = null;

      return self;
    }

    _getCategoryIconClass(role) {
      const value = (role == null) ? '' : String(role).trim().toLowerCase();
      switch (value) {
        case 'maintenance':
          return 'fa-wrench';
        case 'quality':
          return 'fa-ruler';
        case 'documentation':
          return 'fa-book';
        default:
          return 'fa-user';
      }
    }

    get orderedPendingTasks() {
      return Array.isArray(this._orderedPendingTasks) ? this._orderedPendingTasks.slice() : [];
    }

    _updateTaskTabsWidth() {
      if (this._taskTabTaskIds.length !== 0) {
        let remainder = (this._mainTaskLastWidth + 32) - (this._tabWidth + 12) * this._taskTabTaskIds.length - 4 * (this._taskTabTaskIds.length - 1);
        this._tabWidth = this._tabWidth + (remainder / this._taskTabTaskIds.length);

        if (this._tabWidth < 95) {
          if (this._numberOfTasks === 1) {
            this._tabWidth = 95;
          }
          else {
            this._numberOfTasks = this._numberOfTasks - 1;
            this._updateTaskTabs();
          }
        }

        if (this._tabWidth > 155) {
          if (this._numberOfTasks === this._orderedPendingTasks.length) {
            this._tabWidth = 155;
          }
          else {
            this._numberOfTasks = this._numberOfTasks + 1;
            this._updateTaskTabs();
          }
        }

        this._taskTabsContainer.querySelectorAll('.task-tab').forEach((el) => {
          el.style.width = this._tabWidth + 'px';
        });
      }
    }

    _renderMainTask() {
      if (!pulseUtility.isNotDefined(this._mainTaskTitleSpan)) {
        const title = (this._mainTaskInstance
          && this._mainTaskInstance.taskTemplate
          && this._mainTaskInstance.taskTemplate.name)
          ? this._mainTaskInstance.taskTemplate.name
          : '';
        this._mainTaskTitleSpan.textContent = title;
      }

      if (!pulseUtility.isNotDefined(this._mainTaskCategoryIcon)) {
        const role = (this._mainTaskInstance
          && this._mainTaskInstance.taskTemplate
          && this._mainTaskInstance.taskTemplate.role)
          ? this._mainTaskInstance.taskTemplate.role
          : '';
        const iconClass = this._getCategoryIconClass(role);
        this._mainTaskCategoryIcon.className = `fa-solid ${iconClass}`;
        this._mainTaskCategoryIcon.setAttribute('title', role || '');
      }

      if (!pulseUtility.isNotDefined(this._mainTaskStateSpan)) {
        this._mainTaskStateSpan.textContent = this._getTaskStateFromDates(this._mainTaskInstance);
      }

      // Ensure the timer reflects the latest selected task ASAP
      this._updateMainTaskTimerAndSchedule();
    }

    _setSelectedTaskId(taskId) {
      const nextId = (pulseUtility.isNotDefined(taskId) ? null : String(taskId));
      this._selectedTaskId = nextId;
    }

    _applySelectedTabStyle() {
      if (pulseUtility.isNotDefined(this._taskTabsContainer)) {
        return;
      }

      const selectedId = this._selectedTaskId;
      this._taskTabsContainer.querySelectorAll('.task-tab').forEach((el) => {
        const isMore = el.classList.contains('task-tab-more');
        if (isMore) {
          el.classList.remove('task-tab-selected');
          return;
        }

        const elId = el.dataset ? el.dataset.taskId : null;
        if (selectedId && elId === selectedId) {
          el.classList.add('task-tab-selected');
        }
        else {
          el.classList.remove('task-tab-selected');
        }
      });
    }

    _selectTaskById(taskId) {
      this._setSelectedTaskId(taskId);

      const selectedId = this._selectedTaskId;
      const tasks = Array.isArray(this._orderedPendingTasks) ? this._orderedPendingTasks : [];
      const selected = tasks.find(t => t && !pulseUtility.isNotDefined(t.id) && String(t.id) === selectedId);
      if (!pulseUtility.isNotDefined(selected)) {
        this._mainTaskInstance = selected;
      }

      this._applySelectedTabStyle();
      this._renderMainTask();
    }

    _teardownMainTaskResizeObserver() {
      if (this._mainTaskResizeObserver) {
        this._mainTaskResizeObserver.disconnect();
        this._mainTaskResizeObserver = null;
      }
      this._mainTaskLastWidth = null;
    }

    _setupMainTaskResizeObserver() {
      this._teardownMainTaskResizeObserver();

      if (typeof ResizeObserver === 'undefined' || pulseUtility.isNotDefined(this._mainTaskDiv)) {
        return;
      }

      this._mainTaskResizeObserver = new ResizeObserver((entries) => {
        if (!entries || !entries.length) {
          return;
        }

        const rect = entries[0].contentRect;
        const width = rect ? rect.width : null;

        if (width === this._mainTaskLastWidth) {
          return;
        }

        this._mainTaskLastWidth = width;

        // Let external code react to the resize if needed
        this.element.dispatchEvent(new CustomEvent('task-main-task-resize', {
          detail: { width }
        }));
      });

      this._mainTaskResizeObserver.observe(this._mainTaskDiv);
    }

    _stopMainTaskTimerRefreshTimer() {
      if (this._mainTaskTimerRefreshTimer) {
        clearTimeout(this._mainTaskTimerRefreshTimer);
        this._mainTaskTimerRefreshTimer = null;
      }
    }

    _translateSecondsToText(seconds) {
      if (Math.abs(seconds) < 60) {
        return seconds + 's';
      }

      // Round to minutes (keep existing behavior)
      const absSeconds = Math.abs(seconds);
      const totalMinutes = (seconds < 0)
        ? Math.floor(absSeconds / 60)
        : Math.ceil(absSeconds / 60);

      const sign = (seconds >= 0) ? '' : '-';
      const minutesInDay = 24 * 60;

      // Switch to days when >= 24h
      if (absSeconds >= 24 * 60 * 60) {
        const days = Math.floor(totalMinutes / minutesInDay);
        const remainderMinutes = totalMinutes % minutesInDay;
        const hours = Math.floor(remainderMinutes / 60);
        const mins = remainderMinutes % 60;
        return sign + days + 'j ' + hours + ':' + (mins > 9 ? '' + mins : '0' + mins);
      }

      // HH:mm display
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return sign + hours + ':' + (mins > 9 ? '' + mins : '0' + mins);
    }

    _updateMainTaskTimerAndSchedule() {
      this._stopMainTaskTimerRefreshTimer();

      if (pulseUtility.isNotDefined(this._mainTaskTimer)) {
        return;
      }

      if (pulseUtility.isNotDefined(this._mainTaskInstance)) {
        this._mainTaskTimer.innerHTML = '';
        return;
      }

      const startIso = this._mainTaskInstance.start;
      const endIso = this._mainTaskInstance.end;
      const startMs = Date.parse(startIso);
      const endMs = Date.parse(endIso);

      // No valid schedule => no timer
      if (isNaN(startMs) || isNaN(endMs)) {
        this._mainTaskTimer.innerHTML = '';
        return;
      }

      const nowMs = Date.now();

      // Upcoming => countdown to start
      // In progress => countdown to end
      // Late => negative countdown from end
      const targetMs = (nowMs < startMs) ? startMs : endMs;
      const seconds = Math.trunc((targetMs - nowMs) / 1000);
      this._mainTaskTimer.innerHTML = this._translateSecondsToText(seconds);

      // Refresh every second for a smooth timer
      this._mainTaskTimerRefreshTimer = setTimeout(
        this._updateMainTaskTimerAndSchedule.bind(this),
        1000);
    }

    _sortTaskInstancesByEndAscending(taskInstances) {
      if (!Array.isArray(taskInstances)) {
        return [];
      }

      const endTime = (iso) => {
        if (!iso) return Infinity;
        const t = Date.parse(iso);
        return isNaN(t) ? Infinity : t;
      };

      return taskInstances
        .slice()
        .sort((a, b) => endTime(a && a.end) - endTime(b && b.end));
    }

    _getTaskStateFromDates(taskInstance) {
      if (pulseUtility.isNotDefined(taskInstance)) {
        return '';
      }

      if (!pulseUtility.isNotDefined(this._mainTaskStateDiv)) {
        this._mainTaskStateDiv.classList.remove('task-upcoming', 'task-todo', 'task-late');
      }

      const nowMs = Date.now();
      const startMs = Date.parse(taskInstance.start);
      const endMs = Date.parse(taskInstance.end);

      // Upcoming: start is in the future
      if (!isNaN(startMs) && startMs > nowMs) {
        if (!pulseUtility.isNotDefined(this._mainTaskStateDiv)) {
          this._mainTaskStateDiv.classList.add('task-upcoming');
        }
        return this.getTranslation('Upcoming', 'Upcoming');
      }

      // Late: end is in the past
      if (!isNaN(endMs) && endMs < nowMs) {
        if (!pulseUtility.isNotDefined(this._mainTaskStateDiv)) {
          this._mainTaskStateDiv.classList.add('task-late');
        }
        return this.getTranslation('Late', 'Late');
      }

      // Otherwise: Todo (includes in-progress and undated cases)
      if (!pulseUtility.isNotDefined(this._mainTaskStateDiv)) {
        this._mainTaskStateDiv.classList.add('task-todo');
      }
      return this.getTranslation('Todo', 'Todo');
    }

    _getTaskStateClassFromDates(taskInstance) {
      if (pulseUtility.isNotDefined(taskInstance)) {
        return '';
      }

      const nowMs = Date.now();
      const startMs = Date.parse(taskInstance.start);
      const endMs = Date.parse(taskInstance.end);

      if (!isNaN(startMs) && startMs > nowMs) {
        return 'task-upcoming';
      }

      if (!isNaN(endMs) && endMs < nowMs) {
        return 'task-late';
      }

      return 'task-todo';
    }

    _createTaskTab(taskInstance) {
      let tab = document.createElement('div');
      tab.classList.add('task-tab');

      const taskId = (!pulseUtility.isNotDefined(taskInstance) && !pulseUtility.isNotDefined(taskInstance.id))
        ? String(taskInstance.id)
        : null;
      if (taskId) {
        tab.dataset.taskId = taskId;
        tab.tabIndex = 0;
        tab.addEventListener('click', () => this._selectTaskById(taskId));
        tab.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._selectTaskById(taskId);
          }
        });

        if (this._selectedTaskId && this._selectedTaskId === taskId) {
          tab.classList.add('task-tab-selected');
        }
      }

      let header = document.createElement('div');
      header.classList.add('task-tab-header');

      // Category icon
      let icon = document.createElement('i');
      const role = (!pulseUtility.isNotDefined(taskInstance)
        && taskInstance.taskTemplate
        && taskInstance.taskTemplate.role)
        ? taskInstance.taskTemplate.role
        : '';
      const iconClass = this._getCategoryIconClass(role);
      icon.className = `fa-solid ${iconClass} task-tab-icon`;
      icon.setAttribute('aria-hidden', 'true');
      icon.setAttribute('title', role || '');
      header.appendChild(icon);

      let titleSpan = document.createElement('span');
      titleSpan.classList.add('task-tab-title');

      const title = (!pulseUtility.isNotDefined(taskInstance)
        && taskInstance.taskTemplate
        && taskInstance.taskTemplate.name)
        ? taskInstance.taskTemplate.name
        : '';
      titleSpan.textContent = title;

      header.appendChild(titleSpan);
      tab.appendChild(header);

      // Visual state line under the title
      let stateLine = document.createElement('div');
      stateLine.classList.add('task-tab-state-line');
      const stateClass = this._getTaskStateClassFromDates(taskInstance);
      if (stateClass) {
        stateLine.classList.add(stateClass);
      }
      tab.appendChild(stateLine);

      return tab;
    }

    _createMoreTab(hiddenCount) {
      let tab = document.createElement('div');
      tab.classList.add('task-tab');
      tab.classList.add('task-tab-more');

      let header = document.createElement('div');
      header.classList.add('task-tab-header');

      let titleSpan = document.createElement('span');
      titleSpan.classList.add('task-tab-title');
      titleSpan.textContent = `+${Math.max(0, Number(hiddenCount) || 0)}`;

      header.appendChild(titleSpan);
      tab.appendChild(header);

      let stateLine = document.createElement('div');
      stateLine.classList.add('task-tab-state-line');
      tab.appendChild(stateLine);

      return tab;
    }

    _updateTaskTabs() {
      if (pulseUtility.isNotDefined(this._taskTabsContainer)) {
        return;
      }

      const tasks = Array.isArray(this._orderedPendingTasks) ? this._orderedPendingTasks : [];
      if (!tasks.length) {
        this._taskTabsContainer.innerHTML = '';
        this._taskTabTaskIds = [];
        return;
      }

      const maxTabs = Math.max(0, Number(this._numberOfTasks) || 0);

      // Default: show up to maxTabs tasks.
      let taskSlots = maxTabs;
      let tasksToDisplay = tasks.slice(0, taskSlots);
      let hiddenCount = Math.max(0, tasks.length - tasksToDisplay.length);

      // Only show a "+XX" tab when at least 2 tasks are hidden.
      const showMoreTab = hiddenCount >= 1;
      if (showMoreTab) {
        taskSlots = Math.max(0, maxTabs - 1);
        tasksToDisplay = tasks.slice(0, taskSlots);
        hiddenCount = Math.max(0, tasks.length - tasksToDisplay.length);
      }

      const nextIds = tasksToDisplay
        .map(t => (t && !pulseUtility.isNotDefined(t.id)) ? String(t.id) : '')
        .filter(id => id !== '');

      if (showMoreTab) {
        nextIds.push(`more:${hiddenCount}`);
      }

      const currentIds = Array.isArray(this._taskTabTaskIds) ? this._taskTabTaskIds : [];
      const same = (currentIds.length === nextIds.length)
        && currentIds.every((id, i) => id === nextIds[i]);

      if (same) {
        return;
      }

      // Rebuild tabs (only when the displayed ids changed)
      this._taskTabsContainer.innerHTML = '';
      for (const taskInstance of tasksToDisplay) {
        if (pulseUtility.isNotDefined(taskInstance) || pulseUtility.isNotDefined(taskInstance.id)) {
          continue;
        }
        this._taskTabsContainer.appendChild(this._createTaskTab(taskInstance));
      }

      if (showMoreTab) {
        this._taskTabsContainer.appendChild(this._createMoreTab(hiddenCount));
      }

      this._taskTabTaskIds = nextIds;
      this._updateTaskTabsWidth();
      this._applySelectedTabStyle();
    }

    attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);

      switch (attr) {
        case 'machine-id':
          this.start();
          break;
        default:
          break;
      }
    }

    initialize() {
      // In case of clone, need to be empty :
      this.element.innerHTML = '';

      this._tabWidth = 127;

      // create DOM - Content
      this._content = document.createElement('div');
      this._content.classList.add('task-content');

      let mainTask = document.createElement('div');
      mainTask.classList.add('task-main-task');
      this._mainTaskDiv = mainTask;

      let mainTaskTopSide = document.createElement('div');
      mainTaskTopSide.classList.add('task-main-task-top-side');

      let mainTaskTitle = document.createElement('div');
      mainTaskTitle.classList.add('task-main-task-title');

      let mainTaskTitleSpan = document.createElement('span');
      mainTaskTitleSpan.classList.add('task-main-task-title-span');
      this._mainTaskTitleSpan = mainTaskTitleSpan;
      mainTaskTitle.appendChild(mainTaskTitleSpan);

      mainTaskTopSide.appendChild(mainTaskTitle);

      mainTask.appendChild(mainTaskTopSide);

      let mainTaskBotSide = document.createElement('div');
      mainTaskBotSide.classList.add('task-main-task-bot-side');

      let mainTaskStateCategory = document.createElement('div');
      mainTaskStateCategory.classList.add('task-main-task-state-category');

      let mainTaskCategory = document.createElement('div');
      mainTaskCategory.classList.add('task-main-task-category');

      let mainTaskCategorySpan = document.createElement('span');
      mainTaskCategorySpan.classList.add('task-main-task-category-span');

      let mainTaskCategoryIcon = document.createElement('i');
      mainTaskCategoryIcon.className = 'fa-solid fa-user';
      mainTaskCategoryIcon.setAttribute('aria-hidden', 'true');
      this._mainTaskCategoryIcon = mainTaskCategoryIcon;
      mainTaskCategorySpan.appendChild(mainTaskCategoryIcon);
      mainTaskCategory.appendChild(mainTaskCategorySpan);

      mainTaskStateCategory.appendChild(mainTaskCategory);

      let mainTaskState = document.createElement('div');
      mainTaskState.classList.add('task-main-task-state');
      this._mainTaskStateDiv = mainTaskState;
      mainTaskStateCategory.appendChild(mainTaskState);

      let mainTaskStateSpan = document.createElement('span');
      mainTaskStateSpan.classList.add('task-main-task-state-span');
      this._mainTaskStateSpan = mainTaskStateSpan;
      mainTaskState.appendChild(mainTaskStateSpan);

      mainTaskBotSide.appendChild(mainTaskStateCategory);

      let mainTaskTimer = document.createElement('div');
      mainTaskTimer.classList.add('task-main-task-timer');

      let mainTaskTimerSpan = document.createElement('span');
      mainTaskTimerSpan.classList.add('task-main-task-timer-span');
      this._mainTaskTimer = mainTaskTimerSpan;
      mainTaskTimer.appendChild(mainTaskTimerSpan);

      mainTaskBotSide.appendChild(mainTaskTimer);

      mainTask.appendChild(mainTaskBotSide);

      this._content.appendChild(mainTask);

      let tabs = document.createElement('div');
      tabs.classList.add('task-tabs');
      this._taskTabsContainer = tabs;
      this._content.appendChild(tabs);

      this.element.appendChild(this._content);

      // create DOM - loader
      let loader = document.createElement('div');
      loader.classList.add('pulse-loader');
      loader.innerHTML = 'Loading...';
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

      this.element.addEventListener('task-main-task-resize', (event) => {
        this._updateTaskTabsWidth();
      });

      this.switchToNextContext();

      // Observe any resize of the main task container
      this._setupMainTaskResizeObserver();

      // Start timer loop (it will show nothing until a main task exists)
      this._updateMainTaskTimerAndSchedule();
      return;
    }

    clearInitialization() {
      this._stopMainTaskTimerRefreshTimer();
      this._teardownMainTaskResizeObserver();

      this.element.innerHTML = '';
      this._messageSpan = undefined;
      this._content = undefined;
      this._mainTaskTimer = undefined;
      this._mainTaskTitleSpan = undefined;
      this._mainTaskCategoryIcon = undefined;
      this._mainTaskStateSpan = undefined;
      this._mainTaskStateDiv = undefined;
      this._mainTaskDiv = undefined;
      this._taskTabsContainer = undefined;
      this._taskTabTaskIds = [];
      this._tabWidth = null;
      this._numberOfTasks = null;
      this._orderedPendingTasks = [];
      this._selectedTaskId = null;
      if (this.element) {
        this.element.orderedPendingTasks = undefined;
      }

      super.clearInitialization();
    }

    validateParameters() {
      if (!this.element.hasAttribute('machine-id')) {
        this.setError('no machine selected');
        return;
      }

      if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
        this.switchToKey('Error', () => this.displayError('invalid machine-id'), () => this.removeError());
        return;
      }

      this.switchToNextContext();
    }

    getShortUrl() {
      let url = 'graphql';
      return url;
    }

    postData() {
      let request = `query ($machineId: ID!) { allTaskInstances(machineId: $machineId) { id start end result { __typename } taskTemplate { name role __typename } } }`;
      return {
        query: request,
        variables: {
          machineId: this.element.getAttribute('machine-id')
        }
      };
    }

    get refreshRate() {
      return 1000 * Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10));
    }

    refresh(data) {
      let allTaskInstances = [];
      if (!pulseUtility.isNotDefined(data) && !pulseUtility.isNotDefined(data.data)) {
        allTaskInstances = data.data.allTaskInstances || [];
      }
      else if (!pulseUtility.isNotDefined(data)) {
        allTaskInstances = data.allTaskInstances || [];
      }

      // Only keep tasks that are not completed/validated (no result)
      const pendingTasks = Array.isArray(allTaskInstances)
        ? allTaskInstances.filter(t => t && t.result == null)
        : [];

      // Sort all pending tasks by ascending end date.
      let orderedPendingTasks = this._sortTaskInstancesByEndAscending(pendingTasks);

      // If there are any late or in-progress tasks, ignore upcoming tasks completely
      // (they won't appear and won't be counted in +XX).
      const nowMs = Date.now();
      const isUpcoming = (t) => {
        const startMs = Date.parse(t && t.start);
        return !isNaN(startMs) && startMs > nowMs;
      };
      const isLate = (t) => {
        const endMs = Date.parse(t && t.end);
        return !isNaN(endMs) && endMs < nowMs;
      };
      const isInProgress = (t) => {
        const startMs = Date.parse(t && t.start);
        const endMs = Date.parse(t && t.end);
        return !isNaN(startMs) && !isNaN(endMs) && startMs <= nowMs && nowMs <= endMs;
      };

      const hasLateOrInProgress = orderedPendingTasks.some(t => isLate(t) || isInProgress(t));
      if (hasLateOrInProgress) {
        orderedPendingTasks = orderedPendingTasks.filter(t => !isUpcoming(t));
      }

      // Persist for access from other methods / external code.
      this._orderedPendingTasks = orderedPendingTasks.slice();
      this.element.orderedPendingTasks = this._orderedPendingTasks;

      // Keep current selection if possible, otherwise fallback to first task.
      const tasks = this._orderedPendingTasks;
      const currentSelectedId = this._selectedTaskId;
      const selected = currentSelectedId
        ? tasks.find(t => t && !pulseUtility.isNotDefined(t.id) && String(t.id) === currentSelectedId)
        : null;
      if (!pulseUtility.isNotDefined(selected)) {
        this._mainTaskInstance = selected;
      }
      else {
        this._mainTaskInstance = orderedPendingTasks.length ? orderedPendingTasks[0] : null;
        this._setSelectedTaskId(this._mainTaskInstance && this._mainTaskInstance.id);
      }

      this._updateTaskTabs();

      this._renderMainTask();
    }

    displayError(message) {
      this._messageSpan.innerHTML = message;
      console.error('x-taskslist: ' + message);
    }

    removeError() {
      this._messageSpan.innerHTML = '';
    }
  }

  pulseComponent.registerElement('x-task', TaskComponent, ['machine-id']);
})();
