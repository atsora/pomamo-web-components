// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Lightweight provider that fetches ReasonOnlySlots and publishes a selected period
 *
 * @module x-stopperiods
 * @requires module:pulsecomponent
 * @requires module:pulseService
 * @requires module:pulseRange
 * @requires module:pulseUtility
 */

var pulseComponent = require('pulsecomponent');
var pulseService = require('pulseService');
var pulseRange = require('pulseRange');
var pulseUtility = require('pulseUtility');
require('x-stopclassification/x-stopclassification');

(function () {
    /**
     * Lightweight headless provider that fetches selectable ReasonOnlySlots for a given machine and range,
     */
    class StopPeriodsComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
        /**
         * Constructor
         * Initializes internal state and exposes a minimal public API (fetch)
         * @param  {...any} args
         */
        constructor(...args) {
            const self = super(...args);

            self._currentRangeString = null;
            self._lastData = null;

            // Public API
            self.methods = {
                fetch: self.start, // re-fetch using current attributes
            };

            return self;
        }

        attributeChangedWhenConnectedOnce(attr, oldVal, newVal) {
            super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
            switch (attr) {
                case 'machine-id':
                case 'range':
                    this.start();
                    break;
                default:
                    break;
            }
        }

        /**
         * Initialize the component
         * Headless provider: no DOM content created, just validates and fetches.
         */
        initialize() {
            // headless provider; no UI
            this.switchToNextContext();
            return;
        }

        clearInitialization() {
            this._currentRangeString = null;
            super.clearInitialization();
        }

        /**
         * Validate required attributes and the input range format.
         */
        validateParameters() {
            if (!this.element.hasAttribute('machine-id')) {
                this.setError(this.getTranslation('error.selectMachine', 'Please select a machine'));
                return;
            }
            if (!this.element.hasAttribute('range')) {
                this.setError(this.getTranslation('error.missingRange', 'Missing range'));
                return;
            }
            // Sanity check
            let inputRange = this.element.getAttribute('range');
            let r = pulseRange.createDateRangeFromString(inputRange);
            if (!(r instanceof pulseRange.DateRange) || r.isEmpty()) {
                this.setError(this.getTranslation('error.invalidRange', 'Invalid range'));
                return;
            }
            this.switchToNextContext();
        }

        /**
         * Build the service URL to fetch ReasonOnlySlots (similar to x-reasonslotlist)
         */
        getShortUrl() {
            let url = 'CurrentReason?MachineId=' + this.element.getAttribute('machine-id');
            url += '&Period=reason_machinemodecategory';
            return url;
        }

        /**
         * Handle service data
         * @param {Object} data Service response
         */
        refresh(data) {
            // Use PeriodStart from the response (always current reason)
            if (!data || !data.PeriodStart) {
                this._publish(null, null);
                return;
            }

            // Create an open-ended range from PeriodStart to now
            let selectedRangeStr = pulseUtility.createDateRangeForWebService(data.PeriodStart);

            this._currentRangeString = selectedRangeStr;
            this._publish(selectedRangeStr, data);

            // Optionally auto-create/update a child x-stopclassification in place
            // When attribute 'autocreate-stopclassification' is present,
            // a <x-stopclassification> is created as a child (or updated) with machine-id and range.
            if (this.element.hasAttribute('autocreate-stopclassification')) {
                let existing = this.element.querySelector('x-stopclassification');
                if (!existing) {
                    let xstopclassification = pulseUtility.createjQueryElementWithAttribute('x-stopclassification', {
                        'machine-id': this.element.getAttribute('machine-id'),
                        'range': selectedRangeStr,
                        'fullRange': this.element.getAttribute('range')
                    });
                    // Append as child
                    $(this.element).append(xstopclassification);
                }
                else {
                    existing.setAttribute('machine-id', this.element.getAttribute('machine-id'));
                    // Update via attribute so it triggers attributeChangedWhenConnectedOnce
                    existing.setAttribute('range', selectedRangeStr);
                }
            }
        }

        /**
         * Publish the selected range via a DOM CustomEvent 'stopperiods-range'
         * @param {string|null} rangeString A normalized range string or null if none
         * @param {Object|null} slot Optional original slot object
         */
        _publish(rangeString, slot) {
            // Fire a DOM event with the computed range
            let detail = { range: rangeString, slot: slot };
            try {
                let ev = new CustomEvent('stopperiods-range', { detail: detail, bubbles: true });
                this.element.dispatchEvent(ev);
            } catch (e) {
                // Older browsers: fallback minimal event (unlikely in our context)
            }
        }

        /**
         * Display a validation/runtime error in console (headless component)
         * @param {string} message
         */
        displayError(message) {
            console.error('x-stopperiods: ' + message);
        }

        removeError() { }
    }

    pulseComponent.registerElement('x-stopperiods', StopPeriodsComponent, ['machine-id', 'range']);
})();
