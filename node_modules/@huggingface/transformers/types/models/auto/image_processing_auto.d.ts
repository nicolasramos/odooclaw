/**
 * Loads an image processor from a pretrained id. The concrete class is
 * selected from the `image_processor_type` in `preprocessor_config.json`.
 *
 * ```javascript
 * import { AutoImageProcessor, load_image } from '@huggingface/transformers';
 *
 * const processor = await AutoImageProcessor.from_pretrained('Xenova/clip-vit-base-patch16');
 * const image = await load_image('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/artemis.jpeg');
 * const { pixel_values } = await processor(image);
 * ```
 */
export class AutoImageProcessor {
    static from_pretrained(pretrained_model_name_or_path: string, options?: import("../../utils/hub.js").PretrainedOptions): Promise<ImageProcessor>;
}
import { ImageProcessor } from '../../image_processors_utils.js';
//# sourceMappingURL=image_processing_auto.d.ts.map