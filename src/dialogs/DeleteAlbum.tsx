import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';

import useNotification from '../Notification';
import { useDeleteAlbumMutation } from '../services/api';

interface DialogProps {
    open: boolean;
    collection: string;
    album: string;
    onClose: () => void;
}

const DeleteAlbumDialog: FC<DialogProps> = ({collection, album, open, onClose}) => {
    const navigate = useNavigate();
    const [deleteAlbum] = useDeleteAlbumMutation();
    const { successNotification, errorNotification } = useNotification();

    const handleClose = () => {
        onClose();
    }

    const handleDeleteAlbum = async () => {
        try {
            await deleteAlbum({ collection, album }).unwrap();
            successNotification(`Album ${album} successfully deleted`);
            handleClose();
            navigate("/" + collection);
        }
        catch (error: any) {
            errorNotification(`Error deleting album: ${error.data.message}!`);
            console.log(error);
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} fullWidth aria-labelledby="confirm-delete-album">
            <DialogTitle id="confirm-delete-album">Deleting album {album}</DialogTitle>
            <DialogContent>
                <Typography variant="body1">This action cannot be undone. Are you sure you want to delete this album?</Typography>
                <Typography variant="body2" sx={{mt: 2}}>The album will be deleted only if it is empty.</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="inherit">Cancel</Button>
                <Button onClick={handleDeleteAlbum} color="error" variant="contained" disableElevation>Delete</Button>
            </DialogActions>
        </Dialog>
    );
}

export default DeleteAlbumDialog;
