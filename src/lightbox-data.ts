import { SlideVideo } from "yet-another-react-lightbox/plugins/video";
import { Slide, SlideImage } from "yet-another-react-lightbox/types";
import { FileType, PhotoType } from "./types";
import { SlideLivePhoto } from "./yarl-plugins/LivePhoto";

const breakpoints = [4320, 2160, 1080, 720, 640];
const THUMBNAIL_HEIGHT = 200;
const MAX_ZOOM = 5;

export function photoToSlideImage(photo: PhotoType, file: FileType): SlideImage {
    const favorite = photo.favorite;
    const original = file.url;
    const width = 3120; // photo.width;
    const height = 4160; //photo.height;
    const ratio = height / width;
    
    return {
        type: "image",
        favorite,
        src: photo.src,
        alt: photo.title,
        title: photo.title,
        width: width * MAX_ZOOM,
        height: height * MAX_ZOOM,
        srcSet: [
            {   // Thumbnail
                src: encodeURI(photo.src),
                width: Math.round(THUMBNAIL_HEIGHT / ratio),
                height: THUMBNAIL_HEIGHT,
            },
            {   // Original
                src: encodeURI(original),
                width,
                height,
            },
            ...breakpoints.filter(bp => bp < width).map((width) => {
                const height = Math.round(ratio * width);
                return {
                    src: encodeURI(`${original}?width=${width}&height=${height}`),
                    width,
                    height,
                };
            })
        ]
    };
}

export function photoToSlideVideo(photo: PhotoType, files: FileType[]): SlideVideo {
    return {
        type: "video",
        favorite: photo.favorite,
        poster: photo.src,
        title: photo.title,
        // width: photo.width,
        // height: photo.height,
        width: 1440,
        height: 1920,
        sources: files.map(file => ({
            src: file.url,
            //type: file.type,
            type: "",
        }))
    };
}

export function photoToSlideLivePhoto(photo: PhotoType): SlideLivePhoto {
    const file_image = photo.files.find(file => file.type === "image");
    const file_video = photo.files.find(file => file.type === "video");

    return {
        type: "live",
        favorite: photo.favorite,
        src: photo.src,
        title: photo.title,
        width: photo.width,
        height: photo.height,
        image: photoToSlideImage(photo, file_image as FileType),
        video: photoToSlideVideo(photo, [file_video as FileType]),
    }
}

export function photosToSlides(photos: PhotoType[]): Slide[] {
    // eslint-disable-next-line array-callback-return
    return photos.map((photo) => {
        switch(photo.type) {
            case "image":
                if(photo.files.length !== 1)
                    console.error("Photo of type image with more or less than one file", photo.title, photo.files);
                return photoToSlideImage(photo, photo.files[0]);
            case "video":
                return photoToSlideVideo(photo, photo.files);
            case "live":
                return photoToSlideLivePhoto(photo);
        }
    });
}

export default photosToSlides;
