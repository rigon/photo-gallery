import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { ThemeOptions } from '@mui/material/styles';
import "@fontsource/pt-sans";

// layouts
import Layout from './Layout';
import Gallery from './Gallery';

function Home() {
  return (<p>Select an album from the list on the left.</p>);
}

function Router() {
  const [zoom, setZoom] = useState(180);
  const changeZoom = (multiplier: number) => {
    setZoom(zoom * multiplier);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout changeZoom={changeZoom} />}>
          <Route index element={<Home />} />
          <Route path="/:collection" element={<Home />} />
          <Route path="/:collection/:album" element={<Gallery zoom={zoom} />} />
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
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = React.useMemo(() => createTheme(prefersDarkMode ? darkTheme : lightTheme), [prefersDarkMode]);

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <Router />
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
