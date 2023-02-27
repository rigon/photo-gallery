import { FC, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import IconButton from '@mui/material/IconButton';
import LightModeIcon from '@mui/icons-material/LightMode';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import Tooltip from '@mui/material/Tooltip';

import { selectTheme, changeTheme } from './services/app';

const options = {
    "light": { label: "Light", icon: <LightModeIcon /> },
    "dark": { label: "Dark", icon: <DarkModeIcon /> },
    "system": { label: "System", icon: <SettingsBrightnessIcon /> },
}

const ThemeMenu: FC = () => {
    const dispatch = useDispatch();
    const themeSelected = useSelector(selectTheme);
    const [anchorEl, setAnchorEl] = useState(null);
    
    const handleClickListItem = (event: any) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = (event: React.MouseEvent<HTMLElement>, key: typeof themeSelected) => {
        dispatch(changeTheme(key));
        //setAnchorEl(null);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    return (
        <div>
            <Tooltip title="Change theme" enterDelay={300}>
                <IconButton
                    color="inherit"
                    onClick={handleClickListItem}>
                        {options[themeSelected].icon}
                </IconButton>
            </Tooltip>

            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}>
                    {Object.keys(options).map((key) => (
                        <MenuItem
                            key={`theme-${key}`}
                            value={key}
                            selected={themeSelected === key}
                            onClick={e => handleMenuItemClick(e, key as typeof themeSelected)}>
                                <ListItemIcon>{options[key as typeof themeSelected].icon}</ListItemIcon>
                                <ListItemText>{options[key as typeof themeSelected].label}</ListItemText>
                        </MenuItem>
                    ))}
            </Menu>
        </div>
    );
}

export default ThemeMenu;
