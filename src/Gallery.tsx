import { FC, useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from 'react-redux';

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from '@mui/material/LinearProgress';
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { RowsPhotoAlbum } from "react-photo-album";
import { UnstableInfiniteScroll as InfiniteScroll } from "react-photo-album/scroll";
import "react-photo-album/rows.css";

import {
    IconAlertCircle,
    IconCircleX,
} from '@tabler/icons-react';

import { PhotoImageType, AlbumType } from "./types";
import { useGetAlbumQuery } from "./services/api";
import { selectZoom } from "./services/app";
// import { useDialog } from "./dialogs";
import useFavorite from "./favoriteHook";
import Thumb from "./Thumb";

const rootSubAlbum = "/";
const defaultData: AlbumType = {
    name: "",
    photos: [],
    subalbums: [],
    pseudo: false,
    count: 0,
    title: ""
};

const Gallery: FC = () => {
    const { collection = "", album = "" } = useParams();
    console.log("GALLERY", useParams());
    const { data = defaultData, isFetching, isError } = useGetAlbumQuery({ collection, album });
    const [subAlbum, setSubAlbum] = useState<string>("");
    // const showPhoto = useRef<string | undefined>(photo);
    // const dialog = useDialog();
    const favorite = useFavorite();
    const zoom = useSelector(selectZoom);

    const isEmpty = false; //data.count < 1;
    const hasSubAlbums = data.subalbums?.length > 0;
    const hasRootSubAlbumPhotos = useMemo(() => data.photos?.some(photo => photo.subalbum === ""), [data.photos]);

    const [_photos, setPhotos] = useState<PhotoImageType[]>([]);
    useEffect(() => { console.log("FUCKING HELL"); setPhotos([]) }, [collection, album, setPhotos]);
    // const photos = useMemo((): PhotoImageType[] => {
    //     let list = data?.photos || [];
    //     // Filter photos by subalbum
    //     if (subAlbum === rootSubAlbum)
    //         list = list.filter(v => v.subalbum === "");
    //     else if (subAlbum !== "")
    //         list = list.filter(v => subAlbum === v.subalbum);
    //     // Create urls for thumbnails
    //     return list.map(v => ({ ...v, src: urls.thumb(v) }));
    // }, [data, subAlbum]);

    // Clear sub-album selection when album changes
    useEffect(() => setSubAlbum(""), [collection, album, setSubAlbum]);

    // Open lightbox only after loading if a photo is provided from path parameters
    // useEffect(() => {
    //     if (showPhoto.current !== undefined && isSuccess) {
    //         const index = photos.findIndex(i => i.id === showPhoto.current);
    //         if (index >= 0)
    //             dialog.lightbox(photos, index);
    //         showPhoto.current = undefined;
    //     }
    // }, [dialog, photos, isSuccess]);

    const handleSubAlbum = (selected: string) => () => {
        setSubAlbum(selected === subAlbum ? "" : selected);
    }

    const showLightbox = (_index: number) => {
        // dialog.lightbox(photos, index);
    }
    const showInfo = (_index: number) => {
        // dialog.info(photos, index);
    }
    const saveFavorite = (_index: number) => {
        // favorite.toggle(photos, index);
    }

    // Loading
    if (isFetching)
        return (
            <Box sx={{ width: '100%' }}>
                <LinearProgress />
            </Box>);

    // Error, album not found
    if (isError)
        return (
            <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <IconCircleX size={42} />
                <Typography variant="h6" sx={{ m: 1 }}>Album not found.</Typography>
            </Box>);

    // Empty album
    if (isEmpty)
        return (
            <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <IconAlertCircle size={42} />
                <Typography variant="h6" sx={{ mt: 1 }}>No photos in this album.</Typography>
            </Box>);

    // All OK, render Gallery

    const subAlbumsComponent = (
        <Paper elevation={4} square>
            <Stack direction="row" p={1.5} spacing={1} useFlexGap flexWrap="wrap">
                {hasRootSubAlbumPhotos && <Chip key={rootSubAlbum} label={rootSubAlbum} variant={subAlbum === rootSubAlbum ? "filled" : "outlined"} onClick={handleSubAlbum(rootSubAlbum)} />}
                {data.subalbums?.map(v => <Chip key={v} label={v} variant={subAlbum === v ? "filled" : "outlined"} onClick={handleSubAlbum(v)} />)}
            </Stack>
        </Paper>);

    async function loadFromUrl(index: number): Promise<PhotoImageType[]> {
        try {
            const response = await fetch(`/api/collections/${collection}/albums/${album}/photos?page=${index}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            const batch = data; //.map((v: PhotoType) => ({ ...v, src: urls.thumb(v) }));
            setPhotos((prev) => [...prev, batch]);
            return batch;
        } catch (error) {
            console.error("Error loading data:", error);
            throw error;
        }
    }

    return (<>
        {hasSubAlbums && subAlbumsComponent}
        <InfiniteScroll
            fetch={loadFromUrl}
            finished={<div className="finished">You are all set!</div>}
            loading={(
                <Box sx={{ width: '100%' }}>
                    <LinearProgress />
                </Box>)}
        // error={(
        //     <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
        //         <IconCircleX size={42} />
        //         <Typography variant="h6" sx={{ m: 1 }}>Album not found.</Typography>
        //     </Box>)}
        >
            <RowsPhotoAlbum
                photos={[] as PhotoImageType[]}
                targetRowHeight={zoom}
                rowConstraints={{ singleRowMaxHeight: zoom }}
                spacing={1}
                render={{
                    photo: (_, { photo, height, width, index }) =>
                        <Thumb
                            key={`${photo.collection}:${photo.album}:${photo.id}`}
                            photo={photo}
                            height={height}
                            width={width}
                            index={index}
                            hideIcons={zoom < 100}
                            showLightbox={showLightbox}
                            showInfo={showInfo}
                            saveFavorite={saveFavorite}
                            favoriteStatus={favorite.photo(photo)} />
                }}
            />
        </InfiniteScroll>
    </>);
}

export default Gallery;
