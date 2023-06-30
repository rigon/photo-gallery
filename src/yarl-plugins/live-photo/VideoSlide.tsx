import * as React from "react";

import {
    ACTIVE_SLIDE_COMPLETE,
    ACTIVE_SLIDE_LOADING,
    ACTIVE_SLIDE_PLAYING,
    CLASS_FLEX_CENTER,
    clsx,
    cssClass,
    useContainerRect,
    useEventCallback,
    useLightboxProps,
} from "yet-another-react-lightbox/core";
import { SlideVideo, LightboxProps } from "yet-another-react-lightbox";
import { defaultVideoProps } from "./LivePhoto";
import { PublishState } from "./LivePhotoSlide";

export type VideoSlideProps = {
    slide: SlideVideo;
    offset: number;
    publish: (state: PublishState ) => void;
};

/** Video slide */
export function VideoSlide({ slide, offset, publish }: VideoSlideProps) {
    const video = { ...defaultVideoProps, ...useLightboxProps().video };
    const { setContainerRef, containerRect } = useContainerRect();
    const videoRef = React.useRef<HTMLVideoElement | null>(null);

    React.useEffect(() => {
        if (offset !== 0 && videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
        }
    }, [offset]);

    React.useEffect(() => {
        if (offset === 0 && videoRef.current && (slide.autoPlay || video.autoPlay)) {
            publish(ACTIVE_SLIDE_LOADING);

            videoRef.current.play().catch(() => {/* do nothing*/});
        }
    }, [offset, video.autoPlay, slide.autoPlay, publish]);

    const handleVideoRef = useEventCallback((node: HTMLVideoElement) => {
        if (offset === 0 && (video.autoPlay || slide.autoPlay) && node.paused) {
            node.play().catch(() => {/* do nothing*/});
        }
    });

    const setVideoRef = React.useCallback(
        (node: HTMLVideoElement | null) => {
            videoRef.current = node;

            if (node) {
                handleVideoRef(node);
            }
        },
        [handleVideoRef]
    );

    const { width, height, poster, sources } = slide;

    const scaleWidthAndHeight = () => {
        if (!width || !height || !containerRect) return null;

        const widthBound = width / height > containerRect.width / containerRect.height;
        const elementWidth = widthBound ? containerRect.width : Math.round((containerRect.height / height) * width);
        const elementHeight = !widthBound ? containerRect.height : Math.round((containerRect.width / width) * height);

        return {
            width: elementWidth,
            height: elementHeight,
            style: { width: elementWidth, height: elementHeight, maxWidth: "100%", maxHeight: "100%" },
        };
    };

    const resolveBoolean = (attr: keyof Required<Pick<LightboxProps, "video">>["video"]) => {
        if (slide[attr] === false) return null;
        if (slide[attr] === true) return { [attr]: true };
        if (video[attr] === false) return null;
        if (video[attr] === true) return { [attr]: true };
        return null;
    };

    const resolveString = (attr: keyof Required<Pick<LightboxProps, "video">>["video"]) => {
        if (video[attr] || slide[attr]) {
            return { [attr]: slide[attr] || video[attr] };
        }
        return null;
    };

    return (
        <>
            {sources && (
                <div
                    ref={setContainerRef}
                    style={{
                        width: "100%",
                        height: "100%",
                        // not adjusting for devicePixelRatio for now since videos do not look that pixelated
                        // even without devicePixelRatio adjustment
                        ...(width ? { maxWidth: `${width}px` } : null),
                    }}
                    className={clsx(cssClass("video_container"), cssClass(CLASS_FLEX_CENTER))}
                >
                    {containerRect && (
                        <video
                            ref={setVideoRef}
                            poster={poster}
                            {...scaleWidthAndHeight()}
                            {...resolveBoolean("controls")}
                            {...resolveBoolean("playsInline")}
                            {...resolveBoolean("loop")}
                            {...resolveBoolean("muted")}
                            {...resolveBoolean("playsInline")}
                            {...resolveBoolean("disablePictureInPicture")}
                            {...resolveBoolean("disableRemotePlayback")}
                            {...resolveString("controlsList")}
                            {...resolveString("crossOrigin")}
                            {...resolveString("preload")}
                            onPlay={() => {
                                publish(ACTIVE_SLIDE_PLAYING);
                            }}
                            onEnded={() => {
                                publish(ACTIVE_SLIDE_COMPLETE);
                            }}
                        >
                            {sources.map(({ src, type }, index) => (
                                <source key={index} src={src} type={type} />
                            ))}
                        </video>
                    )}
                </div>
            )}
        </>
    );
}