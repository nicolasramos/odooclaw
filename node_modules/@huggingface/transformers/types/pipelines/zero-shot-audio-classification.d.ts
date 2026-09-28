declare const ZeroShotAudioClassificationPipeline_base: new (options: TextAudioPipelineConstructorArgs) => ZeroShotAudioClassificationPipelineType;
/**
 * @typedef {import('./_base.js').TextAudioPipelineConstructorArgs} TextAudioPipelineConstructorArgs
 * @typedef {import('./_base.js').Disposable} Disposable
 * @typedef {import('./_base.js').AudioInput} AudioInput
 */
/**
 * @typedef {Object} ZeroShotAudioClassificationOutputSingle
 * @property {string} label The label identified by the model. It is one of the suggested `candidate_label`.
 * @property {number} score The score attributed by the model for that label (between 0 and 1).
 *
 * @typedef {ZeroShotAudioClassificationOutputSingle[]} ZeroShotAudioClassificationOutput
 *
 * @typedef {Object} ZeroShotAudioClassificationPipelineOptions Parameters specific to zero-shot audio classification pipelines.
 * @property {string} [hypothesis_template="This is a sound of {}."] The sentence used in conjunction with `candidate_labels`
 * to attempt the audio classification by replacing the placeholder with the candidate_labels.
 * Then likelihood is estimated by using `logits_per_audio`.
 *
 * @typedef {TextAudioPipelineConstructorArgs & ZeroShotAudioClassificationPipelineCallback & Disposable} ZeroShotAudioClassificationPipelineType
 */
/**
 * @template T
 * @typedef {T extends AudioInput[] ? ZeroShotAudioClassificationOutput[] : ZeroShotAudioClassificationOutput} ZeroShotAudioClassificationPipelineResult
 */
/**
 * @typedef {<T extends AudioInput | AudioInput[]>(audio: T, candidate_labels: string[], options?: ZeroShotAudioClassificationPipelineOptions) => Promise<ZeroShotAudioClassificationPipelineResult<T>>} ZeroShotAudioClassificationPipelineCallback
 */
/**
 * Zero-shot audio classification pipeline using `ClapModel`. This pipeline predicts the class of an audio clip from
 * audio and a set of `candidate_labels`.
 *
 * **Example:** Perform zero-shot audio classification with `Xenova/clap-htsat-unfused`.
 * ```javascript
 * import { pipeline } from '@huggingface/transformers';
 *
 * const classifier = await pipeline('zero-shot-audio-classification', 'Xenova/clap-htsat-unfused');
 * const audio = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/dog_barking.wav';
 * const candidate_labels = ['dog', 'vacuum cleaner'];
 * const scores = await classifier(audio, candidate_labels);
 * // [
 * //   { score: 0.9993992447853088, label: 'dog' },
 * //   { score: 0.0006007603369653225, label: 'vacuum cleaner' }
 * // ]
 * ```
 */
export class ZeroShotAudioClassificationPipeline extends ZeroShotAudioClassificationPipeline_base {
    _call(audio: any, candidate_labels: any, { hypothesis_template }?: {
        hypothesis_template?: string;
    }): Promise<{
        score: any;
        label: any;
    }[] | {
        score: any;
        label: any;
    }[][]>;
}
export type TextAudioPipelineConstructorArgs = import("./_base.js").TextAudioPipelineConstructorArgs;
export type Disposable = import("./_base.js").Disposable;
export type AudioInput = import("./_base.js").AudioInput;
export type ZeroShotAudioClassificationOutputSingle = {
    /**
     * The label identified by the model. It is one of the suggested `candidate_label`.
     */
    label: string;
    /**
     * The score attributed by the model for that label (between 0 and 1).
     */
    score: number;
};
export type ZeroShotAudioClassificationOutput = ZeroShotAudioClassificationOutputSingle[];
/**
 * Parameters specific to zero-shot audio classification pipelines.
 */
export type ZeroShotAudioClassificationPipelineOptions = {
    /**
     * The sentence used in conjunction with `candidate_labels`
     * to attempt the audio classification by replacing the placeholder with the candidate_labels.
     * Then likelihood is estimated by using `logits_per_audio`.
     */
    hypothesis_template?: string;
};
export type ZeroShotAudioClassificationPipelineType = TextAudioPipelineConstructorArgs & ZeroShotAudioClassificationPipelineCallback & Disposable;
export type ZeroShotAudioClassificationPipelineResult<T> = T extends AudioInput[] ? ZeroShotAudioClassificationOutput[] : ZeroShotAudioClassificationOutput;
export type ZeroShotAudioClassificationPipelineCallback = <T extends AudioInput | AudioInput[]>(audio: T, candidate_labels: string[], options?: ZeroShotAudioClassificationPipelineOptions) => Promise<ZeroShotAudioClassificationPipelineResult<T>>;
export {};
//# sourceMappingURL=zero-shot-audio-classification.d.ts.map