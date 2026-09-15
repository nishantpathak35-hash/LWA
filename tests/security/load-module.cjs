const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute application modules with explicit infrastructure substitutes. Never load
// environment files or open a connection to the configured business database.
module.exports = function loadModule(filename, mocks = {}, cache = new Map()) {
  const absolute = path.resolve(filename);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} };
  cache.set(absolute, module);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (!specifier.startsWith('.')) return require(specifier);
    const base = path.resolve(path.dirname(absolute), specifier);
    const resolved = [base, base + '.js', base + '.ts'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!resolved || /[/\\](db|email)\.js$/.test(resolved)) throw new Error('Test requires an explicit infrastructure substitute: ' + specifier);
    return loadModule(resolved, mocks, cache);
  };
  new vm.Script('(function(require,module,exports){' + code + '\n})', { filename: absolute })
    .runInThisContext()(localRequire, module, module.exports);
  return module.exports;
};
