import { FC, Fragment, useEffect, useState } from 'react';
import { useTheme, SxProps, Theme } from "@mui/material/styles";
import useMediaQuery from '@mui/material/useMediaQuery';

import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import WarningIcon from '@mui/icons-material/Warning';

import { useDialog } from '.';
import { ResponseDuplicates, useDuplicatedPhotosQuery } from '../services/api';
import { SelectionProvider, Selectable, useSelection } from '../Selection';
import { PhotoImageType, PseudoAlbumType, urls } from '../types';
import useFavorite from '../favoriteHook';

const selectedStyle: SxProps<Theme> = {
    outline: "5px solid dodgerblue",
    outlineOffset: "-5px",
};

type Duplicated = ResponseDuplicates['duplicates'][0];
type Unique = ResponseDuplicates['unique'][0];

interface ItemProps<T extends Duplicated | Unique> {
    item: T;
}
const ItemDuplicated: FC<ItemProps<Duplicated>> = ({item: {photo, found}}) => {
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
            secondary={found.map(({photo: {collection, album, id, files: foundFiles}, partial, samealbum, files}, index) => (
                <Fragment key={index}>
                    {(partial || samealbum) &&
                        <Tooltip title={
                            <ol style={{paddingLeft: 12}}>
                                {partial && <li>Not all files were matched</li>}
                                {samealbum && <li>This photo is duplicated in the same album<br /><b>Do not delete all matches!</b></li>}
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
const ItemUnique: FC<ItemProps<Unique>> = ({item}) => {
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
    albums: [],
    total: 0,
    countDup: 0,
    countUniq: 0,
    duplicates: [],
    unique: [],
}

const DuplicatesDialog: FC<DialogProps> = ({open, collection, album, onClose}) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const dialog = useDialog();
    const favorite = useFavorite();
    const { data = defaultData, isFetching } = useDuplicatedPhotosQuery({ collection, album }, {skip: !open});
    const [albumsFilter, setAlbumsFilter] = useState<string[]>([]);
    const [tab, setTab] = useState(0);
    const [isSelectingDups, setSelectingDups] = useState<boolean>(false);
    const [isSelectingUniq, setSelectingUniq] = useState<boolean>(false);
    const [selDups, setSelDups] = useState<Duplicated[]>([]);
    const [selUniq, setSelUniq] = useState<Unique[]>([]);
    
    const noSelection = isFetching ||
        // Duplicates, Partial, Same
        ((tab === 0 || tab === 1 || tab === 2) && !isSelectingDups) ||
        // Unique
        (tab === 3 && !isSelectingUniq);

    // Filter by selected albums
    const filter = albumsFilter.map(album => JSON.parse(album) as PseudoAlbumType);
    const dataDuplicates = data.duplicates || [];
    const filtered = filter.length < 1 ? dataDuplicates :
        dataDuplicates.map(d => ({ ...d, found: d.found.filter(p => filter.some(f => f.collection === p.photo.collection && f.album === p.photo.album))}));
    // const filtered = filter.length < 1 ? dataDuplicates :
    //     dataDuplicates.filter(d => d.found.some(p => filter.some(f => f.collection === p.photo.collection && f.album === p.photo.album)));
    const duplicates = filtered.filter(d => d.found.some(v => !v.partial && !v.samealbum));
    const partial = filtered.filter(d => d.found.length > 0 && d.found.every(v => v.partial));
    const same = filtered.filter(d => d.found.length > 0 && d.found.every(v => v.samealbum));

    // Clear album filter when opening
    useEffect(() => setAlbumsFilter([]), [open]);

    const handleChangeAlbumsFilter = (event: SelectChangeEvent<string[]>) => {
        const val = event.target.value;
        // On autofill we get a stringified value.
        setAlbumsFilter(typeof val === "string" ? [val] : val);
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

        if(tab === 0 || tab === 1 || tab === 2) {
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
        } else if(tab === 3) {
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
            tab === 0 || tab === 1 || tab === 2 ? selDups.map(item => item.photo) :
            tab === 3 ? selUniq : [];
        // Create urls for thumbnails
        const photos: PhotoImageType[] = selection.map(photo => ({ ...photo, src: urls.thumb(photo) }));
        // Show move dialog
        dialog.move(collection, album, photos);
        onClose();
    };

    const handleDelete = () => {
        const selection =
            tab === 0 || tab === 1 || tab === 2 ? selDups.map(item => item.photo) :
            tab === 3 ? selUniq : [];
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
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen} PaperProps={{sx: {minHeight: "calc(100% - 64px)"}}}>
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
                    <Typography variant='body2'>
                        <b>Note well:</b> moving and deleting are performed on photos of this album, while bookmarking is over the photos found.
                    </Typography>
                    
                    <FormControl sx={{ margin: "1em 0", width: "100%" }}>
                        <InputLabel id="demo-multiple-chip-label">Filter albums</InputLabel>
                        <Select
                            labelId="demo-multiple-chip-label"
                            id="demo-multiple-chip"
                            multiple
                            value={albumsFilter}
                            onChange={handleChangeAlbumsFilter}
                            input={<OutlinedInput id="select-multiple-chip" label="Filter albums" />}
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
                    
                    <Tabs value={tab} onChange={handleChangeTab} sx={{ borderBottom: 1, borderColor: 'divider' }} aria-label="selection duplicates or unique">
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero max={9999} badgeContent={duplicates.length}><FileCopyIcon /></Badge>} iconPosition="start" label="Duplicates" />
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero max={9999} badgeContent={partial.length}><RuleIcon /></Badge>} iconPosition="start" label="Partial" />
                        <Tab sx={{minHeight: 0}} icon={<Badge showZero max={9999} badgeContent={same.length}><PinDropIcon /></Badge>} iconPosition="start" label="Same" />
                        <Tab sx={{minHeight: 0, ml: "auto"}} icon={<Badge showZero max={9999} badgeContent={data.countUniq}><NewReleasesIcon /></Badge>} iconPosition="start" label="Unique" />
                        {/* <Tab sx={{minHeight: 0, textTransform: "none"}} label={"Total of " + data.total + " photos"} disabled /> */}
                    </Tabs>
                    <TabPanel value={tab} index={0}>
                        <SelectionProvider<Duplicated> onChange={setSelDups} onIsSelecting={setSelectingDups} itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={duplicates} component={ItemDuplicated} />
                        </SelectionProvider>
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <SelectionProvider<Duplicated> onChange={setSelDups} onIsSelecting={setSelectingDups} itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={partial} component={ItemDuplicated} />
                        </SelectionProvider>
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <SelectionProvider<Duplicated> onChange={setSelDups} onIsSelecting={setSelectingDups} itemToId={i => `${i.photo.collection}:${i.photo.album}:${i.photo.id}`}>
                            <ListItems items={same} component={ItemDuplicated} />
                        </SelectionProvider>
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <SelectionProvider<Unique> onChange={setSelUniq} onIsSelecting={setSelectingUniq} itemToId={i => `${i.collection}:${i.album}:${i.id}`}>
                            <ListItems items={data.unique || []} component={ItemUnique} />
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
