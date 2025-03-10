import { FC } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from 'react-redux';

import Box from "@mui/material/Box";
import LinearProgress from '@mui/material/LinearProgress';
import Typography from "@mui/material/Typography";

import { RowsPhotoAlbum } from "react-photo-album";
import { UnstableInfiniteScroll as InfiniteScroll } from "react-photo-album/scroll";
import "react-photo-album/rows.css";

import {
    IconCircleX,
} from '@tabler/icons-react';

import { PhotoType, PhotoImageType, urls } from "./types";
import { selectZoom } from "./services/app";
// import { useDialog } from "./dialogs";
import useFavorite from "./favoriteHook";
import Thumb from "./Thumb";

const Gallery: FC = () => {
    const { collection } = useParams();
    // const dialog = useDialog();
    const favorite = useFavorite();
    const zoom = useSelector(selectZoom);

    const showLightbox = (_index: number) => {
        // dialog.lightbox(photos, index);
    }
    const showInfo = (_index: number) => {
        // dialog.info(photos, index);
    }
    const saveFavorite = (_index: number) => {
        // favorite.toggle(photos, index);
    }

    async function loadFromUrl(index: number): Promise<PhotoImageType[]> {
        try {
            const response = await fetch(`/api/collections/${collection}/photos?page=${index}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            return data.map((v: PhotoType) => ({ ...v, src: urls.thumb(v) }));
        } catch (error) {
            console.error("Error loading data:", error);
            throw error;
        }
    }

    return (
        <InfiniteScroll
            fetch={loadFromUrl}
            finished={<div className="finished">You are all set!</div>}
            loading={(
                <Box sx={{ width: '100%' }}>
                    <LinearProgress />
                </Box>)}
            error={(
                <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <IconCircleX size={42} />
                    <Typography variant="h6" sx={{ m: 1 }}>Album not found.</Typography>
                </Box>)}
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
        </InfiniteScroll>);
}

export default Gallery;
