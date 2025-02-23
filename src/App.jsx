import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, useMediaQuery } from '@mui/material';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './redux/store';
import { performFMScript, handleFMScriptResult, inFileMaker } from './utils/filemaker';
import { setSchema, createLog, LogType } from './redux/slices/appSlice';
import { setInitialized, setInitError, setRegisteredTools } from './redux/slices/llmSlice';
import Header from './components/Header';
import LLMChat from './components/LLMChat';
import Log from './components/Log';
import Spinner from './components/Spinner';
import llmServiceFactory from './services/llm';
import { registerTools } from './services/llm/tools';

const AppContent = () => {
  const dispatch = useDispatch();
  const llmSettings = useSelector(state => state.llm);
  const [isLoading, setIsLoading] = useState(true);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const [activeComponent, setActiveComponent] = useState('LLMChat');
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Starting initialization with settings:', JSON.stringify(llmSettings, null, 2));
        
        // Only fetch schema if we're in FileMaker
        if (inFileMaker) {
          dispatch(createLog('Fetching schema...', LogType.INFO));
          const request = {parameter: {action: 'requestSchema'}}
          const result = await performFMScript(request);
          const schema = handleFMScriptResult(result);
          dispatch(setSchema(schema));
          dispatch(createLog('Schema loaded successfully', LogType.SUCCESS));
        } else {
          dispatch(createLog('Running in standalone mode (no FileMaker)', LogType.INFO));
        }

        // Check for OpenAI API key
        if (llmSettings.provider === 'openai' && !import.meta.env.VITE_OPENAI_API_KEY) {
          throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY environment variable.');
        }

        // Initialize LLM service if provider is set and not initialized
        if (llmSettings.provider && !llmSettings.isInitialized) {
          console.log('Initializing LLM service for provider:', llmSettings.provider);
          dispatch(createLog(`Initializing ${llmSettings.provider} service...`, LogType.INFO));
          const service = await llmServiceFactory.initializeService(llmSettings.provider);
          console.log('Service initialized:', service?.provider || 'unknown');
          
          // Register tools
          dispatch(createLog('Registering tools...', LogType.INFO));
          console.log('Starting tool registration');
          const toolRegistration = await registerTools(service);
          console.log('Tool registration result:', JSON.stringify(toolRegistration, null, 2));
          dispatch(setRegisteredTools(toolRegistration));
          
          if (toolRegistration.success) {
            dispatch(createLog(`Registered ${toolRegistration.toolCount} tools successfully`, LogType.SUCCESS));
          } else {
            dispatch(createLog(`Partial tool registration: ${toolRegistration.error}`, LogType.WARNING));
          }
          
          dispatch(setInitialized());
          dispatch(createLog(`${llmSettings.provider} service initialized`, LogType.SUCCESS));
          console.log('Service initialization complete');
        }

        // Stop loading if we have a provider
        if (llmSettings.provider) {
          console.log('Initialization successful, stopping loading');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        dispatch(createLog(`Initialization error: ${error.message}`, LogType.ERROR));
        dispatch(setInitError(error.message));
        setIsLoading(false);
      }
    };

    initialize();
  }, [dispatch, llmSettings.provider]); // Only re-run when provider changes

  if (isLoading) {
    return (
      <Box sx={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}>
        <Spinner size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      color: 'text.primary'
    }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header
          isCollapsed={isHeaderCollapsed}
          onToggleCollapse={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
          setActiveComponent={(component) => {
            if (component === 'Log') {
              setLogOpen(true);
            } else {
              setActiveComponent(component);
            }
          }}
          activeComponent={activeComponent}
        />
        {activeComponent === 'LLMChat' && <LLMChat />}
        <Log open={logOpen} onClose={() => setLogOpen(false)} />
      </Box>
    </Box>
  );
};

function App() {
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

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}

export default App;
