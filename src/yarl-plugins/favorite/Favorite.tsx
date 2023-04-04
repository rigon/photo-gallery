import * as React from "react";

import { Plugin, PluginProps } from "yet-another-react-lightbox/types";
import { FavoriteButton } from "./FavoriteButton";

/** Favorite plugin */
export const Favorite: Plugin = ({ augment }: PluginProps): void => {
    augment(({ toolbar: { buttons, ...restToolbar }, ...restProps }) => ({
        toolbar: {
            buttons: [<FavoriteButton key="favorite" />, ...buttons],
            ...restToolbar,
        },
        ...restProps,
    }));
};
