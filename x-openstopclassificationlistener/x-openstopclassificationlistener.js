// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Headless component that listens for reasonStatusCurrentChange and opens the Stop Classification dialog
 * 
 * @module x-openstopclassificationlistener
 */

var pulseComponent = require('pulsecomponent');
var pulseService = require('pulseService');
var pulseRange = require('pulseRange');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');
var eventBus = require('eventBus');

(function () {
    /**
     * Headless helper that listens for reasonStatusCurrentChange events and opens the Stop Classification dialog
     */
    class OpenStopClassificationListener extends pulseComponent.PulseParamInitializedComponent {
        constructor(...args) {
            const self = super(...args);
            self._dateRange = undefined;
            self._machineId = undefined;
            self._listening = false;
            return self;
        }

        /**
         * Initialize listeners for period, machine, and reason status changes.
         */
        initialize() {
            // Listen period context to get current date range
            if (this.element.hasAttribute('period-context')) {
                eventBus.EventBus.addEventListener(this,
                    'dateTimeRangeChangeEvent',
                    this.element.getAttribute('period-context'),
                    this._onDateTimeRangeChange.bind(this));
                // ask for initial
                eventBus.EventBus.dispatchToContext('askForDateTimeRangeEvent',
                    this.element.getAttribute('period-context'));
            } else {
                eventBus.EventBus.addGlobalEventListener(this,
                    'dateTimeRangeChangeEvent', this._onDateTimeRangeChange.bind(this));
                eventBus.EventBus.dispatchToAll('askForDateTimeRangeEvent');
            }

            // Listen machine context to keep machine-id up to date
            if (this.element.hasAttribute('machine-context')) {
                eventBus.EventBus.addEventListener(this,
                    'machineIdChangeSignal',
                    this.element.getAttribute('machine-context'),
                    this._onMachineIdChange.bind(this));
            }

            // Also allow fixed machine-id via attribute
            if (this.element.hasAttribute('machine-id')) {
                this._machineId = Number(this.element.getAttribute('machine-id'));
            }

            // Listen for status change in provided status-context (required)
            const statusCtx = this.element.getAttribute('status-context') || 'PulseWebApp';
            eventBus.EventBus.addEventListener(this,
                'reasonStatusCurrentChange', statusCtx,
                this._onReasonStatusChange.bind(this));
            return;
        }

        clearInitialization() {
            super.clearInitialization();
        }

        /**
         * Keep track of the current page date range from context.
         * @param {*} event
         */
        _onDateTimeRangeChange(event) {
            this._dateRange = event.target.daterange;
        }

        /**
         * Keep track of the current machine id from context and mirror it as attribute.
         * @param {*} event
         */
        _onMachineIdChange(event) {
            this._machineId = event.target.newMachineId;
            if (this._machineId) {
                // Mirror as attribute so downstream helpers can read it
                this.element.setAttribute('machine-id', this._machineId);
            }
        }

        /**
         * Open the stop classification dialog when the current reason requires classification.
         * @param {*} event
         */
        _onReasonStatusChange(event) {
            try {
                if (!event || !event.target) return;
                // Do not try to open if the dialog is already present
                if (this._isDialogOpen()) return;
                // Do not open if a revision progress is active for this machine
                if (this._isRevisionInProgress()) return;
                const status = event.target.status;
                if (!status) return; // open only when missing / required
                if (this._listening) return; // debounce re-entrance
                this._listening = true;
                // Fetch last begin, then open dialog
                this._openDialogFromLastStatus()
                    .finally(() => { this._listening = false; });
            } catch (e) {
                this._listening = false;
            }
        }

        /**
         * Fetch last machine status to compute the applicable open-ended range, then open the dialog.
         * @returns {Promise<void>}
         */
        _openDialogFromLastStatus() {
            // If already open or revision in progress, skip any work
            if (this._isDialogOpen() || this._isRevisionInProgress()) return Promise.resolve();
            const machineId = this._machineId || Number(this.element.getAttribute('machine-id'));
            if (!machineId) return Promise.resolve();

            const url = this.getConfigOrAttribute('path', '') + 'GetLastMachineStatusV2?Id=' + machineId;

            return new Promise((resolve) => {
                pulseService.runAjaxSimple(url, (data) => {
                    // Check again in case dialog opened or revision started in the meantime
                    if (this._isDialogOpen() || this._isRevisionInProgress()) { resolve(); return; }
                    const ms = data && data.MachineStatus;
                    const rs = ms && ms.ReasonSlot;
                    const beginIso = rs && rs.Begin;

                    if (beginIso) {
                        const upper = (this._dateRange && this._dateRange.upper) ? this._dateRange.upper : new Date();
                        const dr = pulseRange.createDateRangeDefaultInclusivity(beginIso, upper);
                        try {
                            // Ensure helper can read machine-id off the element
                            this.element.setAttribute('machine-id', machineId);
                            // Final guard before opening (check both dialog and revision)
                            if (!this._isDialogOpen() && !this._isRevisionInProgress()) {
                                pulseDetailsPopup.openChangeStopClassificationDialog(this, dr);
                            }
                        } catch (e) { /* no-op */ }
                    }

                    resolve();
                });
            });
        }

        /**
         * Check if a stop classification dialog is already open (DOM presence based).
         * @returns {boolean}
         */
        _isDialogOpen() {
            // Pure DOM check: is the dialog element present in the document?
            const doc = (typeof document !== 'undefined') ? document : null;
            if (!doc || !doc.querySelector) return false;
            return doc.querySelector('.dialog-stopclassification') !== null;
        }

        /**
         * Check if a reason revision is in progress for this machine (presence of x-revisionprogress).
         * @returns {boolean}
         */
        _isRevisionInProgress() {
            // Check if there's an active x-revisionprogress for reason modifications on this machine
            const doc = (typeof document !== 'undefined') ? document : null;
            if (!doc || !doc.querySelector) return false;
            
            const machineId = this._machineId || Number(this.element.getAttribute('machine-id'));
            if (!machineId) return false;

            // Look for x-revisionprogress elements with kind="reason" and matching machine-id
            const revisionElements = doc.querySelectorAll('x-revisionprogress[kind="reason"]');
            for (let elem of revisionElements) {
                const elemMachineId = elem.getAttribute('machine-id');
                if (elemMachineId && Number(elemMachineId) === machineId) {
                    // Found an active revision progress for this machine and reason kind
                    return true;
                }
            }
            return false;
        }
    }

    pulseComponent.registerElement('x-openstopclassificationlistener', OpenStopClassificationListener,
        ['machine-id', 'machine-context', 'period-context', 'status-context']);
})();
