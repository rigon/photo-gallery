import { FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import AddAlbumIcon from '@mui/icons-material/AddPhotoAlternate';
import Box from '@mui/material/Box';
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

import { useGetCollectionsQuery } from "./services/api";

const NewAlbum: FC = () => {
    const { collection } = useParams();
    const [open, setOpen] = useState<boolean>(false);
    const { data: collections = [] } = useGetCollectionsQuery("");

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <>
            <IconButton onClick={handleClickOpen} aria-label="create album" color="inherit">
                <AddAlbumIcon />
            </IconButton>

            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">
                    <Box display="flex" alignItems="center">
                        <Box flexGrow={1} >Create a new album</Box>
                        <Box>
                            <IconButton size="small" onClick={handleClose}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
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
                                    defaultValue={collection}
                                >
                                    { collections.map((collection) => (
                                        <MenuItem key={collection} value={collection}>{collection}</MenuItem>
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
                                    name="new-album-type"
                                    value="pseudo"
                                >
                                    <FormControlLabel value="regular" control={<Radio />} label="Regular" disabled />
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
                                    id="name"
                                    label="Album name"
                                    type="text"
                                    fullWidth
                                />
                            </Stack>
                        </Grid>
                    </Grid>
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
