// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * 
 * @module x-taskslist
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');

(function () {

    /**
     * 
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

            return self;
        }

        /**
         * React to attribute changes (machine-id, range)
         */
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
         * Validate required parameters and the internal range format
         */
        validateParameters() {
            if (!this.element.hasAttribute('machine-id')) {
                this.setError('no machine selected');
                return;
            }

            this.switchToNextContext();
        }

        /**
         * Build WS URL for ReasonSelection/Post
         * @returns {string}
         */
        getShortUrl() {
            let url = 'graphql';
            return url;
        }

        postData() {
            let request = `{ allTaskInstances }`;
            return {
                query: request
            };
        }

        /**
         * Store fetched reasons and render tiles
         * @param {*} data
         */
        refresh(data) {
            const now = moment();

            // Group tasks by time category (Late, Todo, Upcoming)
            const pastTasks = [];
            const currentTasks = [];
            const upcomingTasks = [];

            const nowIso = now.toISOString();

            for (const taskInstance of data.data.allTaskInstances) {
                if (taskInstance.result == null) {
                    const startIso = taskInstance.start;
                    const endIso = taskInstance.end;
                    if (Date.parse(endIso) < Date.parse(nowIso)) {
                        pastTasks.push(taskInstance);
                    }
                    else if (Date.parse(startIso) > Date.parse(nowIso)) {
                        upcomingTasks.push(taskInstance);
                    }
                    else {
                        currentTasks.push(taskInstance);
                    }
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
                timeTarget = Math.abs(moment(taskInstance.end).diff(now, 'seconds'));
                timeDisplay = textTimeBefore + pulseUtility.getTextDuration(timeTarget) + ' ' + textTimeAfter;
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

            const group = document.createElement('span');
            group.innerText = taskInstance.taskTemplate.machineGroup || '(no group)';
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

    pulseComponent.registerElement('x-taskslist', TasksListComponent, ['machine-id']);
})();
