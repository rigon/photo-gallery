import * as React from "react";
import {
    ACTIVE_SLIDE_COMPLETE,
    ACTIVE_SLIDE_LOADING,
    ACTIVE_SLIDE_PLAYING,
    ImageSlide,
} from "yet-another-react-lightbox/core";
import { SlideLivePhoto, ContainerRect } from "yet-another-react-lightbox";
import { VideoSlide } from "./VideoSlide";

type LivePhotoSlideProps = {
    /** slide */
    slide: SlideLivePhoto, 
    /** slide offset (`0` - current slide, `1` - next slide, `-1` - previous slide, etc.) */
    offset: number, 
    /** container rect */
    rect: ContainerRect
};

export type PublishState =
    typeof ACTIVE_SLIDE_COMPLETE |
    typeof ACTIVE_SLIDE_LOADING |
    typeof ACTIVE_SLIDE_PLAYING;

export const LivePhotoSlide: React.FC<LivePhotoSlideProps> = ({ slide, offset, rect }) => {
    const [isImage, setIsImage] = React.useState<boolean>(false);

    // Reset live photo when is not selected
    React.useEffect(() => {
        if(offset !== 0)
            setIsImage(false);
    }, [offset, setIsImage]);
    
    const videoEnded = (state: PublishState) => {
        switch(state) {
            case ACTIVE_SLIDE_LOADING:
                break;
            case ACTIVE_SLIDE_PLAYING:
                break;
            case ACTIVE_SLIDE_COMPLETE:
                setIsImage(true);
                break;
        }
    }

    return isImage ?
        <ImageSlide
            slide={slide.image}
            offset={offset}
            rect={rect}
        /> :
        <VideoSlide
            slide={slide.video}
            offset={offset}
            publish={videoEnded}
        />;
}
