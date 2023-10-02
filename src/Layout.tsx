import { FC, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import MenuIcon from '@mui/icons-material/Menu';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import AlbumList from './AlbumList';
import AlbumTitle from './AlbumTitle';
import CollectionList from './CollectionList';
import Storage from './Storage';
import ToolbarMenu from './Toolbar';

const drawerWidth = 300;

const Layout: FC = () => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const [mobileOpen, setMobileOpen] = useState<boolean>(isSmallScreen);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    const handleDrawerClose = () => {
        setMobileOpen(false);
    };


    const drawer = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Toolbar sx={{ color: "secondary.contrastText", backgroundColor: "secondary.main" }}>
                <Box mx="auto">
                    <Typography variant="h5" fontWeight="fontWeightBold" noWrap>
                        <Link href="#" color="inherit" underline="none">Photo Gallery</Link>
                    </Typography>
                </Box>
            </Toolbar>
            <Divider />
            <CollectionList />
            <Box sx={{ flex: '1 1 auto', overflow: 'hidden' }}>
                <AlbumList onClick={handleDrawerClose} />
            </Box>
            <Box sx={{ flex: 'none' }}>
                <Storage />
                <Paper elevation={24} square>
                    <Typography variant="body2" style={{ padding: "10px", textAlign: 'justify' }} >
                        <Link href="https://github.com/rigon/photo-gallery#contribute">
                            If you find this project useful, please consider supporting it.
                            Only with your help is possible to make this project better.
                        </Link>
                        <span style={{ float: "right" }}>v{APP_VERSION}</span>
                    </Typography>
                </Paper>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: "flex" }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <AlbumTitle />
                    <Box sx={{ flexGrow: 1 }} />
                    <ToolbarMenu />
                </Toolbar>
            </AppBar>
            <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
                {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: "70%", minWidth: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` } }}
            >
                <Toolbar />

                <Outlet />
            </Box>
        </Box>
    );
}

export default Layout;
