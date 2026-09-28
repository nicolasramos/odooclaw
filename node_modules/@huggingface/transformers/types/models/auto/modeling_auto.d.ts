/**
 * Helper class which is used to instantiate pretrained models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModel } from '@huggingface/transformers';
 *
 * const model = await AutoModel.from_pretrained('Xenova/bert-base-uncased');
 * ```
 */
export class AutoModel extends PretrainedMixin {
}
/**
 * Helper class which is used to instantiate pretrained sequence classification models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForSequenceClassification } from '@huggingface/transformers';
 *
 * const model = await AutoModelForSequenceClassification.from_pretrained('Xenova/distilbert-base-uncased-finetuned-sst-2-english');
 * ```
 */
export class AutoModelForSequenceClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained token classification models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForTokenClassification } from '@huggingface/transformers';
 *
 * const model = await AutoModelForTokenClassification.from_pretrained('Xenova/distilbert-base-multilingual-cased-ner-hrl');
 * ```
 */
export class AutoModelForTokenClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained sequence-to-sequence models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForSeq2SeqLM } from '@huggingface/transformers';
 *
 * const model = await AutoModelForSeq2SeqLM.from_pretrained('Xenova/t5-small');
 * ```
 */
export class AutoModelForSeq2SeqLM extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained sequence-to-sequence speech-to-text models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForSpeechSeq2Seq } from '@huggingface/transformers';
 *
 * const model = await AutoModelForSpeechSeq2Seq.from_pretrained('onnx-community/whisper-tiny.en');
 * ```
 */
export class AutoModelForSpeechSeq2Seq extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained sequence-to-sequence text-to-spectrogram models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForTextToSpectrogram } from '@huggingface/transformers';
 *
 * const model = await AutoModelForTextToSpectrogram.from_pretrained('Xenova/speecht5_tts');
 * ```
 */
export class AutoModelForTextToSpectrogram extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained text-to-waveform models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForTextToWaveform } from '@huggingface/transformers';
 *
 * const model = await AutoModelForTextToWaveform.from_pretrained('Xenova/mms-tts-eng');
 * ```
 */
export class AutoModelForTextToWaveform extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained causal language models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForCausalLM } from '@huggingface/transformers';
 *
 * const model = await AutoModelForCausalLM.from_pretrained('Xenova/gpt2');
 * ```
 */
export class AutoModelForCausalLM extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained masked language models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForMaskedLM } from '@huggingface/transformers';
 *
 * const model = await AutoModelForMaskedLM.from_pretrained('Xenova/bert-base-uncased');
 * ```
 */
export class AutoModelForMaskedLM extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained question answering models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForQuestionAnswering } from '@huggingface/transformers';
 *
 * const model = await AutoModelForQuestionAnswering.from_pretrained('Xenova/distilbert-base-cased-distilled-squad');
 * ```
 */
export class AutoModelForQuestionAnswering extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained vision-to-sequence models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForVision2Seq } from '@huggingface/transformers';
 *
 * const model = await AutoModelForVision2Seq.from_pretrained('Xenova/vit-gpt2-image-captioning');
 * ```
 */
export class AutoModelForVision2Seq extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained image classification models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForImageClassification } from '@huggingface/transformers';
 *
 * const model = await AutoModelForImageClassification.from_pretrained('Xenova/vit-base-patch16-224');
 * ```
 */
export class AutoModelForImageClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained image segmentation models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForImageSegmentation } from '@huggingface/transformers';
 *
 * const model = await AutoModelForImageSegmentation.from_pretrained('Xenova/detr-resnet-50-panoptic');
 * ```
 */
export class AutoModelForImageSegmentation extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained image segmentation models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForSemanticSegmentation } from '@huggingface/transformers';
 *
 * const model = await AutoModelForSemanticSegmentation.from_pretrained('Xenova/segformer-b0-finetuned-ade-512-512');
 * ```
 */
export class AutoModelForSemanticSegmentation extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained universal image segmentation models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForUniversalSegmentation } from '@huggingface/transformers';
 *
 * const model = await AutoModelForUniversalSegmentation.from_pretrained('Xenova/detr-resnet-50-panoptic');
 * ```
 */
export class AutoModelForUniversalSegmentation extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained object detection models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForObjectDetection } from '@huggingface/transformers';
 *
 * const model = await AutoModelForObjectDetection.from_pretrained('Xenova/detr-resnet-50');
 * ```
 */
export class AutoModelForObjectDetection extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained zero-shot object detection models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForZeroShotObjectDetection } from '@huggingface/transformers';
 *
 * const model = await AutoModelForZeroShotObjectDetection.from_pretrained('Xenova/owlvit-base-patch32');
 * ```
 */
export class AutoModelForZeroShotObjectDetection extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained mask generation models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForMaskGeneration } from '@huggingface/transformers';
 *
 * const model = await AutoModelForMaskGeneration.from_pretrained('Xenova/slimsam-77-uniform');
 * ```
 */
export class AutoModelForMaskGeneration extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained connectionist temporal classification (CTC) models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForCTC } from '@huggingface/transformers';
 *
 * const model = await AutoModelForCTC.from_pretrained('Xenova/wav2vec2-base-960h');
 * ```
 */
export class AutoModelForCTC extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained audio classification models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForAudioClassification } from '@huggingface/transformers';
 *
 * const model = await AutoModelForAudioClassification.from_pretrained('Xenova/wav2vec2-base-superb-ks');
 * ```
 */
export class AutoModelForAudioClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained speaker embedding models (X-Vector) with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForXVector } from '@huggingface/transformers';
 *
 * const model = await AutoModelForXVector.from_pretrained('Xenova/wavlm-base-plus-sv');
 * ```
 */
export class AutoModelForXVector extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained audio frame (token) classification models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForAudioFrameClassification } from '@huggingface/transformers';
 *
 * const model = await AutoModelForAudioFrameClassification.from_pretrained('onnx-community/pyannote-segmentation-3.0');
 * ```
 */
export class AutoModelForAudioFrameClassification extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained document question answering models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForDocumentQuestionAnswering } from '@huggingface/transformers';
 *
 * const model = await AutoModelForDocumentQuestionAnswering.from_pretrained('Xenova/donut-base-finetuned-docvqa');
 * ```
 */
export class AutoModelForDocumentQuestionAnswering extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained image matting models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForImageMatting } from '@huggingface/transformers';
 *
 * const model = await AutoModelForImageMatting.from_pretrained('Xenova/vitmatte-small-composition-1k');
 * ```
 */
export class AutoModelForImageMatting extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained image-to-image models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForImageToImage } from '@huggingface/transformers';
 *
 * const model = await AutoModelForImageToImage.from_pretrained('Xenova/swin2SR-classical-sr-x2-64');
 * ```
 */
export class AutoModelForImageToImage extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained depth estimation models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForDepthEstimation } from '@huggingface/transformers';
 *
 * const model = await AutoModelForDepthEstimation.from_pretrained('onnx-community/depth-anything-v2-small-ONNX');
 * ```
 */
export class AutoModelForDepthEstimation extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained surface-normal estimation models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForNormalEstimation } from '@huggingface/transformers';
 *
 * const model = await AutoModelForNormalEstimation.from_pretrained('onnx-community/sapiens-normal-0.3b');
 * ```
 */
export class AutoModelForNormalEstimation extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained pose estimation models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForPoseEstimation } from '@huggingface/transformers';
 *
 * const model = await AutoModelForPoseEstimation.from_pretrained('onnx-community/vitpose-base-simple');
 * ```
 */
export class AutoModelForPoseEstimation extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained image feature extraction models with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForImageFeatureExtraction } from '@huggingface/transformers';
 *
 * const model = await AutoModelForImageFeatureExtraction.from_pretrained('onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX');
 * ```
 */
export class AutoModelForImageFeatureExtraction extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained vision-language models that map images and text to text
 * (image+text-to-text) with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForImageTextToText } from '@huggingface/transformers';
 *
 * const model = await AutoModelForImageTextToText.from_pretrained('onnx-community/LFM2.5-VL-450M-ONNX');
 * ```
 */
export class AutoModelForImageTextToText extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Helper class which is used to instantiate pretrained audio-language models that map audio and text to text
 * (audio+text-to-text) with the `from_pretrained` function.
 *
 * **Example:**
 * ```javascript
 * import { AutoModelForAudioTextToText } from '@huggingface/transformers';
 *
 * const model = await AutoModelForAudioTextToText.from_pretrained('onnx-community/Voxtral-Mini-4B-Realtime-2602-ONNX');
 * ```
 */
export class AutoModelForAudioTextToText extends PretrainedMixin {
    static MODEL_CLASS_MAPPINGS: Map<string, string>[];
}
/**
 * Base class of all AutoModels. Contains the `from_pretrained` function
 * which is used to instantiate pretrained models.
 */
declare class PretrainedMixin {
    /**
     * Mapping from model type to model class.
     * @type {Map<string, Object>[]}
     */
    static MODEL_CLASS_MAPPINGS: Map<string, any>[];
    /**
     * Whether to attempt to instantiate the base class (`PretrainedModel`) if
     * the model type is not found in the mapping.
     */
    static BASE_IF_FAIL: boolean;
    /**
     * Check whether this AutoModel class supports a given model type.
     * @param {string} model_type The model type from config (e.g., 'bert', 'whisper').
     * @returns {boolean} Whether this class can handle the given model type.
     */
    static supports(model_type: string): boolean;
    static from_pretrained(pretrained_model_name_or_path: string, { progress_callback, config, cache_dir, local_files_only, revision, model_file_name, subfolder, device, dtype, use_external_data_format, session_options, }?: import("../../utils/hub.js").PretrainedModelOptions): Promise<PreTrainedModel>;
}
import { PreTrainedModel } from '../modeling_utils.js';
export {};
//# sourceMappingURL=modeling_auto.d.ts.map