export type ImageChannelOrder = "rgb" | "bgr";

export interface ImageInput {
    width: number;
    height: number;
    data: Uint8Array;
}

/**
 * Simple rectangle representation.
 */
export interface Box {
    /** X-coordinate of the top-left corner. */
    x: number;
    /** Y-coordinate of the top-left corner. */
    y: number;
    /** Width of the box in pixels. */
    width: number;
    /** Height of the box in pixels. */
    height: number;
    /** Optional four-point text box in clockwise order: top-left, top-right, bottom-right, bottom-left. */
    points?: [Point, Point, Point, Point];
    /** Optional arbitrary polygon, used by DBPostProcess `box_type: poly` modules such as seal text detection. */
    polygon?: Point[];
}

export interface Point {
    x: number;
    y: number;
}
