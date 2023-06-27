import { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { useGetAlbumsQuery } from "./services/api";

const AlbumTitle: FC = () => {
    const { collection, album } = useParams();
    const { data = [], isFetching } = useGetAlbumsQuery({ collection }, { skip: collection === undefined });
    
    const index = data.findIndex(e => e.name === album);
    const hasBefore = !isFetching && index > 0;
    const hasNext = !isFetching && index >= 0 && index < data.length - 1;
    const before = hasBefore ? data[index-1].name : "#";
    const next = hasNext ? data[index+1].name: "#";

    return (
        <>
            <Link to={`/${collection}/${before}`} onClick={(e) => hasBefore ? true : e.preventDefault()}>
                <Tooltip title={before} enterDelay={300}>
                    <IconButton disabled={!hasBefore} aria-label="before">
                        <NavigateBeforeIcon fontSize='small' />
                    </IconButton>
                </Tooltip>
            </Link>
            <Link to={`/${collection}/${next}`} onClick={(e) => hasNext ? true : e.preventDefault()}>
                <Tooltip title={next} enterDelay={300}>
                    <IconButton disabled={!hasNext} aria-label="next">
                        <NavigateNextIcon fontSize='small' />
                    </IconButton>
                </Tooltip>
            </Link>
            <Typography variant="h6" noWrap component="div" sx={{ ml: 1 }}>
                {album}
            </Typography>
        </>
    );
}

export default AlbumTitle;
