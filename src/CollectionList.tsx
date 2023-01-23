import { FC, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

import { CollectionType } from "./types";

const CollectionList: FC = () => {
    const { collection } = useParams();
    const [collections, setCollections] = useState<CollectionType[]>([]);

    useEffect(() => {
        fetch('/collections')
            .then((response) => response.json())
            .then(collections => {
                setCollections(collections);
            });
    }, []);

    return (
        <FormControl variant="filled" fullWidth>
            <InputLabel id="collection-label">Collection</InputLabel>
            <Select labelId="collection-label" >
                { collections.map((c) => (
                    <MenuItem key={c} component={Link} to={`/${c}`} selected={c === collection}>{c}</MenuItem>
                    // <MenuItem key={c} value={c} component={Link} to={`/${c}`}>{c}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}

export default CollectionList;
