export class GraniteSpeechProcessor extends Processor {
    static tokenizer_class: typeof AutoTokenizer;
    static feature_extractor_class: typeof AutoFeatureExtractor;
    /**
     * Compute the number of audio tokens for a given raw audio length.
     * @param {number} audioLength Raw audio sample count.
     * @returns {number} Number of projector output tokens.
     */
    _get_num_audio_features(audioLength: number): number;
    /**
     * @param {string} text The text input to process.
     * @param {Float32Array} audio The audio input to process.
     */
    _call(text: string, audio?: Float32Array, kwargs?: {}): Promise<{
        input_features: any;
        input_features_mask: Tensor;
        /**
         * Token ids to be fed to the model.
         */
        input_ids: Tensor;
        /**
         * Mask indicating which tokens should be attended to (1) versus padded (0).
         */
        attention_mask: Tensor;
        /**
         * Segment ids, present only for tokenizers that distinguish sequence A vs B (e.g. BERT).
         */
        token_type_ids?: Tensor;
    }>;
}
import { Processor } from '../../processing_utils.js';
import { Tensor } from '../../utils/tensor.js';
import { AutoTokenizer } from '../auto/tokenization_auto.js';
import { AutoFeatureExtractor } from '../auto/feature_extraction_auto.js';
//# sourceMappingURL=processing_granite_speech.d.ts.map