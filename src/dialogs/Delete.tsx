import { FC, useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';

import PhotoAlbum from 'react-photo-album';

import { QueryDeletePhotos, useDeletePhotosMutation } from '../services/api';
import useNotification from '../Notification';
import { PhotoImageType } from '../types';

interface DialogProps {
    open: boolean;
    collection: string;
    album: string;
    photos: PhotoImageType[];
    onClose: () => void;
}

/* Dialog for delete action */
const DeleteDialog: FC<DialogProps> = ({collection, album, photos, open, onClose}) => {
    const [deletePhotos] = useDeletePhotosMutation();
    const [answer, setAnswer] = useState<string>();
    const [processingAction, setProcessingAction] = useState<boolean>(false);

    const { successNotification, errorNotification } = useNotification();

    const answerOk = (answer?.toLocaleLowerCase() === "yes");

    const handleAnswer = (event: React.ChangeEvent<HTMLInputElement>) => {
        setAnswer(event.target.value)
    }
    const handleClose = () => {
        setAnswer("");
        onClose();
    }

    const handleDelete = async () => {
        const query: QueryDeletePhotos = {
            collection,
            album,
            target: {
                photos: photos.map(photo => photo.id),
            }
        };
        
        setProcessingAction(true);
        try {
            await deletePhotos(query).unwrap();
            successNotification(`${photos.length} photos were deleted`);
            handleClose();
        }
        catch(error) {
            errorNotification("An error occured while deleting photos!");
            console.log(error);
        }
        setProcessingAction(false);
    }

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle color="error">Delete photos</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Photos to be deleted:
                </DialogContentText>
                <FormControl variant="filled" fullWidth margin="normal">
                    <PhotoAlbum
                        photos={photos}
                        layout="rows"
                        targetRowHeight={48}
                        rowConstraints={{ singleRowMaxHeight: 48 }}
                        spacing={1} />
                </FormControl>
                <DialogContentText>
                    This will permanently delete the selected photos. If you are sure about that,
                    please type "yes" in the box bellow and press "Delete":
                </DialogContentText>
                <TextField
                    autoFocus
                    fullWidth
                    margin="normal"
                    variant="standard"
                    label='Type "yes" to delete'
                    color={answerOk ? "success" : "error"}
                    onChange={handleAnswer}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="inherit">Cancel</Button>
                <Button onClick={handleDelete} disabled={!answerOk || processingAction} color="error" variant="contained" disableElevation>Delete</Button>
            </DialogActions>
        </Dialog>
    )
}

export default DeleteDialog;
