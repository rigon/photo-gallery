import { FC, useRef, useState } from 'react';
import { SxProps, Theme } from "@mui/material/styles";
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import Divider from '@mui/material/Divider';
import FavoriteIcon from '@mui/icons-material/Favorite';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

import { useDialog } from '.';
import { QuerySaveFavorite, ResponseDuplicates, useDuplicatedPhotosQuery } from '../services/api';
import { SelectionProvider, Selectable, useSelection } from '../Selection';
import { PhotoImageType, urls } from '../types';
import useFavorite from '../favoriteHook';

const selectedStyle: SxProps<Theme> = {
    outline: "5px solid dodgerblue",
    outlineOffset: "-5px",
    // border: "5px solid dodgerblue",
    // boxSizing: "border-box",
};

type DuplicatedItem = ResponseDuplicates['duplicates'][0];

interface ItemProps {
    item: DuplicatedItem;
}

const Item: FC<ItemProps> = ({item}) => {
    const [selected, setSelected] = useState<boolean>(false);

    const handleSelect = (state: boolean) => {
        setSelected(state);
    }

    return (
        <Selectable<DuplicatedItem> item={item} onChange={handleSelect}>
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
    items: DuplicatedItem[];
    fn: (cb: () => DuplicatedItem[]) => void;
}

const ListItems: FC<ListItemsProps> = ({items, fn}) => {
    const { get } = useSelection<DuplicatedItem>();

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

const defaultData: ResponseDuplicates = {
    total: 0,
    countDup: 0,
    countUniq: 0,
    duplicates: []
}

const DuplicatesDialog: FC<DialogProps> = ({open, collection, album, onClose}) => {
    const dialog = useDialog();
    const favorite = useFavorite();
    const { data = defaultData, isFetching } = useDuplicatedPhotosQuery({ collection, album }, {skip: !open});
    const fnRef = useRef<() => DuplicatedItem[]>(() => []);
    
    const noDups = isFetching || data.duplicates.length === 0;
    
    const handleClose = () => {
        onClose();
    };

    const handleFavorite = () => {
        const duplicatedData = fnRef.current();
        const resultArray: QuerySaveFavorite["saveData"][] = [];

        duplicatedData.forEach(data => {
            data.found.forEach(item => {
                const existingEntry = resultArray.find(entry => entry.collection === item.collection && entry.album === item.album);
                if (existingEntry) {
                    existingEntry.photos.push(item.photo);
                } else {
                    resultArray.push({
                        collection: item.collection,
                        album: item.album,
                        photos: [item.photo]
                    });
                }
            });
        });
        
        console.log("resultArray", resultArray);

        resultArray.forEach(item => favorite.save(item, [], true));
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

    const handleFn = (cb: () => DuplicatedItem[]) => {
        fnRef.current = cb;
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Duplicated photos
                <IconButton sx={{ position: 'absolute', right: 8, top: 8 }} onClick={handleClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                {isFetching ? (
                    // Render progressbar while loading
                    <Box sx={{ width: '100%' }}>
                        <LinearProgress />
                    </Box>
                ):(
                    noDups? <>No duplicated photos found in the current album</> : (<>
                        <DialogContentText>
                            The following photos were found in another albums:
                        </DialogContentText>
                        <DialogContentText>
                            <ul>
                                <li>{data.total} photos in the album</li>
                                <li>{data.countDup} photos are duplicated in another albums</li>
                                <li>{data.countUniq} photos are unique in this album</li>
                            </ul>
                        </DialogContentText>
                        <DialogContentText>
                            Please select which photos you want to bookmark, move or delete:
                        </DialogContentText>
                        <SelectionProvider<DuplicatedItem> itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={data.duplicates} fn={handleFn} />
                        </SelectionProvider>
                    </>)
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color='inherit'>Cancel</Button>
                <Button onClick={handleFavorite} color='primary' startIcon={<FavoriteIcon />} variant='contained' disabled={noDups} disableElevation>Favorite</Button>
                <Button onClick={handleMove} color='warning' startIcon={<DriveFileMoveIcon />} variant='contained' disabled={noDups} disableElevation>Move</Button>
                <Button onClick={handleDelete} color='error' startIcon={<DeleteForeverIcon />} variant='contained' disabled={noDups} disableElevation>Delete</Button>
            </DialogActions>
        </Dialog>
    );
}

export default DuplicatesDialog;
