import * as React from "react";

import {
    ACTIVE_SLIDE_COMPLETE,
    cleanup,
    IconButton,
    label,
    useEvents,
    useLightboxProps,
    useLightboxState,
} from "yet-another-react-lightbox/core";

import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";

const defaultProps = {
    onChange: ()=>{},
};

export const FavoriteButton: React.FC = () => {
    const {
        state: {
            currentIndex,
            slides,
        },
    } = useLightboxState();
    const { subscribe } = useEvents();

    const {
        favorite: props,
        render,
        labels,
    } = useLightboxProps();
    
    const {onChange} = { ...defaultProps, ...props };
    const [isFavorite, setFavorite] = React.useState(slides[currentIndex].favorite);
    const [updateFavorite, setUpdateFavorite] = React.useState(false);
    
    if(updateFavorite) {
        setFavorite(slides[currentIndex].favorite);
        setUpdateFavorite(false);
    };

    React.useEffect(
        () => cleanup(subscribe(ACTIVE_SLIDE_COMPLETE, () => setUpdateFavorite(true))),
        [subscribe]);

    const toggleFavorite = React.useCallback(() => {
        setFavorite(() => !isFavorite);
        onChange(currentIndex, !isFavorite, slides[currentIndex]);
    }, [onChange, currentIndex, slides, isFavorite]);


    return render.buttonFavorite ? (
        <>{render.buttonFavorite({ isFavorite, toggleFavorite })}</>
    ) : (
        <IconButton
            label={isFavorite ? label(labels, "Save to favorites") : label(labels, "Remove from favorites")}
            icon={isFavorite ? FavoriteIcon : FavoriteBorderIcon}
            renderIcon={isFavorite ? render.iconFavorite : render.iconNotFavorite}
            onClick={toggleFavorite}
        />
    );
};
