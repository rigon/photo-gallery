import React, { Component } from 'react';
import { useParams } from 'react-router-dom';
import Gallery from "react-photo-gallery";
import Carousel, { Modal, ModalGateway } from "react-images";
import { photos } from "./photos";

class GalleryApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            photos: [],
            currentImage: 0,
            viewerIsOpen: false
        };
    }

    componentDidMount() {
        //const { album } = useParams();
        const album = "";
        fetch(`/album/${album}`)
            .then((response) => response.json())
            .then(album => {
                this.setState({ photos: album.photos });
            });
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
                <Gallery photos={this.state.photos} onClick={openLightbox} />
                <ModalGateway>
                    {this.state.viewerIsOpen ? (
                    <Modal onClose={closeLightbox}>
                        <Carousel
                        currentIndex={this.state.currentImage}
                        views={this.state.photos.map(x => ({
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
