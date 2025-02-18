import * as React from "react";

import {
    IconButton,
    useLightboxProps,
    useLightboxState,
} from "yet-another-react-lightbox/core";

import {
    IconHeart,
    IconHeartFilled,
} from "@tabler/icons-react";

import useFavorite from "../../favoriteHook";

const defaultProps = {
    onChange: () => {/* do nothing*/ },
};

export const FavoriteButton: React.FC = () => {
    const {
        currentIndex,
        slides,
    } = useLightboxState();

    const {
        favorite: props,
    } = useLightboxProps();

    const { onChange } = { ...defaultProps, ...props };
    const favoriteList = (slides && slides[currentIndex] ? slides[currentIndex].favorite : []);
    const { isFavoriteThis } = useFavorite().list(favoriteList);

    const toggleFavorite = React.useCallback(() => {
        onChange(currentIndex, !isFavoriteThis, slides[currentIndex]);
    }, [onChange, currentIndex, slides, isFavoriteThis]);


    return (
        <IconButton
            label={isFavoriteThis ? "Save to favorites" : "Remove from favorites"}
            icon={isFavoriteThis ? IconHeartFilled : IconHeart}
            onClick={toggleFavorite}
        />
    );
};
