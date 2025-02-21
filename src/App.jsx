import { useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, useMediaQuery } from '@mui/material';
import { Provider, useDispatch } from 'react-redux';
import { store } from './redux/store';
import { performFMScript, handleFMScriptResult } from './utils/filemaker';
import { setSchema, createLog, LogType } from './redux/slices/appSlice';
import LLMChat from './components/LLMChat';

const AppContent = () => {
  const dispatch = useDispatch();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(() => 
    createTheme({
      palette: {
        mode: prefersDarkMode ? 'dark' : 'light',
        primary: {
          main: prefersDarkMode ? '#90caf9' : '#1976d2',
        },
        secondary: {
          main: prefersDarkMode ? '#f48fb1' : '#dc004e',
        },
        error: {
          main: '#f44336',
          dark: '#d32f2f',
          light: '#e57373',
          contrastText: '#fff',
        },
        background: {
          default: prefersDarkMode ? '#121212' : '#fff',
          paper: prefersDarkMode ? '#1e1e1e' : '#fff',
        },
        text: {
          primary: prefersDarkMode ? '#fff' : 'rgba(0, 0, 0, 0.87)',
          secondary: prefersDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
        },
      },
      components: {
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundColor: prefersDarkMode ? '#1e1e1e' : '#fff',
              borderRight: `1px solid ${prefersDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
            },
          },
        },
        MuiListItem: {
          styleOverrides: {
            root: {
              '&:hover': {
                backgroundColor: prefersDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              },
            },
          },
        },
      },
    }),
    [prefersDarkMode]
  );

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        dispatch(createLog('Fetching schema...', LogType.INFO));
        const result = await performFMScript('Request_Schema');
        const schema = handleFMScriptResult(result);
        dispatch(setSchema(schema));
        dispatch(createLog('Schema loaded successfully', LogType.SUCCESS));
      } catch (error) {
        console.error('Error fetching schema:', error);
        dispatch(createLog(`Failed to fetch schema: ${error.message}`, LogType.ERROR));
      }
    };

    fetchSchema();
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', display: 'flex' }}>
        <LLMChat />
      </Box>
    </ThemeProvider>
  );
};

function App() {
  return (
    <Provider store={store}>
      <CssBaseline />
      <AppContent />
    </Provider>
  );
}

export default App;
