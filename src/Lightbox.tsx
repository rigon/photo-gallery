import { FC, useMemo } from "react";
import { useTheme } from '@mui/material/styles';

import PlayIcon from '@mui/icons-material/PlayCircleFilledTwoTone';

import { Lightbox as YARL, Render } from "yet-another-react-lightbox";
import { Slide } from "yet-another-react-lightbox/types";
import "yet-another-react-lightbox/styles.css";
import {
    cssClass,
    ELEMENT_ICON,
    PLUGIN_THUMBNAILS
} from "yet-another-react-lightbox/core";
// import optional lightbox plugins
import Captions from "yet-another-react-lightbox/plugins/captions";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
// import additional lightbox plugins
// FIXME: the two lines bellow cannot be swapped (and it should)
import LivePhoto from "./yarl-plugins/live-photo";
import Favorite from "./yarl-plugins/favorite";
import "./yarl-plugins/captions.scss";
import "./yarl-plugins/thumbnails.scss";

import { PhotoType } from "./types";
import { photosToSlides } from "./lightbox-data";


interface LightboxProps {
    photos: PhotoType[];
    selected: number;
    onClose?: () => void;
    onFavorite?: (index: number, isFavorite: boolean, slide: Slide) => void;
}

const thumbnailImageClass = cssClass(`${PLUGIN_THUMBNAILS}_thumbnail_image`);
const thumbnailIconClass = cssClass(`${PLUGIN_THUMBNAILS}_thumbnail_${ELEMENT_ICON}`);

const renderThumbnail: Render["thumbnail"] = ({ slide }) => {
    let src, alt;
    if("poster" in slide)
        src = slide.poster;
    else if("src" in slide)
        src = slide.src;

    if("alt" in slide)
        alt = slide.alt;

    return (
        <>
            <img alt={alt} src={src} className={thumbnailImageClass} />
            { slide.type === "video" &&
                <PlayIcon fontSize="large" className={thumbnailIconClass} />
            }
        </>);
};

const Lightbox: FC<LightboxProps> = ({photos, selected, onClose, onFavorite}) => {
    const theme = useTheme();
    const slides = useMemo(() => photosToSlides(photos), [photos]);

    return (
        <YARL
            slides={slides}
            open={selected >= 0}
            index={selected}
            animation={{ swipe: 0 }}
            close={onClose}
            // Fix lightbox over snackbar
            styles={{ root: { zIndex: theme.zIndex.modal - 1} }}
            // enable optional lightbox plugins
            plugins={[Captions, Fullscreen, Slideshow, Favorite, LivePhoto, Video, Thumbnails, Zoom]}
            render={{
                thumbnail: renderThumbnail
            }}
            carousel={{
                finite: true,
                preload: 5,
                padding: 0,
                spacing: 0,
                imageFit: "contain"
            }}
            thumbnails={{
                position: "bottom",
                width: 80,
                height: 80,
                borderRadius: 4,
                border: 0,
                padding: 0,
                gap: 3,
                vignette: true,
            }}
            video={{
                autoPlay: true,
                preload: "none",
            }}
            favorite={{
                onChange: onFavorite
            }} />
    );
}

export default Lightbox;
