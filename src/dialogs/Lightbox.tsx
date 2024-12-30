import { FC, useMemo} from "react";
import { useTheme } from '@mui/material/styles';

import PlayIcon from '@mui/icons-material/PlayCircleFilledTwoTone';

import { Lightbox as YARL, Render, RenderThumbnailProps } from "yet-another-react-lightbox";
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
// FIXME: LivePhoto must be imported first than other custom plugins,
// otherwise the project does not build with "npm run build"
import Favorite from "../yarl-plugins/favorite";
import Info from "../yarl-plugins/info";
import LivePhoto from "../yarl-plugins/live-photo";
import "../yarl-plugins/captions.scss";
import "../yarl-plugins/thumbnails.scss";

import { PhotoImageType } from "../types";
import { photosToSlides } from "../lightbox-data";
import { useDialog } from ".";
import useFavorite from "../favoriteHook";

interface LightboxProps {
    open: boolean;
    photos: PhotoImageType[];
    selected: number;
    onClose?: () => void;
}

const thumbnailImageClass = cssClass(`${PLUGIN_THUMBNAILS}_thumbnail_image`);
const thumbnailIconClass = cssClass(`${PLUGIN_THUMBNAILS}_thumbnail_${ELEMENT_ICON}`);

const renderThumbnail: Render["thumbnail"] = ({ slide }: RenderThumbnailProps) => {
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

const Lightbox: FC<LightboxProps> = ({ open, photos, selected, onClose }) => {
    const theme = useTheme();
    const dialog = useDialog();
    const slides = useMemo(() => photosToSlides(photos), [photos]);
    const favorite = useFavorite();

    const handlePhotoInfo = (index: number) => {
        dialog.info(photos, index);
    }
    const handleFavorite = (index: number) => {
        favorite.toggle(photos, index);
    }

    return (
        <YARL
            open={open}
            slides={slides}
            index={selected}
            animation={{ swipe: 0 }}
            close={onClose}
            // Fix lightbox over snackbar
            styles={{ root: { zIndex: theme.zIndex.modal - 1} }}
            // enable optional lightbox plugins
            plugins={[Captions, Fullscreen, Slideshow, Info, Favorite, LivePhoto, Video, Thumbnails, Zoom]}
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
                onChange: handleFavorite
            }}
            info={{
                onClick: handlePhotoInfo
            }} />
    );
}

export default Lightbox;
