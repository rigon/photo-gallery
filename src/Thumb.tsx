import React, { useState, CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { SxProps, Theme, styled } from "@mui/material/styles";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteTwoToneIcon from '@mui/icons-material/FavoriteTwoTone';
import IconButton from '@mui/material/IconButton';
import InfoIcon from '@mui/icons-material/Info';
import PlayIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import Tooltip from "@mui/material/Tooltip";

import { RenderPhotoProps } from "react-photo-album";

import BoxBar from "./BoxBar";
import LivePhotoIcon from "./icons/LivePhotoIcon";
import { PhotoImageType } from "./types";
import useFavorite from "./favoriteHook";
import { useDialog } from "./dialogs";

const boxStyle: SxProps<Theme> = {
    position: "relative",
    color: "white",
    backgroundColor: "action.hover",
    cursor: "pointer",
};
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

export default (photos: PhotoImageType[], showIcons: boolean) => ({ photo, layout, wrapperStyle, renderDefaultPhoto }: RenderPhotoProps<PhotoImageType>) => {
    const { collection } = useParams();
    const dialog = useDialog();
    const [mouseOver, setMouseOver] = useState<boolean>(false);

    const favorite = useFavorite();
    const selectedFavorite = favorite.get();
    const { isFavorite, isFavoriteThis, isFavoriteAnother } = favorite.photo(photo);

    const mouseEnter = () => {
        setMouseOver(true);
    }
    const mouseLeave = () => {
        setMouseOver(false);
    }
    const openLightbox = (event: React.MouseEvent<Element, MouseEvent>) => {
        event.stopPropagation();
        dialog.lightbox(photos, layout.index);
    }
    const saveFavorite = (event: React.MouseEvent<Element, MouseEvent>) => {
        event.stopPropagation();
        favorite.toggle(photos, layout.index);
    }
    const showInfo = (event: React.MouseEvent<Element, MouseEvent>) => {
        event.stopPropagation();
        dialog.info(photos, layout.index);
    }

    const favoriteTooltip = !isFavorite ? (
        <>Add as favorite in album {selectedFavorite?.album}</>
    ):(<>
        <b>This photo is from album:</b><br />
            &bull; {photo.album} {collection !== photo.collection && <Badge>{photo.collection}</Badge>}<br />
        <b>And it is favorite in:</b><br />
            {photo.favorite?.map(favorite => (
                <React.Fragment key={`${photo.collection}:${photo.album}`}>
                    &bull; {favorite.album} {collection !== favorite.collection && <Badge>{favorite.collection}</Badge>}<br />
                </React.Fragment>)
            )}
        <Divider />
        Press to {isFavoriteThis ? "remove from" : "add to"} {selectedFavorite?.album}
    </>);

    const icons = (<>
        {photo.type === "live" &&
            <BoxBar top left>
                <LivePhotoIcon fontSize="small" style={iconsStyle} />
            </BoxBar>
        }
        {photo.type === "video" &&
            <BoxBar middle center>
                <PlayIcon style={{ ...iconsStyle, width: "100%", height: "100%" }} />
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
                    <IconButton color="inherit" onClick={saveFavorite} style={iconsStyle} aria-label="favorite">
                        {!isFavorite && <FavoriteBorderIcon />}
                        {isFavoriteThis && <FavoriteIcon />}
                        {isFavoriteAnother && <FavoriteTwoToneIcon />}
                    </IconButton>
                </Tooltip>
            </BoxBar>
        }
    </>);

    return (
        <Box
            sx={{ ...wrapperStyle, ...boxStyle }}
            onMouseEnter={mouseEnter}
            onMouseLeave={mouseLeave}
            onClick={openLightbox}
            onDoubleClick={saveFavorite}>
            {renderDefaultPhoto({ wrapped: true })}
            {showIcons && icons}
        </Box>
    );
}
