import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactImageGallery from 'react-image-gallery';
import Box from '@material-ui/core/Box';
import Modal from '@material-ui/core/Modal';
// Icons
import IconButton from '@material-ui/core/IconButton';
import PlayIcon from '@material-ui/icons/PlayArrowRounded';
import PauseIcon from '@material-ui/icons/PauseRounded';
import FullscreenIcon from '@material-ui/icons/FullscreenRounded';
import FullscreenExitIcon from '@material-ui/icons/FullscreenExitRounded';
import CloseIcon from '@material-ui/icons/Close';
// Components styles
import 'react-image-gallery/styles/css/image-gallery.css';
// Custom components
import Photo from './Photo';

class Carousel extends Component {
    constructor(props) {
        super(props);

        this.state = {
            open: this.props.open,
            fullscreen: false,
            play: false,
        };
        
        this.imageGallery = React.createRef();
    }
    
    componentDidUpdate(prevProps, prevState) {
        if(prevProps.open !== this.props.open) {
            this.setState({ open: this.props.open });
        }
        
        if(this.imageGallery.current != null) {
            if(this.props.selected !== this.imageGallery.current.getCurrentIndex())
                this.imageGallery.current.slideToIndex(this.props.selected);
            
            if(prevState.open !== this.state.open)
                this.state.open ?
                    this.imageGallery.current.fullScreen() :
                    this.imageGallery.current.exitFullScreen();
        }
        
    }
    
    closeLightbox = () => {
        this.setState({
            open: false,
            play: false,
            fullscreen: false,
        });
        this.props.onClose();
    };
    
    toggleFullscreen = () => {
        this.state.fullscreen ?
            this.imageGallery.current.exitFullScreen() :
            this.imageGallery.current.fullScreen();
            
        this.setState({
            fullscreen: !this.state.fullscreen
        });
    };
    
    togglePlay = () => {
        this.state.play ?
            this.imageGallery.current.pause() :
            this.imageGallery.current.play();
        
        this.setState({
            play: !this.state.play
        });
    };
    
    imageControls = () => (
        <Box style={{color: 'white', background: 'rgba(0, 0, 0, 0.4)' }}position={'absolute'} top={0} right={0} zIndex={10000} padding={"10px"}>
            <IconButton onClick={this.togglePlay} aria-label="play" color='inherit'>
                {this.state.play ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            <IconButton onClick={this.toggleFullscreen} aria-label="fullscreen" color='inherit'>
                {this.state.fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
            <IconButton onClick={this.closeLightbox} aria-label="close" color='inherit'><CloseIcon /></IconButton>
        </Box>);
    
    render() {
        console.log("RENDER");
        return (
            <Modal open={this.state.open} onClose={this.closeLightbox}>
                <ReactImageGallery ref={this.imageGallery} lazyLoad onClick={this.closeLightbox}
                    renderItem={(item) => <Photo {...item} />}
                    renderCustomControls={this.imageControls}
                    slideDuration={150}
                    showBullets={false}
                    showFullscreenButton={false}
                    showIndex={false}
                    showPlayButton={false}
                    showThumbnails={false}
                    //useBrowserFullscreen={this.state.fullscreen}
                    thumbnailPosition='bottom'
                    infinite={false}
                    startIndex={this.props.selected}
                    items={this.props.items} />
        </Modal>
        );
    }
}

Carousel.propTypes = {
    open: PropTypes.bool,
    items: PropTypes.array,
    selected: PropTypes.number,
    onClose: PropTypes.func,
}
Carousel.defaultProps = {
    open: false,
    items: [],
    selected: 0,
    onClose: () => {}
}

export default Carousel;
