import { FC, SetStateAction, useState } from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';

import { useGetPseudoAlbumsQuery } from './services/api';
import { PseudoAlbumType } from './types';

const options: PseudoAlbumType[] = [
    { collection: "Photos", album: { name: "Favorite 1 ", photos: []}},
    { collection: "Photos", album: { name: "Favorite 2 ", photos: []}},
    { collection: "Photos", album: { name: "Favorite 3 ", photos: []}},
    { collection: "Photos", album: { name: "Favorite 4 ", photos: []}},
    { collection: "Photos", album: { name: "Favorite 5 ", photos: []}},
    { collection: "Photos", album: { name: "Favorite 6 ", photos: []}},
    { collection: "Photos", album: { name: "Favorite 7 ", photos: []}},
];
const StyledButton = styled(Button)({
    textTransform: "none",
    borderRadius: "1000px",
    paddingLeft: "11px",
});

const FavoriteMenu: FC = () => {
    const { data = options, isLoading } = useGetPseudoAlbumsQuery();
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    
    const handleClickListItem = (event: any) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = (event: React.MouseEvent<HTMLElement>, index: SetStateAction<number>) => {
        setSelectedIndex(index);
        setAnchorEl(null);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const noItems = isLoading || data.length < 1;
    const info = <MenuItem disabled><em>{isLoading ? "Loading..." : "Nothing to show"}</em></MenuItem>;
    const items = data.map((item, index) => (
        <MenuItem
            key={item.collection + "-" + item.album.name}
            value={item.album.name}
            selected={index === selectedIndex}
            onClick={(event) => handleMenuItemClick(event, index)}>
                <ListItemText primary={item.album.name} secondary={item.collection} />
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
                        { data[selectedIndex]?.album.name || <em>Nothing</em> }
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
