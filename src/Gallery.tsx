import { FC, useState, useMemo, useEffect, useRef } from "react";
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

import Thumb from "./Thumb";
import { SelectionContext } from "./Selection";
import { PhotoType, PhotoImageType, urls, AlbumType } from "./types";
import { useGetAlbumQuery } from "./services/api";
import { selectZoom } from "./services/app";
import { useDialog } from "./dialogs";

const rootSubAlbum = "/";
const defaultData: AlbumType = {
    name: "",
    photos: [],
    subalbums: [],
    pseudo: false,
    count: 0,
};

const Gallery: FC = () => {
    const { collection = "", album = "", photo } = useParams();
    const { data = defaultData, isFetching, isSuccess, isError } = useGetAlbumQuery({ collection, album });
    const [subAlbum, setSubAlbum] = useState<string>("");
    const showPhoto = useRef<string | undefined>(photo);
    const zoom = useSelector(selectZoom);
    const dialog = useDialog();

    const isEmpty = data.count < 1;
    const hasSubAlbums = data.subalbums?.length > 0;
    const hasRootSubAlbumPhotos = useMemo(() => data.photos?.some(photo => photo.subalbum === ""), [data.photos]);

    const photos = useMemo((): PhotoImageType[] => {
        let list = data?.photos || [];
        // Filter photos by subalbum
        if(subAlbum === rootSubAlbum)
            list = list.filter(v => v.subalbum === "");
        else if(subAlbum !== "")
            list = list.filter(v => subAlbum === v.subalbum);
        // Create urls for thumbnails
        return list.map(v => ({ ...v, src: urls.thumb(v) }));
    }, [data, subAlbum]);

    // Clear sub-album selection when album changes
    useEffect(() => setSubAlbum(""), [collection, album, setSubAlbum]);

    // Open lightbox only after loading if a photo is provided from path parameters
    useEffect(() => {
        if(showPhoto.current !== undefined && isSuccess) {
            const index = photos.findIndex(i => i.id === showPhoto.current);
            if(index >= 0)
                dialog.lightbox(photos, index);
            showPhoto.current = undefined;
        }
    }, [dialog, photos, isSuccess]);

    const handleSubAlbum = (selected: string) => () => {
        setSubAlbum(selected === subAlbum ? "" : selected);
    }
    
    // Loading
    if(isFetching)
        return (
            <Box sx={{ width: '100%' }}>
                <LinearProgress />
            </Box>);

    // Error, album not found
    if(isError)
        return (
            <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <DangerousIcon fontSize="large" sx={{ m: 1 }} />
                <Typography variant="h6">Album not found.</Typography>
            </Box>);
    
    // Empty album
    if(isEmpty)
        return (
            <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <ReportIcon fontSize="large" sx={{ m: 1 }} />
                <Typography variant="h6">No photos in this album.</Typography>
            </Box>);

    // All OK, render Gallery

    const RenderPhoto = Thumb(photos, zoom >= 100);

    const subAlbumsComponent = (
        <Paper elevation={4} square>
            <Stack direction="row" p={1.5} spacing={1} useFlexGap flexWrap="wrap">
                {hasRootSubAlbumPhotos && <Chip key={rootSubAlbum} label={rootSubAlbum} variant={subAlbum === rootSubAlbum ? "filled" : "outlined"} onClick={handleSubAlbum(rootSubAlbum)} />}
                {data.subalbums?.map(v => <Chip key={v} label={v} variant={subAlbum === v ? "filled" : "outlined"} onClick={handleSubAlbum(v)} />)}
            </Stack>
        </Paper>);

    return (<>
        {hasSubAlbums && subAlbumsComponent}
        <SelectionContext<PhotoType> key={`${collection}:${album}`} transformItemToId={item => item.id}>
            <PhotoAlbum
                photos={photos}
                layout="rows"
                targetRowHeight={zoom}
                rowConstraints={{ singleRowMaxHeight: zoom*2 }}
                spacing={1}
                renderPhoto={RenderPhoto} />
        </SelectionContext>
    </>);
}

export default Gallery;
