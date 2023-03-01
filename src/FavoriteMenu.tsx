import { FC, useState } from 'react';
import { styled } from '@mui/material/styles';
import { useSelector, useDispatch } from 'react-redux';
import Button from '@mui/material/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';

import { useGetPseudoAlbumsQuery } from './services/api';
import { changeFavorite, selectFavorite } from './services/app';

const StyledButton = styled(Button)({
    textTransform: "none",
    borderRadius: "1000px",
    paddingLeft: "11px",
});

const FavoriteMenu: FC = () => {
    const dispatch = useDispatch();
    const favoriteSelected = useSelector(selectFavorite);
    const { data = [], isLoading } = useGetPseudoAlbumsQuery();
    const [anchorEl, setAnchorEl] = useState(null);
    
    const handleClickListItem = (event: any) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = (event: React.MouseEvent<HTMLElement>, index: number) => {
        dispatch(changeFavorite(data[index]))
        setAnchorEl(null);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const noItems = isLoading || data.length < 1;
    const info = <MenuItem disabled><em>{isLoading ? "Loading..." : "Nothing to show"}</em></MenuItem>;
    const items = data.map((item, index) => (
        <MenuItem
            key={`favorite-${item.collection}-${item.album}`}
            value={item.album}
            selected={favoriteSelected?.collection === item.collection && favoriteSelected?.album === item.album}
            onClick={(event) => handleMenuItemClick(event, index)}>
                <ListItemText primary={item.album} secondary={item.collection} />
        </MenuItem>
    ));

    return (
        <div>
            <Tooltip title="Select an album to bookmark your favorites photos" enterDelay={300}>
                <StyledButton
                    color="inherit"
                    onClick={handleClickListItem}
                    startIcon={<FavoriteIcon />}
                    endIcon={<ExpandMoreIcon />}>
                        { favoriteSelected?.album || <em>Nothing</em> }
                </StyledButton>
            </Tooltip>

            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}>
                    { noItems ? info : items }
            </Menu>
        </div>
    );
}

export default FavoriteMenu;
