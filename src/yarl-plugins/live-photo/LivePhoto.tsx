import { PluginProps } from "yet-another-react-lightbox";
import { LivePhotoSlide } from "./LivePhotoSlide";

export const defaultVideoProps = {
    controls: true,
    playsInline: true,
};

/** LivePhoto plugin */
export function LivePhoto({ augment }: PluginProps) {
    augment(({ render: { slide: renderSlide, ...restRender }, video: originalVideo, ...restProps }) => ({
        render: {
            slide: ({slide, offset, rect}) => {
                if (slide.type === "live") {
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
