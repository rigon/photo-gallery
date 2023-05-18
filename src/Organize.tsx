import { FC, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DeselectIcon from '@mui/icons-material/Deselect';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

import PhotoAlbum from 'react-photo-album';

import {
    QueryAddAlbum,
    QueryDeletePhotos,
    QueryMovePhotos,
    useAddAlbumMutation,
    useDeletePhotosMutation,
    useGetAlbumsQuery,
    useGetCollectionsQuery,
    useMovePhotosMutation
} from './services/api';
import useNotification from './Notification';
import { useSelectionContext } from './Selection';
import { PhotoType } from './types';

interface DialogProps {
    collection: string;
    album: string;
    photos: PhotoType[];
    open: boolean;
    onClose: () => void;
}

/* Dialog for move action */
const MoveDialog: FC<DialogProps> = ({collection, album, photos, open, onClose}) => {
    const [movePhotos] = useMovePhotosMutation();
    const [addAlbum] = useAddAlbumMutation();
    const [targetCollection, setTargetCollection] = useState<string>(collection);
    const [targetAlbum, setTargetAlbum] = useState<string>(album);
    const [isNewAlbum, setIsNewAlbum] = useState<boolean>(false);
    const [errorName, setErrorName] = useState<boolean>(false);

    const { successNotification, errorNotification } = useNotification();
    const { data: collections = [], isFetching } = useGetCollectionsQuery();
    const { data: tmpAlbums = [] } = useGetAlbumsQuery({ collection: targetCollection }, { skip: isFetching });
    const albums = tmpAlbums.filter(album => !album.pseudo);

    useEffect(() => setIsNewAlbum(albums.find(a => a.name === targetAlbum) === undefined), [albums, targetAlbum, setIsNewAlbum]);
    
    const changeCollection = (event: SelectChangeEvent<string>) => {
        setTargetCollection(event.target.value);
        setTargetAlbum("");
    };
    
    const changeAlbum = (event: React.SyntheticEvent, value: string | null) => {
        if(!value || !value?.trim()) {
            setErrorName(true);
            return;
        }

        setErrorName(false);
        setTargetAlbum(value.trim());
    };

    const handleMove = async () => {
        if(isNewAlbum) {
            const addAlbumData: QueryAddAlbum = {
                collection: targetCollection,
                name: targetAlbum.trim(),
                type: "regular"
            }
            
            // Form validation
            if(!addAlbumData.name)
                return;
            
            try {
                await addAlbum(addAlbumData).unwrap();
                successNotification(`Album created with name ${addAlbumData.name}`);
            }
            catch(error) {
                errorNotification(`Could not create album named ${addAlbumData.name}!`);
                console.log(error);
                return;
            }
        }

        const query: QueryMovePhotos = {
            collection,
            album,
            target: {
                collection: targetCollection,
                album: targetAlbum,
                photos: photos.map(photo => photo.title),
            }
        };
        
        try {
            await movePhotos(query).unwrap();
            successNotification(`${photos.length} photos were moved successfully to ${album}`);
            onClose();
        }
        catch(error) {
            errorNotification("An error occured while moving photos!");
            console.log(error);
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Move photos</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Select the destination for your photos:
                </DialogContentText>
                <FormControl variant="filled" fullWidth margin="normal">
                    <InputLabel id="collection-label">Collection</InputLabel>
                    <Select labelId="collection-label" defaultValue={collection} onChange={changeCollection}>
                        {collections.map((c) => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl fullWidth>
                    <Autocomplete
                        freeSolo
                        autoSelect
                        selectOnFocus
                        options={albums.map(a => a.name)}
                        value={targetAlbum}
                        onChange={changeAlbum}
                        color='error'
                        renderInput={(params) =>
                            <TextField {...params} label="Album" variant="filled" error={errorName} />}
                        />
                    {isNewAlbum && !errorName && <FormHelperText>"{targetAlbum}" does not exist, a regular album will be created</FormHelperText>}
                    {errorName && <FormHelperText error>Invalid album name</FormHelperText>}
                </FormControl>

                <FormControl variant="filled" fullWidth margin="normal">
                <DialogContentText>
                    Photos to be moved:
                </DialogContentText>
                    <PhotoAlbum
                        photos={photos}
                        layout="rows"
                        targetRowHeight={48}
                        spacing={1} />
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color='inherit'>Cancel</Button>
                <Button onClick={handleMove} color='warning' variant='contained' disableElevation>Move</Button>
            </DialogActions>
        </Dialog>);
}

/* Dialog for delete action */
const DeleteDialog: FC<DialogProps> = ({collection, album, photos, open, onClose}) => {
    const [ deletePhotos ] = useDeletePhotosMutation();
    const { successNotification, errorNotification } = useNotification();
    const [ answer, setAnswer ] = useState<string>();

    const answerOk = (answer === "yes");

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
                photos: photos.map(photo => photo.title),
            }
        };
        
        try {
            await deletePhotos(query).unwrap();
            successNotification(`${photos.length} photos were deleted`);
            handleClose();
        }
        catch(error) {
            errorNotification("An error occured while deleting photos!");
            console.log(error);
        }
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
                <Button onClick={handleClose} color='inherit'>Cancel</Button>
                <Button onClick={handleDelete} disabled={!answerOk} color='error' variant='contained' disableElevation>Delete</Button>
            </DialogActions>
        </Dialog>
    )
}


const Organize: FC = () => {
    const { collection, album } = useParams();
    const {isSelecting, cancel, get} = useSelectionContext();
    const [movePhotos, setMovePhotos] = useState<PhotoType[]>();
    const [deletePhotos, setDeletePhotos] = useState<PhotoType[]>();

    const showMove = () => {
        setMovePhotos(get());
    };

    const showDelete = () => {
        setDeletePhotos(get());
    };

    const closeMove = () => {
        setMovePhotos(undefined);
    };

    const closeDelete = () => {
        setDeletePhotos(undefined);
    };
    
    return !isSelecting || collection === undefined || album === undefined ? null : (<>
        <Tooltip title="Cancel selection" enterDelay={300}>
            <IconButton onClick={cancel} aria-label="cancel selection" color="inherit">
                <DeselectIcon />
            </IconButton>
        </Tooltip>
        <Tooltip title="Move to another album" enterDelay={300}>
            <IconButton onClick={showMove} aria-label="move to another album" color="inherit">
                <DriveFileMoveIcon />
            </IconButton>
        </Tooltip>
        <Tooltip title="Delete photos" enterDelay={300}>
            <IconButton onClick={showDelete} aria-label="delete photos" color="inherit">
                <DeleteForeverIcon />
            </IconButton>
        </Tooltip>
        
        <MoveDialog open={movePhotos !== undefined}
            collection={collection}
            album={album}
            photos={movePhotos || []}
            onClose={closeMove} />
        <DeleteDialog open={deletePhotos !== undefined}
            collection={collection}
            album={album}
            photos={deletePhotos || []}
            onClose={closeDelete} />
    </>);
}

export default Organize;
