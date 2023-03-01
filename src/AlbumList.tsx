import { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import { useGetAlbumsQuery } from "./services/api";

interface AlbumListProps {
    /** Callback when a link is clicked */
    onClick: () => void
}

const AlbumList: FC<AlbumListProps> = ({onClick}) => {
    const { collection, album } = useParams();
    const { data: albums = [], isFetching } = useGetAlbumsQuery({collection}, {skip: collection === undefined});
    
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

    return (isFetching ? loading : list);
}

export default AlbumList;
