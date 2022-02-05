import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { Typography } from '@material-ui/core';

class AlbumsList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            albums: []
        };
    }

    componentDidMount() {
        fetch('/albums')
            .then((response) => response.json())
            .then(albumsList => {
                console.log(albumsList);
                this.setState({ albums: albumsList });
            });
    }

    render() {
        return (
            <List>
            { this.state.albums.map((album, index) => (
                <ListItem button key={album.name} component={Link} to={album.name}>
                    <Typography noWrap>
                        <ListItemText primary={album.name} />
                    </Typography>
                </ListItem>
            ))}
            </List>
        );
    }
}

export default AlbumsList;
