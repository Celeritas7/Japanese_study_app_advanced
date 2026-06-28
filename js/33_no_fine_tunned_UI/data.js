// Backward-compatibility shim. Re-exports the modular data layer.
// The data layer now lives under ./data/. This shim exists so existing
// imports like `import { loadWords } from './data.js'` keep working.
// Will be removed after callers migrate to specific entity imports.
export * from './data/index.js';
