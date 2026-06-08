// Copyright (C) 2009-2023 Lemoine Automation Technologies
// Copyright (C) 2023-2026 Atsora Solutions
//
// SPDX-License-Identifier: Apache-2.0

require('x-markdowntext/x-markdowntext');

var pulseConfig = require('pulseConfig');
pulseConfig.setGlobal('path', 'http://localhost:8082/');

var SAMPLE_1 = [
  '# Heading 1',
  '## Heading 2',
  '',
  'This text is **bold** and this is *italic*.',
  '',
  '- First item',
  '- Second item',
  '  - Nested item',
  '- Third item',
  '',
  '1. Numbered',
  '2. List'
].join('\n');

var SAMPLE_2 = [
  'Inline code: `let x = 42;`',
  '',
  '```js',
  'function hello (name) {',
  '  return "Hello, " + name + "!";',
  '}',
  '```',
  '',
  'Visit [Atsora](https://atsora.com) for more info.'
].join('\n');

var SAMPLE_3 = [
  '| Machine  | Status  | Motion |',
  '|----------|---------|--------|',
  '| Machine 1| Running | 75 %   |',
  '| Machine 2| Idle    | 0 %    |',
  '| Machine 3| Setup   | 12 %   |',
  '',
  '> "If you can\'t measure it, you can\'t improve it." — Peter Drucker',
  '',
  '---',
  '',
  'End of report.'
].join('\n');

if (document.readyState !== 'loading') {
  initMarkdownDemo();
} else {
  document.addEventListener('DOMContentLoaded', initMarkdownDemo);
}

function initMarkdownDemo() {
  // Populate the 3 static samples on page load.
  var s1 = document.querySelector('.md-sample-1');
  if (s1 && typeof s1.setText === 'function') s1.setText(SAMPLE_1);
  var s2 = document.querySelector('.md-sample-2');
  if (s2 && typeof s2.setText === 'function') s2.setText(SAMPLE_2);
  var s3 = document.querySelector('.md-sample-3');
  if (s3 && typeof s3.setText === 'function') s3.setText(SAMPLE_3);

  // Live editor — type + SHOW.
  var showBtn = document.querySelector('.showtextbutton');
  if (showBtn) {
    showBtn.addEventListener('click', function () {
      var inputEl = document.querySelector('.inputtext');
      var outputEl = document.querySelector('.outputtext');
      if (inputEl && outputEl && typeof outputEl.setText === 'function') {
        var message = inputEl.value;
        outputEl.setText(message);
      }
    });
  }
}
