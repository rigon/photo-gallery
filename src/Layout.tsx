import { FC, useState } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ZoomOutIcon from "@mui/icons-material/ZoomOutRounded";
import ZoomInIcon from "@mui/icons-material/ZoomInRounded";

import CollectionList from './CollectionList';
import AlbumList from './AlbumList';
import NewAlbum from './NewAlbum';
import FavoriteMenu from './FavoriteMenu';

const drawerWidth = 300;

interface LayoutProps {
  changeZoom: (zoom: number) => void;
}

const Layout: FC<LayoutProps> = ({changeZoom}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState<boolean>(isSmallScreen);
  
  const {album} = useParams();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  const handleDrawerClose = () => {
    setMobileOpen(false);
  };
  const increaseZoom = () => {
    changeZoom(1.5);
  }
  const decreaseZoom = () => {
    changeZoom(0.5);
  }

  const drawer = (
    <div>
      <Toolbar sx={{ color: "secondary.contrastText", backgroundColor: "secondary.main" }}>
        <Box mx="auto">
          <Typography variant="h5" fontWeight="fontWeightBold" noWrap>
            Photo Gallery
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <CollectionList />
      <AlbumList onClick={handleDrawerClose} />
    </div>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            { album }
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <NewAlbum />
          <FavoriteMenu />
          
          <Tooltip title="Increase Zoom" enterDelay={300}>
            <IconButton onClick={increaseZoom} aria-label="zoom in" color="inherit">
                <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Decrease Zoom" enterDelay={300}>
            <IconButton onClick={decreaseZoom} aria-label="zoom out" color="inherit">
                <ZoomOutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: "90%" },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />

        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;
