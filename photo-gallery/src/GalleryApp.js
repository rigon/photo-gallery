import React, { Component } from 'react';
import Gallery from "react-photo-gallery";
import Carousel, { Modal, ModalGateway } from "react-images";
import { photos } from "./photos";

class GalleryApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentImage: 0,
            viewerIsOpen: false
        };
    }

    render() {
        const openLightbox = (event, { photo, index }) => {
            this.setState({
                currentImage: index,
                viewerIsOpen: true
            });
        };
    
        const closeLightbox = () => {
            this.setState({
                viewerIsOpen: false
            });
        };

        return (
            <div>
                <Gallery photos={photos} onClick={openLightbox} />
                <ModalGateway>
                    {this.state.viewerIsOpen ? (
                    <Modal onClose={closeLightbox}>
                        <Carousel
                        currentIndex={this.state.currentImage}
                        views={photos.map(x => ({
                            ...x,
                            srcset: x.srcSet,
                            caption: x.title
                        }))}
                        />
                    </Modal>
                    ) : null}
                </ModalGateway>
            </div>
        );
    }
}

export default GalleryApp;
