import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

class CollectionList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            collections: []
        };
    }
    
    handleChange = (event) => {
      //setAge(event.target.value);
    };

    componentDidMount() {
        fetch('/collections')
            .then((response) => response.json())
            .then(collectionsList => {
                this.setState({ collections: collectionsList });
            });
    }

    render() {
        return (
            <FormControl variant="filled" fullWidth>
                <InputLabel id="collection-label">Collection</InputLabel>
                <Select labelId="collection-label" value={this.props.selected} onChange={this.handleChange}>
                    { this.state.collections.map((collection, index) => (
                        <MenuItem key={collection} value={index}>{collection}</MenuItem>
                        // <ListItem button key={album.name} component={Link} to={`/${album.name}`} onClick={this.props.onClick} selected={album.name === this.props.selected}>
                    ))}
                </Select>
            </FormControl>
        );
    }
}

export default CollectionList;
