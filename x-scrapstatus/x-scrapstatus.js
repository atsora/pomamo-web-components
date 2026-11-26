// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-scrapstatus
 * @requires module:pulseUtility
 * @requires module:pulseService
 * @requires module:pulseRange
 * @requires module:pulseComponent
 * @requires module:pulsecomponent-detailspopup
 * @requires module:eventBus
 */

import * as pulseUtility from 'pulseUtility';
import * as pulseService from 'pulseService';
import * as pulseComponent from 'pulsecomponent';
import * as pulseDetailsPopup from 'pulsecomponent-detailspopup';
import * as eventBus from 'eventBus';

import 'x-scrapclassification/x-scrapclassification';

(function () {

  /**
   * `<x-scrapstatus>` — current-shift scrap count and "Scrap Declaration"
   * button for one machine.
   *
   * Polls `Scrap/CurrentShift?MachineId=<machine-id>` (interval =
   * `refreshingRate.currentRefreshSeconds`, default 10 s) and renders a
   * "Shift scrap" label ("Day scrap" when there is no shift), the number of
   * scrap parts of the current shift (`ScrapCount`: the scrap reports the
   * analysis counted in the operation slots) and a button that calls
   * `pulseDetailsPopup.openChangeScrapClassificationDialog()`. Reacts to
   * `machineIdChangeSignal` on `machine-context` (updates `machine-id`).
   *
   * After each answer, `Scrap/At/Get?MachineId=<machine-id>` (no At: the
   * current period, the latest cycles) tells whether a cycle completed since
   * the last declaration (`FullCycleCount` > 0): the button is then
   * highlighted (class `scrapstatus-todo`), else it stays neutral.
   *
   * @element x-scrapstatus
   * @attr {number} machine-id      (required) machine id
   * @attr {string} machine-context event-bus context for `machineIdChangeSignal`
   * @extends pulseComponent.PulseParamAutoPathRefreshingComponent
   */
    class ScrapStatusComponent extends pulseComponent.PulseParamAutoPathRefreshingComponent {
        /**
         * Constructor
         *
         * @param  {...any} args
         */
        constructor(...args) {
            const self = super(...args);

            // DOM
            self._messageSpan = undefined;
            self._content = undefined;
            self._scrapTextSpan = undefined;
            self._scrapValueSpan = undefined;

            // A request Scrap/At/Get is running (no second one meanwhile)
            self._newCyclesRequestRunning = false;

            return self;
        }

        /**
         * Callback when an attribute changes after connection
         *
         * @param {string} attr - Attribute name
         * @param {string} oldVal - Old value
         * @param {string} newVal - New value
         */
        attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
            super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
            switch (attr) {
                case 'machine-id':
                    this._setPending(); // The count of the previous machine is not valid any more
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
         * Initialize the component
         */
        initialize() {
            this.element.innerHTML = '';

            // Create DOM - Content
            this._content = document.createElement('div');
            this._content.classList.add('scrapstatus-content');

            this._buildUI();
            this._setPending(); // No count before the first answer (machine not known yet, or loading)

            this.element.appendChild(this._content);

            // Create DOM - Loader
            let loader = document.createElement('div');
            loader.classList.add('pulse-loader');
            loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
            loader.style.display = 'none';
            let loaderDiv = document.createElement('div');
            loaderDiv.classList.add('pulse-loader-div');
            loaderDiv.appendChild(loader);
            this.element.appendChild(loaderDiv);

            // Create DOM - Message for errors
            this._messageSpan = document.createElement('span');
            this._messageSpan.classList.add('pulse-message');
            let messageDiv = document.createElement('div');
            messageDiv.classList.add('pulse-message-div');
            messageDiv.appendChild(this._messageSpan);
            this.element.appendChild(messageDiv);

            // listeners
            if (this.element.hasAttribute('machine-context')) {
                eventBus.EventBus.addEventListener(this,
                    'machineIdChangeSignal',
                    this.element.getAttribute('machine-context'),
                    this.onMachineIdChange.bind(this));
            }

            this.switchToNextContext();
            return;
        }

        /**
         * Build the user interface with scrap text, value and declaration button
         */
        _buildUI() {
            let textSpan = document.createElement('span');
            this._scrapTextSpan = textSpan;
            textSpan.classList.add('scrapstatus-text');
            textSpan.innerHTML = this.getTranslation('shiftscrap', 'Shift scrap');
            this._content.appendChild(textSpan);

            let valueSpan = document.createElement('span');
            this._scrapValueSpan = valueSpan;
            valueSpan.classList.add('scrapstatus-value');
            this._content.appendChild(valueSpan);

            let buttonContent = document.createElement('div');
            buttonContent.classList.add('scrapstatus-button-content');
            buttonContent.addEventListener('click', () => {
                if (this._isPending()) { // Machine not known yet
                    return;
                }
                pulseDetailsPopup.openChangeScrapClassificationDialog(this);
            });

            let icon = document.createElement('i');
            icon.classList.add('fa-solid', 'fa-trash-can-arrow-up');
            buttonContent.appendChild(icon);

            let button = document.createElement('span');
            button.classList.add('scrapstatus-button');
            button.innerHTML = this.getTranslation('scrapDeclaration', 'Scrap Declaration');
            buttonContent.appendChild(button);

            this._content.appendChild(buttonContent);
        }

        /**
         * No count to display yet (no machine, or first answer not received):
         * the value shows a loading animation and the button is inactive
         */
        _setPending() {
            if (this._scrapValueSpan) {
                this._scrapValueSpan.innerHTML = '';
            }
            this.element.classList.add('scrapstatus-pending');
            this.element.classList.remove('scrapstatus-todo'); // Not known for this machine yet
        }

        /**
         * @returns {boolean} true while no count has been received for the machine
         */
        _isPending() {
            return this.element.classList.contains('scrapstatus-pending');
        }

        /**
         * Show a count (or '–' when the count is unknown) and leave the pending state
         *
         * @param {number|string} value
         */
        _setValue(value) {
            this.element.classList.remove('scrapstatus-pending');
            if (this._scrapValueSpan) {
                this._scrapValueSpan.innerHTML = value;
            }
        }

        /**
         * Clear initialization
         */
        clearInitialization() {
            this.element.innerHTML = '';

            this._messageSpan = undefined;
            this._content = undefined;
            this._scrapTextSpan = undefined;
            this._scrapValueSpan = undefined;

            super.clearInitialization();
        }

        /**
         * Validate the (event) parameters
         */
        validateParameters() {
            if (!this.element.hasAttribute('machine-id')) {
                this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
                return;
            }
            if (!pulseUtility.isInteger(this.element.getAttribute('machine-id'))) {
                this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidMachineId', 'Invalid machine-id')), () => this.removeError());
                return;
            }

            this.switchToNextContext();
        }

        /**
         * Display error message
         *
         * @param {string} message - Error message
         */
        displayError(message) {
            this._messageSpan.innerHTML = message;
            this._setValue('–'); // Count unknown, not 0
            if (message) {
                console.error('x-scrapstatus : ' + message);
            }
        }

        /**
         * Remove error message
         */
        removeError() {
            this._messageSpan.innerHTML = '';
        }

        /**
         * Get the refresh rate in milliseconds
         *
         * @returns {number} Refresh rate in milliseconds
         */
        get refreshRate() {
            return 1000 * (Number(this.getConfigOrAttribute('refreshingRate.currentRefreshSeconds', 10)));
        }

        /**
         * Get the URL for data request
         *
         * @returns {string} URL
         */
        getShortUrl() {
            return 'Scrap/CurrentShift?MachineId=' + this.element.getAttribute('machine-id');
        }

        /**
         * Refresh with data from server
         *
         * @param {Object} data - Server response
         */
        refresh(data) {
            this._scrapTextSpan.innerHTML = (data && data.Shift)
                ? this.getTranslation('shiftscrap', 'Shift scrap')
                : this.getTranslation('dayscrap', 'Day scrap');
            this._setValue((data && Number.isInteger(data.ScrapCount)) ? data.ScrapCount : '–');
            this._checkNewCycles();
        }

        /**
         * Highlight the button when a cycle completed since the last declaration:
         * cycles of the current period of Scrap/At/Get (the latest cycles).
         * When the answer is not known (error), the button is highlighted:
         * a declaration may be needed.
         */
        _checkNewCycles() {
            if (this._newCyclesRequestRunning) {
                return;
            }
            let machineId = this.element.getAttribute('machine-id');
            if (!pulseUtility.isInteger(machineId)) {
                return;
            }
            // path ends with '/', as in x-savescrapreason
            let url = this.getConfigOrAttribute('path', '') + 'Scrap/At/Get?MachineId=' + machineId;
            let apply = (todo) => {
                this._newCyclesRequestRunning = false;
                // Answer for a previous machine, or no count any more
                if ((this.element.getAttribute('machine-id') !== machineId) || this._isPending()) {
                    return;
                }
                this.element.classList.toggle('scrapstatus-todo', todo);
            };
            this._newCyclesRequestRunning = true;
            pulseService.runAjaxSimple(url,
                (data) => apply(!data || !Number.isInteger(data.FullCycleCount) || (data.FullCycleCount > 0)),
                () => apply(true),
                () => apply(true),
                this.timeout);
        }

        /**
         * Callback once the scrap declaration dialog is closed:
         * check again whether a declaration is still needed
         */
        onScrapDeclarationClosed() {
            this._checkNewCycles();
        }

        /**
         * Event bus callback triggered when machineid changes
         *
         * @param {Object} event
         */
        onMachineIdChange(event) {
            this.element.setAttribute('machine-id', event.target.newMachineId);
        }

    }

    pulseComponent.registerElement('x-scrapstatus', ScrapStatusComponent, ['machine-id', 'machine-context']);
})();
