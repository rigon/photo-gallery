import * as React from "react";

import { Plugin, PluginProps } from "yet-another-react-lightbox/types";
import { InfoButton } from "./InfoButton";

/** Info plugin */
export const Info: Plugin = ({ augment }: PluginProps): void => {
    augment(({ toolbar: { buttons, ...restToolbar }, ...restProps }) => ({
        toolbar: {
            buttons: [<InfoButton key="info" />, ...buttons],
            ...restToolbar,
        },
        ...restProps,
    }));
};
