// Aggregator for the modular data layer.
// Re-exports every entity module. Callers should prefer importing from
// specific entity modules; importing from this index (or from the
// legacy ../data.js shim) remains supported for backward compatibility.
export * from './markings.js';
export * from './words.js';
export * from './sentences.js';
export * from './stories.js';
export * from './similar.js';
export * from './relations.js';
export * from './self-study.js';
export * from './srs.js';
