declare const TextToAudioPipeline_base: new (options: TextToAudioPipelineConstructorArgs) => TextToAudioPipelineType;
/**
 * @typedef {import('./_base.js').TextAudioPipelineConstructorArgs} TextAudioPipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 */
/**
 * @typedef {Object} VocoderOptions
 * @property {import('../models/modeling_utils.js').PreTrainedModel} [vocoder] The vocoder used by the pipeline (if the model uses one). If not provided, use the default HifiGan vocoder.
 * @typedef {TextAudioPipelineConstructorArgs & VocoderOptions} TextToAudioPipelineConstructorArgs
 */
/**
 * @typedef {RawAudio[]} TextToAudioOutput
 *
 * @typedef {Object} TextToAudioPipelineOptions Parameters specific to text-to-audio pipelines.
 * @property {Tensor|Float32Array|string|URL} [speaker_embeddings=null] The speaker embeddings (if the model requires it).
 * @property {number} [num_inference_steps] The number of denoising steps (if the model supports it).
 * More denoising steps usually lead to higher quality audio but slower inference.
 * @property {number} [speed] The speed of the generated audio (if the model supports it).
 *
 * @typedef {TextToAudioPipelineConstructorArgs & TextToAudioPipelineCallback & Disposable} TextToAudioPipelineType
 */
/**
 * @template T
 * @typedef {T extends string[] ? TextToAudioOutput : RawAudio} TextToAudioPipelineResult
 */
/**
 * @typedef {<T extends string | string[]>(text: T, options?: TextToAudioPipelineOptions) => Promise<TextToAudioPipelineResult<T>>} TextToAudioPipelineCallback
 */
/**
 * Text-to-audio generation pipeline using any `AutoModelForTextToWaveform` or `AutoModelForTextToSpectrogram`.
 * This pipeline generates an audio file from an input text and optional other conditional inputs.
 *
 * **Example:** Generate audio from text with `onnx-community/Supertonic-TTS-ONNX`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const synthesizer = await pipeline('text-to-speech', 'onnx-community/Supertonic-TTS-ONNX');
 * const speaker_embeddings = 'https://huggingface.co/onnx-community/Supertonic-TTS-ONNX/resolve/main/voices/F1.bin';
 * const output = await synthesizer('Hello there, how are you doing?', { speaker_embeddings });
 * // RawAudio {
 * //   audio: Float32Array(95232) [-0.000482565927086398, -0.0004853440332226455, ...],
 * //   sampling_rate: 44100
 * // }
 *
 * // Optional: Save the audio to a .wav file or Blob
 * await output.save('output.wav'); // You can also use `output.toBlob()` to access the audio as a Blob
 * ```
 *
 * **Example:** Multilingual speech generation with `Xenova/mms-tts-fra`. See the [MMS-TTS model list](https://huggingface.co/models?pipeline_tag=text-to-speech&other=vits&sort=trending) for available languages.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const synthesizer = await pipeline('text-to-speech', 'Xenova/mms-tts-fra');
 * const output = await synthesizer('Bonjour');
 * // RawAudio {
 * //   audio: Float32Array(23808) [-0.00037693005288019776, 0.0003325853613205254, ...],
 * //   sampling_rate: 16000
 * // }
 * ```
 */
export class TextToAudioPipeline extends TextToAudioPipeline_base {
    DEFAULT_VOCODER_ID: string;
    vocoder: import("../transformers.js").PreTrainedModel;
    _prepare_speaker_embeddings(speaker_embeddings: any, batch_size: any): Promise<any>;
    /**
     * Helper to convert batched waveform tensor to RawAudio output(s).
     * @param {string|string[]} text_inputs Original text input(s) to determine return type.
     * @param {Tensor} waveform The waveform tensor of shape [batch_size, waveform_length].
     * @param {number} sampling_rate The audio sampling rate.
     * @param {Tensor} [durations] Optional durations tensor for trimming (used by Supertonic).
     * @returns {RawAudio|RawAudio[]} Single RawAudio or array based on input type.
     * @private
     */
    private _postprocess_waveform;
    _call(text_inputs: any, options: any): Promise<RawAudio | RawAudio[]>;
    _call_supertonic(text_inputs: any, { speaker_embeddings, num_inference_steps, speed }: {
        speaker_embeddings: any;
        num_inference_steps: any;
        speed: any;
    }): Promise<RawAudio | RawAudio[]>;
    _call_text_to_waveform(text_inputs: any): Promise<RawAudio | RawAudio[]>;
    _call_text_to_spectrogram(text_inputs: any, { speaker_embeddings }: {
        speaker_embeddings: any;
    }): Promise<RawAudio | RawAudio[]>;
}
export type TextAudioPipelineConstructorArgs = import("./_base.js").TextAudioPipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type VocoderOptions = {
    /**
     * The vocoder used by the pipeline (if the model uses one). If not provided, use the default HifiGan vocoder.
     */
    vocoder?: import("../models/modeling_utils.js").PreTrainedModel;
};
export type TextToAudioPipelineConstructorArgs = TextAudioPipelineConstructorArgs & VocoderOptions;
export type TextToAudioOutput = RawAudio[];
/**
 * Parameters specific to text-to-audio pipelines.
 */
export type TextToAudioPipelineOptions = {
    /**
     * The speaker embeddings (if the model requires it).
     */
    speaker_embeddings?: Tensor | Float32Array | string | URL;
    /**
     * The number of denoising steps (if the model supports it).
     * More denoising steps usually lead to higher quality audio but slower inference.
     */
    num_inference_steps?: number;
    /**
     * The speed of the generated audio (if the model supports it).
     */
    speed?: number;
};
export type TextToAudioPipelineType = TextToAudioPipelineConstructorArgs & TextToAudioPipelineCallback & Disposable;
export type TextToAudioPipelineResult<T> = T extends string[] ? TextToAudioOutput : RawAudio;
export type TextToAudioPipelineCallback = <T extends string | string[]>(text: T, options?: TextToAudioPipelineOptions) => Promise<TextToAudioPipelineResult<T>>;
import { RawAudio } from '../utils/audio.js';
import { Tensor } from '../utils/tensor.js';
export {};
//# sourceMappingURL=text-to-audio.d.ts.map