import { FC, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import { useGetPseudoAlbumsQuery } from './services/api';
import { changeFavorite, selectFavorite } from './services/app';
import { ToolbarItem } from './Toolbar';


const FavoriteMenu: FC = () => {
    const dispatch = useDispatch();
    const favoriteSelected = useSelector(selectFavorite);
    const { data = [], isFetching } = useGetPseudoAlbumsQuery();
    const [anchorEl, setAnchorEl] = useState<Element | null>(null);
    
    const handleClickListItem = (event: React.MouseEvent<Element, MouseEvent>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = (index: number) => {
        dispatch(changeFavorite(data[index]))
        setAnchorEl(null);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const noItems = isFetching || data.length < 1;
    const info = <MenuItem disabled><em>{isFetching ? "Loading..." : "Nothing to show"}</em></MenuItem>;
    const items = data.map((item, index) => (
        <MenuItem
            key={`favorite-${item.collection}-${item.album}`}
            value={item.album}
            selected={favoriteSelected?.collection === item.collection && favoriteSelected?.album === item.album}
            onClick={() => handleMenuItemClick(index)}>
                <ListItemText primary={item.album} secondary={item.collection} />
        </MenuItem>
    ));

    return (
        <>
            <ToolbarItem
                subMenu
                showTitle
                onClick={handleClickListItem}
                icon={<FavoriteIcon />}
                title={ favoriteSelected?.album || <em>Nothing</em> }
                tooltip="Select an album to bookmark your favorites photos" />

            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}>
                    { noItems ? info : items }
            </Menu>
        </>
    );
}

export default FavoriteMenu;
