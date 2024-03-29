import { FC, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';

import { useGetCollectionsQuery } from "./services/api";

const CollectionList: FC = () => {
    const navigate = useNavigate();
    const { collection } = useParams();
    const { data: collections = [], isFetching } = useGetCollectionsQuery();

    const selected = isFetching ? "" : collection || collections[0]?.name || "";

    // Select collection if none is selected
    useEffect(() => {
        if(!isFetching && selected !== collection && selected.length > 0)
            navigate(selected);
    }, [collection, isFetching, navigate, selected]);
    
    /** Navigate to the selected collection */
    const handleChange = (event: SelectChangeEvent) => {
        navigate(event.target.value as string);
    };

    const noItems = isFetching || collections.length < 1;
    const info = <MenuItem disabled><em>{isFetching ? "Loading..." : "Nothing to show"}</em></MenuItem>;
    const items = collections.map((c) => <MenuItem key={c.name} value={c.name}>{c.name}</MenuItem>);

    return (
        <FormControl variant="filled" fullWidth>
            <InputLabel id="collection-label">Collection</InputLabel>
            <Select labelId="collection-label" value={selected} onChange={handleChange}>
                { noItems ? info : items }
            </Select>
        </FormControl>
    );
}

export default CollectionList;
