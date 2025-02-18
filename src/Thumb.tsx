import { useState, CSSProperties, Fragment, FC } from "react";
import { useParams } from "react-router-dom";
import { styled } from "@mui/material/styles";

import Divider from "@mui/material/Divider";
import IconButton from '@mui/material/IconButton';
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";

import {
    IconInfoCircleFilled,
    IconLivePhoto,
    IconPlayerPlayFilled,
    IconHeart,
    IconHeartMinus,
    IconHeartPlus,
    IconHeartFilled,
} from '@tabler/icons-react';

import { PhotoImageType, PseudoAlbumType } from "./types";

const iconsStyle: CSSProperties = {
    WebkitFilter: "drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8))",
    filter: "drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8))",
    color: "white",
    pointerEvents: "none",
};

const Badge = styled("span")({
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "100px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "0px 4px",
    marginLeft: "3px",
    lineHeight: 0,
});

interface ThumbProps {
    photo: PhotoImageType;
    width: number;
    height: number;
    index: number;
    // Callbacks
    showLightbox(index: number): void;
    showInfo(index: number): void;
    saveFavorite(index: number): void;
    // Favorite
    selectedFavorite: PseudoAlbumType;
    favoriteStatus: {
        isFavorite: boolean;
        isFavoriteThis: boolean;
        isFavoriteAnother: boolean;
    };
}

const Thumb: FC<ThumbProps> = ({ index, photo, width, height, showLightbox, showInfo, saveFavorite, selectedFavorite, favoriteStatus }) => {
    const { collection } = useParams();
    const [mouseOver, setMouseOver] = useState<boolean>(false);

    const { isFavorite, isFavoriteThis, isFavoriteAnother } = favoriteStatus;

    const onMouseEnter = () => {
        setMouseOver(true);
    }
    const onMouseLeave = () => {
        setMouseOver(false);
    }

    const onClickImg = (event: React.MouseEvent<Element, MouseEvent>) => {
        event.stopPropagation();
        showLightbox(index);
    }
    const onClickInfo = (event: React.MouseEvent<Element, MouseEvent>) => {
        event.stopPropagation();
        showInfo(index);
    }
    const onClickFavorite = (event: React.MouseEvent<Element, MouseEvent>) => {
        event.stopPropagation();
        saveFavorite(index);
    }

    const favoriteTooltip = !isFavorite ? (
        <>Add as favorite in album {selectedFavorite?.album}</>
    ) : (
        <div onClick={e => e.stopPropagation()}>
            <b>This photo is from album:</b><br />
            &bull;
            <Link href={`/${photo.collection}/${photo.album}/${photo.id}`} target="_blank" color="inherit" underline="hover">
                {photo.album} {collection !== photo.collection && <Badge>{photo.collection}</Badge>}
            </Link>
            <br />
            <b>And it is favorite in:</b><br />
            {photo.favorite?.map(favorite => (
                <Fragment key={`${favorite.collection}:${favorite.album}`}>
                    &bull;
                    <Link href={`/${favorite.collection}/${favorite.album}`} target="_blank" color="inherit" underline="hover">
                        {favorite.album} {collection !== favorite.collection && <Badge>{favorite.collection}</Badge>}
                    </Link>
                    <br />
                </Fragment>)
            )}
            <Divider />
            Press to {isFavoriteThis ? "remove from" : "add to"} {selectedFavorite?.album}
        </div>
    );

    return (
        <div
            style={{ width, height, position: "relative" }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}>
            <img
                src={photo.src}
                alt={photo.title}
                title={photo.title}
                width="100%"
                height="100%"
                loading="lazy"
                decoding="async"
                onClick={onClickImg}
                style={{ cursor: "pointer" }} />

            {photo.type === "live" &&
                <IconLivePhoto size={20} style={{ ...iconsStyle, position: "absolute", top: 10, left: 10 }} />
            }
            {photo.type === "video" &&
                <IconPlayerPlayFilled
                    style={{
                        ...iconsStyle,
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: "40%",
                        height: "40%",
                        transform: "translate(-50%, -50%)",
                    }} />
            }
            {mouseOver &&
                <IconButton color="default" onClick={onClickInfo} style={{ position: "absolute", top: 1, right: 1 }}>
                    <IconInfoCircleFilled style={iconsStyle} />
                </IconButton>
            }
            {(isFavorite || mouseOver) &&
                <Tooltip title={favoriteTooltip} arrow>
                    <IconButton onClick={onClickFavorite} style={{ position: "absolute", bottom: 1, right: 1 }} aria-label="favorite">
                        {(mouseOver && !isFavorite) && <IconHeartPlus style={iconsStyle} />}
                        {(mouseOver && isFavoriteThis) && <IconHeartMinus style={iconsStyle} />}
                        {(mouseOver && isFavoriteAnother) && <IconHeartPlus style={iconsStyle} />}
                        {(!mouseOver && isFavoriteThis) && <IconHeartFilled style={iconsStyle} />}
                        {(!mouseOver && isFavoriteAnother) && <IconHeart style={iconsStyle} />}
                    </IconButton>
                </Tooltip>
            }
        </div >);
}

export default Thumb;
