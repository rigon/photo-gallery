import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, ThemeOptions, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import InfoIcon from '@mui/icons-material/Info';
import Typography from '@mui/material/Typography';
import { SnackbarProvider } from 'notistack';
import "@fontsource/pt-sans";

import Layout from './Layout';
import Gallery from './Gallery';

import { DialogProvider } from './dialogs';
import { selectTheme } from "./services/app";

function Home() {
    return (
        <Box sx={{ marginTop: "45vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <InfoIcon fontSize="large" sx={{m: 1}} />
            <Typography variant="h6">Select an album from the list on the left.</Typography>
        </Box>);
}

function MainLayout() {
    return (
        <DialogProvider>
            <Layout />
        </DialogProvider>
    );
}

function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Home />} />
                    <Route path="/:collection" element={<Home />} />
                    <Route path="/:collection/:album" element={<Gallery />} />
                    <Route path="/:collection/:album/:photo" element={<Gallery />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

const baseTheme: ThemeOptions = {
    typography: {
        fontFamily: 'PT Sans, sans-serif',
    },
};

const lightTheme: ThemeOptions = {
    ...baseTheme,
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#1e87e5',
        },
    },
};

const darkTheme: ThemeOptions = {
    ...baseTheme,
    palette: {
        mode: 'dark',
        primary: {
            main: '#4cc2ff',
        },
        secondary: {
            main: '#3f525e',
        },
        background: {
            default: '#202020',
            paper: '#272727',
        },
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#314049',
                    backgroundImage: 'none',
                },
            },
        },
    },
};

function App() {
    const themeSetting = useSelector(selectTheme);
    let darkMode = useMediaQuery('(prefers-color-scheme: dark)');
    if (themeSetting === "light") darkMode = false;
    if (themeSetting === "dark") darkMode = true;

    const theme = useMemo(() => createTheme(darkMode ? darkTheme : lightTheme), [darkMode]);

    return (
        <ThemeProvider theme={theme}>
            <SnackbarProvider>
                <Router />
            </SnackbarProvider>
        </ThemeProvider>
    );
}

export default App;
