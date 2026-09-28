export interface OrtTensor {
    data: unknown;
    dims: readonly number[];
}

export interface OrtTensorMetadata {
    shape?: readonly (number | string | null | undefined)[];
}

export interface OrtInferenceSession {
    inputNames?: readonly string[];
    inputMetadata?: readonly OrtTensorMetadata[];
    outputNames: readonly string[];
    run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
    release?(): Promise<void>;
}

export interface OrtTensorConstructor {
    new (type: string, data: Float32Array, dims: readonly number[]): OrtTensor;
}

export interface OrtInferenceSessionConstructor {
    create(modelBuffer: ArrayBuffer): Promise<OrtInferenceSession>;
}

export interface OrtModule {
    Tensor: OrtTensorConstructor;
    InferenceSession: OrtInferenceSessionConstructor;
}
