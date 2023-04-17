import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { ThemeOptions } from '@mui/material/styles';
import "@fontsource/pt-sans";

// layouts
import Layout from './Layout';
import Gallery from './Gallery';
import { selectTheme } from "./services/app";

function Home() {
  return (<p style={{margin: 32}}>Select an album from the list on the left.</p>);
}

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/:collection" element={<Home />} />
          <Route path="/:collection/:album" element={<Gallery />} />
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
  if(themeSetting === "light") darkMode = false;
  if(themeSetting === "dark") darkMode = true;

  const theme = React.useMemo(() => createTheme(darkMode ? darkTheme : lightTheme), [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <Router />
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
