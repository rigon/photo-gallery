import { FC, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

import { AlbumType } from "./types";

interface AlbumListProps {
    /** Callback when a link is clicked */
    onClick: () => void
}

const AlbumList: FC<AlbumListProps> = ({onClick}) => {
    const { collection, album } = useParams();
    const [albums, setAlbums] = useState<AlbumType[]>([]);

    useEffect(() => {
        // Check if collection is valid
        if(collection !== undefined && collection.length > 0) {
            fetch(`/collection/${collection}/albums`)
                .then((response) => response.json())
                .then(albums => {
                    setAlbums(albums);
                });
        }
    }, [collection]);

    return (
        <List onClick={onClick}>
        { albums.map((a, index) => (
            <ListItemButton key={a.name} component={Link} to={`/${collection}/${a.name}`} selected={a.name === album}>
                <ListItemText>
                    <Typography noWrap>{a.name}</Typography>
                </ListItemText>
            </ListItemButton>
        ))}
        </List>
    );
}

export default AlbumList;
