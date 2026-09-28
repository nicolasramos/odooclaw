/**
 * Represents a VoxtralProcessor that extracts features from an audio input.
 */
export class VoxtralProcessor extends Processor {
    static tokenizer_class: typeof AutoTokenizer;
    static feature_extractor_class: typeof AutoFeatureExtractor;
    /**
     * @param {string} text The text input to process.
     * @param {Float32Array|Float32Array[]} audio The audio input(s) to process.
     */
    _call(text: string, audio?: Float32Array | Float32Array[], kwargs?: {}): Promise<{
        audio_values: any;
        /**
         * Token ids to be fed to the model.
         */
        input_ids: import("../../transformers.js").Tensor;
        /**
         * Mask indicating which tokens should be attended to (1) versus padded (0).
         */
        attention_mask: import("../../transformers.js").Tensor;
        /**
         * Segment ids, present only for tokenizers that distinguish sequence A vs B (e.g. BERT).
         */
        token_type_ids?: import("../../transformers.js").Tensor;
    }>;
}
import { Processor } from '../../processing_utils.js';
import { AutoTokenizer } from '../auto/tokenization_auto.js';
import { AutoFeatureExtractor } from '../auto/feature_extraction_auto.js';
//# sourceMappingURL=processing_voxtral.d.ts.map