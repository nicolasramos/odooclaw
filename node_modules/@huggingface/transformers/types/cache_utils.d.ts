/**
 * Mutable cache of decoder past key/value tensors used by `generate()`.
 *
 * Pass a `DynamicCache` through generation options when you need to preserve
 * cache tensors across calls or inspect them from `return_dict_in_generate`.
 */
export type DynamicCache = Record<string, Tensor> & _DynamicCache;
/**
 * Mutable cache of decoder past key/value tensors used by `generate()`.
 *
 * Pass a `DynamicCache` through generation options when you need to preserve
 * cache tensors across calls or inspect them from `return_dict_in_generate`.
 *
 * @typedef {Record<string, Tensor> & _DynamicCache} DynamicCache
 */
export const DynamicCache: new (entries?: Record<string, Tensor>) => DynamicCache;
import { Tensor } from './utils/tensor.js';
/**
 * A cache class that stores past key values as named tensors.
 */
declare class _DynamicCache {
    /**
     * Create a DynamicCache, optionally pre-populated with entries.
     * @param {Record<string, Tensor>} [entries] Initial name→Tensor mappings.
     */
    constructor(entries?: Record<string, Tensor>);
    /**
     * Get the cached sequence length. This requires at least one attention cache entry to be present.
     * @returns {number} The past sequence length.
     */
    get_seq_length(): number;
    /**
     * Update the cache in-place with new entries, disposing replaced GPU tensors.
     * @param {Record<string, Tensor>} newEntries The new name → Tensor mappings.
     */
    update(newEntries: Record<string, Tensor>): void;
    /**
     * Dispose all contained tensors whose data resides on the GPU.
     * Returns a promise that resolves when all disposals are complete.
     * @returns {Promise<void>} Promise that resolves when all GPU tensors are disposed.
     */
    dispose(): Promise<void>;
}
export {};
//# sourceMappingURL=cache_utils.d.ts.map