import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import NotFavoriteIcon from '@mui/icons-material/FavoriteBorder';
import IconButton from '@mui/material/IconButton';
import PlayIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import Snackbar from '@mui/material/Snackbar';

import PhotoAlbum from "react-photo-album";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// import optional lightbox plugins
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import Favorite from "./lightbox-plugins/Favorite";
import BoxBar from "./BoxBar";
import LivePhotoIcon from "./icons/LivePhotoIcon";

function Gallery({zoom}) {
    const {collection, album} = useParams();
    const [photos, setPhotos] = useState([]);
    const [index, setIndex] = useState(-1);
    const [showSnackbar, setShowSnackbar] = useState(false);

    const openSnackbar = () => {
        setShowSnackbar(true);
    };
    const closeSnackbar = () => {
        setShowSnackbar(false);
    };

    const RenderPhoto = ({ photo, layout, wrapperStyle, renderDefaultPhoto }) => {
        const [mouseOver, setMouseOver] = useState(false);

        const mouseEnter = () => {
            setMouseOver(true);
        }
        const mouseLeave = () => {
            setMouseOver(false);
        }
        const openLightbox = (event) => {
            setIndex(layout.index);
        }
        const saveFavorite = (event) => {
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

    useEffect(() => {
        // Clear gallery when a new album is selected
        setPhotos([]);

        fetch(`/collection/${collection}/album/${album}`)
            .then((response) => response.json())
            .then(album => {
                setPhotos(album.photos);
            });
    }, [collection, album]);

    return (
        <>
            <PhotoAlbum
                photos={photos}
                layout="rows"
                targetRowHeight={zoom}
                spacing={1}
                renderPhoto={RenderPhoto}
            />
            <Lightbox
                slides={photos.map(({ src, width, height, favorite }) => ({
                    src,
                    width: 20000,
                    height: 20000,
                    favorite: favorite,
                    srcSet: [{
                        src: src,
                        width: 200,
                        height: 200,
                    }],
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

Gallery.propTypes = {
    zoom: PropTypes.number,
}

export default Gallery;
