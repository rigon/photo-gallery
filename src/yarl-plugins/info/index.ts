import { Info } from "./Info";

declare module "yet-another-react-lightbox" {
    interface LightboxProps {
        /** Slideshow plugin settings */
        info?: {
            /** Event fired when the state is changed */
            onClick?: (index: number) => void;
        };
    }
}

export default Info;
