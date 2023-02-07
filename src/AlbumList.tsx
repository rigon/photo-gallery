import { FC, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { AlbumType } from "./types";

interface AlbumListProps {
    /** Callback when a link is clicked */
    onClick: () => void
}

const AlbumList: FC<AlbumListProps> = ({onClick}) => {
    const { collection, album } = useParams();
    const [isLoading, setLoading] = useState<boolean>(true);
    const [albums, setAlbums] = useState<AlbumType[]>([]);

    useEffect(() => {
        setLoading(true);
        // Check if collection is valid
        if(collection !== undefined && collection.length > 0) {
            fetch(`/api/collection/${collection}/albums`)
                .then((response) => response.json())
                .then(albums => {
                    setAlbums(albums);
                    setLoading(false);
                });
        }
    }, [collection]);
    
    const list = (
        <List onClick={onClick}>
        { albums.map((a, index) => (
            <ListItemButton key={a.name} component={Link} to={`/${collection}/${a.name}`} selected={a.name === album}>
                <ListItemText>
                    <Typography noWrap>{a.name}</Typography>
                </ListItemText>
            </ListItemButton>
        ))}
        </List>);
    
    const loading = (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>);

    return (isLoading ? loading : list);
}

export default AlbumList;
