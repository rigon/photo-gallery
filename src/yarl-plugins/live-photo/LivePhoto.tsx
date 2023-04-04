import * as React from "react";

import { PluginProps, Slide, SlideLivePhoto } from "yet-another-react-lightbox/types";
import { LivePhotoSlide } from "./LivePhotoSlide";

export const defaultVideoProps = {
    controls: true,
    playsInline: true,
};

function isLivePhotoSlide(slide: Slide): slide is SlideLivePhoto {
    return slide.type === "live";
}

/** LivePhoto plugin */
export function LivePhoto({ augment }: PluginProps) {
    augment(({ render: { slide: renderSlide, ...restRender }, video: originalVideo, ...restProps }) => ({
        render: {
            slide: ({slide, offset, rect}) => {
                if (isLivePhotoSlide(slide)) {
                    return (
                        <LivePhotoSlide
                            //key={`${slide.sources.map((source) => source.src).join(" ")}`}
                            slide={slide}
                            offset={offset}
                            rect={rect}
                        />
                    );
                }
                return renderSlide?.({ slide, offset, rect });
            },
            ...restRender,
        },
        video: {
            ...defaultVideoProps,
            ...originalVideo,
        },
        ...restProps,
    }));
}
