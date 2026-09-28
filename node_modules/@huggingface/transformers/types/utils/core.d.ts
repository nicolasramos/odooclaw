/**
 * @typedef {Object} InitiateProgressInfo
 * @property {'initiate'} status A file load is about to start.
 * @property {string} name The model ID or directory path.
 * @property {string} file The name of the file.
 */
/**
 * @typedef {Object} DownloadProgressInfo
 * @property {'download'} status A file download has started.
 * @property {string} name The model ID or directory path.
 * @property {string} file The name of the file.
 */
/**
 * @typedef {Object} ProgressStatusInfo
 * @property {'progress'} status A file download has reported byte progress.
 * @property {string} name The model ID or directory path.
 * @property {string} file The name of the file.
 * @property {number} progress A number between 0 and 100.
 * @property {number} loaded The number of bytes loaded.
 * @property {number} total The total number of bytes to be loaded.
 */
/**
 * @typedef {Object} FileLoadingProgress
 * @property {number} loaded The number of bytes loaded for this file.
 * @property {number} total The total number of bytes for this file.
 */
/**
 * @typedef {Record<string, FileLoadingProgress>} FilesLoadingMap
 * A mapping of file names to their loading progress. Each key is a file path and each value contains
 * the loaded and total bytes for that file.
 */
/**
 * @typedef {Object} TotalProgressInfo
 * @property {'progress_total'} status Aggregate progress across all files being loaded.
 * @property {string} name The model ID or directory path.
 * @property {number} progress A number between 0 and 100.
 * @property {number} loaded The number of bytes loaded.
 * @property {number} total The total number of bytes to be loaded.
 * @property {FilesLoadingMap} files A mapping of file names to their loading progress.
 */
/**
 * @typedef {Object} DoneProgressInfo
 * @property {'done'} status A file has finished loading.
 * @property {string} name The model ID or directory path.
 * @property {string} file The name of the file.
 */
/**
 * @typedef {Object} ReadyProgressInfo
 * @property {'ready'} status The requested pipeline is ready to use.
 * @property {string} task The loaded task.
 * @property {string} model The loaded model.
 */
/**
 * @typedef {InitiateProgressInfo | DownloadProgressInfo | ProgressStatusInfo | DoneProgressInfo | ReadyProgressInfo | TotalProgressInfo} ProgressInfo
 */
/**
 * A callback function that is called with progress information.
 * @callback ProgressCallback
 * @param {ProgressInfo} progressInfo
 * @returns {void}
 */
/**
 * Helper function to dispatch progress callbacks.
 *
 * @param {ProgressCallback | null | undefined} progress_callback The progress callback function to dispatch.
 * @param {ProgressInfo} data The data to pass to the progress callback function.
 * @returns {void}
 * @private
 */
export function dispatchCallback(progress_callback: ProgressCallback | null | undefined, data: ProgressInfo): void;
/**
 * Check if a value is an integer.
 * @param {*} x The value to check.
 * @returns {boolean} True if the value is a string, false otherwise.
 */
export function isIntegralNumber(x: any): boolean;
/**
 * Determine if a provided width or height is nullish.
 * @param {*} x The value to check.
 * @returns {boolean} True if the value is `null`, `undefined` or `-1`, false otherwise.
 */
export function isNullishDimension(x: any): boolean;
/**
 * Calculates the dimensions of a nested array.
 *
 * @param {any[]} arr The nested array to calculate dimensions for.
 * @returns {number[]} An array containing the dimensions of the input array.
 */
export function calculateDimensions(arr: any[]): number[];
/**
 * Efficiently merge arrays, creating a new copy.
 * Adapted from https://stackoverflow.com/a/6768642/13989043
 * @param  {any[]} arrs Arrays to merge.
 * @returns {any[]} The merged array.
 */
export function mergeArrays(...arrs: any[]): any[];
/**
 * Compute the Cartesian product of given arrays
 * @param {...any[]} a Arrays to compute the product
 * @returns {any[]} Returns the computed Cartesian product as an array
 * @private
 */
export function product(...a: any[][]): any[];
/**
 * Calculates the index offset for a given index and window size.
 * @param {number} i The index.
 * @param {number} w The window size.
 * @returns {number} The index offset.
 */
export function calculateReflectOffset(i: number, w: number): number;
/**
 *
 * @param {Object} o
 * @param {string[]} props
 * @returns {Object}
 */
export function pick(o: any, props: string[]): any;
/**
 * Count the occurrences of a value in an array or string.
 * This mimics the behavior of Python's `count` method.
 * @param {any[]|string} arr The array or string to search.
 * @param {any} value The value to count.
 */
export function count(arr: any[] | string, value: any): number;
declare const DefaultProgressCallback_base: new () => {
    (...args: any[]): any;
    _call(...args: any[]): any;
};
/**
 * A callable progress callback that wraps an original callback and emits
 * aggregate `progress_total` events. Because it extends `Callable`, instances
 * can be passed directly wherever a plain callback function is expected.
 *
 * Callers can check `callback instanceof DefaultProgressCallback` to avoid
 * double-wrapping when both `pipeline()` and `from_pretrained()` would
 * otherwise each add their own wrapper.
 */
export class DefaultProgressCallback extends DefaultProgressCallback_base {
    /**
     * @param {ProgressCallback} callback The original callback.
     * @param {FilesLoadingMap} files_loading Mutable map storing per-file progress.
     */
    constructor(callback: ProgressCallback, files_loading: FilesLoadingMap);
    callback: ProgressCallback;
    files_loading: Record<string, FileLoadingProgress>;
    /** @type {Map<string, Promise<string|Uint8Array|null>>} Pending and completed file loads, used to deduplicate work within a single pipeline() call. */
    loads: Map<string, Promise<string | Uint8Array | null>>;
    /**
     * @param {ProgressInfo} info
     */
    _call(info: ProgressInfo): void;
}
export type InitiateProgressInfo = {
    /**
     * A file load is about to start.
     */
    status: "initiate";
    /**
     * The model ID or directory path.
     */
    name: string;
    /**
     * The name of the file.
     */
    file: string;
};
export type DownloadProgressInfo = {
    /**
     * A file download has started.
     */
    status: "download";
    /**
     * The model ID or directory path.
     */
    name: string;
    /**
     * The name of the file.
     */
    file: string;
};
export type ProgressStatusInfo = {
    /**
     * A file download has reported byte progress.
     */
    status: "progress";
    /**
     * The model ID or directory path.
     */
    name: string;
    /**
     * The name of the file.
     */
    file: string;
    /**
     * A number between 0 and 100.
     */
    progress: number;
    /**
     * The number of bytes loaded.
     */
    loaded: number;
    /**
     * The total number of bytes to be loaded.
     */
    total: number;
};
export type FileLoadingProgress = {
    /**
     * The number of bytes loaded for this file.
     */
    loaded: number;
    /**
     * The total number of bytes for this file.
     */
    total: number;
};
/**
 * A mapping of file names to their loading progress. Each key is a file path and each value contains
 * the loaded and total bytes for that file.
 */
export type FilesLoadingMap = Record<string, FileLoadingProgress>;
export type TotalProgressInfo = {
    /**
     * Aggregate progress across all files being loaded.
     */
    status: "progress_total";
    /**
     * The model ID or directory path.
     */
    name: string;
    /**
     * A number between 0 and 100.
     */
    progress: number;
    /**
     * The number of bytes loaded.
     */
    loaded: number;
    /**
     * The total number of bytes to be loaded.
     */
    total: number;
    /**
     * A mapping of file names to their loading progress.
     */
    files: FilesLoadingMap;
};
export type DoneProgressInfo = {
    /**
     * A file has finished loading.
     */
    status: "done";
    /**
     * The model ID or directory path.
     */
    name: string;
    /**
     * The name of the file.
     */
    file: string;
};
export type ReadyProgressInfo = {
    /**
     * The requested pipeline is ready to use.
     */
    status: "ready";
    /**
     * The loaded task.
     */
    task: string;
    /**
     * The loaded model.
     */
    model: string;
};
export type ProgressInfo = InitiateProgressInfo | DownloadProgressInfo | ProgressStatusInfo | DoneProgressInfo | ReadyProgressInfo | TotalProgressInfo;
/**
 * A callback function that is called with progress information.
 */
export type ProgressCallback = (progressInfo: ProgressInfo) => void;
export {};
//# sourceMappingURL=core.d.ts.map