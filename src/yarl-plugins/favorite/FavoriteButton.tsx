import * as React from "react";

import {
    IconButton,
    label,
    useLightboxProps,
    useLightboxState,
} from "yet-another-react-lightbox/core";

import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteTwoToneIcon from "@mui/icons-material/FavoriteTwoTone";

import useFavorite from "../../favoriteHook";

const defaultProps = {
    onChange: () => {/* do nothing*/},
};

export const FavoriteButton: React.FC = () => {
    const {
        currentIndex,
        slides,
    } = useLightboxState();

    const {
        favorite: props,
        labels,
    } = useLightboxProps();

    const { onChange } = { ...defaultProps, ...props };
    const { isFavorite, isFavoriteThis } = useFavorite().list(slides[currentIndex].favorite);

    const toggleFavorite = React.useCallback(() => {
        onChange(currentIndex, !isFavoriteThis, slides[currentIndex]);
    }, [onChange, currentIndex, slides, isFavoriteThis]);


    return (
        <IconButton
            label={isFavoriteThis ? label(labels, "Save to favorites") : label(labels, "Remove from favorites")}
            icon={isFavorite ? isFavoriteThis ? FavoriteIcon : FavoriteTwoToneIcon : FavoriteBorderIcon}
            onClick={toggleFavorite}
        />
    );
};
