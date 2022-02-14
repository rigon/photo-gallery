import React, { Component } from 'react';
import { useParams } from 'react-router-dom';
import Gallery from "react-photo-gallery";
import Carousel, { Modal, ModalGateway } from "react-images";

function withParams(Component) {
    return props => <Component {...props} params={useParams()} />;
}

class GalleryApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            photos: [],
            currentImage: 0,
            viewerIsOpen: false
        };
        
        this.currentAlbum = null;
    }

    fetchPhotos(album) {
        fetch(`/album/${album}`)
            .then((response) => response.json())
            .then(album => {
                this.setState({ photos: album.photos });
            });
    }

    componentDidMount() {
        let { album } = this.props.params;
        this.fetchPhotos(album);
    }

    shouldComponentUpdate(nextProps) {
        if(nextProps.params.album !== this.currentAlbum) {
            this.currentAlbum = nextProps.params.album;
            this.fetchPhotos(nextProps.params.album);
            return false;
        }
        return true;
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
                        views={this.state.photos.map(photo => ({
                                src: photo.full,
                                caption: photo.title
                            }))}
                        />
                    </Modal>
                    ) : null}
                </ModalGateway>
            </div>
        );
    }
}

export default withParams(GalleryApp);
