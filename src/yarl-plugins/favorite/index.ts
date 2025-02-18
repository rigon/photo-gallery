import { Slide } from "yet-another-react-lightbox";

import { Favorite } from "./Favorite";
import { PseudoAlbumType } from "../../types";

declare module "yet-another-react-lightbox" {
    /** Adds the favorite property to every slide type */
    interface GenericSlide {
        favorite: PseudoAlbumType[]
    }

    interface LightboxProps {
        /** Slideshow plugin settings */
        favorite?: {
            /** Event fired when the state is changed */
            onChange?: (index: number, isFavorite: boolean, slide: Slide) => void;
        };
    }

    interface Labels {
        // TODO v4: change Fullscreen to lowercase
        "Save to favorites": string;
        "Remove from favorites": string;
    }
}

export default Favorite;
