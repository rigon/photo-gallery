import { FC, useState, useEffect, useCallback } from 'react';
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
    
    const changeUrl = useCallback((url: string) => {
        setSelected(url);
        navigate(`/${url}`);
    }, [navigate]);
    
    // Fetch list of collections
    useEffect(() => {
        fetch('/api/collections')
            .then((response) => response.json())
            .then(collections => {
                const newCollection = collection || collections[0] || "";
                if(newCollection !== collection)
                    changeUrl(newCollection);
                
                setCollections(collections);
                setSelected(newCollection);
            });
    }, [collection, changeUrl]);
    
    /** Navigate to the selected collection */
    const handleChange = (event: SelectChangeEvent) => {
        changeUrl(event.target.value as string);
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
