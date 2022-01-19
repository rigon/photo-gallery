import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

class AlbumsList extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <List>
            {['Inbox1', 'Starred1', 'Send email1', 'Drafts1',
                'Inbox2', 'Starred2', 'Send email2', 'Drafts2',
                'Inbox3', 'Starred3', 'Send email3', 'Drafts3',
                'Inbox4', 'Starred4', 'Send email4', 'Drafts4'].map((text, index) => (
                <ListItem button key={text} component={Link} to={text}>
                    <ListItemText primary={text} />
                </ListItem>
            ))}
            </List>
        );
    }
}

export default AlbumsList;
