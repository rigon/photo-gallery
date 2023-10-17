import { FC, useState } from 'react';
import { useTheme, SxProps, Theme } from "@mui/material/styles";
import useMediaQuery from '@mui/material/useMediaQuery';

import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
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
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { useDialog } from '.';
import { ResponseDuplicates, useDuplicatedPhotosQuery } from '../services/api';
import { SelectionProvider, Selectable, useSelection } from '../Selection';
import { PhotoImageType, urls } from '../types';
import useFavorite from '../favoriteHook';

const selectedStyle: SxProps<Theme> = {
    outline: "5px solid dodgerblue",
    outlineOffset: "-5px",
};

type Duplicated = ResponseDuplicates['duplicates'][0];
type Unique = ResponseDuplicates['uniq'][0];

interface ItemProps<T extends Duplicated | Unique> {
    item: T;
}
const ItemDuplicated: FC<ItemProps<Duplicated>> = ({item}) => {
    return (<>
        <ListItemAvatar>
            <Avatar alt={item.photo.title} src={urls.thumb(item.photo)} variant='square' />
        </ListItemAvatar>
        <ListItemText
            primary={item.photo.title}
            secondary={item.found.map(({collection, album, photo, files}) => (<>
                {collection}: {album} {photo}<br/>
                {files.map(file => <>&bull; {file}<br/></>)}
            </>))}
        />
    </>);
}
const ItemUnique: FC<ItemProps<Unique>> = ({item}) => {
    return (<>
        <ListItemAvatar>
            <Avatar alt={item.title} src={urls.thumb(item)} variant='square' />
        </ListItemAvatar>
        <ListItemText
            primary={item.title}
            secondary={item.collection + ": " + item.album}
        />
    </>);
}

interface SelectableItemProps<T extends Duplicated | Unique> {
    item: T;
    component: FC<ItemProps<T>>;
}
function SelectableItem<T extends Duplicated | Unique>({ item, component }: SelectableItemProps<T>) {
    const [selected, setSelected] = useState<boolean>(false);
    const Item = component;

    const handleSelect = (state: boolean) => {
        setSelected(state);
    }

    return (
        <Selectable<T> item={item} onChange={handleSelect}>
            <ListItem alignItems="flex-start" sx={selected ? selectedStyle : {}}>
                <Item item={item} />
            </ListItem>
            <Divider />
        </Selectable>
    );
}

interface ListItemsProps<T extends Duplicated | Unique> {
    items: T[];
    component: FC<ItemProps<T>>;
}
function ListItems<T extends Duplicated | Unique>({ items, component }: ListItemsProps<T>) {
    const { all, cancel } = useSelection();

    if(items.length < 1)
        return <Typography p="15px 0">No items to display</Typography>;

    return (<>
        <List sx={{ bgcolor: 'background.paper', overflow: "auto" }}>
            <Divider />
            {items.map((item, index) => (<SelectableItem key={index} item={item} component={component} />))}
        </List>
        <Box sx={{textAlign: "right"}}>
            <Link onClick={all}>Select All</Link>&nbsp;-&nbsp;
            <Link onClick={cancel}>Clear Selection</Link>
        </Box>
    </>);
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}
function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`duplicates-tabpanel-${index}`}
            aria-labelledby={`duplicates-tab-${index}`}
            {...other}
        >
            {value === index && children}
        </div>
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
    duplicates: [],
    uniq: [],
}

const DuplicatesDialog: FC<DialogProps> = ({open, collection, album, onClose}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const dialog = useDialog();
    const favorite = useFavorite();
    const { data = defaultData, isFetching } = useDuplicatedPhotosQuery({ collection, album }, {skip: !open});
    const [tab, setTab] = useState(0);
    const [isSelectingDups, setSelectingDups] = useState<boolean>(false);
    const [isSelectingUniq, setSelectingUniq] = useState<boolean>(false);
    const [selDups, setSelDups] = useState<Duplicated[]>([]);
    const [selUniq, setSelUniq] = useState<Unique[]>([]);
    
    const noSelection = isFetching ||
        (tab === 0 && !isSelectingDups) ||  // Duplicates
        (tab === 1 && !isSelectingUniq);    // Unique

    const handleClose = () => {
        onClose();
    };

    const handleFavorite = async () => {
        const isSelectingDupsBack = isSelectingDups;
        const isSelectingUniqBak = isSelectingUniq;
        setSelectingDups(false);
        setSelectingUniq(false);
        
        const grouped = new Map<string, Map<string, Set<string>>>();

        if(tab === 0) {
            selDups.forEach(duplicate => {
                duplicate.found.forEach(entry => {
                    // Collection
                    const collection = grouped.get(entry.collection) || new Map<string, Set<string>>();
                    if (!grouped.has(entry.collection))
                        grouped.set(entry.collection, collection);
                    // Album
                    const album = collection.get(entry.album) || new Set<string>();
                    if (!collection.has(entry.album))
                        collection.set(entry.album, album);
                    // Photo
                    album.add(entry.photo);
                });
            });
        } else if(tab === 1) {
            selUniq.forEach(entry => {
                // Collection
                const collection = grouped.get(entry.collection) || new Map<string, Set<string>>();
                if (!grouped.has(entry.collection)) {
                    grouped.set(entry.collection, collection);
                }
                // Album
                const album = collection.get(entry.album) || new Set<string>();
                if (!collection.has(entry.album)) {
                    collection.set(entry.album, album);
                }
                // Photo
                album.add(entry.id);
            })
        }

        const promises: Promise<void>[] = [];
        grouped.forEach((collectionMap, collection) => {
            collectionMap.forEach(async (albumSet, album) => {
                promises.push(favorite.save({ collection, album, photos: Array.from(albumSet) }, [], true));
            });
        });
        await Promise.all(promises);

        setSelectingDups(isSelectingDupsBack);
        setSelectingUniq(isSelectingUniqBak);
    };

    const handleMove = () => {
        const selection =
            tab === 0 ? selDups.map(item => item.photo) :
            tab === 1 ? selUniq : [];
        // Create urls for thumbnails
        const photos: PhotoImageType[] = selection.map(photo => ({ ...photo, src: urls.thumb(photo) }));
        // Show move dialog
        dialog.move(collection, album, photos);
        onClose();
    };

    const handleDelete = () => {
        const selection =
            tab === 0 ? selDups.map(item => item.photo) :
            tab === 1 ? selUniq : [];
        // Create urls for thumbnails
        const photos: PhotoImageType[] = selection.map(photo => ({ ...photo, src: urls.thumb(photo) }));
        // Show delete dialog
        dialog.delete(collection, album, photos);
        onClose();
    };

    const handleChangeTab = (_event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
        // Selection is lost when swapping between tabs
        setSelectingDups(false);
        setSelectingUniq(false);
        setSelDups([]);
        setSelUniq([]);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
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
                ):(<>
                    <DialogContentText>
                        The following photos were found in another albums:
                    </DialogContentText>
                    <DialogContentText>
                        Please select which photos you want to bookmark, move or delete:
                    </DialogContentText>

                    <Tabs value={tab} onChange={handleChangeTab} sx={{ borderBottom: 1, borderColor: 'divider' }} aria-label="selection duplicates or unique">
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero badgeContent={data.countDup}><FileCopyIcon /></Badge>} iconPosition="start" label="Duplicates" />
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero badgeContent={data.countUniq}><InsertDriveFileIcon /></Badge>} iconPosition="start" label="Unique" />
                        <Tab sx={{flexGrow: 1, minHeight: 0, alignItems: "end", textTransform: "none"}} label={"Total of " + data.total + " photos"} disabled />
                    </Tabs>
                    <TabPanel value={tab} index={0}>
                        <SelectionProvider<Duplicated> onChange={setSelDups} onIsSelecting={setSelectingDups} itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={data.duplicates || []} component={ItemDuplicated} />
                        </SelectionProvider>
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <SelectionProvider<Unique> onChange={setSelUniq} onIsSelecting={setSelectingUniq} itemToId={i => `${i.collection}:${i.album}:${i.id}`}>
                            <ListItems items={data.uniq || []} component={ItemUnique} />
                        </SelectionProvider>
                    </TabPanel>
                </>)}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleMove} color='warning' startIcon={<DriveFileMoveIcon />} variant='contained' disabled={noSelection} disableElevation>Move</Button>
                <Button onClick={handleDelete} color='error' startIcon={<DeleteForeverIcon />} variant='contained' disabled={noSelection} disableElevation>Delete</Button>
                <Box sx={{ flexGrow: 1 }} />
                <Button onClick={handleClose} color='inherit'>Cancel</Button>
                <Button onClick={handleFavorite} color='info' startIcon={<FavoriteIcon />} variant='contained' disabled={noSelection} disableElevation>Favorite</Button>
            </DialogActions>
        </Dialog>
    );
}

export default DuplicatesDialog;
