import React, { Component, Fragment } from 'react';
import { useParams } from 'react-router-dom';
import ReactPhotoGallery from 'react-photo-gallery';
// Custom components
import Carousel from './Carousel';
import Thumbnail from './Thumbnail';

function withParams(Component) {
    return props => <Component {...props} params={useParams()} />;
}

class Gallery extends Component {
    constructor(props) {
        super(props);
        this.state = {
            photos: [],
            selectedImage: 0,
            viewerIsOpen: false
        };
        
        this.currentAlbum = null;
    }

    fetchPhotos(collection, album) {
        // Clear gallery when a new album is selected
        this.setState({ photos: [] });
        fetch(`/collection/${collection}/album/${album}`)
            .then((response) => response.json())
            .then(album => {
                this.setState({ photos: album.photos });
            }); 
    }

    componentDidMount() {
        let { collection, album } = this.props.params;
        this.fetchPhotos(collection, album);
    }

    shouldComponentUpdate(nextProps) {
        if(nextProps.params.album !== this.currentAlbum) {
            this.currentAlbum = nextProps.params.album;
            this.fetchPhotos(nextProps.params.collection, nextProps.params.album);
            return false;
        }
        return true;
    }
    
    openLightbox = (event, { photo, index }) => {
        this.setState({
            selectedImage: index,
            viewerIsOpen: true
        });
    };
    
    closeLightbox = () => {
        this.setState({
            viewerIsOpen: false
        });
    };
    
    render() {
        return (
            <Fragment>
                <ReactPhotoGallery photos={this.state.photos} onClick={this.openLightbox} targetRowHeight={120} margin={1} renderImage={Thumbnail} />
                <Carousel
                    selected={this.state.selectedImage}
                    open={this.state.viewerIsOpen}
                    onClose={this.closeLightbox}
                    items={this.state.photos
                    //     .map(photo => ({
                    //     originalTitle: photo.title,
                    //     description  : photo.title,
                    //     original: photo.files[0].url,
                    //     thumbnail: photo.src,
                    // }))
                    } />
            </Fragment>
        );
    }
}

export default withParams(Gallery);
