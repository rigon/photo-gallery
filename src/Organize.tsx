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
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';

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
import { PhotoImageType, MoveConflictMode } from './types';
import { ToolbarItem } from './Toolbar';

interface DialogProps {
    collection: string;
    album: string;
    photos: PhotoImageType[];
    open: boolean;
    onClose: () => void;
}

const isValidAlbumName = (function () {
    const rg1 = /^[^\\/:*?"<>|]+$/; // forbidden characters \ / : * ? " < > |
    const rg2 = /^\./; // cannot start with dot (.)
    const rg3 = /^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names
    return (fname: string) => rg1.test(fname) && !rg2.test(fname) && !rg3.test(fname);
})();

function mostCommon(arr: string[]): string {
    const dist: {[key: string]: number} = {};
    let best = "";
    arr.forEach((v) => {
        dist[v] = (dist[v] || 0) + 1;
        if(dist[v] > (dist[best] || 0))
            best = v;
    });
    return best;
}

/* Dialog for move action */
const MoveDialog: FC<DialogProps> = ({collection, album, photos, open, onClose}) => {
    const [movePhotos] = useMovePhotosMutation();
    const [addAlbum] = useAddAlbumMutation();
    const [targetCollection, setTargetCollection] = useState<string>(collection);
    const [targetAlbum, setTargetAlbum] = useState<string>("");
    const [mode, setMode] = useState<MoveConflictMode>(MoveConflictMode.Cancel);
    const [isNewAlbum, setIsNewAlbum] = useState<boolean>(false);
    const [errorName, setErrorName] = useState<boolean>(false);
    const [processingAction, setProcessingAction] = useState<boolean>(false);

    const { successNotification, errorNotification } = useNotification();
    const { data: collections = [], isFetching } = useGetCollectionsQuery();
    const { data: tmpAlbums = [] } = useGetAlbumsQuery({ collection: targetCollection }, { skip: isFetching });
    const albums = tmpAlbums.filter(v => !v.pseudo && v.name !== album);

    // Find out if it is a new album
    useEffect(() => {
        // Check if is not moving for the same album or it is a valid name
        if((targetCollection === collection && targetAlbum === album) || !isValidAlbumName(targetAlbum)) {
            setErrorName(true);
            return;
        }
        // all good
        setErrorName(false);
        setIsNewAlbum(albums.find(a => a.name === targetAlbum) === undefined);
    }, [collection, targetCollection, album, albums, targetAlbum, setIsNewAlbum]);

    // Initial album name
    useEffect(() => {
        const dates = photos
            .filter(v => !v.date.startsWith("0001-01-01"))
            .map(v => v.date.slice(0, v.date.lastIndexOf('T')));
        setTargetAlbum(mostCommon(dates));
    }, [open, photos, setTargetAlbum]);
    
    const changeCollection = (event: SelectChangeEvent<string>) => {
        setTargetCollection(event.target.value);
    };
    
    const changeAlbum = (_event: React.SyntheticEvent<Element, Event>, value: string | null) => {
        setTargetAlbum(value?.trim() || "");
    };

    const changeMode = (_event: React.ChangeEvent<HTMLInputElement>, value: string) => {
        setMode(value as MoveConflictMode);
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
            
            setProcessingAction(true);
            try {
                await addAlbum(addAlbumData).unwrap();
                successNotification(`Album created with name ${addAlbumData.name}`);
            }
            catch(error) {
                setProcessingAction(false);
                errorNotification(`Could not create album named ${addAlbumData.name}!`);
                console.log(error);
                return;
            }
        }

        const query: QueryMovePhotos = {
            collection,
            album,
            target: {
                mode,
                collection: targetCollection,
                album: targetAlbum.trim(),
                photos: photos.map(photo => photo.id),
            }
        };
        
        setProcessingAction(true);
        try {
            const stats = await movePhotos(query).unwrap();
            successNotification(`${stats.moved_photos} photos (${stats.moved_files} files)
                were moved to ${album}, ${stats.skipped} skipped and ${stats.renamed} renamed.`);
            onClose();
        }
        catch(error: any) {
            errorNotification(`Error while moving photos: ${error.data.message}!`);
            console.log(error);
        }
        setProcessingAction(false);
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
                    {errorName && <FormHelperText error>"{targetAlbum}" is an invalid album name</FormHelperText>}
                    {!errorName && isNewAlbum && <FormHelperText>"{targetAlbum}" does not exist, a regular album will be created</FormHelperText>}
                    {!errorName && !isNewAlbum && <FormHelperText>Photos will moved into the album "{targetAlbum}"</FormHelperText>}
                </FormControl>

                <FormControl>
                    <FormLabel id="conflict-group-label" title="What to do when on the destination the file already exists ">On conflict</FormLabel>
                    <RadioGroup row defaultValue="cancel" value={mode} onChange={changeMode} name="conflict-group-label" aria-labelledby="conflict-group-label">
                        <FormControlLabel value="cancel" control={<Radio />} label="Cancel" title="Cancel everything before making any changes" />
                        <FormControlLabel value="skip" control={<Radio />} label="Skip" title="Skip files in conflict and move everything else" />
                        <FormControlLabel value="rename" control={<Radio />} label="Rename" title="Rename files in conflict by adding a sequence number between parenthesis" />
                    </RadioGroup>
                </FormControl>

                <FormControl variant="filled" fullWidth margin="normal">
                    <DialogContentText>
                        Photos to be moved:
                    </DialogContentText>
                    <PhotoAlbum
                        photos={photos}
                        layout="rows"
                        targetRowHeight={48}
                        rowConstraints={{ singleRowMaxHeight: 48 }}
                        spacing={1} />
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color='inherit'>Cancel</Button>
                <Button onClick={handleMove} color='warning' variant='contained' disabled={processingAction || errorName} disableElevation>Move</Button>
            </DialogActions>
        </Dialog>);
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


const Organize: FC = () => {
    const { collection, album } = useParams();
    const { isSelecting, cancel, get } = useSelectionContext();
    const [movePhotos, setMovePhotos] = useState<PhotoImageType[]>();
    const [deletePhotos, setDeletePhotos] = useState<PhotoImageType[]>();

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
        <ToolbarItem
            onClick={cancel}
            icon={<DeselectIcon />}
            title="Clear selection"
            tooltip="Clear current photo selection in the gallery"
            aria-label="cancel selection" />

        <ToolbarItem
            onClick={showMove}
            icon={<DriveFileMoveIcon />}
            title="Move photos"
            tooltip="Move selected photos to another album"
            aria-label="move photos" />
        
        <ToolbarItem
            onClick={showDelete}
            icon={<DeleteForeverIcon />}
            title="Delete photos"
            tooltip="Delete selected photos"
            aria-label="delete photos" />
        
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
