import { FC, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import ClearIcon from '@mui/icons-material/Clear';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useGetAlbumsQuery } from "./services/api";

interface AlbumListProps {
    /** Callback when a link is clicked */
    onClick: () => void
}

const AlbumList: FC<AlbumListProps> = ({onClick}) => {
    const { collection, album } = useParams();
    const { data = [], isFetching } = useGetAlbumsQuery({collection}, {skip: collection === undefined});
    const [ searchTerm, setSearchTerm ] = useState<string>("");

    const albums = searchTerm.length > 2 ?
        data.filter((album) => album.name.toLowerCase().includes(searchTerm.toLowerCase())) :
        data;

    const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };
    const clearSearch = () => {
        setSearchTerm("");
    };
    
    const list = (<>
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
                        <SearchIcon />
                    </InputAdornment>),
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton edge="end" onClick={clearSearch}>
                            <ClearIcon />
                        </IconButton>
                    </InputAdornment>),
                }} />
        <List onClick={onClick}>
            { albums.map((a) => (
                <ListItem disablePadding>
                    <ListItemButton key={a.name} component={Link} to={`/${collection}/${a.name}`} selected={a.name === album}>
                        <ListItemText>
                            <Typography noWrap>{a.name}</Typography>
                        </ListItemText>
                    </ListItemButton>
                </ListItem>
            ))}
        </List>
    </>);
    
    const loading = (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>);

    return (isFetching ? loading : list);
}

export default AlbumList;
