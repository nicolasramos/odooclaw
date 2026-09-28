/**
 * @typedef {import('../../processing_utils.js').PretrainedProcessorOptions} PretrainedProcessorOptions
 */
/**
 * Loads a processor from a pretrained id. Unlike `AutoImageProcessor` and
 * `AutoFeatureExtractor`, `AutoProcessor` returns a multi-modal {@link Processor}
 * that bundles together a tokenizer, image processor, and/or feature extractor
 * — use it when a single model needs more than one.
 *
 * **Example:** Load a Whisper processor (tokenizer + audio feature extractor).
 * ```javascript
 * import { AutoProcessor } from '@huggingface/transformers';
 * const processor = await AutoProcessor.from_pretrained('onnx-community/whisper-tiny.en');
 * ```
 *
 * **Example:** Run an image through a CLIP processor.
 * ```javascript
 * import { AutoProcessor, load_image } from '@huggingface/transformers';
 *
 * const processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch16');
 * const image = await load_image('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/football-match.jpg');
 * const { pixel_values } = await processor(image);
 * ```
 */
export class AutoProcessor {
    static from_pretrained(pretrained_model_name_or_path: string, options?: import("../../processing_utils.js").PretrainedProcessorOptions): Promise<Processor>;
}
export type PretrainedProcessorOptions = import("../../processing_utils.js").PretrainedProcessorOptions;
import { Processor } from '../../processing_utils.js';
//# sourceMappingURL=processing_auto.d.ts.map