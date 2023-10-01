import { FC, useRef, useState } from 'react';
import { SxProps, Theme } from "@mui/material/styles";
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

import { useDialog } from '.';
import { useDuplicatedPhotosQuery } from '../services/api';
import { SelectionProvider, Selectable, useSelection } from '../Selection';
import { DuplicatedType, PhotoImageType, urls } from '../types';

const selectedStyle: SxProps<Theme> = {
    outline: "5px solid dodgerblue",
    outlineOffset: "-5px",
    // border: "5px solid dodgerblue",
    // boxSizing: "border-box",
};

interface ItemProps {
    item: DuplicatedType;
}

const Item: FC<ItemProps> = ({item}) => {
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
                    secondary={item.found.map((found) => <>{found.collection}: {found.album} {found.photo} ({found.file})<br/></>)}
                />
            </ListItem>
            <Divider />
        </Selectable>);
}


interface ListItemsProps {
    items: DuplicatedType[];
    fn: (cb: () => DuplicatedType[]) => void;
}

const ListItems: FC<ListItemsProps> = ({items, fn}) => {
    const { get } = useSelection<DuplicatedType>();

    fn(() => get());

    return (
        <List sx={{ bgcolor: 'background.paper' }}>
            <Divider />
            {items.map(item => (<Item item={item} />))}
        </List>
    );
}

interface DialogProps {
    open: boolean;
    collection: string;
    album: string;
    onClose: () => void;
}

const DuplicatesDialog: FC<DialogProps> = ({open, collection, album, onClose}) => {
    const dialog = useDialog();
    const { data, isFetching } = useDuplicatedPhotosQuery({ collection, album }, {skip: !open});
    const fnRef = useRef<() => DuplicatedType[]>(() => []);
    
    const dups = data || [];
    const noDups = dups.length === 0;
    
    const handleClose = () => {
        onClose();
    };

    const handleMove = () => {
        const selection = fnRef.current();
        // Create urls for thumbnails
        const photos: PhotoImageType[] = selection.map(item => ({ ...item.photo, src: urls.thumb(item.photo) }));
        dialog.move(collection, album, photos);
        onClose();
    };

    const handleDelete = () => {
        const selection = fnRef.current();
        // Create urls for thumbnails
        const photos: PhotoImageType[] = selection.map(item => ({ ...item.photo, src: urls.thumb(item.photo) }));
        dialog.delete(collection, album, photos);
        onClose();
    };

    const handleFn = (cb: () => DuplicatedType[]) => {
        fnRef.current = cb;
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Duplicated photos</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Select duplicated photos:
                </DialogContentText>
                {isFetching ? (
                    // Render progressbar while loading
                    <Box sx={{ width: '100%' }}>
                        <LinearProgress />
                    </Box>
                ):(
                    noDups? <>No duplicated photos found in the current album</> : (
                    <SelectionProvider<DuplicatedType> itemToId={i => i.photo.id}>
                        <ListItems items={dups} fn={handleFn} />
                    </SelectionProvider>
                    )
                )}
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
