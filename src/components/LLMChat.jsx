import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar, Slide } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ProgressText from './ProgressText';
import { createLog, LogType } from '../redux/slices/appSlice';
import {
  setTemperature,
  setSystemInstructions,
  setProvider,
  setModel,
  setStreamingEnabled
} from '../redux/slices/llmSlice';
import llmServiceFactory from '../services/llm';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Stack,
  Switch
} from '@mui/material';
import {
  Send as SendIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

const LLMChat = () => {
  const dispatch = useDispatch();
  const llmSettings = useSelector(state => state.llm);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [providers] = useState(() => {
    const factory = llmServiceFactory;
    return Object.entries(factory.services).map(([key, service]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      provider: key
    }));
  });
  
  const [selectedProvider, setSelectedProvider] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize default provider and model
  useEffect(() => {
    const defaultProvider = import.meta.env.VITE_DEFAULT_PROVIDER?.toLowerCase();
    const defaultModel = import.meta.env.VITE_DEFAULT_MODEL;

    if (defaultProvider && providers.find(p => p.provider === defaultProvider)) {
      handleProviderChange({ target: { value: defaultProvider } });
      
      // If we have a default model, set it in the store
      if (defaultModel) {
        dispatch(setModel(defaultModel));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (!selectedProvider) return;
    
    const fetchModels = async () => {
      setError(null);
      dispatch(createLog('Fetching available models...', LogType.INFO));
      try {
        const service = await llmServiceFactory.initializeService(selectedProvider);
        const availableModels = await service.getModels();
        setModels(availableModels);
        
        const defaultModel = import.meta.env.VITE_DEFAULT_MODEL;
        if (defaultModel && availableModels.includes(defaultModel)) {
          setSelectedModel(defaultModel);
          dispatch(setModel(defaultModel));
        } else if (llmSettings.model && availableModels.includes(llmSettings.model)) {
          setSelectedModel(llmSettings.model);
        } else if (availableModels.length > 0) {
          setSelectedModel(availableModels[0]);
          dispatch(setModel(availableModels[0]));
        }
      } catch (err) {
        console.error('Error fetching models:', err);
        dispatch(createLog(`Failed to fetch models: ${err.message}`, LogType.ERROR));
        setError(`Failed to load models: ${err.message}`);
      }
    };

    fetchModels();
  }, [selectedProvider, dispatch]);

  const handleProviderChange = (event) => {
    const provider = event.target.value;
    setSelectedProvider(provider);
    setSelectedModel('');
    setModels([]);
    dispatch(setProvider(provider));
  };

  const handleModelChange = (event) => {
    const model = event.target.value;
    setSelectedModel(model);
    dispatch(setModel(model));
  };

  const handleSubmit = async () => {
    if (!input.trim() || !selectedProvider || !selectedModel) return;

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      let streamedContent = '';
      let assistantMessage = { role: 'assistant', content: <ProgressText text="Thinking..." /> };
      setMessages(prev => [...prev, assistantMessage]);

      const service = await llmServiceFactory.initializeService(selectedProvider);
      
      if (llmSettings.streamingEnabled) {
        // Handle streaming updates
        let streamedContent = '';
        const handleStreamUpdate = (chunk) => {
          streamedContent += chunk;
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            // Only update if the content has changed
            if (lastMessage.content !== streamedContent) {
              return [
                ...prev.slice(0, -1),
                {
                  role: 'assistant',
                  content: streamedContent
                }
              ];
            }
            return prev;
          });
        };

        await service.sendMessage(
          [
            { role: 'system', content: llmSettings.systemInstructions },
            ...messages,
            newMessage
          ],
          {
            model: selectedModel,
            temperature: llmSettings.temperature
          },
          handleStreamUpdate
        );
      } else {
        // Non-streaming mode
        const response = await service.sendMessage(
          [
            { role: 'system', content: llmSettings.systemInstructions },
            ...messages,
            newMessage
          ],
          {
            model: selectedModel,
            temperature: llmSettings.temperature
          }
        );

        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: response.content
        }]);
      }

    } catch (err) {
      console.error('Error in chat completion:', err);
      dispatch(createLog(`Chat completion error: ${err.message}`, LogType.ERROR));
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `Error: ${err.message}. Please try again.`
      }]);
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      color: 'text.primary'
    }}>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={3000}
        onClose={() => setError(null)}
        message={error}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={SlideTransition}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: 'error.main',
            color: 'error.contrastText'
          }
        }}
      />

      <Box sx={{ 
        p: 1.5,
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: 2,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>AI Provider</InputLabel>
          <Select
            value={selectedProvider}
            label="AI Provider"
            onChange={handleProviderChange}
            sx={{
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider'
              }
            }}
          >
            {providers.map(provider => (
              <MenuItem key={provider.id} value={provider.provider}>
                {provider.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            label="Model"
            onChange={handleModelChange}
            disabled={!selectedProvider}
            sx={{
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider'
              }
            }}
          >
            {models.map(model => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <IconButton 
          onClick={() => setSettingsOpen(true)}
          sx={{ color: 'primary.main' }}
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      <Box sx={{ 
        flex: 1, 
        p: 1.5, 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5
      }}>
        {messages.map((message, index) => (
          <Box 
            key={index}
            sx={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '70%',
              minWidth: '20%'
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                bgcolor: message.role === 'user' ? 'primary.main' : 'background.paper',
                color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                borderRadius: 2,
                '& p': {
                  m: 0,
                  mb: 1,
                  '&:last-child': {
                    mb: 0
                  }
                },
                '& pre': {
                  m: 0,
                  p: 0,
                  '& > div': {
                    m: '0.5em -1.5em',
                    borderRadius: 1
                  }
                },
                '& code': {
                  p: '0.2em 0.4em',
                  borderRadius: 1,
                  bgcolor: message.role === 'user' ? 'primary.dark' : 'action.hover',
                  color: message.role === 'user' ? 'primary.contrastText' : 'text.primary'
                },
                '& a': {
                  color: message.role === 'user' ? 'primary.contrastText' : 'primary.main',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                },
                '& ul, & ol': {
                  m: 0,
                  mb: 1,
                  pl: 3,
                  '&:last-child': {
                    mb: 0
                  }
                }
              }}
            >
              {typeof message.content === 'string' ? (
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ 
        p: 1.5, 
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Type your message..."
            sx={{
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'divider'
                }
              }
            }}
          />
          <IconButton 
            onClick={handleSubmit}
            disabled={!input.trim() || !selectedProvider || !selectedModel}
            color="primary"
            sx={{
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle>Chat Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2, minWidth: 300 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="System Instructions"
              value={llmSettings.systemInstructions}
              onChange={(e) => dispatch(setSystemInstructions(e.target.value))}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'divider'
                  }
                }
              }}
            />
            
            <Stack spacing={2}>
              <Box>
                <Typography gutterBottom>Temperature: {llmSettings.temperature}</Typography>
                <Slider
                  value={llmSettings.temperature}
                  onChange={(e, value) => dispatch(setTemperature(value))}
                  min={0}
                  max={2}
                  step={0.1}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 1, label: '1' },
                    { value: 2, label: '2' }
                  ]}
                  sx={{
                    color: 'primary.main'
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography>Enable Streaming</Typography>
                <Switch
                  checked={llmSettings.streamingEnabled}
                  onChange={(e) => dispatch(setStreamingEnabled(e.target.checked))}
                  color="primary"
                />
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSettingsOpen(false)}
            sx={{ color: 'primary.main' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LLMChat;
