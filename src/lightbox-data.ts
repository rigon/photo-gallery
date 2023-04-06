import { Slide, SlideImage, SlideVideo, SlideLivePhoto } from "yet-another-react-lightbox/types";
import { FileType, PhotoType } from "./types";

const breakpoints = [4320, 2160, 1080, 720, 640];
const THUMBNAIL_HEIGHT = 200;
const MAX_ZOOM = 5;

export function photoToSlideImage(photo: PhotoType, files: FileType[]): SlideImage {
    const favorite = photo.favorite;
    const width = photo.width;
    const height = photo.height;
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
            ...files.flatMap(file => ([{
                    // Original
                    src: encodeURI(file.url),
                    width,
                    height,
                },
                // Reduced images according with breakpoints
                ...breakpoints.filter(bp => bp < width).map(bkWidth => {
                    const bkHeight = Math.round(ratio * bkWidth);
                    return {
                        src: encodeURI(`${file.url}?width=${bkWidth}&height=${bkHeight}`),
                        width: bkWidth,
                        height: bkHeight,
                    };
                })
            ])),
        ]
    };
}

export function photoToSlideVideo(photo: PhotoType, files: FileType[]): SlideVideo {
    return {
        type: "video",
        favorite: photo.favorite,
        poster: photo.src,
        title: photo.title,
        width: photo.width,
        height: photo.height,
        sources: files.map(file => ({
            src: file.url,
            type: file.mime,
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
        image: photoToSlideImage(photo, [file_image as FileType]),
        video: photoToSlideVideo(photo, [file_video as FileType]),
    }
}

export function photosToSlides(photos: PhotoType[]): Slide[] {
    // eslint-disable-next-line array-callback-return
    return photos.map((photo) => {
        switch(photo.type) {
            case "image":
                return photoToSlideImage(photo, photo.files);
            case "video":
                return photoToSlideVideo(photo, photo.files);
            case "live":
                return photoToSlideLivePhoto(photo);
        }
    });
}

export default photosToSlides;
