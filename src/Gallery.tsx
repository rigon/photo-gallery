import { FC, useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from 'react-redux';

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FavoriteIcon from '@mui/icons-material/Favorite';
import NotFavoriteIcon from '@mui/icons-material/FavoriteBorder';
import IconButton from '@mui/material/IconButton';
import InfoIcon from '@mui/icons-material/Info';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from "@mui/material/Paper";
import PlayIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import Stack from "@mui/material/Stack";

import PhotoAlbum, { RenderPhotoProps } from "react-photo-album";

import BoxBar from "./BoxBar";
import PhotoInfo from "./PhotoInfo";
import Lightbox from "./Lightbox";
import LivePhotoIcon from "./icons/LivePhotoIcon";
import { PhotoType } from "./types";
import useNotification from "./Notification";
import { useGetAlbumQuery, useSavePhotoToPseudoMutation } from "./services/api";
import { selectZoom, selectFavorite } from "./services/app";

const Gallery: FC = () => {
    const { collection, album } = useParams();
    const { data, isFetching } = useGetAlbumQuery({collection, album});
    const [ lightboxIndex, setLightboxIndex ] = useState<number>(-1);
    const [ infoPhotoIndex, setInfoPhotoIndex ] = useState<number>(-1);
    const [ subAlbum, setSubAlbum ] = useState<string>("");
    const [ saveFavorite ] = useSavePhotoToPseudoMutation();
    const { infoNotification, errorNotification } = useNotification();
    const zoom = useSelector(selectZoom);
    const favorite = useSelector(selectFavorite);

    const subalbums = data?.subalbums || [];
    const photos = useMemo(() => {
        const photos = data?.photos || [];
        return subAlbum.length < 1 ? photos :
            photos.filter(v => subAlbum === v.subalbum);
    }, [data, subAlbum]);

    // Clear sub-album selection when album changed
    useEffect(() => setSubAlbum(""), [collection, album, setSubAlbum]);

    const toggleFavorite = async (index: number) => {
        if(favorite === undefined) {
            errorNotification("No favorite album is selected. Select first from the top menu.");
            return;
        }
        if(collection === undefined || album === undefined || index >= photos.length) {
            errorNotification("Select a collection and an album first from the left menu.");
            return;
        }

        const isFavorite = !(photos[index].favorite);
        try {
            await saveFavorite({
                collection: collection,
                album: album,
                photo: photos[index].id,
                photoIndex: index,
                saveTo: favorite,
                favorite: isFavorite,
            }).unwrap();
            infoNotification(isFavorite ?
                `Photo added as favorite to ${favorite.album}` :
                `Photo removed as favorite from ${favorite.album}`);
        }
        catch(error) {
            errorNotification(`Could not set the photo as favorite in ${favorite.album}!`);
            console.log(error);
        }
    }
    const closeLightbox = () => {
        setLightboxIndex(-1);
    }
    const openInfoPhoto = (index: number) => {
        setInfoPhotoIndex(index);
    }
    const closeInfoPhoto = () => {
        setInfoPhotoIndex(-1);
    }
    const handleSubAlbum = (selected: string) => () => {
        setSubAlbum(selected === subAlbum ? "" : selected);
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
            setLightboxIndex(layout.index);
        }
        const saveFavorite = (event: { stopPropagation: () => void; }) => {
            event.stopPropagation();
            toggleFavorite(layout.index);
        }
        const showInfo = (event: { stopPropagation: () => void; }) => {
            event.stopPropagation();
            setInfoPhotoIndex(layout.index);
        }
        
        return (
            <Box
                sx={{ ...wrapperStyle, position: "relative", color: "white", backgroundColor: "action.hover", cursor: "pointer" }}
                onMouseEnter={mouseEnter}
                onMouseLeave={mouseLeave}
                onClick={openLightbox}
                onDoubleClick={saveFavorite}>
                    {renderDefaultPhoto({ wrapped: true })}
                    {photo.type === "live" && (
                        <BoxBar top left>
                            <LivePhotoIcon fontSize="small" />
                        </BoxBar>
                    )}
                    {photo.type === "video" &&
                        <BoxBar middle center>
                            <PlayIcon style={{width: "100%", height: "100%"}}/>
                        </BoxBar>
                    }
                    {(mouseOver) && (
                        <BoxBar top right>
                            <IconButton color="inherit" onClick={showInfo}>
                                <InfoIcon/>
                            </IconButton>
                        </BoxBar>
                    )}
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
            { subalbums.length > 0 &&
                <Paper elevation={4} square>
                    <Stack direction="row" p={1.5} spacing={1} useFlexGap flexWrap="wrap">
                        {subalbums.map(v => <Chip key={v} label={v} variant={subAlbum === v ? "filled" : "outlined"} onClick={handleSubAlbum(v)} />)}
                    </Stack>
                </Paper>
            }
            <PhotoAlbum
                photos={photos}
                layout="rows"
                targetRowHeight={zoom}
                spacing={1}
                renderPhoto={RenderPhoto} />
            <Lightbox
                photos={photos}
                selected={lightboxIndex}
                onClose={closeLightbox}
                onFavorite={toggleFavorite}
                onInfo={openInfoPhoto} />
            <PhotoInfo
                photos={photos}
                selected={infoPhotoIndex}
                onClose={closeInfoPhoto} />
        </>);
    
    const loading = (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>);
    
    return isFetching ? loading : gallery;
}

export default Gallery;
