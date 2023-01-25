import { FC, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AddAlbumIcon from '@mui/icons-material/AddPhotoAlternate';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';

import { CollectionType } from './types';

const NewAlbum: FC = () => {
    const { collection } = useParams();
    const [open, setOpen] = useState<boolean>(false);
    const [collections, setCollections] = useState<CollectionType[]>([]);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        if(open)
            fetch('/collections')
                .then((response) => response.json())
                .then(collectionsList => {
                    setCollections(collectionsList);
                });
    }, [open])

    return (
        <>
            <IconButton onClick={handleClickOpen} aria-label="create album" color="inherit">
                <AddAlbumIcon />
            </IconButton>

            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Create new album</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please select the collection and type for the new album:
                    </DialogContentText>
                    <FormControl variant="filled">
                        <InputLabel id="new-album-collection-label">Collection</InputLabel>
                        <Select
                            labelId="new-album-collection-label"
                            id="new-album-collection-select"
                            value={collection}
                        >
                            { collections.map((collection) => (
                                <MenuItem key={collection} value={collection}>{collection}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl variant="filled">
                        <InputLabel id="new-album-type-label">Type</InputLabel>
                        <Select
                            labelId="new-album-type-label"
                            id="new-album-type-select"
                            value="pseudo"
                        >
                            <MenuItem disabled value="regular">Regular</MenuItem>
                            <MenuItem value="pseudo">Pseudo</MenuItem>
                        </Select>
                        <IconButton></IconButton>
                    </FormControl>
                    <DialogContentText>
                        Now, enter the name for the new album:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        id="name"
                        label="Album name"
                        type="text"
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleClose} color="primary">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default NewAlbum;
