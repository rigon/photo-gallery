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

import BoxBar from "./BoxBar";
import Lightbox from "./Lightbox";
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
    const closeLightbox = () => {
        setIndex(-1);
    }

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
    
    const gallery = (
        <>
            <PhotoAlbum
                photos={photos}
                layout="rows"
                targetRowHeight={zoom}
                spacing={1}
                renderPhoto={RenderPhoto} />
            <Lightbox
                photos={photos}
                selected={index}
                onClose={closeLightbox}
                onFavorite={openSnackbar} />
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
