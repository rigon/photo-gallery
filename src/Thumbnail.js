import React from 'react';
import PropTypes from 'prop-types';
import Box from '@material-ui/core/Box';
import PlayIcon from '@material-ui/icons/PlayCircleFilledTwoTone';
import MoreIcon from '@material-ui/icons/CameraEnhance';

const imgStyle = {
  height: '100%',
  width: '100%',
  objectFit: 'cover',
  position: 'absolute',
};
const overlayIconStyle = {
  color: 'white',
  position: 'relative',
  margin: 'auto',
  fontSize: '50px',
};
const overlayBadgeStyle = {
  color: 'white',
  position: 'absolute',
  fontSize: '15px',
  right: 5,
  top: 5,
};

const Thumbnail = ({ index, onClick, photo, margin, direction, top, left, key }) => {
  const boxStyle = {
    position: 'relative',
    margin: margin,
    width: photo.width,
    height: photo.height,
    backgroundColor: '#eee',
    display: 'flex',
    alignItems: 'center',
  }
  // Column direction style
  if (direction === 'column') {
    Object.assign(boxStyle, {
      position: 'absolute',
      left: left,
      top: top,
    });
  }
  // Clickable thumbnails style
  if (onClick) {
    Object.assign(boxStyle, {
      cursor: 'pointer',
    });
  }

  const handleClick = event => {
    onClick(event, { photo, index });
  };

  return (
    <Box key={key} style={boxStyle} onClick={onClick && handleClick} title={photo.title}>
      <img
        style={imgStyle}
        src={photo.thumbnail}
        srcSet={photo.srcSet}
        alt={photo.title}
      />
      { photo.type === "video" &&
        <PlayIcon style={overlayIconStyle}/>
      }
      { photo.files.length > 1 &&
        <MoreIcon style={overlayBadgeStyle}/>
      }
    </Box>
  );
};

export const photoPropType = PropTypes.shape({
  key: PropTypes.string,
  thumbnail: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  alt: PropTypes.string,
  title: PropTypes.string,
  srcSet: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  sizes: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
});

Thumbnail.propTypes = {
  index: PropTypes.number.isRequired,
  onClick: PropTypes.func,
  photo: photoPropType.isRequired,
  margin: PropTypes.number,
  top: props => {
    if (props.direction === 'column' && typeof props.top !== 'number') {
      return new Error('top is a required number when direction is set to `column`');
    }
  },
  left: props => {
    if (props.direction === 'column' && typeof props.left !== 'number') {
      return new Error('left is a required number when direction is set to `column`');
    }
  },
  direction: PropTypes.string,
};

export default Thumbnail;
