import { SlideImage, GenericSlide } from "yet-another-react-lightbox/types";
import { SlideVideo } from "yet-another-react-lightbox/plugins/video";
import { LivePhoto } from "./LivePhoto";

/** Video slide attributes */
export interface SlideLivePhoto extends GenericSlide {
    /** video slide type marker */
    type: "live";
    /** live photo thumbnail URL */
    src: string;
    /** live photo width in pixels */
    width?: number;
    /** live photo height in pixels */
    height?: number;
    /** live photo still photo */
    image: SlideImage;
    /** live photo video */
    video: SlideVideo;
}

declare module "yet-another-react-lightbox/types" {
    // noinspection JSUnusedGlobalSymbols
    interface SlideTypes {
        /** live photo slide type */
        SlideLivePhoto: SlideLivePhoto;
    }
}

export default LivePhoto;
