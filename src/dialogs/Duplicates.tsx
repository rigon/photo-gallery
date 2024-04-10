import { FC, Fragment, useEffect, useState } from 'react';
import { useTheme, SxProps, Theme } from "@mui/material/styles";
import useMediaQuery from '@mui/material/useMediaQuery';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
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
import FileCopyIcon from '@mui/icons-material/FileCopy';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import OutlinedInput from '@mui/material/OutlinedInput';
import PinDropIcon from '@mui/icons-material/PinDrop';
import RuleIcon from '@mui/icons-material/Rule';
import SaveIcon from '@mui/icons-material/Save';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import WarningIcon from '@mui/icons-material/Warning';

import { useDialog } from '.';
import { Duplicate, ResponseDuplicates, useDuplicatedPhotosQuery } from '../services/api';
import { SelectionProvider, Selectable, useSelection } from '../Selection';
import { PhotoImageType, PhotoType, PseudoAlbumType, urls } from '../types';
import useFavorite from '../favoriteHook';

const selectedStyle: SxProps<Theme> = {
    outline: "5px solid dodgerblue",
    outlineOffset: "-5px",
};

interface ItemProps<T extends Duplicate | PhotoType> {
    item: T;
}
const ItemDuplicated: FC<ItemProps<Duplicate>> = ({item: {photo, found}}) => {
    const dialog = useDialog();

    const handleOpenPhoto = () => {
        dialog.lightbox([photo, ...found.map(i => i.photo)], 0);
    }

    return (<>
        <ListItemAvatar>
            <Avatar
                alt={photo.title}
                src={urls.thumb(photo)}
                variant='square'
                onClick={handleOpenPhoto}
                style={{cursor: 'pointer'}}
            />
        </ListItemAvatar>
        <ListItemText
            primary={photo.title}
            secondary={found.map(({photo: {collection, album, id, files: foundFiles}, partial, incomplete, conflict, samealbum, files}, index) => (
                <Fragment key={index}>
                    {(partial || incomplete || conflict || samealbum) &&
                        <Tooltip title={
                            <ol style={{paddingLeft: 12}}>
                                {partial && <li><b>Partial:</b> found photo does not have all files</li>}
                                {incomplete && <li><b>Incomplete:</b> the photo is missing some files, found entry is more complete</li>}
                                {conflict && <li><b>Conflict:</b> the photo and the found entry both have missing files</li>}
                                {samealbum && <li><b>Same Album:</b> duplicated in the same album<br /><b>Do not delete all matches!</b></li>}
                            </ol>}>
                            <WarningIcon fontSize="small" color="error" />
                        </Tooltip>
                    } <Link href={`/${collection}/${album}/${id}`} target="_blank">
                        {collection}: {album} - {id}
                    </Link>
                    <br />
                    {files.map((f, i) => <Fragment key={i}>
                        {f.from < 0 ? <>&empty;</> : photo.files[f.from].id} &harr; {f.to < 0 ? <>&empty;</> : foundFiles[f.to].id}<br />
                    </Fragment>)}
                </Fragment>)
            )}
        />
    </>);
}
const ItemUnique: FC<ItemProps<PhotoType>> = ({item}) => {
    const dialog = useDialog();

    const handleOpenPhoto = () => {
        dialog.lightbox([item], 0);
    }

    return (<>
        <ListItemAvatar>
            <Avatar
                alt={item.title}
                src={urls.thumb(item)}
                variant='square'
                onClick={handleOpenPhoto}
                style={{cursor: 'pointer'}}
            />
        </ListItemAvatar>
        <ListItemText
            primary={item.title}
            secondary={<>{item.files.map((f, i) => <Fragment key={i}>{f.id}<br /></Fragment>)}</>}
        />
    </>);
}

interface SelectableItemProps<T extends Duplicate | PhotoType> {
    item: T;
    component: FC<ItemProps<T>>;
}
function SelectableItem<T extends Duplicate | PhotoType>({ item, component }: SelectableItemProps<T>) {
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

interface ListItemsProps<T extends Duplicate | PhotoType> {
    items: T[];
    component: FC<ItemProps<T>>;
}
function ListItems<T extends Duplicate | PhotoType>({ items, component }: ListItemsProps<T>) {
    const { all, cancel } = useSelection();

    if(items.length < 1)
        return <Alert severity="success" variant="outlined" sx={{m: "15px 0"}}>No items to display</Alert>;

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
    albums: [],
    keep: [],
    unique: [],
    delete: [],
    conflict: [],
    samealbum: [],
    countKeep: 0,
    countDelete: 0,
    countUnique: 0,
    countConflict: 0,
    countSameAlbum: 0
}

function filterList(list: Duplicate[], filter: PseudoAlbumType[], onlyMultiple: boolean): Duplicate[] {
    const validList = list || [];

    const filteredAlbums = filter.length < 1 ? validList :
        validList.map(d => ({
            ...d,
            found: d.found.filter(p => filter.some(f => f.collection === p.photo.collection && f.album === p.photo.album))
        })).filter(d => d.found.length > 0);

    return onlyMultiple ?
        filteredAlbums.filter(d => d.found.length > 1) :
        filteredAlbums;
}

const DuplicatesDialog: FC<DialogProps> = ({open, collection, album, onClose}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const dialog = useDialog();
    const favorite = useFavorite();
    const { data = defaultData, isFetching } = useDuplicatedPhotosQuery({ collection, album }, {skip: !open});
    const [albumsFilter, setAlbumsFilter] = useState<string[]>([]);
    const [onlyMultiple, setOnlyMultiple] = useState<boolean>(false);
    const [tab, setTab] = useState(0);
    const [isSelectingDups, setSelectingDups] = useState<boolean>(false);
    const [isSelectingUniq, setSelectingUniq] = useState<boolean>(false);
    const [selDups, setSelDups] = useState<Duplicate[]>([]);
    const [selUniq, setSelUniq] = useState<PhotoType[]>([]);
    
    const noSelection = isFetching ||
        // Delete, Keep, Conflict, Same
        ((tab === 0 || tab === 1 || tab === 2 || tab === 3) && !isSelectingDups) ||
        // Unique
        (tab === 4 && !isSelectingUniq);

    // Filter by selected albums
    const filter = albumsFilter.map(album => JSON.parse(album) as PseudoAlbumType);
    const listDelete = filterList(data.delete, filter, onlyMultiple);
    const listKeep = filterList(data.keep, filter, onlyMultiple);
    const listConflict = filterList(data.conflict, filter, onlyMultiple);
    const listSameAlbum = filterList(data.samealbum, filter, onlyMultiple);
    const listUnique = data.unique || [];

    // Clear album filter when opening
    useEffect(() => setAlbumsFilter([]), [open]);

    const handleChangeAlbumsFilter = (event: SelectChangeEvent<string[]>) => {
        const val = event.target.value;
        // On autofill we get a stringified value.
        setAlbumsFilter(typeof val === "string" ? [val] : val);
    };

    const handleOnlyMultiple = (event: React.ChangeEvent<HTMLInputElement>) => {
        setOnlyMultiple(event.target.checked);
    };
 
    const handleClose = () => {
        onClose();
    };

    const handleFavorite = async () => {
        const isSelectingDupsBak = isSelectingDups;
        const isSelectingUniqBak = isSelectingUniq;
        setSelectingDups(false);
        setSelectingUniq(false);
        
        const grouped = new Map<string, Map<string, Set<string>>>();

        if(tab === 0 || tab === 1 || tab === 2 || tab === 3) {
            selDups.forEach(duplicate => {
                duplicate.found.forEach(({photo}) => {
                    // Collection
                    const collection = grouped.get(photo.collection) || new Map<string, Set<string>>();
                    if (!grouped.has(photo.collection))
                        grouped.set(photo.collection, collection);
                    // Album
                    const album = collection.get(photo.album) || new Set<string>();
                    if (!collection.has(photo.album))
                        collection.set(photo.album, album);
                    // Photo
                    album.add(photo.id);
                });
            });
        } else if(tab === 4) {
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

        setSelectingDups(isSelectingDupsBak);
        setSelectingUniq(isSelectingUniqBak);
    };

    const handleMove = () => {
        const selection =
            tab === 0 || tab === 1 || tab === 2 || tab === 3 ? selDups.map(item => item.photo) :
            tab === 4 ? selUniq : [];
        // Create urls for thumbnails
        const photos: PhotoImageType[] = selection.map(photo => ({ ...photo, src: urls.thumb(photo) }));
        // Show move dialog
        dialog.move(collection, album, photos);
        onClose();
    };

    const handleDelete = () => {
        const selection =
            tab === 0 || tab === 1 || tab === 2 || tab === 3 ? selDups.map(item => item.photo) :
            tab === 4 ? selUniq : [];
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
        <Dialog open={open} maxWidth="sm" fullWidth fullScreen={fullScreen} PaperProps={{sx: {minHeight: "calc(100% - 64px)"}}}>
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
                        The following photos were found duplicated in another places. From the list bellow,
                        please select which photos you want to bookmark, move or delete.
                    </DialogContentText>
                    
                    <FormControl fullWidth sx={{mt: 2}}>
                        <InputLabel id="duplicates-filter-albums-label">Filter albums</InputLabel>
                        <Select
                            labelId="duplicates-filter-albums-label"
                            multiple
                            value={albumsFilter}
                            onChange={handleChangeAlbumsFilter}
                            input={<OutlinedInput label="Filter albums" />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={JSON.parse(value).album} />
                                    ))}
                                </Box>
                            )}
                        >
                            {data.albums.map((a) => (<MenuItem key={a.collection+":"+a.album} value={JSON.stringify(a)}>{a.album}</MenuItem>))}
                        </Select>
                    </FormControl>
                    <FormGroup>
                        <FormControlLabel control={<Checkbox checked={onlyMultiple} onChange={handleOnlyMultiple} />} label="Show only photos with multiple matches" />
                    </FormGroup>
                    
                    <Tabs value={tab} onChange={handleChangeTab} sx={{ borderBottom: 1, borderColor: 'divider' }} aria-label="selection duplicates or unique">
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero max={9999} badgeContent={listDelete.length}><FileCopyIcon /></Badge>} iconPosition="start" label="Delete" />
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero max={9999} badgeContent={listKeep.length}><SaveIcon /></Badge>} iconPosition="start" label="Keep" />
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero max={9999} badgeContent={listConflict.length}><RuleIcon /></Badge>} iconPosition="start" label="Conflict" />
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero max={9999} badgeContent={listSameAlbum.length}><PinDropIcon /></Badge>} iconPosition="start" label="Same" />
                        <Tab sx={{minHeight: 0, ml: "auto"}} icon={<Badge showZero max={9999} badgeContent={listUnique.length}><NewReleasesIcon /></Badge>} iconPosition="start" label="Unique" />
                        {/* <Tab sx={{minHeight: 0, textTransform: "none"}} label={"Total of " + data.total + " photos"} disabled /> */}
                    </Tabs>
                    <TabPanel value={tab} index={0}>
                        <SelectionProvider<Duplicate> onChange={setSelDups} onIsSelecting={setSelectingDups} itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={listDelete} component={ItemDuplicated} />
                        </SelectionProvider>
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <SelectionProvider<Duplicate> onChange={setSelDups} onIsSelecting={setSelectingDups} itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={listKeep} component={ItemDuplicated} />
                        </SelectionProvider>
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <SelectionProvider<Duplicate> onChange={setSelDups} onIsSelecting={setSelectingDups} itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={listConflict} component={ItemDuplicated} />
                        </SelectionProvider>
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <SelectionProvider<Duplicate> onChange={setSelDups} onIsSelecting={setSelectingDups} itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={listSameAlbum} component={ItemDuplicated} />
                        </SelectionProvider>
                    </TabPanel>
                    <TabPanel value={tab} index={4}>
                        <SelectionProvider<PhotoType> onChange={setSelUniq} onIsSelecting={setSelectingUniq} itemToId={i => `${i.collection}:${i.album}:${i.id}`}>
                            <ListItems items={listUnique} component={ItemUnique} />
                        </SelectionProvider>
                    </TabPanel>
                    {!noSelection &&
                        <Alert severity="info" variant="outlined" sx={{mt: 2}}>
                            <AlertTitle>Note well</AlertTitle>
                            Moving and deleting are performed on photos of this album, whilst bookmarking is over the photos found.
                        </Alert>
                    }
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
