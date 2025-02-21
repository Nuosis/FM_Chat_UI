import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar, Slide } from '@mui/material';
import ProgressText from './ProgressText';
import { createLog, LogType } from '../redux/slices/appSlice';
import {
  setTemperature,
  setSystemInstructions,
  setProvider,
  setModel
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
  Stack
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
      let assistantMessage = { role: 'assistant', content: <ProgressText text="Thinking..." /> };
      setMessages(prev => [...prev, assistantMessage]);

      const service = await llmServiceFactory.initializeService(selectedProvider);
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
                borderRadius: 2
              }}
            >
              <Typography>{message.content}</Typography>
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
