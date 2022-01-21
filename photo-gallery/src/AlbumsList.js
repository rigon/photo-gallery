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
        fetch('http://localhost:8080/albums')
            .then((response) => response.json())
            .then(albumsList => {
                this.setState({ albums: albumsList });
            });
    }

    render() {
        return (
            <List>
            { this.state.albums.map((text, index) => (
                <ListItem button key={text} component={Link} to={text}>
                    <Typography noWrap>
                        <ListItemText primary={text} />
                    </Typography>
                </ListItem>
            ))}
            </List>
        );
    }
}

export default AlbumsList;
