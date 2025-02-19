import { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import {
    IconChevronLeft,
    IconChevronRight,
} from "@tabler/icons-react";

import { useGetAlbumsQuery, useGetAlbumQuery } from "./services/api";

const AlbumTitle: FC = () => {
    const { collection = "", album = "" } = useParams();
    const { data = [], isFetching } = useGetAlbumsQuery({ collection }, { skip: collection === "" });
    const { data: albumData } = useGetAlbumQuery({ collection, album }, { skip: collection === "" || album === "" });

    const index = data.findIndex(e => e.name === album);
    const hasBefore = !isFetching && index > 0;
    const hasNext = !isFetching && index >= 0 && index < data.length - 1;
    const before = hasBefore ? data[index - 1].name : "#";
    const next = hasNext ? data[index + 1].name : "#";

    return (
        <>
            <Link to={`/${collection}/${before}`} onClick={(e) => hasBefore ? true : e.preventDefault()}>
                <Tooltip arrow title={before} enterDelay={300}>
                    <IconButton disabled={!hasBefore} aria-label="before">
                        <IconChevronLeft size={20} />
                    </IconButton>
                </Tooltip>
            </Link>
            <Link to={`/${collection}/${next}`} onClick={(e) => hasNext ? true : e.preventDefault()}>
                <Tooltip arrow title={next} enterDelay={300}>
                    <IconButton disabled={!hasNext} aria-label="next">
                        <IconChevronRight size={20} />
                    </IconButton>
                </Tooltip>
            </Link>
            <Tooltip arrow enterDelay={300} title={<>
                <b>Number of photos:</b> {albumData?.count}<br />
                <b>Date:</b> {new Date(albumData?.title || "0").toLocaleString()}<br />
            </>}>
                <Typography variant="h6" noWrap component="div" sx={{ ml: 1 }}>
                    {album}
                </Typography>
            </Tooltip>
        </>
    );
}

export default AlbumTitle;
