import { FC, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

import { selectTheme, changeTheme } from './services/app';
import { ToolbarItem } from './Toolbar';

const options = {
    "light": { label: "Light", icon: <LightModeIcon /> },
    "dark": { label: "Dark", icon: <DarkModeIcon /> },
    "system": { label: "System", icon: <SettingsBrightnessIcon /> },
}

const ThemeMenu: FC = () => {
    const dispatch = useDispatch();
    const themeSelected = useSelector(selectTheme);
    const [anchorEl, setAnchorEl] = useState<Element | null>(null);
    
    const handleClickListItem = (event: React.MouseEvent<Element, MouseEvent>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuItemClick = (_event: React.MouseEvent<Element, MouseEvent>, key: typeof themeSelected) => {
        dispatch(changeTheme(key));
        //setAnchorEl(null);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <ToolbarItem
                subMenu
                onClick={handleClickListItem}
                icon={options[themeSelected].icon}
                title="Theme"
                tooltip="Change theme"
                aria-label="change theme" />

            <Menu
                id="lock-menu"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
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
        </>
    );
}

export default ThemeMenu;
