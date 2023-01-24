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
    const [changeUrl, setChangeUrl] = useState<boolean>(false);
    const [collections, setCollections] = useState<CollectionType[]>([]);

    // Navigate to the selected collection
    if(changeUrl) {
        navigate(`/${selected}`);
        setChangeUrl(false);
    }
    
    // Fetch list of collections
    useEffect(() => {
        fetch('/collections')
            .then((response) => response.json())
            .then(collections => {
                setCollections(collections);
                
                const newCollection = collection || collections[0] || "";
                if(newCollection !== collection) {
                    setSelected(newCollection);
                    setChangeUrl(true);
                }
            });
    }, [collection]);
    
    const handleChange = (event: SelectChangeEvent) => {
        setSelected(event.target.value as string);
        setChangeUrl(true);
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
