import { FC } from "react";
import { useTheme } from '@mui/material/styles';

import * as YARL from "yet-another-react-lightbox";
import { Slide } from "yet-another-react-lightbox/types";
import "yet-another-react-lightbox/styles.css";

// import optional lightbox plugins
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import Favorite from "./lightbox-plugins/Favorite";
import { PhotoType } from "./types";

interface LightboxProps {
    photos: PhotoType[];
    selected: number;
    onClose?: () => void;
    onFavorite?: (index: number, isFavorite: boolean, slide: Slide) => void;
}

const Lightbox: FC<LightboxProps> = ({photos, selected, onClose, onFavorite}) => {
    const theme = useTheme();

    return (
        <YARL.Lightbox
            slides={photos.map(({ src, type, width, height, favorite, files }) => ({
                type,
                src,
                ...(type === "video" ? {
                    width: 1920,
                    height: 1080} : {}),
                favorite: favorite,
                sources: files.map(({ type, url }) => ({
                    src: url,
                    type: "",
                })),
                srcSet: [{
                        src,
                        width: 500,
                        height: 500,
                    }, ...files.map(({ type, url }) => ({
                        src: url,
                        width: 20000,
                        height: 20000,
                    }))
                ]
            }))}
            open={selected >= 0}
            index={selected}
            animation={{ swipe: 150 }}
            close={onClose}
            // Fix lightbox over snackbar
            styles={{ root: { zIndex: theme.zIndex.modal - 1} }}
            // enable optional lightbox plugins
            plugins={[Fullscreen, Slideshow, Favorite, Thumbnails, Video, Zoom]}
            carousel={{
                finite: true,
                preload: 3,
                padding: 0,
                spacing: 0,
                imageFit: "contain"
            }}
            thumbnails={{
                position: "bottom",
                width: 80,
                height: 80,
                borderRadius: 0,
                padding: 0,
                gap: 2
            }}
            video={{
                autoPlay: true,
            }}
            favorite={{
                onChange: onFavorite
            }} />
    );

}

export default Lightbox;
