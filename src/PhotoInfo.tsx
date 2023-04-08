import React, { FC } from "react";
import { useParams } from 'react-router-dom';

import Box from "@mui/material/Box";
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { PhotoType } from "./types";
import { useGetPhotoInfoQuery } from "./services/api";
import LinearProgress from "@mui/material/LinearProgress";

interface InfoPanelProps {
    photos: PhotoType[];
    selected: number;
    onClose?: () => void;
}

const PhotoInfo: FC<InfoPanelProps> = ({ photos, selected, onClose }) => {
    const { collection, album } = useParams();
    const [ index, setIndex ] = React.useState(selected);
    const photo = photos[index]?.title || undefined;
    const { data = [], isLoading } = useGetPhotoInfoQuery({collection, album, photo }, {skip: photo === undefined});
    const photoObj = photos[index] || undefined;

    React.useEffect(() => setIndex(selected), [setIndex, selected]);

    const hasBefore = index > 0;
    const hasNext = index < photos.length - 1;

    const handleClose = () => {
        setIndex(-1);
        if(onClose !== undefined)
            onClose();
    };

    const handleBefore = () => {
        if(index > 0)
            setIndex(index - 1);
    }
    const handleNext = () => {
        if(index < photos.length - 1)
            setIndex(index + 1);
    }
    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.defaultPrevented) {
            return; // Do nothing if the event was already processed
        }
        switch (event.key) {
            case "Left": // IE/Edge specific value
            case "ArrowLeft":
                handleBefore();
                break;
            case "Right": // IE/Edge specific value
            case "ArrowRight":
                handleNext();
                break;
        }
    }

    return (
        <Dialog
            onClose={handleClose}
            aria-labelledby="photo-info-title"
            open={index >= 0}
            onKeyDown={onKeyDown}
        >
            <DialogTitle id="photo-info-title">
                {photo}
                <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <IconButton onClick={handleBefore} disabled={!hasBefore} aria-label="before">
                        <NavigateBeforeIcon />
                    </IconButton>
                    <IconButton onClick={handleNext} disabled={!hasNext} aria-label="next">
                        <NavigateNextIcon />
                    </IconButton>
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{ ml: 1 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {isLoading && (<Box sx={{ width: '100%' }}>
                    <LinearProgress />
                </Box>)}
                <img src={photoObj?.src} alt="" />
                {/* <Typography gutterBottom> */}
                    <pre>{JSON.stringify(photoObj, null, 2)}</pre>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                {/* </Typography> */}
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={handleClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default PhotoInfo;
