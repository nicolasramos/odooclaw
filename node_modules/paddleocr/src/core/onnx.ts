import type { OrtInferenceSession, OrtTensor } from "../interface.ts";

export interface FixedInputShape {
    channels?: number;
    height?: number;
    width?: number;
}

export function createInputFeeds(
    session: OrtInferenceSession,
    inputTensor: OrtTensor
): Record<string, OrtTensor> {
    return {
        [session.inputNames?.[0] ?? "x"]: inputTensor,
    };
}

export function getFixedInputDimension(
    session: OrtInferenceSession,
    dimensionIndex: number
): number | undefined {
    const dimension = session.inputMetadata?.[0]?.shape?.[dimensionIndex];
    if (typeof dimension !== "number" || dimension <= 0 || !Number.isFinite(dimension)) {
        return undefined;
    }
    return dimension;
}

export function getFixedInputShape(session: OrtInferenceSession): FixedInputShape {
    return {
        channels: getFixedInputDimension(session, 1),
        height: getFixedInputDimension(session, 2),
        width: getFixedInputDimension(session, 3),
    };
}
