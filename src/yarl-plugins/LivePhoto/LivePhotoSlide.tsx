import * as React from "react";
import { ImageSlide } from "yet-another-react-lightbox/core";
import { ContainerRect } from "yet-another-react-lightbox/types";
import { SlideLivePhoto } from "./index";

type LivePhotoSlideProps = {
    /** slide */
    slide: SlideLivePhoto, 
    /** slide offset (`0` - current slide, `1` - next slide, `-1` - previous slide, etc.) */
    offset: number, 
    /** container rect */
    rect: ContainerRect
};

export const LivePhotoSlide: React.FC<LivePhotoSlideProps> = ({ slide, offset, rect }) => {
    return (
        <>
            <ImageSlide
                slide={slide.image}
                offset={offset}
                rect={rect}
            />
            {/* <VideoSlide
                slide={slide.video}
                offset={offset}
            /> */}
        </>);
}
