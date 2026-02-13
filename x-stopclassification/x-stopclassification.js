// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2025 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Standalone component to classify a stop over a single selected range
 *
 * @module x-stopclassification
 * @requires module:pulseComponent
 * @requires module:pulseUtility
 */

var pulseRange = require('pulseRange');
var pulseComponent = require('pulsecomponent');
var pulseDetailsPopup = require('pulsecomponent-detailspopup');
var pulseService = require('pulseService');
var pulseCustomDialog = require('pulseCustomDialog');
var pulseUtility = require('pulseUtility');
var pulseLogin = require('pulseLogin');

require('x-savereason/x-savereason');
require('x-reasonslotlist/x-reasonslotlist');
require('x-revisionprogress/x-revisionprogress');

(function () {

    /**
     * Behavior is similar to x-savereason but constrained to a single open/closed range.
     */
    class StopClassificationComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
        /**
         * Constructor
         *
         * @param  {...any} args
         */
        constructor(...args) {
            const self = super(...args);

            self._content = undefined;
            // Internal single range string (normalized like pulseRange.createStringRangeFromString)
            self._rangeString = null;
            self._onStopPeriodsRange = null;

            // Expose public methods similar to x-savereason (single-range flavor)
            self.methods = {
                'addRange': self.addRange,          // set range
                'removeRange': self.removeRange,    // unset if matches
                'cleanRanges': self.cleanRanges,    // clear range
                'setRange': self.addRange,          // alias
                'closeAfterSave': self.closeAfterSave
            };

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
                case 'range':
                    if (typeof newVal === 'string') {
                        // Pass string directly; addRange expects a string
                        this.addRange(newVal);
                        this.start();
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
            this._content.classList.add('stopclassification-content');

            let panel = document.createElement('div');
            panel.classList.add('stopclassification-panel');

            let cellsList = document.createElement('ul');
            cellsList.classList.add('stopclassification-cells-list');
            panel.appendChild(cellsList);

            this._content.appendChild(panel);

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

            // Initialize parameters
            this._closeAfterSave = true;

            // Initialize range from attribute if present (like x-savereason does for 'ranges')
            if (this.element.hasAttribute('range')) {
                let attr = this.element.getAttribute('range');
                // Pass raw string to addRange; it expects a string
                this.addRange(attr);
            }

            // Listen for ranges coming from a nested x-stopperiods component
            this._onStopPeriodsRange = (ev) => {
                if (ev && ev.detail && typeof ev.detail.range === 'string') {
                    this.addRange(ev.detail.range);
                }
            };
            this.element.addEventListener('stopperiods-range', this._onStopPeriodsRange);

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
            if (this._onStopPeriodsRange) {
                this.element.removeEventListener('stopperiods-range', this._onStopPeriodsRange);
                this._onStopPeriodsRange = null;
            }

            super.clearInitialization();
        }

        /**
         * Validate required parameters and the internal range format
         */
        validateParameters() {
            if (!this.element.hasAttribute('machine-id')) {
                this.setError(this.getTranslation('error.selectMachine', 'No machine selected'));
                return;
            }
            if (!this._rangeString) {
                this.setError(this.getTranslation('error.missingRange', 'Missing range'));
                return;
            }

            // Validate the format of the internal range
            let rangeToCheck = pulseRange.createDateRangeFromString(this._rangeString);
            if (!(rangeToCheck instanceof pulseRange.DateRange)) {
                this.switchToKey('Error', () => this.displayError(this.getTranslation('error.invalidRange', 'Invalid range')), () => this.removeError());
                return;
            }

            this.switchToNextContext();
        }

        /**
         * Build WS URL for ReasonSelection/Post
         * @returns {string}
         */
        getShortUrl() {
            let url = 'ReasonSelection/Post';
            if (this.element.hasAttribute('machine-id')) {
                url += '?MachineId=' + this.element.getAttribute('machine-id');
            }

            let role = pulseLogin.getRole();

            if (role) {
                url += '&RoleKey=' + role;
            }

            return url;
        }

        /**
         * Payload for ReasonSelection/Post
         * @returns {{Ranges: string[]}}
         */
        postData() {
            let webServiceRangesList = [this._rangeString];
            return {
                'Ranges': webServiceRangesList
            };
        }

        /**
         * Store fetched reasons and render tiles
         * @param {*} data
         */
        refresh(data) {
            this._data = data;
            this._clearPanel();
            this._drawReasons();
        }

        // Public API (single-range semantics like x-savereason)
        /**
         * Set the internal range string and restart if changed
         * @param {string} range
         */
        addRange(range) {
            if (typeof range !== 'string') return;
            // Normalize already expected; still set directly
            if (this._rangeString !== range) {
                this._rangeString = range;
                this.start();
            }
        }

        /**
         * Remove internal range if it matches the provided one
         * @param {string} range
         */
        removeRange(range) {
            if (typeof range !== 'string') return;
            if (this._rangeString === range) {
                this._rangeString = null;
                this.start();
            }
        }

        /** Clear internal range and restart */
        cleanRanges() {
            this._rangeString = null;
            this.start();
        }

        /**
         * Configure whether dialog should auto-close after a save action
         * @param {boolean} closeAfterSave
         */
        closeAfterSave(closeAfterSave) {
            this._closeAfterSave = !!closeAfterSave;
        }

        /**
         * Render reason tiles (flat if <=12 reasons else grouped by ReasonGroupDisplay)
         */
        _drawReasons() {
            if (this._data.length <= 12) {

                for (const reason of this._data) {
                    let classificationId;

                    if (reason.ClassificationId) {
                      classificationId = reason.ClassificationId;
                    }
                    else {
                      classificationId = reason.Id;
                    }

                    this._drawCell(reason.Display, reason.Color, false, classificationId, reason.DetailsRequired, reason.Data);
                }
                this._drawAdancedButton(this._data.length);
            }
            else {
                this._groups = new Object();
                let groupNames = [];
                for (const reason of this._data) {
                    let currentGroupName = reason.ReasonGroupDisplay;
                    if (groupNames.indexOf(currentGroupName) == -1) {
                        this._groups[currentGroupName] = [];
                        groupNames.push(currentGroupName);
                    }
                    this._groups[currentGroupName].push(reason);
                }


                for (const group of groupNames) {
                    this._drawCell(group, this._groups[group][0].Color, true);
                }
                this._drawAdancedButton(groupNames.length);
            }
        }

        /**
         * Render a single tile cell (group or reason)
         * @param {string} text
         * @param {string} color
         * @param {boolean} isGroup
         * @param {number} [classificationId]
         * @param {boolean} [detailsRequired]
         * @param {Object} [reasonData]
         */
        _drawCell(text, color, isGroup, classificationId, detailsRequired, reasonData) {
            let cellsList = this._content.querySelector('.stopclassification-cells-list');

            let cellItem = document.createElement('li');
            cellItem.classList.add('stopclassification-cell-item');

            let box = document.createElement('div');
            box.classList.add('stopclassification-cell-box');

            let boxColor = document.createElement('div');
            boxColor.classList.add('stopclassification-cell-box-color');
            boxColor.style.backgroundColor = color;
            box.appendChild(boxColor);

            let boxText = document.createElement('div');
            boxText.classList.add('stopclassification-cell-box-text');

            let spanText = document.createElement('span');
            spanText.classList.add('stopclassification-cell-text');
            spanText.innerHTML = text;
            boxText.appendChild(spanText);

            box.appendChild(boxText);

            if (isGroup) {
                let triangle = document.createElement('div');
                triangle.classList.add('triangle');
                box.appendChild(triangle);

                let boxArrow = document.createElement('div');
                boxArrow.classList.add('stopclassification-cell-box-arrow');

                let arrow = document.createElement('i');
                arrow.classList.add('fa-solid', 'fa-arrow-down-short-wide');
                boxArrow.appendChild(arrow);

                box.appendChild(boxArrow);

                box.addEventListener('click', () => {
                    this._extendGroup(text);
                });
            }
            else {
                box.setAttribute('reason-id', classificationId);
                box.setAttribute('reason-text', text);
                box.setAttribute('details-required', detailsRequired);
                box.reasondata = reasonData;
                box.addEventListener('click', (box) => {
                    this._selectReason(box);
                })
            }

            cellItem.appendChild(box);

            cellsList.appendChild(cellItem);
        }

        /** Clear all tiles */
        _clearPanel() {
            let cellsList = this._content.querySelector('.stopclassification-cells-list');
            cellsList.innerHTML = '';
        }

        /**
         * Expand a group to show its child reasons
         * @param {string} groupName
         */
        _extendGroup(groupName) {
            this._clearPanel();

            let reasons = this._groups[groupName];

            this._drawBackButton();
            for (const reason of reasons) {
                this._drawCell(reason.Display, reason.Color, false, reason.Id, reason.DetailsRequired, reason.Data);
            }
        }

        /** Add a back button to return to groups overview */
        _drawBackButton() {
            let cellsList = this._content.querySelector('.stopclassification-cells-list');

            let cellItem = document.createElement('li');
            cellItem.classList.add('stopclassification-cell-item');

            let box = document.createElement('div');
            box.classList.add('stopclassification-cell-box');

            let boxArrow = document.createElement('div');
            boxArrow.classList.add('stopclassification-cell-box-text');

            let arrow = document.createElement('i');
            arrow.classList.add('fa-solid', 'fa-arrow-left');
            boxArrow.appendChild(arrow);

            box.appendChild(boxArrow);

            cellItem.appendChild(box);

            cellsList.appendChild(cellItem);

            box.addEventListener('click', () => {
                this._clearPanel();
                this._drawReasons();
            });
        }

        /**
         * Add an "Advanced Options" tile which opens the full reason dialog (x-savereason-like)
         * @param {number} nbElements Number of tiles to compute grid position
         */
        _drawAdancedButton(nbElements) {
            let cellsList = this._content.querySelector('.stopclassification-cells-list');

            let cellItem = document.createElement('li');
            cellItem.classList.add('stopclassification-cell-item');

            let box = document.createElement('div');
            box.classList.add('stopclassification-cell-box');

            let boxText = document.createElement('div');
            boxText.classList.add('stopclassification-cell-box-text');

            let icon = document.createElement('i');
            icon.classList.add('fa-solid', 'fa-screwdriver-wrench');
            boxText.appendChild(icon);

            let text = document.createElement('span');
            text.innerHTML = this.getTranslation('options', 'Advanced Options');
            text.classList.add('stopclassification-cell-text');
            boxText.appendChild(text);

            box.appendChild(boxText);

            cellItem.appendChild(box);

            cellItem.style.gridColumn = 4;
            cellItem.style.gridRow = Math.ceil((nbElements + 1) / 4);

            cellsList.appendChild(cellItem);

            box.addEventListener('click', () => {
                pulseDetailsPopup.openChangeReasonDialog(this, this.element.getAttribute('fullRange'), true);
            });
        }

        /**
         * Handle a reason tile click and either request details or save directly
         * @param {Event} e
         */
        _selectReason(e) {
            let elmt = e.currentTarget;
            let classificationId = Number(elmt.getAttribute('reason-id'));
            let reasonName = elmt.getAttribute('reason-text');
            let detailsRequired = ('true' == elmt.getAttribute('details-required'));
            let reasonData = elmt.reasondata;
            if (detailsRequired)
                this._getDetailsAndSave(classificationId, reasonName, detailsRequired, reasonData);
            else
                this._saveReason(classificationId, undefined, reasonData);
        }

        /**
         * Post the selected reason to ReasonSave/Post for the active range
         * @param {number} classificationId
         * @param {string} [details]
         * @param {Object} [reasonData]
         */
        _saveReason(classificationId, details, reasonData) {
            let machineId = Number(this.element.getAttribute('machine-id'));

            let effectiveRange = this._rangeString || this.element.getAttribute('range');
            let rangesList = [effectiveRange];

            let url = this.getConfigOrAttribute('path', '') + 'ReasonSave/Post'
                + '?MachineId=' + machineId;
            if (classificationId != null) {
                url = url + '&ClassificationId=' + classificationId;
            }

            if (details) {
                url += '&ReasonDetails=' + details;
            }


            let timeout = this.timeout;
            let machid = this.element.getAttribute('machine-id');
            let postData = { 'Ranges': rangesList };
            if (reasonData) {
                postData.ReasonData = reasonData;
            }
            pulseService.postAjax(0, url,
                postData,
                timeout,
                function (ajaxToken, data) {
                    this._saveSuccess(ajaxToken, data, machid);
                }.bind(this),
                this._saveError.bind(this),
                this._saveFail.bind(this));

            this._savedRangeString = effectiveRange;

            if (this._closeAfterSave) {
                pulseCustomDialog.close('.dialog-stopclassification');
                return;
            }
        }

        /**
         * Open a dialog to collect details if required then save the reason
         * @param {number} classificationId
         * @param {string} reasonName
         * @param {boolean} detailsRequired
         * @param {Object} [reasonData]
         */
        _getDetailsAndSave(classificationId, reasonName, detailsRequired, reasonData) {
            // Machine
            let machineDisplay = pulseUtility.createjQueryElementWithAttribute('x-machinedisplay', {
                'machine-id': this.element.getAttribute('machine-id')
            });
            let divMachine = $('<div></div>').addClass('savereason-machine')
                .append($('<div></div>').addClass('savereason-machine-label').html(this.getTranslation('machineColon', 'Machine: ')))
                .append(machineDisplay);

            // Reason
            let divlabelReason = $('<div></div>').addClass('savereason-details-label').html(this.getTranslation('reasonColon', 'Reason: '));
            let divNewReasonSpan = $('<span></span>').addClass('savereason-details-span').html(reasonName);
            let divNewReason = $('<div></div>').addClass('savereason-details-input').append(divNewReasonSpan);
            let divReason = $('<div></div>').addClass('savereason-details-reason')
                .append(divlabelReason).append(divNewReason);

            // Details
            let divinput = $('<div></div>').addClass('savereason-details-input');
            let input = $('<textarea name="details-comment" placeholder="Details..."></textarea>');
            $(input).attr('maxlength', 255);
            $(input).keydown(function (event) {
                if (event.keyCode == 13) { // == Enter
                    $('a.dialog-button-frame-validate').click();
                }
            });
            divinput.append(input);
            let divDetails = $('<div></div>').addClass('savereason-details').append(divinput)

            let dialogbox = $('<div></div>')
                .addClass('savereason-dialog-details')
                .append(divMachine)
                .append(divReason)
                .append(divDetails);

            let reasonDetailsTitle = this.getTranslation('reasonDetailsTitle', 'Reason details');

            this._detailsDialogId = pulseCustomDialog.initialize(dialogbox, {
                title: reasonDetailsTitle,
                onOk: function (x_save, reasId, reasData, inputParam) { // to avoid closure
                    return function () {
                        let details = inputParam.val();
                        if ((details == '') && (detailsRequired)) {
                            // show error msg -- should never happen if button is disabled
                            let pleaseAddComment = x_save.getTranslation('errorNoDetails', 'Please add a comment');
                            pulseCustomDialog.openError(pleaseAddComment);
                        }
                        else {
                            x_save._saveReason(reasId, details, reasData);
                            pulseCustomDialog.close('#' + x_save._detailsDialogId);
                            x_save._detailsDialogId = null;
                        }
                    }
                }(this, classificationId, reasonData, input), /* end of validate*/
                onCancel: function () {
                    pulseCustomDialog.close('#' + this._detailsDialogId);
                    this._detailsDialogId = null;
                }.bind(this),
                autoClose: false,
                autoDelete: true,
                helpName: 'savereason'
            });
            pulseCustomDialog.open('#' + this._detailsDialogId);

            // - Enable / Disable the OK button
            if (detailsRequired) { // Disable validateButton
                let okBtn = $('#' + this._detailsDialogId).find('.customDialogOk');
                $(okBtn)[0].setAttribute('disabled', 'disabled');
            }
            var self = this;
            input.on('keyup paste input', notifyTextChanged);
            function notifyTextChanged() {
                if (detailsRequired) { // show / hide validateButton
                    if (0 == $(this).val().length) {
                        $('#' + self._detailsDialogId + ' .customDialogOk')[0].setAttribute('disabled', 'disabled');
                    }
                    else {
                        $('#' + self._detailsDialogId + ' .customDialogOk').removeAttr('disabled');
                    }
                }
            }
        }

        /** Notify success and record modification like x-savereason */
        _saveSuccess(ajaxToken, data, machid) {
            console.log('_saveSuccess');
            console.info('Reason revision id=' + data.Revision.Id);

            // Store modification (align with x-savereason)
            if (this._savedRangeString) {
                let rangeObj = pulseRange.createDateRangeFromString(this._savedRangeString);
                try {
                    pulseUtility.getOrCreateSingleton('x-modificationmanager')
                        .addModification(data.Revision.Id, 'reason', machid, [rangeObj]);
                } catch (e) {
                    console.warn('x-stopclassification: unable to push modification', e);
                }
                this._savedRangeString = null;
            }
        }

        /** Open a formatted error dialog based on WS response */
        _saveError(ajaxToken, data) {
            let errorMessage = 'Error';
            if (typeof data === 'undefined') {
                errorMessage = 'undefined error data';
            }
            else {
                let status = data.Status;
                if (typeof status === 'undefined') {
                    errorMessage = 'undefined error data status';
                }
                else {
                    if (typeof (status) != 'undefined') {
                        errorMessage = `unknown status ${status}, ${data.ErrorMessage}`;
                    }
                    else {
                        errorMessage = data.ErrorMessage;
                    }
                }
            }
            pulseCustomDialog.openError(errorMessage);
            return;
        }

        /** Open a generic error dialog on transport failures */
        _saveFail(ajaxToken, url, isTimeout, xhrStatus) {
            if (isTimeout) {
                pulseCustomDialog.openError('Timeout');
            }
            else {
                let message = pulseService.getAjaxErrorMessage(xhrStatus);
                pulseCustomDialog.openError(message);
            }
        }

        /** Display a localized error message in the component */
        displayError(message) {
            this._messageSpan.innerHTML = message;
            switch (message) {
                case 'no machine selected':
                    console.error('x-stopclassification: missing machine-id attribute');
                    break;
                case 'invalid range':
                    console.error('x-stopclassification: invalid range, should be a DateRange object or a string like "begin;end"');
                    break;
                case 'no range selected':
                    console.error('x-stopclassification: missing range attribute or range not set through API');
                    break;
                default:
                    console.error('x-stopclassification: unknown error');
                    break;
            }
        }

        /** Clear the error area */
        removeError() {
            this._messageSpan.innerHTML = '';
        }
    }

    pulseComponent.registerElement('x-stopclassification', StopClassificationComponent, ['machine-id', 'range']);
})();
