// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-scrapstatus
 * @requires module:pulseUtility
 * @requires module:pulseRange
 * @requires module:pulseComponent
 * @requires module:pulsecomponent-detailspopup
 */

var pulseUtility = require('pulseUtility');
var pulseComponent = require('pulsecomponent');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');

require('x-scrapclassification/x-scrapclassification');

(function () {

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
            textSpan.classList.add('scrapstatus-text');
            textSpan.innerHTML = this.getTranslation('shiftscrap', 'Shift scrap');
            this._content.appendChild(textSpan);

            let valueSpan = document.createElement('span');
            this._scrapValueSpan = valueSpan;
            valueSpan.classList.add('scrapstatus-value');
            valueSpan.innerHTML = '0';
            this._content.appendChild(valueSpan);

            let buttonContent = document.createElement('div');
            buttonContent.classList.add('scrapstatus-button-content');
            buttonContent.addEventListener('click', () => {
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
         * Clear initialization
         */
        clearInitialization() {
            this.element.innerHTML = '';

            this._messageSpan = undefined;
            this._content = undefined;

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
            console.error('x-scrapstatus : ' + message);
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
            let url = 'GetLastMachineStatusV2?Id=' + this.element.getAttribute('machine-id');
            return url;
        }

        /**
         * Refresh with data from server
         *
         * @param {Object} data - Server response
         */
        refresh(data) {
            this._scrapValueSpan.innerHTML = 25;
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
