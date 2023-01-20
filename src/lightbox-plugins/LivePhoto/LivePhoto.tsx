import * as React from "react";

import { Plugin } from "yet-another-react-lightbox/types";
import { LivePhotoSlide } from "./LivePhotoSlide";

export const defaultVideoProps = {
    controls: true,
    playsInline: true,
};

/** LivePhoto plugin */
export const LivePhoto: Plugin = ({ augment }) => {
    augment(({ render: { slide: renderSlide, ...restRender }, video: originalVideo, ...restProps }) => ({
        render: {
            slide: (slide, offset, rect) => {
                if (slide.type === "live") {
                    return (
                        <LivePhotoSlide
                            key={`${slide.sources.map((source) => source.src).join(" ")}`}
                            slide={slide}
                            offset={offset}
                        />
                    );
                }
                return renderSlide?.(slide, offset, rect);
            },
            ...restRender,
        },
        video: {
            ...defaultVideoProps,
            ...originalVideo,
        },
        ...restProps,
    }));
};
