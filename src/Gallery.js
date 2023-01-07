import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import PropTypes from 'prop-types';

import PhotoAlbum from "react-photo-album";

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// import optional lightbox plugins
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";

function Gallery({zoom}) {
    const {collection, album} = useParams();
    const [photos, setPhotos] = useState([]);
    const [index, setIndex] = useState(-1);

    useEffect(() => {
        // Clear gallery when a new album is selected
        setPhotos([]);

        fetch(`/collection/${collection}/album/${album}`)
            .then((response) => response.json())
            .then(album => {
                setPhotos(album.photos);
            });
    }, [collection, album]);

    return (
        <>
            <PhotoAlbum
                photos={photos}
                layout="rows"
                targetRowHeight={zoom}
                spacing={1}
                onClick={({ index }) => setIndex(index)} />
            <Lightbox
                slides={photos.map(({ src, width, height }) => ({
                    src,
                    width: 2000,
                    height: 2000,
                    srcSet: [{
                        src: src,
                        width: 200,
                        height: 200,
                    }],
                }))}
                open={index >= 0}
                index={index}
                animation={{ swipe: 150 }}
                close={() => setIndex(-1)}
                // enable optional lightbox plugins
                plugins={[Fullscreen, Slideshow, Thumbnails, Video, Zoom]}
                carousel={{
                    finite: true,
                    preload: 3,
                    padding: 0,
                    spacing: 0,
                    imageFit: "contain"
                }}
                thumbnails={{
                    position: "bottom",
                    width: 80,
                    height: 80,
                    borderRadius: 0,
                    padding: 0,
                    gap: 2
                  }} />
        </>
    );
}

Gallery.propTypes = {
    zoom: PropTypes.number,
}

export default Gallery;
