export class HrmTextPreTrainedModel extends PreTrainedModel {
}
export class HrmTextModel extends HrmTextPreTrainedModel {
}
export class HrmTextForCausalLM extends HrmTextPreTrainedModel {
    prepare_inputs_for_generation(input_ids: any, model_inputs: any, generation_config: any): any;
}
import { PreTrainedModel } from '../modeling_utils.js';
//# sourceMappingURL=modeling_hrm_text.d.ts.map