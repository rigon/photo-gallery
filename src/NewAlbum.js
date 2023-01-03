import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import AddPhotoAlternateIcon from '@material-ui/icons/AddPhotoAlternate';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';

const useStyles = makeStyles((theme) => ({
    formControl: {
        marginRight: theme.spacing(2),
        minWidth: 120,
    },
    selectEmpty: {
        marginTop: theme.spacing(2),
    },
}));

export default function NewAlbum() {
    const classes = useStyles();
    const { collection } = useParams();
    const [open, setOpen] = React.useState(false);
    const [collections, setCollections] = React.useState([]);

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        fetch('/collections')
            .then((response) => response.json())
            .then(collectionsList => {
                setCollections(collectionsList);
            });
    }, [])

    return (
        <div>
            <IconButton onClick={handleClickOpen} aria-label="create album" color="inherit">
                <AddPhotoAlternateIcon />
            </IconButton>

            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Create new album</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please select the collection and type for the new album:
                    </DialogContentText>
                    <FormControl variant="filled" className={classes.formControl}>
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
                    <FormControl variant="filled" className={classes.formControl}>
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
        </div>
    );
}
