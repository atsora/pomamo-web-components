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
var pulseSvg = require('pulseSvg');

require('x-datetimerange/x-datetimerange');
require('x-savereason/x-savereason');
require('x-reasonslotlist/x-reasonslotlist');
require('x-revisionprogress/x-revisionprogress');

(function () {

  /**
   * `<x-stopclassification>` — stop reason classification form for a single machine time range.
   *
   * Fetches available reasons from `ReasonSelection/Post?MachineId=<id>&Range=<range>` once.
   * Similar to `x-savereason` but constrained to a single open/closed range.
   * Renders a reason list with a confirm button; integrates `x-revisionprogress` for save tracking.
   * Uses `pulseLogin` to restrict editing based on user role.
   *
   * Attributes:
   *   machine-id - (required) integer machine id
   *   range      - ISO date range string for the stop slot to classify
   *
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
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
            self._rangesList = null;
            self._onStopPeriodsRange = null;
            self._savedRangesList = null;
            self._hideAdvancedOptions = false;

            // Expose public methods similar to x-savereason (single-range flavor)
            self.methods = {
                'addRange': self.addRange,          // set range
                'addRanges': self.addRanges,        // set multiple ranges
                'removeRange': self.removeRange,    // unset if matches
                'cleanRanges': self.cleanRanges,    // clear range
                'setRange': self.addRange,          // alias
                'closeAfterSave': self.closeAfterSave,
                'hideAdvancedOptions': self.hideAdvancedOptions
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
                case 'ranges':
                    if (typeof newVal === 'string') {
                        let ranges = newVal.split('&');
                        this.addRanges(ranges);
                        this.start();
                    }
                    break;
                case 'noadvanced':
                    this.hideAdvancedOptions('true' === newVal || newVal === true);
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
            this._hideAdvancedOptions = false;

            if (this.element.hasAttribute('noadvanced')) {
                this._hideAdvancedOptions = this.element.getAttribute('noadvanced') === 'true';
            }

            // Initialize range(s) from attributes (like x-savereason does for 'ranges')
            if (this.element.hasAttribute('ranges')) {
                let ranges = this.element.getAttribute('ranges').split('&');
                this.addRanges(ranges);
            }
            else if (this.element.hasAttribute('range')) {
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
            if (!this._rangeString && !(this._rangesList && this._rangesList.length)) {
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
            let webServiceRangesList = this._rangesList && this._rangesList.length
                ? this._rangesList
                : [this._rangeString];
            webServiceRangesList = webServiceRangesList.filter(range => typeof range === 'string' && range.length > 0);
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
                this._rangesList = null;
                this.start();
            }
        }

        /**
         * Set multiple ranges and restart
         * @param {string[]} ranges
         */
        addRanges(ranges) {
            if (!Array.isArray(ranges)) return;
            this._rangesList = ranges.filter(r => typeof r === 'string' && r.length > 0);
            this._rangeString = this._rangesList.length ? this._rangesList[0] : null;
            this.start();
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
            this._rangesList = null;
            this.start();
        }

        _isAlwaysSecondLevel(reason) {
            if (!reason) return false;
            const direct = reason.alwayssecondlevel ?? reason.AlwaysSecondLevel;
            if (direct !== undefined) {
                return direct === true || direct === 'true' || direct === 1 || direct === '1';
            }
            const data = reason.Data || {};
            const nested = data.alwayssecondlevel ?? data.AlwaysSecondLevel;
            return nested === true || nested === 'true' || nested === 1 || nested === '1';
        }

        /**
         * Configure whether dialog should auto-close after a save action
         * @param {boolean} closeAfterSave
         */
        closeAfterSave(closeAfterSave) {
          this._closeAfterSave = !!closeAfterSave;
        }

        /**
         * Configure whether to hide the advanced options button
         * @param {boolean} hide
         */
        hideAdvancedOptions(hide) {
          if (this._hideAdvancedOptions === !!hide) return;
          this._hideAdvancedOptions = !!hide;
          this.start();
        }

        _getRangesList () {
          let rangesList = this._rangesList && this._rangesList.length
             ? this._rangesList
             : [this._rangeString || this.element.getAttribute('range')];
          return rangesList.filter(range => typeof range === 'string' && range.length > 0);
        }

        /**
         * Render reason tiles (flat if visual units <= threshold else grouped by ReasonGroupDisplay).
         * Visual units = distinct AlwaysSecondLevel groups + non-AlwaysSecondLevel flat reasons.
         * Threshold is configurable via 'stopclassification.maxflat' (default 12).
         */
        _drawReasons() {
            const _alwaysGroups = new Set();
            let _nonAlwaysCount = 0;
            for (const reason of this._data) {
                if (this._isAlwaysSecondLevel(reason)) {
                    _alwaysGroups.add(reason.ReasonGroupDisplay || reason.ReasonGroupLongDisplay || '');
                } else {
                    _nonAlwaysCount++;
                }
            }
            const _threshold = Number(this.getConfigOrAttribute('stopclassification.maxflat', 11));
            const _shouldGroupAll = (_alwaysGroups.size + _nonAlwaysCount) > _threshold;

            if (!_shouldGroupAll) {
                this._groups = new Object();
                let groupNames = [];
                let nonAlwaysReasons = [];
                let tileCount = 0;

                for (const reason of this._data) {
                    if (this._isAlwaysSecondLevel(reason)) {
                        let currentGroupName = reason.ReasonGroupDisplay || reason.ReasonGroupLongDisplay || '';
                        if (groupNames.indexOf(currentGroupName) == -1) {
                            this._groups[currentGroupName] = [];
                            groupNames.push(currentGroupName);
                        }
                        this._groups[currentGroupName].push(reason);
                        continue;
                    }

                    nonAlwaysReasons.push(reason);
                }

                for (const reason of nonAlwaysReasons) {
                    let classificationId;

                    if (reason.ClassificationId) {
                        classificationId = reason.ClassificationId;
                    }
                    else {
                        classificationId = reason.Id;
                    }

                    this._drawCell(reason.Display, reason.Color, false, classificationId, reason.DetailsRequired, reason.Data, reason.NoDetails);
                    tileCount += 1;
                }

                for (const groupName of groupNames) {
                    this._drawCell(groupName, this._groups[groupName][0].Color, true);
                    tileCount += 1;
                }

                if (!this._hideAdvancedOptions && this._getRangesList().length <= 1) {
                  this._drawAdvancedButton(tileCount);
                }
            }
            else {
                this._groups = new Object();
                let groupNames = [];
                for (const reason of this._data) {
                    let currentGroupName = reason.ReasonGroupDisplay || reason.ReasonGroupLongDisplay || '';
                    if (groupNames.indexOf(currentGroupName) == -1) {
                        this._groups[currentGroupName] = [];
                        groupNames.push(currentGroupName);
                    }
                    this._groups[currentGroupName].push(reason);
                }


                for (const group of groupNames) {
                    this._drawCell(group, this._groups[group][0].Color, true);
                }
                if (!this._hideAdvancedOptions && this._getRangesList().length <= 1) {
                  this._drawAdvancedButton(groupNames.length);
                }
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
         * @param {boolean} [noDetails]
         */
        _drawCell(text, color, isGroup, classificationId, detailsRequired, reasonData, noDetails) {
            let cellsList = this._content.querySelector('.stopclassification-cells-list');

            let cellItem = document.createElement('li');
            cellItem.classList.add('stopclassification-cell-item');

            let box = document.createElement('div');
            box.classList.add('stopclassification-cell-box');
            box.style.borderLeftColor = color;

            let spanText = document.createElement('span');
            spanText.classList.add('stopclassification-cell-text');
            spanText.innerHTML = text;
            box.appendChild(spanText);

            if (isGroup) {
                box.classList.add('stopclassification-cell-box--group');

                let arrow = document.createElement('div');
                arrow.classList.add('stopclassification-icon-expand');
                box.appendChild(arrow);
                pulseSvg.inlineBackgroundSvg(arrow);

                box.addEventListener('click', () => {
                    this._extendGroup(text);
                });
            }
            else {
                box.setAttribute('reason-id', classificationId);
                box.setAttribute('reason-text', text);
                box.setAttribute('details-required', detailsRequired);
                box.reasondata = reasonData;
                box.addEventListener('click', (e) => {
                    this._selectReason(e);
                });

                // Comment button: visible if reason allows details and config permits it
                const showCommentConfig = this.getConfigOrAttribute('stopclassification.showcomment', 'true');
                if (!noDetails && showCommentConfig !== 'false') {
                    let commentBtn = document.createElement('div');
                    commentBtn.classList.add('stopclassification-icon-comment');
                    box.appendChild(commentBtn);
                    pulseSvg.inlineBackgroundSvg(commentBtn);

                    commentBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this._openCommentPopup(classificationId, text, reasonData);
                    });
                }
            }

            cellItem.appendChild(box);
            cellsList.appendChild(cellItem);
        }

        /**
         * Open a popup to enter an optional comment before saving the reason
         * @param {number} classificationId
         * @param {string} reasonName
         * @param {Object} [reasonData]
         */
        _openCommentPopup(classificationId, reasonName, reasonData) {
            let rangeStr = this._getRangesList()[0];
            pulseDetailsPopup.openReasonCommentDialog(this, classificationId, reasonName, rangeStr, false, reasonData,
                (reasId, comment, reasData) => this._saveReason(reasId, comment, reasData)
            );
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
                // Prefer ClassificationId (string code like "MST123") over Id (number)
                // when the backend distinguishes the two — same fallback as in
                // _drawReasons() at the top level.
                let id = reason.ClassificationId || reason.Id;
                this._drawCell(reason.Display, reason.Color, false, id, reason.DetailsRequired, reason.Data, reason.NoDetails);
            }
        }

        /** Add a back button to return to groups overview */
        _drawBackButton() {
            let cellsList = this._content.querySelector('.stopclassification-cells-list');

            let cellItem = document.createElement('li');
            cellItem.classList.add('stopclassification-cell-item', 'stopclassification-cell-item--nav');

            let box = document.createElement('div');
            box.classList.add('stopclassification-cell-box');

            let arrow = document.createElement('div');
            arrow.classList.add('stopclassification-icon-back');
            box.appendChild(arrow);
            pulseSvg.inlineBackgroundSvg(arrow);

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
        _drawAdvancedButton(nbElements) {
            let cellsList = this._content.querySelector('.stopclassification-cells-list');

            let cellItem = document.createElement('li');
            cellItem.classList.add('stopclassification-cell-item', 'stopclassification-cell-item--advanced');

            let box = document.createElement('div');
            box.classList.add('stopclassification-cell-box');

            let text = document.createElement('span');
            text.innerHTML = this.getTranslation('options', 'Advanced Options');
            text.classList.add('stopclassification-cell-text');
            box.appendChild(text);

            let icon = document.createElement('div');
            icon.classList.add('stopclassification-icon-options');
            box.appendChild(icon);
            pulseSvg.inlineBackgroundSvg(icon);

            cellItem.appendChild(box);
            cellsList.appendChild(cellItem);

            let rangesList = this._getRangesList();
            if (1 < rangesList.length) {
              // TODO: for the moment consider fullRange, but ideally should open a specific dialog enabling only the specific ranges
              box.addEventListener('click', () => {
                pulseDetailsPopup.openChangeReasonDialog(this, this.element.getAttribute('fullRange'), true, true);
              });
            }
            else {
              box.addEventListener('click', () => {
                pulseDetailsPopup.openChangeReasonDialog(this, rangesList[0], true, true);
              });
            }
        }

        /**
         * Handle a reason tile click and either request details or save directly
         * @param {Event} e
         */
        _selectReason(e) {
            let elmt = e.currentTarget;
            // Keep the raw string — reason.ClassificationId is a non-numeric code
            // (e.g. "MST123") that must be preserved as-is for the backend.
            // Number() would coerce it to NaN.
            let classificationId = elmt.getAttribute('reason-id');
            let reasonName = elmt.getAttribute('reason-text');
            let detailsRequired = ('true' == elmt.getAttribute('details-required'));
            let reasonData = elmt.reasondata;
            if (detailsRequired) {
                let rangeStr = this._getRangesList()[0];
                pulseDetailsPopup.openReasonCommentDialog(this, classificationId, reasonName, rangeStr, true, reasonData,
                    (reasId, comment, reasData) => this._saveReason(reasId, comment, reasData));
            }
            else {
                this._saveReason(classificationId, undefined, reasonData);
            }
        }

        /**
         * Post the selected reason to ReasonSave/Post for the active range
         * @param {number} classificationId
         * @param {string} [details]
         * @param {Object} [reasonData]
         */
        _saveReason(classificationId, details, reasonData) {
            let machineId = Number(this.element.getAttribute('machine-id'));

            let rangesList = this._rangesList && this._rangesList.length
                ? this._rangesList
                : [this._rangeString || this.element.getAttribute('range')];
            rangesList = rangesList.filter(range => typeof range === 'string' && range.length > 0);

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

            this._savedRangesList = rangesList;

            if (this._closeAfterSave) {
                pulseCustomDialog.close('.dialog-stopclassification');
                return;
            }
        }

        /** Notify success and record modification like x-savereason */
        _saveSuccess(ajaxToken, data, machid) {
            console.log('_saveSuccess');
            console.info('Reason revision id=' + data.Revision.Id);

            // Store modification (align with x-savereason)
            if (this._savedRangesList && this._savedRangesList.length) {
                try {
                    let rangeObjs = this._savedRangesList.map(rangeString => pulseRange.createDateRangeFromString(rangeString));
                    pulseUtility.getOrCreateSingleton('x-modificationmanager')
                        .addModification(data.Revision.Id, 'reason', machid, rangeObjs);
                } catch (e) {
                    console.warn('x-stopclassification: unable to push modification', e);
                }
                this._savedRangesList = null;
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
            pulseCustomDialog.openDialog(errorMessage, { type: 'Error' });
            return;
        }

        /** Open a generic error dialog on transport failures */
        _saveFail(ajaxToken, url, isTimeout, xhrStatus) {
            if (isTimeout) {
                pulseCustomDialog.openDialog('Timeout', { type: 'Error' });
            }
            else {
                let message = pulseService.getAjaxErrorMessage(xhrStatus);
                pulseCustomDialog.openDialog(message, { type: 'Error' });
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

    pulseComponent.registerElement('x-stopclassification', StopClassificationComponent, ['machine-id', 'range', 'ranges']);
})();
