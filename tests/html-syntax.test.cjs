const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const HTML_FILES = [
  'src/ConfigUI.html',
  'ConfigUI.html',
  'src/ChartBuilderUI.html',
  'ChartBuilderUI.html'
];

HTML_FILES.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    test(`HTML script syntax validation: ${filePath}`, () => {
      const content = fs.readFileSync(filePath, 'utf8');
      const scriptMatches = content.match(/<script[\s\S]*?<\/script>/gi) || [];
      assert.ok(scriptMatches.length > 0, `File ${filePath} should have at least one script tag`);

      scriptMatches.forEach((tag, idx) => {
        const code = tag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
        assert.doesNotThrow(() => {
          new vm.Script(code);
        }, `Script #${idx} in ${filePath} has syntax error`);
      });
    });
  }
});
