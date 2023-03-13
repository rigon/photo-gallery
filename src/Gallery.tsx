import { FC, useState, useMemo, useEffect, CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from 'react-redux';

import { SxProps, Theme, styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteTwoToneIcon from '@mui/icons-material/FavoriteTwoTone';
import IconButton from '@mui/material/IconButton';
import InfoIcon from '@mui/icons-material/Info';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from "@mui/material/Paper";
import PlayIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";

import PhotoAlbum, { RenderPhotoProps, Image } from "react-photo-album";

import BoxBar from "./BoxBar";
import PhotoInfo from "./PhotoInfo";
import Lightbox from "./Lightbox";
import LivePhotoIcon from "./icons/LivePhotoIcon";
import useFavorite from "./favoriteHook";
import useNotification from "./Notification";
import { PhotoType, urls } from "./types";
import { useGetAlbumQuery, useSavePhotoToPseudoMutation } from "./services/api";
import { selectZoom } from "./services/app";

type Photo = PhotoType & Image;

const iconsStyle: CSSProperties = {
    WebkitFilter: "drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8))",
    filter: "drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8))",
};
const Badge = styled("span")({
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "100px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "0px 4px",
    marginLeft: "3px",
    lineHeight: 0,
});

const Gallery: FC = () => {
    const { collection = "", album = ""} = useParams();
    const { data, isFetching } = useGetAlbumQuery({collection, album});
    const [ lightboxIndex, setLightboxIndex ] = useState<number>(-1);
    const [ infoPhotoIndex, setInfoPhotoIndex ] = useState<number>(-1);
    const [ subAlbum, setSubAlbum ] = useState<string>("");
    const [ saveFavorite ] = useSavePhotoToPseudoMutation();
    const { infoNotification, errorNotification } = useNotification();
    const zoom = useSelector(selectZoom);
    const favorite = useFavorite();

    const subalbums = data?.subalbums || [];

    const photos = useMemo((): Photo[] => {
        let l = data?.photos || [];
        // Filter photos by subalbum
        if(subAlbum !== "")
            l = l.filter(v => subAlbum === v.subalbum);
        // Create urls for thumbnails
        return l.map(v => ({...v, src: urls.thumb(v)}));
    }, [data, subAlbum]);

    // Clear sub-album selection when album changed
    useEffect(() => setSubAlbum(""), [collection, album, setSubAlbum]);

    const toggleFavorite = async (index: number) => {
        const selected = favorite.get();
        if(selected === undefined) {
            errorNotification("No favorite album is selected. Select first from the top toolbar.");
            return;
        }
        if(collection === "" || album === "" || index < 0 || index >= photos.length) {
            errorNotification("Select a collection and an album from the left menu.");
            return;
        }

        const photo = photos[index];
        const isFavorite = !(favorite.photo(photo).isFavoriteThis);
        try {
            await saveFavorite({
                collection: selected.collection,
                album: selected.album,
                favorite: isFavorite,
                saveData: {
                    collection,
                    album,
                    photos: [photo.id], // TODO: change here for bulk selection
                },
                photoIndex: [index], // TODO: change here for bulk selection
            }).unwrap();
            infoNotification(isFavorite ?
                `Photo added as favorite to ${selected.album}` :
                `Photo removed as favorite from ${selected.album}`);
        }
        catch(error) {
            errorNotification(`Could not set the photo as favorite in ${selected.album}!`);
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
    
    const [selecting, setSelecting] = useState<boolean>(false);
    const [selection, setSelection] = useState<boolean[]>([]);
    const [selectionFirstMove, setSelectionFirstMove] = useState<boolean>(true);
    const [selectionSelect, setSelectionSelect] = useState<boolean>(true);
    const [selectionStart, setSelectionStart] = useState<number>(0);
    const cancelSelection = () => {
        console.log("cancelSelection");
        setSelection([]);
        setSelecting(false);
        setSelectionFirstMove(true);
    }
    useEffect(() => cancelSelection(), [photos]);

    const RenderPhoto = ({ photo, layout, wrapperStyle, renderDefaultPhoto }: RenderPhotoProps<Photo>) => {
        const [mouseOver, setMouseOver] = useState<boolean>(false);
        const { isFavorite, isFavoriteThis, isFavoriteAnother } = favorite.photo(photo);
        const selFavorite = favorite.get();


        const mouseEnter = () => {
            setMouseOver(true);
            print("onMouseEnter");
        }
        const mouseLeave = () => {
            setMouseOver(false);
            print("onMouseLeave");
        }
        const openLightbox = () => {
            setLightboxIndex(layout.index);
            //cancelSelection();
            print("onClick");
        }
        const saveFavorite = (event: { stopPropagation: () => void; }) => {
            event.stopPropagation();
            toggleFavorite(layout.index);
        }
        const showInfo = (event: { stopPropagation: () => void; }) => {
            event.stopPropagation();
            setInfoPhotoIndex(layout.index);
        }


        const favoriteTooltip = isFavorite ?
            <>
                <b>This photo is favorite in:</b><br />
                {photo.favorite?.map(f => <>&bull; {f.album}
                    {collection !== f.collection && <Badge>{f.collection}</Badge>}
                    <br /></>
                )}
                <Divider/>
                Press to {isFavoriteThis ? "remove from" : "add to"} {selFavorite?.album}
            </> :
            <>Add as favorite in album {selFavorite?.album}</>;

        const icons = (<>
            {photo.type === "live" &&
                <BoxBar top left>
                    <LivePhotoIcon fontSize="small" style={iconsStyle} />
                </BoxBar>
            }
            {photo.type === "video" &&
                <BoxBar middle center>
                    <PlayIcon style={{...iconsStyle, width: "100%", height: "100%"}}/>
                </BoxBar>
            }
            {mouseOver &&
                <BoxBar top right>
                    <IconButton color="inherit" onClick={showInfo}>
                        <InfoIcon style={iconsStyle} />
                    </IconButton>
                </BoxBar>
            }
            {(isFavorite || mouseOver) &&
                <BoxBar bottom right>
                    <Tooltip title={favoriteTooltip} arrow>
                        <IconButton color="inherit" onClick={saveFavorite} style={iconsStyle}>
                            {!isFavorite && <FavoriteBorderIcon/>}
                            {isFavoriteThis && <FavoriteIcon/>}
                            {isFavoriteAnother && <FavoriteTwoToneIcon/>}
                        </IconButton>
                    </Tooltip>
                </BoxBar>
            }
        </>);
        // Selection

        const startSelection = () => {
            console.log("startSelection");
            setSelecting(true);
            setSelectionStart(layout.index);
            setSelectionSelect(!selection[layout.index]);
        }
        const stopSelection = () => {
            console.log("stopSelection");
            console.log(selection);
            setSelecting(false);
        }
        const select = () => {
            if(!selecting)
                return;
            if(selectionFirstMove) {
                setSelectionFirstMove(false)
                return;
            }
            
            console.log("select");
            
            let newSelection = selection.slice();   // Copy the array
            const min = Math.min(selectionStart, layout.index);
            const max = Math.max(selectionStart, layout.index);
            for(let i = min; i<=max; i++)
                newSelection[i] = selectionSelect;
            
            setSelection(newSelection);
        }
        const print = (arg: string) => {
            console.log(arg, photo.title);
        }

        const boxStyle: SxProps<Theme> = {
            position: "relative",
            color: "white",
            backgroundColor: "action.hover",
            cursor: "pointer",
        };
        const selectedStyle: SxProps<Theme> =
            selection[layout.index] === true ? {
                border: "5px solid dodgerblue",
                boxSizing: "border-box",
            } : {};
        
        return (
            <Box
                sx={{ ...wrapperStyle, ...boxStyle, ...selectedStyle }}
                onMouseEnter={mouseEnter}
                onMouseLeave={mouseLeave}
                onClick={openLightbox}
                onDoubleClick={saveFavorite}
                
                // onTouchCancel={()=>print("onTouchCancel")}
                onMouseDown={(e)=>{print("onMouseDown"); startSelection();}}
                onMouseMove={()=>{print("onMouseMove"); select();}}
                onMouseUp={(e)=>{print("onMouseUp"); stopSelection();}}
                onTouchStartCapture={(e)=>{print("onTouchStart"); startSelection();}}
                onTouchMove={(e)=>{print("onTouchMove"); select();}}
                onTouchEnd={(e)=>{print("onTouchEnd"); stopSelection();}}
                // onMouseOut={()=>print("onMouseOut")} 
                // onMouseOver={()=>print("onMouseOver")}
                // onMouseUp={()=>print("onMouseUp")}
                // onDragStart={()=>false}
                // onDragCapture={(e)=>e.preventDefault()}
                // draggable={false}
                >
                    {renderDefaultPhoto({ wrapped: true })}
                    {zoom >= 100 && icons}
            </Box>
        );
    }
    
    const gallery = (
        <div onTouchMove={e => e.preventDefault()}>
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
                componentsProps={{imageProps: { draggable: false }}}
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
        </div>);
    
    const loading = (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>);
    
    return isFetching ? loading : gallery;
}

export default Gallery;
