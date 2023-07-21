import { Slide, SlideImage, SlideVideo, SlideLivePhoto } from "yet-another-react-lightbox";
import { FileType, PhotoType, urls } from "./types";

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
        src: urls.thumb(photo),
        alt: photo.title,
        title: photo.title,
        description: new Date(photo.date).toLocaleString(),
        width: width * MAX_ZOOM,
        height: height * MAX_ZOOM,
        srcSet: [
            {   // Thumbnail
                src: encodeURI(urls.thumb(photo)),
                width: Math.round(THUMBNAIL_HEIGHT / ratio),
                height: THUMBNAIL_HEIGHT,
            },
            ...files.flatMap(file => ([{
                    // Original
                    src: encodeURI(urls.file(photo, file)),
                    width: file.width * MAX_ZOOM,
                    height: file.height * MAX_ZOOM,
                },
                // Reduced images according with breakpoints
                ...breakpoints.filter(bp => bp < width).map(bkWidth => {
                    const bkHeight = Math.round(ratio * bkWidth);
                    return {
                        src: encodeURI(`${urls.file(photo, file)}?width=${bkWidth}&height=${bkHeight}`),
                        width: bkWidth * MAX_ZOOM,
                        height: bkHeight * MAX_ZOOM,
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
        poster: urls.thumb(photo),
        title: photo.title,
        description: new Date(photo.date).toLocaleString(),
        width: photo.width,
        height: photo.height,
        sources: files.map(file => ({
            src: urls.file(photo, file),
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
        src: urls.thumb(photo),
        title: photo.title,
        description: new Date(photo.date).toLocaleString(),
        width: photo.width,
        height: photo.height,
        image: photoToSlideImage(photo, [file_image as FileType]),
        video: photoToSlideVideo(photo, [file_video as FileType]),
    }
}

export function photosToSlides(photos: PhotoType[]): Slide[] {
    return photos.map((photo) => {
        switch(photo.type) {
            case "image":
                return photoToSlideImage(photo, photo.files.filter(f => f.type === "image"));
            case "video":
                return photoToSlideVideo(photo, photo.files.filter(f => f.type === "video"));
            case "live":
                return photoToSlideLivePhoto(photo);
        }
    });
}

export default photosToSlides;
