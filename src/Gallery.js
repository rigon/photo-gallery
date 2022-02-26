import React, { Component } from 'react';
import { useParams } from 'react-router-dom';
import ReactPhotoGallery from "react-photo-gallery";
import Carousel, { Modal, ModalGateway } from "react-images";
import Thumbnail from "./Thumbnail";

function withParams(Component) {
    return props => <Component {...props} params={useParams()} />;
}

class Gallery extends Component {
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
                <ReactPhotoGallery photos={this.state.photos} onClick={openLightbox} targetRowHeight={120} margin={1} renderImage={ Thumbnail } />
                { this.state.viewerIsOpen &&
                    <ModalGateway>
                        <Modal onClose={closeLightbox}>
                            <Carousel
                                currentIndex={this.state.currentImage}
                                views={this.state.photos.map(photo => ({
                                    caption: photo.title,
                                    source: {
                                        download: photo.files[0].url,
                                        fullscreen: photo.files[0].url,
                                        regular: photo.files[0].url,
                                        thumbnail: photo.src,
                                    }
                                }))}
                            />
                        </Modal>
                    </ModalGateway>
                }
            </div>
        );
    }
}

export default withParams(Gallery);
