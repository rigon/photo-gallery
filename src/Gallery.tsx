import { FC, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from 'react-redux';

import Box from "@mui/material/Box";
import FavoriteIcon from '@mui/icons-material/Favorite';
import NotFavoriteIcon from '@mui/icons-material/FavoriteBorder';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import PlayIcon from '@mui/icons-material/PlayCircleFilledTwoTone';

import PhotoAlbum, { RenderPhotoProps } from "react-photo-album";

import BoxBar from "./BoxBar";
import Lightbox from "./Lightbox";
import LivePhotoIcon from "./icons/LivePhotoIcon";
import { PhotoType } from "./types";
import useNotification from "./Notification";
import { useGetAlbumQuery, useSaveFavoriteMutation } from "./services/api";
import { selectZoom } from "./services/app";

const Gallery: FC = () => {
    const { collection, album } = useParams();
    const { data, isLoading } = useGetAlbumQuery({collection, album});
    const [ index, setIndex ] = useState(-1);
    const [ saveFavorite ] = useSaveFavoriteMutation();
    const sendNotification = useNotification();
    const zoom = useSelector(selectZoom);

    const photos = data?.photos || [];

    const toggleFavorite = (index: number) => {
        const saveToAlbum = "Favorite 1";
        const favorite = !(photos[index].favorite);
        saveFavorite({
            collection: collection || "",
            album: album || "",
            photo: photos[index].title,
            photoIndex: index,
            saveToCollection: "",
            saveToAlbum: saveToAlbum,
            favorite
        });
        sendNotification(favorite ?
            `Photo added as favorite to ${saveToAlbum}` :
            `Photo removed as favorite from ${saveToAlbum}`);
    }
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
            toggleFavorite(layout.index);
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
                            <IconButton color="inherit" onClick={saveFavorite}>
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
                onFavorite={toggleFavorite} />
        </>);
    
    const loading = (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>);
    
    return isLoading ? loading : gallery;
}

export default Gallery;
