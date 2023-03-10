import * as React from "react";

import { Plugin } from "yet-another-react-lightbox/types";
import { FavoriteButton } from "./FavoriteButton";

/** Favorite plugin */
export const Favorite: Plugin = ({ augment }) => {
    augment(({ toolbar: { buttons, ...restToolbar }, ...restProps }) => ({
        toolbar: {
            buttons: [<FavoriteButton key="favorite" />, ...buttons],
            ...restToolbar,
        },
        ...restProps,
    }));
};
