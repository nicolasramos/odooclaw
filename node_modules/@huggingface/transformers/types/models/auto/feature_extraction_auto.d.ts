/**
 * Loads a feature extractor from a pretrained id. The concrete class is
 * selected from the `feature_extractor_type` in `preprocessor_config.json`.
 * Most commonly used for audio models.
 *
 * ```javascript
 * import { AutoFeatureExtractor, load_audio } from '@huggingface/transformers';
 *
 * const extractor = await AutoFeatureExtractor.from_pretrained('onnx-community/whisper-tiny.en');
 * const audio = await load_audio('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav', 16000);
 * const { input_features } = await extractor(audio);
 * ```
 */
export class AutoFeatureExtractor {
    static from_pretrained(pretrained_model_name_or_path: string, options?: import("../../utils/hub.js").PretrainedOptions): Promise<FeatureExtractor>;
}
import { FeatureExtractor } from '../../feature_extraction_utils.js';
//# sourceMappingURL=feature_extraction_auto.d.ts.map