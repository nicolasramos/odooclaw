/**
 * Load and sample frames from a video.
 *
 * @param {string|Blob|HTMLVideoElement} src The video to process.
 * @param {Object} [options] Optional parameters.
 * @param {number} [options.num_frames=null] The number of frames to sample uniformly.
 * @param {number} [options.fps=null] The number of frames to sample per second.
 *
 * @returns {Promise<RawVideo>} The loaded video.
 */
export function load_video(src: string | Blob | HTMLVideoElement, { num_frames, fps }?: {
    num_frames?: number;
    fps?: number;
}): Promise<RawVideo>;
/**
 * A decoded video frame and its timestamp, in seconds.
 */
export class RawVideoFrame {
    /**
     * Create a video frame.
     * @param {RawImage} image The decoded image for this frame.
     * @param {number} timestamp The frame timestamp, in seconds.
     */
    constructor(image: RawImage, timestamp: number);
    image: RawImage;
    timestamp: number;
}
/**
 * A sampled video represented as decoded frames plus total duration.
 */
export class RawVideo {
    /**
     * Create a video from decoded frames.
     * @param {RawVideoFrame[]|RawImage[]} frames Frames with timestamps, or images to space uniformly across `duration`.
     * @param {number} duration Duration in seconds.
     */
    constructor(frames: RawVideoFrame[] | RawImage[], duration: number);
    frames: RawVideoFrame[];
    duration: number;
    /**
     * Width of the video frames, in pixels.
     * @returns {number}
     */
    get width(): number;
    /**
     * Height of the video frames, in pixels.
     * @returns {number}
     */
    get height(): number;
    /**
     * Effective sampled frame rate.
     * @returns {number}
     */
    get fps(): number;
}
import { RawImage } from './image.js';
//# sourceMappingURL=video.d.ts.map