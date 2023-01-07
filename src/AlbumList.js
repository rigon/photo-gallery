import React, { useState, useEffect } from 'react';
import PropTypes from "prop-types";
import { useParams, Link } from 'react-router-dom';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

function AlbumList({onClick}) {
    const { collection, album } = useParams();
    const [albums, setAlbums] = useState([]);

    useEffect(() => {
        fetch(`/collection/${collection}/albums`)
            .then((response) => response.json())
            .then(albums => {
                setAlbums(albums);
            });
    }, [collection]);

    return (
        <List>
        { albums.map((a, index) => (
            <ListItemButton key={a.name} component={Link} to={`/${collection}/${a.name}`} selected={a.name === album} onClick={onClick}>
                <ListItemText>
                    <Typography noWrap>{a.name}</Typography>
                </ListItemText>
            </ListItemButton>
        ))}
        </List>
    );
}

AlbumList.propTypes = {
    onClick: PropTypes.func
};

export default AlbumList;
