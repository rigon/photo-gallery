import { Info } from "./Info";

declare module "yet-another-react-lightbox" {
    interface LightboxProps {
        /** Slideshow plugin settings */
        info?: {
            /** Event fired when the state is changed */
            onClick?: (index: number) => void;
        };
    }

    interface Labels {
        // TODO v4: change Fullscreen to lowercase
        "Show photo details": string;
    }
}

export default Info;
