import { FC, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer, { Size } from 'react-virtualized-auto-sizer';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import {
    IconX,
    IconSearch,
} from "@tabler/icons-react";

import { useGetAlbumsQuery } from "./services/api";
import { AlbumType } from './types';

interface AlbumListProps {
    /** Callback when a link is clicked */
    onClick: () => void
}

const AlbumList: FC<AlbumListProps> = ({ onClick }) => {
    const { collection, album } = useParams();
    const { data = [], isFetching } = useGetAlbumsQuery({ collection }, { skip: collection === undefined });
    const [searchTerm, setSearchTerm] = useState<string>("");

    const albums = useMemo(() => {
        if (searchTerm.length < 1)  // Empty search, don't filter
            return data;

        const terms = searchTerm.toLowerCase().split(/\s+/);
        return data.filter(album => {
            const low = album.name.toLowerCase();
            return terms.reduce((acc, term) => acc && low.includes(term), true);
        });
    }, [searchTerm, data]);
    const isEmptyList = albums.length < 1;

    const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };
    const clearSearch = () => {
        setSearchTerm("");
    };

    const renderRow = ({ index, style }: ListChildComponentProps<AlbumType>) => {
        const current = albums[index];
        return (
            <ListItemButton onClick={onClick} style={style} component={Link} to={`/${collection}/${current.name}`} selected={current.name === album}>
                <ListItemText>
                    <Typography noWrap>{current.name}</Typography>
                </ListItemText>
            </ListItemButton>
        );
    }

    // Render progressbar while loading
    if (isFetching)
        return (
            <Box sx={{ width: '100%' }}>
                <LinearProgress />
            </Box>);

    const list = isEmptyList ?
        (<ListItem><ListItemText><em>Nothing to show</em></ListItemText></ListItem>) :
        (<AutoSizer>
            {({ height, width }: Size) =>
                <FixedSizeList
                    height={height - 48}
                    width={width}
                    itemSize={48}
                    itemCount={albums.length}
                    overscanCount={5}>
                    {renderRow}
                </FixedSizeList>
            }
        </AutoSizer>);

    return <>
        <TextField
            label="Search albums"
            value={searchTerm}
            onChange={onSearch}
            fullWidth
            variant="filled"
            size="small"
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <IconSearch size={20} />
                    </InputAdornment>),
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton edge="end" onClick={clearSearch} aria-label="clear search">
                            <IconX />
                        </IconButton>
                    </InputAdornment>),
            }} />
        <List component="nav" sx={{ height: "100%", p: 0 }}>
            {list}
        </List>
    </>;
}

export default AlbumList;
