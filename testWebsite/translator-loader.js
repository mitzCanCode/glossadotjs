window.translateCodeLoading = (async function() {
  const baseUrl = '../Translator/';
  const files = [
    'TranslationError.js',
    'ConditionManager.js',
    'LoopManager.js',
    'CodeManager.js',
  ];

  const moduleTexts = {};
  for (const file of files) {
    const res = await fetch(baseUrl + file);
    if (!res.ok) {
      throw new Error(`Failed to load translator file: ${file} (${res.status})`);
    }

    let text = await res.text();
    if (file === 'CodeManager.js') {
      const marker = 'module.exports = {';
      const start = text.indexOf(marker);
      if (start !== -1) {
        const end = text.indexOf('};', start);
        if (end !== -1) {
          text = text.slice(0, end + 2);
        }
      }
    }

    moduleTexts[file] = text;
  }

  const moduleCache = {};

  function normalizePath(path) {
    let normalized = path.replace(/^\.{1,2}\//, '');
    if (!normalized.endsWith('.js')) {
      normalized += '.js';
    }
    return normalized;
  }

  function fakeRequire(path) {
    const normalized = normalizePath(path);
    if (!(normalized in moduleCache)) {
      throw new Error(`Module not found: ${normalized}`);
    }
    return moduleCache[normalized];
  }

  function evaluateModule(fileName, source) {
    const module = { exports: {} };
    const exports = module.exports;
    const require = fakeRequire;

    const wrapped = `(function(require,module,exports){\n${source}\n})(require,module,exports);`;
    eval(wrapped);
    moduleCache[fileName] = module.exports;
  }

  evaluateModule('TranslationError.js', moduleTexts['TranslationError.js']);
  evaluateModule('ConditionManager.js', moduleTexts['ConditionManager.js']);
  evaluateModule('LoopManager.js', moduleTexts['LoopManager.js']);
  evaluateModule('CodeManager.js', moduleTexts['CodeManager.js']);

  const codeManagerPackage = moduleCache['CodeManager.js'];

  window.runtimeHelpers = {
    safeAssignment: codeManagerPackage.safeAssignment,
    createFixArray: codeManagerPackage.createFixArray,
    TranslationError: moduleCache['TranslationError.js']
  };

  if (!codeManagerPackage || !codeManagerPackage.CodeManager) {
    throw new Error('Loaded translator package is missing CodeManager export.');
  }

  window.translateCode = function(code) {
    const manager = new codeManagerPackage.CodeManager();
    return manager.translateCode(code);
  };
})();
