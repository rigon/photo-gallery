import { FC, useState } from 'react';
import { SxProps, Theme } from "@mui/material/styles";
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

import { useDialog } from '.';
import { useDuplicatedPhotosQuery } from '../services/api';
import { Selectable, SelectionContext, useSelectionContext } from '../Selection';
import { DuplicatedType, PhotoImageType, urls } from '../types';

const selectedStyle: SxProps<Theme> = {
    outline: "5px solid dodgerblue",
    outlineOffset: "-5px",
    // border: "5px solid dodgerblue",
    // boxSizing: "border-box",
};

interface ItemsProps {
    item: DuplicatedType;
}

const Item: FC<ItemsProps> = ({item}) => {
    const [selected, setSelected] = useState<boolean>(false);

    const handleSelect = (state: boolean) => {
        setSelected(state);
    }

    return (
        <Selectable<DuplicatedType> item={item} onChange={handleSelect}>
            <ListItem alignItems="flex-start" sx={selected ? selectedStyle : {}}>
                <ListItemAvatar>
                    <Avatar alt={item.photo.title} src={urls.thumb(item.photo)} variant='square' />
                </ListItemAvatar>
                <ListItemText
                    primary={item.photo.title}
                    secondary={item.found.map((found) => <>{found.collection}: {found.album} ({found.photo})<br/></>)}
                />
            </ListItem>
            <Divider />
        </Selectable>);
}

interface DialogProps {
    open: boolean;
    collection: string;
    album: string;
    onClose: () => void;
}

const DuplicatesDialog: FC<DialogProps> = ({open, collection, album, onClose}) => {
    const dialog = useDialog();
    const { data } = useDuplicatedPhotosQuery({ collection, album }, {skip: !open});
    const { get: getSelection } = useSelectionContext("duplicates");
    
    const dups = data || [];
    
    const handleClose = () => {
        onClose();
    };

    const handleMove = () => {
        const selection: DuplicatedType[] = getSelection();
        // Create urls for thumbnails
        const photos: PhotoImageType[] = selection.map(item => ({ ...item.photo, src: urls.thumb(item.photo) }));
        dialog.move(collection, album, photos);
    };

    const handleDelete = () => {
        const selection: DuplicatedType[] = getSelection();
        // Create urls for thumbnails
        const photos: PhotoImageType[] = selection.map(item => ({ ...item.photo, src: urls.thumb(item.photo) }));
        dialog.delete(collection, album, photos);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Duplicated photos</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Select the destination for your photos:
                </DialogContentText>
                <SelectionContext<DuplicatedType> name="duplicates" transformItemToId={item => item.photo.id}>
                    <List sx={{ bgcolor: 'background.paper' }}>
                        {dups.map(item => (<Item item={item} />))}
                    </List>
                </SelectionContext>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color='inherit'>Cancel</Button>
                <Button onClick={handleMove} color='warning' startIcon={<DriveFileMoveIcon />} variant='contained' disableElevation>Move</Button>
                <Button onClick={handleDelete} color='error' startIcon={<DeleteForeverIcon />} variant='contained' disableElevation>Delete</Button>
            </DialogActions>
        </Dialog>
    );
}

export default DuplicatesDialog;
