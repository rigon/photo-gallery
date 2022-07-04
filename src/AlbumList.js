import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { Typography } from '@material-ui/core';

class AlbumList extends Component {
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
                this.setState({ albums: albumsList });
            });
    }

    render() {
        return (
            <List>
            { this.state.albums.map((album, index) => (
                <ListItem button key={album.name} component={Link} to={`/${album.name}`} onClick={this.props.onClick} selected={album.name === this.props.selected}>
                    <ListItemText>
                        <Typography noWrap>{album.name}</Typography>
                    </ListItemText>
                </ListItem>
            ))}
            </List>
        );
    }
}

export default AlbumList;
