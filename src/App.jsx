import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, useMediaQuery } from '@mui/material';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './redux/store';
import { setSchema, createLog, LogType, toggleHeader, setHeaderVisibility } from './redux/slices/appSlice';
import { setInitialized, setInitError, setRegisteredTools } from './redux/slices/llmSlice';
import Header from './components/Header';
import LLMChat from './components/LLMChat';
import Log from './components/Log';
import Spinner from './components/Spinner';
import llmServiceFactory from './services/llm';
import { registerTools } from './services/llm/tools';
import { createAgentManager, initializeDefaultAgent } from './services/llm/agents';

const AppContent = () => {
  const dispatch = useDispatch();
  const llmSettings = useSelector(state => state.llm);
  const { showHeader } = useSelector(state => state.app);
  const [isLoading, setIsLoading] = useState(true);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true);
  const [activeComponent, setActiveComponent] = useState('LLMChat');
  const [logOpen, setLogOpen] = useState(false);

  // Add keyboard shortcut to toggle header visibility (Alt+H)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey && event.key === 'h') {
        dispatch(toggleHeader());
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Starting initialization with settings:', JSON.stringify(llmSettings, null, 2));
        
        // Get schema summary regardless of FileMaker status
        dispatch(createLog('Getting schema summary...', LogType.INFO));
        const { getSchemaSummary } = await import('./schema');
        const schemaSummary = getSchemaSummary();
        dispatch(setSchema(schemaSummary));
        dispatch(createLog('Schema summary loaded successfully', LogType.SUCCESS));

        // Check if we're running in FileMaker context
        const inFileMaker = typeof window.FileMaker !== 'undefined';
        if (!inFileMaker) {
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
          
          // Initialize agent if agents are enabled
          if (import.meta.env.VITE_ENABLE_AGENTS === 'true') {
            const agentName = import.meta.env.VITE_DEFAULT_AGENT || 'default';
            dispatch(createLog(`Initializing agent: ${agentName}`, LogType.INFO));
            try {
              const agentManager = createAgentManager(service);
              if (agentManager) {
                const agent = await initializeDefaultAgent(agentManager);
                if (agent) {
                  dispatch(createLog(`Agent ${agent.name} initialized with tools: ${agent.tools.join(', ')}`, LogType.SUCCESS));
                } else {
                  dispatch(createLog(`Failed to initialize agent`, LogType.WARNING));
                }
              }
            } catch (error) {
              dispatch(createLog(`Error initializing agent: ${error.message}`, LogType.ERROR));
            }
          }
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
        {showHeader && (
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
        )}
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
