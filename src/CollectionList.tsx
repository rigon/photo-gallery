import { FC, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import { CollectionType } from "./types";

const CollectionList: FC = () => {
    const navigate = useNavigate();
    const { collection } = useParams();
    const [selected, setSelected] = useState<string>("");
    const [collections, setCollections] = useState<CollectionType[]>([]);

    // Fetch list of collections
    useEffect(() => {
        fetch('/collections')
            .then((response) => response.json())
            .then(collections => {
                setCollections(collections);
                setSelected(collection || collections[0] || "");
            });
    }, [collection]);
    
    // Navigate to the selected collection
    useEffect(() => navigate(`/${selected}`), [selected, navigate]);
    
    const handleChange = (event: SelectChangeEvent) => {
        setSelected(event.target.value as string);
    };

    return (
        <FormControl variant="filled" fullWidth>
            <InputLabel id="collection-label">Collection</InputLabel>
            <Select labelId="collection-label" value={selected} onChange={handleChange}>
                { collections.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}

export default CollectionList;
