import { FC, useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from 'react-redux';

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import DangerousIcon from '@mui/icons-material/Dangerous';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from "@mui/material/Paper";
import ReportIcon from '@mui/icons-material/Report';
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import PhotoAlbum from "react-photo-album";

import Lightbox from "./Lightbox";
import Thumb from "./Thumb";
import useFavorite from "./favoriteHook";
import { PhotoImageType, urls } from "./types";
import { useGetAlbumQuery } from "./services/api";
import { selectZoom } from "./services/app";
import { useDialog } from "./dialogs";

const Gallery: FC = () => {
    const { collection = "", album = "" } = useParams();
    const { data, isFetching, isError } = useGetAlbumQuery({ collection, album });
    const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
    const [subAlbum, setSubAlbum] = useState<string>("");
    const zoom = useSelector(selectZoom);
    const favorite = useFavorite();
    const dialog = useDialog();

    const subAlbums = data?.subalbums || [];
    const hasSubAlbums = subAlbums.length > 0;
    const isEmpty = !(Number(data?.photos?.length) > 0);

    const photos = useMemo((): PhotoImageType[] => {
        let list = data?.photos || [];
        // Filter photos by subalbum
        if (subAlbum !== "")
            list = list.filter(v => subAlbum === v.subalbum);
        // Create urls for thumbnails
        return list.map(v => ({ ...v, src: urls.thumb(v) }));
    }, [data, subAlbum]);

    // Clear sub-album selection when album changed
    useEffect(() => setSubAlbum(""), [collection, album, setSubAlbum]);

    const closeLightbox = () => {
        setLightboxIndex(-1);
    }
    const handlePhotoInfo = (index: number) => {
        dialog.info(photos, index);
    }
    const handleSubAlbum = (selected: string) => () => {
        setSubAlbum(selected === subAlbum ? "" : selected);
    }
    const toggleFavorite = (index: number) => {
        favorite.toggle(index, photos);
    }

    const RenderPhoto = Thumb(toggleFavorite, setLightboxIndex, handlePhotoInfo, zoom >= 100);

    const loading = (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>);

    const errorAlbum = (
        <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <DangerousIcon fontSize="large" sx={{ m: 1 }} />
            <Typography variant="h6">Album not found.</Typography>
        </Box>);
    
    const emptyAlbum = (
        <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ReportIcon fontSize="large" sx={{ m: 1 }} />
            <Typography variant="h6">No photos in this album.</Typography>
        </Box>);

    const subAlbumsComp = (
        <Paper elevation={4} square>
            <Stack direction="row" p={1.5} spacing={1} useFlexGap flexWrap="wrap">
                {subAlbums.map(v => <Chip key={v} label={v} variant={subAlbum === v ? "filled" : "outlined"} onClick={handleSubAlbum(v)} />)}
            </Stack>
        </Paper>);

    const gallery = (
        <>
            {hasSubAlbums && subAlbumsComp}
            <PhotoAlbum
                photos={photos}
                layout="rows"
                targetRowHeight={zoom}
                rowConstraints={{ singleRowMaxHeight: zoom*2 }}
                spacing={1}
                renderPhoto={RenderPhoto} />
            <Lightbox
                photos={photos}
                selected={lightboxIndex}
                onClose={closeLightbox}
                onFavorite={toggleFavorite} />
        </>);

    return isFetching ? loading :   // Loading
        isError? errorAlbum :       // Error
        isEmpty ? emptyAlbum :      // Empty album
        /* OK */ gallery;           // Gallery
}

export default Gallery;
