import * as React from "react";
import { Slide } from "yet-another-react-lightbox/types";

import { Favorite } from "./Favorite";

declare module "yet-another-react-lightbox/types" {
    /** Adds the favorite property to every slide type */
    interface GenericSlide {
        favorite: boolean
    }

    interface LightboxProps {
        /** Slideshow plugin settings */
        favorite?: {
            /** Event fired when the state is changed */
            onChange?: (isFavorite: boolean, slide: Slide, index: number) => void;
        };
    }

    interface Render {
        /** render custom Favorite icon */
        iconFavorite?: () => React.ReactNode;
        /** render custom NotFavorite icon */
        iconNotFavorite?: () => React.ReactNode;
        /** render custom Favorite button */
        buttonFavorite?: ({
            isFavorite,
            toggleFavorite
        }: {
            /** current favorite status */
            isFavorite: boolean;
            /** toggle favorite status */
            toggleFavorite: () => void;
        }) => React.ReactNode;
    }
}

export default Favorite;
