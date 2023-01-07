import React from 'react';
import Button from '@mui/material/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import StarIcon from '@mui/icons-material/Star';
import Tooltip from '@mui/material/Tooltip';

const options = [
    'Favorites 1',
    'Favorites 2',
    'Favorites 3',
    'Favorites 4',
    'Favorites 5',
    'Favorites 6',
    'Favorites 7',
];

export default function FavoriteMenu() {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    const handleClickListItem = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = (event, index) => {
        setSelectedIndex(index);
        setAnchorEl(null);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    return (
        <div>
            <Tooltip title="Select an album to bookmark your favorites photos" enterDelay={300}>
                <Button
                    color="inherit"
                    onClick={handleClickListItem}
                    startIcon={<StarIcon />}
                    endIcon={<ExpandMoreIcon />}>
                    {options[selectedIndex]}
                </Button>
            </Tooltip>

            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}>
                {options.map((option, index) => (
                    <MenuItem
                        key={option}
                        selected={index === selectedIndex}
                        onClick={(event) => handleMenuItemClick(event, index)}>
                        {option}
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
}
