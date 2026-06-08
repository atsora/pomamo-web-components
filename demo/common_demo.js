// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

var pulseConfig = require('pulseConfig');

//pulseConfig.setGlobal('path', 'http://localhost:8082/');


//////////////////////////////
// LEFT PANEL = NAVIGATION  //
//////////////////////////////
var openNavigationPanel = function (fast) {
  let menuicons = document.querySelectorAll('.menuicon');
  menuicons.forEach(icon => icon.classList.add('tooltip_disabled'));
  let navBtn = document.getElementById('navigationpanelbtn');
  if (navBtn.classList.contains('disabled'))
    return;
  let navPanel = document.getElementById('pulse-panel-navigation');
  let pulseInner = document.getElementById('pulse-inner');
  if (fast)
    navPanel.classList.add('notransition');
  else
    navPanel.classList.remove('notransition');
  pulseInner.classList.remove('pulse-panel-navigation-collapsed');
  navBtn.classList.add('activated');
};

var closeNavigationPanel = function (fast) {
  let menuicons = document.querySelectorAll('.menuicon');
  menuicons.forEach(icon => icon.classList.remove('tooltip_disabled'));
  let navPanel = document.getElementById('pulse-panel-navigation');
  let pulseInner = document.getElementById('pulse-inner');
  if (fast)
    navPanel.classList.add('notransition');
  else
    navPanel.classList.remove('notransition');
  pulseInner.classList.add('pulse-panel-navigation-collapsed');
  document.getElementById('navigationpanelbtn').classList.remove('activated');
};

var populateNavigationPanel = function () {

  // First init open/close panel
  // Click to show / hide the navigation panel
  let navBtn = document.getElementById('navigationpanelbtn');
  navBtn.addEventListener('click', function (e) {
    let pulseInner = document.getElementById('pulse-inner');
    if (pulseInner.classList.contains('pulse-panel-navigation-collapsed')) {
      // is closed -> open
      openNavigationPanel();
      if (window.innerWidth <= 685)
        closeParameterPanel(false);
    }
    else { // is opened -> close
      closeNavigationPanel(false);
    }
  });

  // Real populate
  let currentPage = window.location.href.replace(/(.*\/)([^\\]*)(\.html.*)/, '$2');

  let displayedPages = tagConfig.displayedPages;

  if (displayedPages == null || displayedPages.length == 0) {
    let navPanel = document.getElementById('pulse-panel-navigation');
    navPanel.style.display = 'none';
    navBtn.classList.add('disabled');
    if (currentPage != 'index')
      window.location = 'index.html';
    return; // Nothing to display
  }
  let allDisplayedPages = displayedPages;

  navBtn.classList.remove('disabled');

  // Menu type
  let textOrNothing = true;
  if (!textOrNothing) {
    document.getElementById('pulse-inner').classList.add('navigation-always-visible');
  }

  let mapTextMenu = {};
  //allDisplayedPages.unshift('home');
  let ul = document.querySelector('#navbar > ul');
  for (let i = 0; i < allDisplayedPages.length; i++) {
    let pageName = allDisplayedPages[i].pageName;

    let title = allDisplayedPages[i].title;
    let subtitle = allDisplayedPages[i].subTitle;
    if (title == undefined || title == '') {
      title = pageName;
      if (subtitle == undefined) subtitle = '';
    }
    else {
      if (subtitle == undefined || subtitle == '') subtitle = pageName
    }

    let li = null;
    let selection = (pageName == currentPage);
    if (textOrNothing) {
      if (subtitle == '') {
        li = document.createElement('li');
        li.setAttribute('data', pageName);
        li.innerHTML = '<span class="menutext">' + title + '</span>';
      }
      else {
        if (title in mapTextMenu) {
          li = mapTextMenu[title];
          let ulChild = li.querySelector('ul');
          let newLi = document.createElement('li');
          if (selection) newLi.className = 'selected';
          newLi.setAttribute('data', pageName);
          newLi.textContent = subtitle;
          ulChild.appendChild(newLi);
        }
        else {
          li = document.createElement('li');
          li.className = 'expandable';
          let span = document.createElement('span');
          span.className = 'menutext';
          span.textContent = title;
          let ulChild = document.createElement('ul');
          let newLi = document.createElement('li');
          if (selection) newLi.className = 'selected';
          newLi.setAttribute('data', pageName);
          newLi.textContent = subtitle;
          ulChild.appendChild(newLi);
          li.appendChild(span);
          li.appendChild(ulChild);
          mapTextMenu[title] = li;
        }
      }
    }
    else {
      if (subtitle != '')
        title += ' (' + subtitle + ')';
      li = document.createElement('li');
      li.setAttribute('data', pageName);
      let icon = document.createElement('div');
      icon.className = 'menuicon';
      icon.style.backgroundImage = 'url(images/' + pageName + '-icon.svg)';
      let span = document.createElement('span');
      span.className = 'menutext';
      span.textContent = title;
      li.appendChild(icon);
      li.appendChild(span);
    }

    // Current selection
    if (selection) {
      li.classList.add('selected');
    }
    ul.appendChild(li);

  }
};

var setNavigationLinks = function () {
  // Open or hide sub menu
  let expandables = document.querySelectorAll('#navbar > ul > li.expandable > span');
  expandables.forEach(span => {
    span.addEventListener('click', function () {
      let parentLi = this.parentElement;
      let subUl = parentLi.querySelector('ul');
      let previousState = subUl.style.display === 'block';
      let allSubUls = document.querySelectorAll('#navbar > ul > li > ul');
      allSubUls.forEach(ul => ul.style.display = 'none');
      if (!previousState)
        subUl.style.display = 'block';
    });
  });

  let fullURL = window.location.pathname;
  let navbarLis = document.querySelectorAll('#navbar li');
  navbarLis.forEach(li => {
    // Highlight the right navigation link, depending on the url
    let dataAttr = li.getAttribute('data');
    if (fullURL.indexOf('/' + dataAttr + '.html') !== -1) {
      li.classList.add('selected');

      // Open and select the parent li if possible
      let grandParent = li.parentElement.parentElement;
      if (grandParent && grandParent.classList.contains('expandable')) {
        grandParent.classList.add('selected');
        let subUl = grandParent.querySelector('ul');
        if (subUl) subUl.style.display = 'block';
      }
    }

    // Function called on click on left menu
    li.addEventListener('click', function () {
      let attribute = this.getAttribute('data');
      if (attribute != null && attribute != '' && fullURL.indexOf('/' + attribute + '.html') == -1) {
        // Build the url with the role and the machines kept in memory
        let newfullURL = fullURL.substring(0, fullURL.lastIndexOf('/') + 1) + attribute + '.html';

        // Groups allowed for the page?

        window.location.href = newfullURL;
      }
    });
  });
}

/////////////////////////
// RIGHT PANEL = THEME //
/////////////////////////

var openParameterPanel = function (fast) {
  let configBtn = document.getElementById('configpanelbtn');
  if (configBtn.classList.contains('disabled'))
    return;
  let paramPanel = document.getElementById('pulse-panel-parameter');
  let pulseInner = document.getElementById('pulse-inner');
  if (fast)
    paramPanel.classList.add('notransition');
  else
    paramPanel.classList.remove('notransition');
  pulseInner.classList.remove('pulse-panel-parameter-collapsed');
  configBtn.classList.add('activated');
};

var closeParameterPanel = function (fast) {
  let paramPanel = document.getElementById('pulse-panel-parameter');
  let pulseInner = document.getElementById('pulse-inner');
  if (fast)
    paramPanel.classList.add('notransition');
  else
    paramPanel.classList.remove('notransition');
  pulseInner.classList.add('pulse-panel-parameter-collapsed');
  document.getElementById('configpanelbtn').classList.remove('activated');
};

var populateConfigPanel = function () {
  // Click to show / hide the parameter panel
  let configBtn = document.getElementById('configpanelbtn');
  configBtn.addEventListener('click', function (e) {
    let pulseInner = document.getElementById('pulse-inner');
    if (pulseInner.classList.contains('pulse-panel-parameter-collapsed')) {
      openParameterPanel();
      if (window.innerWidth <= 685)
        closeNavigationPanel(false);
    }
    else {
      closeParameterPanel(false);
    }
  });

  // Real populate
};

////////////////////
// THEME MANAGER  //
////////////////////

var themeManager = {

  load: function (name) {
    let oldTheme = pulseConfig.getString('theme', 'dark'); // first of ALL

    // Save the new value -- before ALL to happen even when an error occurs
    pulseConfig.setGlobal('theme', name);

    // Page name, for a style specific to the page
    let pageName = window.location.href.replace(/(.*\/)([^\\]*)(\.html.*)/, '$2');

    // version -> Not here !

    // Load the new theme
    let newLink = document.createElement('link');
    newLink.rel = 'stylesheet';
    newLink.type = 'text/css';
    newLink.href = './styles/style_' + name + '/' + pageName + '.css';
    document.head.appendChild(newLink);

    // Unload the previous theme
    if (oldTheme != name) {
      let oldLinks = document.querySelectorAll('link[rel=stylesheet][href*="./styles/style_' + oldTheme + '/' + pageName + '.css"]');
      oldLinks.forEach(link => link.remove());
    }
  },
  current: function () {
    return pulseConfig.getString('theme', 'dark');
  }
};

var initTheme = function () {
  let darkThemeBtn = document.getElementById('darkthemebtn');
  darkThemeBtn.checked = (themeManager.current() == 'dark');
  darkThemeBtn.addEventListener('click', function () {
    themeManager.load(themeManager.current() == 'light' ? 'dark' : 'light');
  });
}

///////////////////
// MAIN function //
///////////////////

if (document.readyState !== 'loading') {
  populateConfigPanel();
  populateNavigationPanel();
  setNavigationLinks();
  initTheme();
  closeParameterPanel(true);
  closeNavigationPanel(true);
} else {
  document.addEventListener('DOMContentLoaded', function () {
    populateConfigPanel();
    populateNavigationPanel();
    setNavigationLinks();
    initTheme();
    closeParameterPanel(true);
    closeNavigationPanel(true);
  });
}
