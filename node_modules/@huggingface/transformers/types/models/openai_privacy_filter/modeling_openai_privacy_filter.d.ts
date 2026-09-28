export class OpenAIPrivacyFilterPreTrainedModel extends PreTrainedModel {
}
export class OpenAIPrivacyFilterModel extends OpenAIPrivacyFilterPreTrainedModel {
}
export class OpenAIPrivacyFilterForTokenClassification extends OpenAIPrivacyFilterPreTrainedModel {
    /**
     * Calls the model on new inputs.
     *
     * @param {Object} model_inputs The inputs to the model.
     * @returns {Promise<SequenceClassifierOutput>} An object containing the model's output logits for sequence classification.
     */
    _call(model_inputs: any): Promise<SequenceClassifierOutput>;
}
import { PreTrainedModel } from '../modeling_utils.js';
import { SequenceClassifierOutput } from '../modeling_outputs.js';
//# sourceMappingURL=modeling_openai_privacy_filter.d.ts.map