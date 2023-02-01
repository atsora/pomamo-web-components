// Copyright (C) 2009-2023 Lemoine Automation Technologies
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @module x-workselection
 * @requires module:pulseComponent
 */
var pulseComponent = require('pulsecomponent');
var pulseUtility = require('pulseUtility');
var pulseSvg = require('pulseSvg');

(function () {

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
            $(this._inputSearch).val(newVal);
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
      $(this.element).empty();

      // Create DOM - Content
      this._content = $('<div></div>').addClass('workselection-content');
      $(this.element)
        .addClass('workselection')
        .append(this._content);

      // Create DOM - Search
      this._searchDiv = $('<div></div>').addClass('workselection-search-div');
      this._content.append(this._searchDiv);

      this._inputSearch = $('<input></input>').addClass('workselection-search-input')
        .attr('type', 'text').attr('placeholder', 'Search...');
      this._searchDiv.append(this._inputSearch);
      if (this.element.hasAttribute('search'))
        $(this._inputSearch).val(this.element.getAttribute('search'));

      this._searchButton = $('<button title="Search" role="button"></button>')
        .addClass('workselection-search-button');
      this._searchDiv.append(this._searchButton);

      this._clearSearchButton = $('<button title="Clear search" role="button"></button>')
        .addClass('workselection-clear-search');
      this._searchDiv.append(this._clearSearchButton);

      // Create DOM - List
      let mainList = $('<div></div>').addClass('workselection-list-scrollable');
      this._content.append(mainList);

      this._list = $('<div></div>').addClass('workselection-list');
      mainList.append(this._list);

      // Create DOM - Loader
      let loader = $('<div></div>').addClass('pulse-loader').html('Loading...').css('display', 'none');
      let loaderDiv = $('<div></div>').addClass('pulse-loader-div').append(loader);
      $(this.element).append(loaderDiv);
      // Create DOM - message for error
      this._messageSpan = $('<span></span>')
        .addClass('pulse-message').html('');
      let messageDiv = $('<div></div>')
        .addClass('pulse-message-div')
        .append(this._messageSpan);
      $(this.element).append(messageDiv);

      // INIT CLICKS
      // Use filter direct -> NO
      /*$(this._inputSearch).on('input', function () {
        // Nothing
      }.bind(this));*/

      // Clear filter
      $(this._clearSearchButton).click(function () {
        $(this._inputSearch).val('');
        this._searchButton.click();
      }.bind(this));

      // Search button
      $(this._searchButton).click(function () {
        //let newSearch = $(this._inputSearch).val();
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
      $(this._messageSpan).html(message);
      $(this._list).hide();
    }

    removeError () {
      // Code here to remove the error message.
      $(this._messageSpan).html('');
      $(this._list).show();
    }

    getShortUrl () {
      let url = 'WorkSelection?Search=';
      let newSearch = $(this._inputSearch).val();

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
      this._list.empty();

      // Maybe Store ? this._data = data -> only first time ? When search is empty ?

      // Fill list
      for (let iWorkInfo = 0; iWorkInfo < data.WorkInfoGroup.length; iWorkInfo++) {
        let group = data.WorkInfoGroup[iWorkInfo];

        let groupDiv = $('<div></div>').addClass('workselection-group-div');
        this._list.append(groupDiv);

        // Show / Hide Icon
        let svgShow = $('<div></div>').addClass('show-sub');
        let svgHide = $('<div></div>').addClass('hide-sub');
        let showHide = $('<div></div>').addClass('workselection-items-visibility')
          .addClass('opened')
          .append(svgShow).append(svgHide);
        pulseSvg.inlineBackgroundSvg(svgShow);
        pulseSvg.inlineBackgroundSvg(svgHide);

        // Title
        let spanGroup = $('<span></span>').addClass('workselection-group-span')
          .attr('kind', group.Kind)
          .html(group.Display);
        // ADD : group.Kind;
        let groupTitle = $('<div></div>').addClass('workselection-group-title')
          .append(showHide)
          .append(spanGroup);
        groupDiv.append(groupTitle);

        // Collapse / Expand group
        showHide.click(function () {
          if ($(this).hasClass('closed')) {
            $(this).removeClass('closed');
            $(this).addClass('opened');

            $(this).closest('.workselection-group-div')
              .children('.workselection-group-content').toggle();
          }
          else if ($(this).hasClass('opened')) {
            $(this).removeClass('opened');
            $(this).addClass('closed');

            $(this).closest('.workselection-group-div')
              .children('.workselection-group-content').toggle();
          }
        });

        spanGroup.click(function () {
          // Change search - to kind:<group>
          let kind = $(this).attr('kind');
          let xWorkSel = $(this).closest('x-workselection');
          xWorkSel.attr('search', 'kind:' + kind);
        });

        // ADD : content = list of items
        let groupContent = $('<div></div>').addClass('workselection-group-content');
        groupDiv.append(groupContent);

        // Details
        for (let iItem = 0; iItem < group.Items.length; iItem++) {
          let item = group.Items[iItem];

          let spanItem = $('<span></span>').addClass('workselection-item-span')
            .html(item.Display);
          spanItem.attr('kind', item.Kind).attr('itemid', item.Id);
          let itemDiv = $('<div></div>').addClass('workselection-item-div')
            .append(spanItem);
          groupContent.append(itemDiv);

          // Click on item -> go to next page (= replace : selection -> explorer)
          spanItem.click(function () {
            let kind = $(this).attr('kind');
            let itemid = $(this).attr('itemid');
            //let xWorkSel = $(this).closest('x-workselection');

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
