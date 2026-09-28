export type GenerationFunctionParametersBase = {
    /**
     * (`Tensor` of varying shape depending on the modality, *optional*):
     * The sequence used as a prompt for generation or as model inputs to the encoder. If `null`, the
     * method initializes it with `bos_token_id` and a batch size of 1. For decoder-only models `inputs`
     * should be in the format of `input_ids`. For encoder-decoder models *inputs* can represent any of
     * `input_ids`, `input_values`, `input_features`, or `pixel_values`.
     */
    inputs?: import("../utils/tensor.js").Tensor;
    /**
     * (`GenerationConfig`, *optional*):
     * The generation configuration to use as the base parameters for the generation call.
     * `**kwargs` passed to generate that match attributes of `generation_config` will override them.
     * If `generation_config` is not provided, the default is used, with the following loading
     * priority:
     * - (1) from the `generation_config.json` model file, if it exists;
     * - (2) from the model configuration. Unspecified parameters inherit the default values documented by `GenerationConfig`.
     */
    generation_config?: import("./configuration_utils.js").GenerationConfig;
    /**
     * (`LogitsProcessorList`, *optional*):
     * Custom logits processors that complement the default logits processors built from arguments and
     * the generation config. If a logits processor duplicates one already created from the arguments or
     * generation config, an error is thrown. This feature is intended for advanced users.
     */
    logits_processor?: import("./logits_process.js").LogitsProcessorList;
    /**
     * (`StoppingCriteriaList`, *optional*):
     * Custom stopping criteria that complement the default stopping criteria built from arguments and the
     * generation config. If a stopping criterion duplicates one already created from the arguments or
     * generation config, an error is thrown. This feature is intended for advanced users.
     */
    stopping_criteria?: import("./stopping_criteria.js").StoppingCriteria | import("./stopping_criteria.js").StoppingCriteria[] | import("./stopping_criteria.js").StoppingCriteriaList;
    /**
     * (`BaseStreamer`, *optional*):
     * Streamer object used to stream the generated sequences. Generated tokens are passed
     * through `streamer.put(token_ids)` and the streamer is responsible for any further processing.
     */
    streamer?: import("./streamers.js").BaseStreamer;
    /**
     * (`number[]` or `Tensor`, *optional*):
     * If the model is an encoder-decoder model, this argument is used to pass the `decoder_input_ids`.
     */
    decoder_input_ids?: number[] | import("../utils/tensor.js").Tensor;
    /**
     * (`DynamicCache`, *optional*):
     * A cache object that stores previously computed key/value states. When provided, the model will
     * use these cached states to avoid recomputing them, significantly speeding up sequential generation.
     */
    past_key_values?: import("../cache_utils.js").DynamicCache | null;
};
export type GenerationFunctionParameters = GenerationFunctionParametersBase & Partial<import("./configuration_utils.js").GenerationConfig> & {
    [key: string]: unknown;
};
//# sourceMappingURL=parameters.d.ts.map