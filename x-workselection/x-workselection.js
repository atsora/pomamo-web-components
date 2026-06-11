// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-workselection
 * @requires module:pulseComponent
 */
import * as pulseComponent from 'pulsecomponent';
import * as pulseUtility from 'pulseUtility';
import * as pulseSvg from 'pulseSvg';

(function () {

  /**
   * `<x-workselection>` — search-as-you-type picker for a work order /
   * component / operation.
   *
   * Renders a search input + button and a result list. On each query
   * fetches `WorkSelection?Search=<text>[&MachineId=<id>]` and lists the
   * matches; selecting an entry dispatches `workSelectionChangeEvent`
   * on `work-context` with the picked record. The `search` attribute
   * sets the initial query.
   *
   * @element x-workselection
   * @attr {number} machine-id   machine id used to scope the search
   * @attr {string} work-context event-bus context for `workSelectionChangeEvent`
   * @attr {string} search       initial search string
   * @fires workSelectionChangeEvent `{ … selected record … }` — on `work-context`
   * @extends pulseComponent.PulseParamAutoPathSingleRequestComponent
   */
  class WorkSelectionComponent extends pulseComponent.PulseParamAutoPathSingleRequestComponent {
    /**
     * Constructor
     * 
     * @param  {...any} args 
     */
    constructor(...args) {
      const self = super(...args);

      // DOM - not here
      self._content = undefined;

      return self;
    }

    //get content () { return this._content; } // Optional

    attributeChangedWhenConnectedOnce (attr, oldVal, newVal) {
      super.attributeChangedWhenConnectedOnce(attr, oldVal, newVal);
      switch (attr) {
        case 'search':
          if (this.isInitialized()) {
            this._inputSearch.value = newVal;
            this._searchButton.click();
            //this.start();
          } break;
        default:
          break;
      }
    }

    initialize () {
      // Attribute is not modified by an event. It can be managed during the initialization phase
      // Update here some internal parameters

      // Listeners and dispatchers

      // In case of clone, need to be empty :
      this.element.replaceChildren();

      // Create DOM - Content
      this._content = document.createElement('div');
      this._content.className = 'workselection-content';
      this.element.classList.add('workselection');
      this.element.appendChild(this._content);

      // Create DOM - Search
      this._searchDiv = document.createElement('div');
      this._searchDiv.className = 'workselection-search-div';
      this._content.appendChild(this._searchDiv);

      this._inputSearch = document.createElement('input');
      this._inputSearch.type = 'text';
      this._inputSearch.className = 'workselection-search-input';
      this._inputSearch.placeholder = this.getTranslation('searchPlaceholder', 'Search...');
      this._searchDiv.appendChild(this._inputSearch);
      if (this.element.hasAttribute('search'))
        this._inputSearch.value = this.element.getAttribute('search');

      this._searchButton = document.createElement('button');
      this._searchButton.title = 'Search';
      this._searchButton.setAttribute('role', 'button');
      this._searchButton.className = 'workselection-search-button';
      this._searchDiv.appendChild(this._searchButton);
      pulseSvg.inlineBackgroundSvg(this._searchButton);

      this._clearSearchButton = document.createElement('button');
      this._clearSearchButton.title = 'Clear search';
      this._clearSearchButton.setAttribute('role', 'button');
      this._clearSearchButton.className = 'workselection-clear-search';
      this._searchDiv.appendChild(this._clearSearchButton);
      pulseSvg.inlineBackgroundSvg(this._clearSearchButton);

      // Create DOM - List
      let mainList = document.createElement('div');
      mainList.className = 'workselection-list-scrollable';
      this._content.appendChild(mainList);

      this._list = document.createElement('div');
      this._list.className = 'workselection-list';
      mainList.appendChild(this._list);

      // Create DOM - Loader
      let loader = document.createElement('div');
      loader.className = 'pulse-loader';
      loader.innerHTML = this.getTranslation('loadingDots', 'Loading...');
      loader.style.display = 'none';
      let loaderDiv = document.createElement('div');
      loaderDiv.className = 'pulse-loader-div';
      loaderDiv.appendChild(loader);
      this.element.appendChild(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = document.createElement('span');
      this._messageSpan.className = 'pulse-message';
      this._messageSpan.innerHTML = '';
      let messageDiv = document.createElement('div');
      messageDiv.className = 'pulse-message-div';
      messageDiv.appendChild(this._messageSpan);
      this.element.appendChild(messageDiv);

      // INIT CLICKS
      // Use filter direct -> NO
      /*this._inputSearch.addEventListener('input', function () {
        // Nothing
      }.bind(this));*/

      // Clear filter
      this._clearSearchButton.addEventListener('click', function () {
        this._inputSearch.value = '';
        this._searchButton.click();
      }.bind(this));

      // Search button
      this._searchButton.addEventListener('click', function () {
        //let newSearch = this._inputSearch.value;
        this.start();
      }.bind(this));

      // Initialization OK => switch to the next context
      this.switchToNextContext();
      return;
    }

    validateParameters () {
      this.switchToNextContext();
    }

    displayError (message) {
      // Code here to display the error message
      this._messageSpan.innerHTML = message;
      this._list.style.display = 'none';
    }

    removeError () {
      // Code here to remove the error message.
      this._messageSpan.innerHTML = '';
      this._list.style.display = '';
    }

    getShortUrl () {
      let url = 'WorkSelection?Search=';
      let newSearch = this._inputSearch.value;

      /* Do not add these 2 lines - attr is copied in input search
      if (this.element.hasAttribute('search'))
        url += this.element.getAttribute('search'); else */
      if (newSearch != '')
        url += newSearch;

      if (url == 'WorkSelection?Search=') // Not changed
        url += 'Kind:home'; // == Default for main page

      return url;
    }

    refresh (data) {
      // Clean list
      this._list.replaceChildren();

      // Maybe Store ? this._data = data -> only first time ? When search is empty ?

      // Fill list
      for (let iWorkInfo = 0; iWorkInfo < data.WorkInfoGroup.length; iWorkInfo++) {
        let group = data.WorkInfoGroup[iWorkInfo];

        let groupDiv = document.createElement('div');
        groupDiv.className = 'workselection-group-div';
        this._list.appendChild(groupDiv);

        // Show / Hide Icon
        let svgShow = document.createElement('div');
        svgShow.className = 'show-sub';
        let svgHide = document.createElement('div');
        svgHide.className = 'hide-sub';
        let showHide = document.createElement('div');
        showHide.className = 'workselection-items-visibility opened';
        showHide.appendChild(svgShow);
        showHide.appendChild(svgHide);
        pulseSvg.inlineBackgroundSvg(svgShow);
        pulseSvg.inlineBackgroundSvg(svgHide);

        // Title
        let spanGroup = document.createElement('span');
        spanGroup.className = 'workselection-group-span';
        spanGroup.setAttribute('kind', group.Kind);
        spanGroup.innerHTML = group.Display;
        // ADD : group.Kind;
        let groupTitle = document.createElement('div');
        groupTitle.className = 'workselection-group-title';
        groupTitle.appendChild(showHide);
        groupTitle.appendChild(spanGroup);
        groupDiv.appendChild(groupTitle);

        // Collapse / Expand group
        showHide.addEventListener('click', function () {
          if (this.classList.contains('closed')) {
            this.classList.remove('closed');
            this.classList.add('opened');

            let content = this.closest('.workselection-group-div').querySelector('.workselection-group-content');
            if (content) {
              content.style.display = content.style.display === 'none' ? '' : 'none';
            }
          }
          else if (this.classList.contains('opened')) {
            this.classList.remove('opened');
            this.classList.add('closed');

            let content = this.closest('.workselection-group-div').querySelector('.workselection-group-content');
            if (content) {
              content.style.display = content.style.display === 'none' ? '' : 'none';
            }
          }
        });

        spanGroup.addEventListener('click', function () {
          // Change search - to kind:<group>
          let kind = this.getAttribute('kind');
          let xWorkSel = this.closest('x-workselection');
          xWorkSel.setAttribute('search', 'kind:' + kind);
        });

        // ADD : content = list of items
        let groupContent = document.createElement('div');
        groupContent.className = 'workselection-group-content';
        groupDiv.appendChild(groupContent);

        // Details
        for (let iItem = 0; iItem < group.Items.length; iItem++) {
          let item = group.Items[iItem];

          let spanItem = document.createElement('span');
          spanItem.className = 'workselection-item-span';
          spanItem.innerHTML = item.Display;
          spanItem.setAttribute('kind', item.Kind);
          spanItem.setAttribute('itemid', item.Id);
          let itemDiv = document.createElement('div');
          itemDiv.className = 'workselection-item-div';
          itemDiv.appendChild(spanItem);
          groupContent.appendChild(itemDiv);

          // Click on item -> go to next page (= replace : selection -> explorer)
          spanItem.addEventListener('click', function () {
            let kind = this.getAttribute('kind');
            let itemid = this.getAttribute('itemid');
            //let xWorkSel = this.closest('x-workselection');

            let href = window.location.href;
            href = href.replace('selection', 'explorer');
            href = pulseUtility.changeURLParameter(href, 'kind', kind);
            href = pulseUtility.changeURLParameter(href, 'id', itemid);
            window.location.href = href;
          });
        }

        // Hide if more than 5 itemsS
        if (group.Items.length > 5) {
          showHide.click();
        }

      }
    }

    // Callback events

    /**
     * Event callback in case a config is updated: (re-)start the component
     *
     * @param {*} event
     */
    onConfigChange (event) {
      // Default = do nothing
    }
  }

  pulseComponent.registerElement('x-workselection', WorkSelectionComponent, ['search']);
})();
