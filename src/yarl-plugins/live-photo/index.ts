import { SlideImage } from "yet-another-react-lightbox";
import { LivePhoto } from "./LivePhoto";

declare module "yet-another-react-lightbox" {
    // noinspection JSUnusedGlobalSymbols
    interface SlideTypes {
        /** live photo slide type */
        live: SlideLivePhoto;
    }

    /** Video slide attributes */
    export interface SlideLivePhoto extends GenericSlide {
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
}

export default LivePhoto;
