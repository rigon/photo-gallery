import React, {FC, useContext, useState, forwardRef } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { useTheme, styled } from '@mui/material/styles';

import useMediaQuery from '@mui/material/useMediaQuery';
import AddAlbumIcon from '@mui/icons-material/AddPhotoAlternate';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import Box from "@mui/material/Box";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DeselectIcon from '@mui/icons-material/Deselect';
import Divider from "@mui/material/Divider";
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import FavoriteMenu from './FavoriteMenu';
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MoreIcon from '@mui/icons-material/MoreVert';
import MenuItem from "@mui/material/MenuItem";
import ThemeMenu from './ThemeMenu';
import Tooltip from "@mui/material/Tooltip";
import ZoomInIcon from "@mui/icons-material/ZoomInRounded";
import ZoomOutIcon from "@mui/icons-material/ZoomOutRounded";

import { Upload } from "./Upload";
import { useDialog } from './dialogs';
import { useSelectionContext } from './Selection';
import { increaseZoom, decreaseZoom } from "./services/app";

const StyledButton = styled(IconButton)(({ theme }) => ({
    textTransform: "none",
    borderRadius: 9999,
    //borderRadius: theme.shape.borderRadius,
    fontSize: theme.typography.fontSize,
    fontFamily: theme.typography.fontFamily,
}));

interface ContextProps {
    isCollapsed: boolean;
}

// Create the selection context
const ToolbarContext = React.createContext<ContextProps>({
    isCollapsed: false,
});

interface ToolbarItemProps {
    icon: JSX.Element;
    title: React.ReactNode;
    tooltip: React.ReactNode;
    subMenu?: boolean;
    showTitle?: boolean;
    "aria-label"?: string;
    onClick: (event: React.MouseEvent<Element, MouseEvent>) => void;
}

export const ToolbarItem = forwardRef<any, ToolbarItemProps>(
    ({ icon, title, tooltip, subMenu, showTitle, "aria-label": ariaLabel, onClick }, ref) => {
        const ctx = useContext(ToolbarContext);
        return ctx.isCollapsed ? (
            <Tooltip title={tooltip} enterDelay={300} placement="left" arrow>
                <MenuItem ref={ref} onClick={onClick} aria-label={ariaLabel}>
                    <ListItemIcon>{icon}</ListItemIcon>
                    <ListItemText>{title}</ListItemText>
                    {subMenu && <ArrowRightIcon />}
                </MenuItem>
            </Tooltip>
        ):(
            <Tooltip title={tooltip} enterDelay={300}>
                <StyledButton ref={ref} onClick={onClick} aria-label={ariaLabel} color="inherit">
                    {icon}
                    {showTitle && <span style={{marginLeft: 4}}>{title}</span>}
                    {subMenu && <ArrowDropDownIcon sx={{mr: -0.8}} />}
                </StyledButton>
            </Tooltip>
        );
    }
);

interface ToolbarMenuProps {
    children?: React.ReactNode;
}

export const ToolbarProvider: FC<ToolbarMenuProps> = ({ children }) => {
    const theme = useTheme();
    const isCollapsed = useMediaQuery(theme.breakpoints.down("lg"));
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMobileMenuClose = () => {
        setAnchorEl(null);
    };

    return isCollapsed ? (
        // Collapsed menu for mobile
        <ToolbarContext.Provider value={{ isCollapsed: true }}>
            <Menu
                keepMounted
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorEl)}
                onClose={handleMobileMenuClose}
            >
                {children}
            </Menu>
            <Box sx={{ display: { xs: 'flex', lg: 'none' } }}>
                <IconButton aria-label="show more"
                    aria-haspopup="true"
                    onClick={handleMobileMenuOpen}
                    color="inherit">
                    
                    <MoreIcon />
                </IconButton>
            </Box>
        </ToolbarContext.Provider>
    ):(
        // Expanded toolbar for desktop
        <ToolbarContext.Provider value={{ isCollapsed: false }}>
            <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
                {children}
            </Box>
        </ToolbarContext.Provider>
    );
}

const ToolbarMenu : FC = () => {
    const {collection = "", album = ""} = useParams();
    const dispatch = useDispatch();
    const dialog = useDialog();
    const { get: getSelection, cancel: cancelSelection } = useSelectionContext();

    const zoomIn = () => {
        dispatch(increaseZoom());
    }
    const zoomOut = () => {
        dispatch(decreaseZoom());
    }

    return (
        <ToolbarProvider>
            <ToolbarItem
                onClick={cancelSelection}
                icon={<DeselectIcon />}
                title="Clear selection"
                tooltip="Clear current photo selection in the gallery"
                aria-label="cancel selection" />
            <ToolbarItem
                onClick={() => dialog.move(collection, album, getSelection())}
                icon={<DriveFileMoveIcon />}
                title="Move photos"
                tooltip="Move selected photos to another album"
                aria-label="move photos" />
            
            <ToolbarItem
                onClick={() => dialog.delete(collection, album, getSelection())}
                icon={<DeleteForeverIcon />}
                title="Delete photos"
                tooltip="Delete selected photos"
                aria-label="delete photos" />
            <Divider />
            <Upload />
            
            <ToolbarItem
                onClick={() => dialog.newAlbum()}
                icon={<AddAlbumIcon />}
                title="New album"
                tooltip="Create a new album"
                aria-label="create album" />
            <FavoriteMenu />
            <Divider />
            <ThemeMenu />
            <ToolbarItem
                title="Zoom in"
                tooltip="Increase Zoom"
                aria-label="zoom in"
                onClick={zoomIn}
                icon={<ZoomInIcon />} />
            <ToolbarItem
                title="Zoom out"
                tooltip="Decrease Zoom"
                aria-label="zoom out"
                onClick={zoomOut}
                icon={<ZoomOutIcon />} />
                
        </ToolbarProvider>
    );
}

export default ToolbarMenu;
