import { FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import AddAlbumIcon from '@mui/icons-material/AddPhotoAlternate';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

import { useGetCollectionsQuery, useAddAlbumMutation, QueryAddAlbum } from "./services/api";
import useNotification from './Notification';

const defaults: QueryAddAlbum = {
    collection: "",
    type: "pseudo",
    name: ""
};

const NewAlbum: FC = () => {
    const { collection = "" } = useParams();
    const [ open, setOpen ] = useState<boolean>(false);
    const [ formData, updateFormData ] = useState<QueryAddAlbum>(defaults);
    const [ errorName, setErrorName ] = useState<boolean>(false);
    const { data: collections = [] } = useGetCollectionsQuery();
    const [ addAlbum ] = useAddAlbumMutation();
    const { successNotification, errorNotification } = useNotification();

    const handleChange = (e: { target: { name: string; value: string; }; }) => {
      updateFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleClickOpen = () => {
        // Clear form data when openning
        updateFormData({...defaults, collection});
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSave = async () => {
        const trimmedFormData = {
            ...formData,
            name: formData.name.trim()
        }
        
        // Form validation
        if(!trimmedFormData.name) {
            setErrorName(true);
            return;
        }
        setErrorName(false);
        
        try {
            await addAlbum(trimmedFormData).unwrap();
            successNotification(`Album created with name ${trimmedFormData.name}`);
            setOpen(false);
        }
        catch(error) {
            errorNotification(`Could not create album named ${trimmedFormData.name}!`);
            console.log(error);
        }
    };

    return (
        <>
            <Tooltip title="Create new album" enterDelay={300}>
                <IconButton onClick={handleClickOpen} aria-label="create album" color="inherit">
                    <AddAlbumIcon />
                </IconButton>
            </Tooltip>

            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title" >
                    Create a new album
                    
                    <IconButton sx={{ position: 'absolute', right: 8, top: 8 }} onClick={handleClose}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <DialogContentText>
                                Please select the collection where to create the new album:
                            </DialogContentText>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl variant="filled">
                                <InputLabel id="new-album-collection-label">Collection</InputLabel>
                                <Select
                                    labelId="new-album-collection-label"
                                    id="new-album-collection-select"
                                    name="collection"
                                    value={formData.collection}
                                    onChange={handleChange}
                                >
                                    { collections.map((collection) => (
                                        <MenuItem key={collection.name} value={collection.name}>{collection.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl variant="filled">
                                <FormLabel id="new-album-type-label">And the type:</FormLabel>
                                <RadioGroup
                                    row
                                    aria-labelledby="new-album-type-label"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                >
                                    <FormControlLabel value="regular" control={<Radio />} label="Regular" />
                                    <FormControlLabel value="pseudo" control={<Radio />} label="Pseudo" />
                                </RadioGroup>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack spacing={1}>
                                <DialogContentText>
                                    Now, enter the name for the new album:
                                </DialogContentText>
                                <TextField
                                    autoFocus
                                    label="Album name"
                                    type="text"
                                    name="name"
                                    fullWidth
                                    error={errorName}
                                    defaultValue={formData.name}
                                    onChange={handleChange}
                                />
                            </Stack>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} color="primary">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default NewAlbum;
