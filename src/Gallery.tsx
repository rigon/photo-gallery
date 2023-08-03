import { FC, useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from 'react-redux';

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import DangerousIcon from '@mui/icons-material/Dangerous';
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from '@mui/material/LinearProgress';
import Paper from "@mui/material/Paper";
import ReportIcon from '@mui/icons-material/Report';
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import PhotoAlbum from "react-photo-album";

import Thumb from "./Thumb";
import { SelectionContext } from "./Selection";
import { PhotoType, PhotoImageType, urls, AlbumType } from "./types";
import { useDeleteAlbumMutation, useGetAlbumQuery } from "./services/api";
import { selectZoom } from "./services/app";
import useNotification from "./Notification";

const rootSubAlbum = "/";
const defaultData: AlbumType = {
    name: "",
    photos: [],
    subalbums: [],
    pseudo: false,
    count: 0,
};

const Gallery: FC = () => {
    const { collection = "", album = "" } = useParams();
    const { data = defaultData, isFetching, isError } = useGetAlbumQuery({ collection, album });
    const [deleteAlbum] = useDeleteAlbumMutation();
    const [subAlbum, setSubAlbum] = useState<string>("");
    const [showDeleteAlbum, setDeleteAlbum] = useState<boolean>(false);
    const { successNotification, errorNotification } = useNotification();
    const zoom = useSelector(selectZoom);

    const navigate = useNavigate();
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

    // Clear sub-album selection when album changed
    useEffect(() => setSubAlbum(""), [collection, album, setSubAlbum]);

    const handleSubAlbum = (selected: string) => () => {
        setSubAlbum(selected === subAlbum ? "" : selected);
    }
    const handleDeleteAlbum = async () => {
        setDeleteAlbum(false);
        try {
            await deleteAlbum({ collection, album }).unwrap();
            successNotification(`Album ${album} successfully deleted`);
            navigate("/" + collection);
        }
        catch (error: any) {
            errorNotification(`Error deleting album: ${error.data.message}!`);
            console.log(error);
        }
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
                <Button variant="outlined" color="error" sx={{mt: 10}} onClick={() => setDeleteAlbum(true)}>Delete Album</Button>
                <Dialog fullWidth open={showDeleteAlbum} onClose={() => setDeleteAlbum(false)} aria-labelledby="confirm-delete-album">
                    <DialogTitle id="confirm-delete-album">Deleting album {album}</DialogTitle>
                    <DialogContent>
                        <Typography variant="body1">This action cannot be undone. Are you sure you want to delete this album?</Typography>
                        <Typography variant="body2" sx={{mt: 2}}>The album will be deleted only if it is empty.</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteAlbum(false)} color="inherit">Cancel</Button>
                        <Button onClick={handleDeleteAlbum} color="error" variant="contained" disableElevation>Delete</Button>
                    </DialogActions>
                </Dialog>
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
