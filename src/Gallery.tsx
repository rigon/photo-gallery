import { FC, useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import Box from "@mui/material/Box";
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import NotFavoriteIcon from '@mui/icons-material/FavoriteBorder';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import PlayIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import Snackbar from '@mui/material/Snackbar';

import PhotoAlbum, { RenderPhotoProps } from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// import optional lightbox plugins
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import BoxBar from "./BoxBar";
import Favorite from "./lightbox-plugins/Favorite";
import LivePhotoIcon from "./icons/LivePhotoIcon";
import { PhotoType } from "./types";

interface GalleryProps {
    zoom: number;
}

const Gallery: FC<GalleryProps> = ({zoom}) => {
    const {collection, album} = useParams();
    const [isLoading, setLoading] = useState<boolean>(true);
    const [photos, setPhotos] = useState<PhotoType[]>([]);
    const [index, setIndex] = useState(-1);
    const [showSnackbar, setShowSnackbar] = useState(false);

    useEffect(() => {
        setLoading(true);
        // Clear gallery when a new album is selected
        setPhotos([]);

        fetch(`/collection/${collection}/album/${album}`)
            .then((response) => response.json())
            .then(album => {
                setPhotos(album.photos);
                setLoading(false);
            });
    }, [collection, album]);
    
    
    const openSnackbar = () => {
        setShowSnackbar(true);
    };
    const closeSnackbar = () => {
        setShowSnackbar(false);
    };

    const RenderPhoto = ({ photo, layout, wrapperStyle, renderDefaultPhoto }: RenderPhotoProps<PhotoType>) => {
        const [mouseOver, setMouseOver] = useState<boolean>(false);

        const mouseEnter = () => {
            setMouseOver(true);
        }
        const mouseLeave = () => {
            setMouseOver(false);
        }
        const openLightbox = (event: any) => {
            setIndex(layout.index);
        }
        const saveFavorite = (event: { stopPropagation: () => void; }) => {
            event.stopPropagation();
            openSnackbar();
        }

        return (
            <Box
                sx={{ position: "relative", color: "white", backgroundColor: "action.hover", cursor: "pointer", ...wrapperStyle }}
                onMouseEnter={mouseEnter}
                onMouseLeave={mouseLeave}
                onClick={openLightbox}
                onDoubleClick={saveFavorite}>
                    {renderDefaultPhoto({ wrapped: true })}
                    {photo.files.length > 1 && (
                        <BoxBar top left>
                            <LivePhotoIcon fontSize="small" />
                        </BoxBar>
                    )}
                    {photo.type === "video" &&
                        <BoxBar middle center>
                            <PlayIcon style={{width: "100%", height: "100%"}}/>
                        </BoxBar>
                    }
                    {(photo.favorite || mouseOver) && (
                        <BoxBar bottom right>
                            <IconButton onClick={saveFavorite} style={{color: "white"}}>
                                {photo.favorite? <FavoriteIcon/> : <NotFavoriteIcon/>}
                            </IconButton>
                        </BoxBar>
                    )}
            </Box>
        );
    }
    
    const gallery = (<>
        <PhotoAlbum
                photos={photos}
                layout="rows"
                targetRowHeight={zoom}
                spacing={1}
                renderPhoto={RenderPhoto}
            />
        <Lightbox
            slides={photos.map(({ src, type, width, height, favorite, files }) => ({
                type,
                src,
                favorite: favorite,
                srcSet: [{
                    src,
                    width: 500,
                    height: 500,
                }, ...files.map(({type, url}) => ({
                    src: url,
                    width: 20000,
                    height: 20000,
                }))],
            }))}
            open={index >= 0}
            index={index}
            animation={{ swipe: 150 }}
            close={() => setIndex(-1)}
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
            favorite={{
                onChange: openSnackbar
            }} />
        </>);
    
    const loading = (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>);
    
    return (
        <>
            {isLoading ? loading : gallery}
            <Snackbar
                open={showSnackbar}
                autoHideDuration={3000}
                onClose={closeSnackbar}
                message="Favorite not yet implemented"
                style={{zIndex: 19999}}
                action={(
                    <IconButton size="small" aria-label="close" color="inherit" onClick={closeSnackbar}>
                        <CloseIcon fontSize="small" />
                    </IconButton>)} />
        </>
    );
}

export default Gallery;
