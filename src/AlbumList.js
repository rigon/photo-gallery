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

    fetchCollections() {
        fetch(`/collection/${this.props.collection}/albums`)
            .then((response) => response.json())
            .then(albumsList => {
                this.setState({ albums: albumsList });
            });
    }
    
    componentDidMount() {
        this.fetchCollections()
    }
    
    componentDidUpdate(prevProps) {
      if(this.props.collection !== prevProps.collection) {
        this.fetchCollections();
      }
    } 

    render() {
        return (
            <List>
            { this.state.albums.map((album, index) => (
                <ListItem button key={album.name} component={Link} to={`/${this.props.collection}/${album.name}`} onClick={this.props.onClick} selected={album.name === this.props.selected}>
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
