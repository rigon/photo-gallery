import React from 'react';
import { bool, func, string } from 'prop-types';

const Photo = React.memo(({
  title,
  type,
  fullscreen, // fullscreen version of img
  // handleImageLoaded,
  isFullscreen,
  // onImageError,
  original,
  originalAlt,
  originalHeight,
  originalWidth,
  originalTitle,
  sizes,
  srcSet,
  loading,
  files,
}) => {
  const file = files[0];
  //const itemSrc = files[0].url; //isFullscreen ? (fullscreen || original) : original;
  console.log(title, file.type, file.url);

  return (
    <React.Fragment>
      { file.type === 'image' && (
          <img
            className="image-gallery-image"
            src={file.url}
            alt={originalAlt}
            srcSet={srcSet}
            height={originalHeight}
            width={originalWidth}
            sizes={sizes}
            title={originalTitle}
            // onLoad={event => handleImageLoaded(event, original)}
            // onError={onImageError}
            loading={loading}
          />
      )}
      { file.type === 'video' && (
          <video
            className="image-gallery-image"
            src={file.url}
            height={originalHeight}
            width={originalWidth}
            controls/>
          //     <source src={file.url} type="video/mp4"></source>
          // </video>
      )}
      { title && (
          <span className="image-gallery-description" style={{top: 0, bottom: 'initial' }}>
            {files.length} files
          </span>
      )}
      { title && (
          <span className="image-gallery-description">
            {title}
          </span>
      )}
    </React.Fragment>
  );
});

Photo.displayName = 'Photo';

Photo.propTypes = {
  title: string,
  type: string,
  fullscreen: string, // fullscreen version of img
  // handleImageLoaded: func.isRequired,
  isFullscreen: bool,
  // onImageError: func.isRequired,
  // original: string.isRequired,
  originalAlt: string,
  originalHeight: string,
  originalWidth: string,
  originalTitle: string,
  sizes: string,
  srcSet: string,
  loading: string,
};

Photo.defaultProps = {
  title: '',
  type: 'image',
  fullscreen: '',
  isFullscreen: false,
  originalAlt: '',
  originalHeight: '',
  originalWidth: '',
  originalTitle: '',
  sizes: '',
  srcSet: '',
  loading: 'eager',
};

export default Photo;
