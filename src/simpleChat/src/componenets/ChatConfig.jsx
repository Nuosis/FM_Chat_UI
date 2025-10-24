import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { createDefaultOpenAIConfig } from '../service/openai';

const ChatConfig = ({ open, onClose, onSave }) => {
  const [config, setConfig] = useState({
    provider: 'openai',
    apiKey: '',
    endpoint: '',
    model: 'gpt-4.1-nano',
    systemPrompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
    maxTokens: 1000
  });

  // Load config from localStorage on component mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('chatConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
      } catch (error) {
        console.error('Error parsing saved config:', error);
      }
    } else {
      // Set default OpenAI configuration
      const defaultConfig = createDefaultOpenAIConfig();
      setConfig(defaultConfig);
    }
  }, []);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('chatConfig', JSON.stringify(config));
    
    // Create the window.fmChatConfig format expected by the existing code
    const fmConfig = {
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      payload: {
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages: [
          {
            role: "system",
            content: config.systemPrompt
          }
        ]
      }
    };
    
    // Update the global config
    window.fmChatConfig = fmConfig;
    
    onSave(fmConfig);
    onClose();
  };

  const handleProviderChange = (provider) => {
    const providerDefaults = {
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4.1-nano'
      },
      anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-sonnet-20240229'
      },
      ollama: {
        endpoint: 'http://localhost:11434/api/chat',
        model: 'llama2'
      },
      custom: {
        endpoint: '',
        model: ''
      }
    };

    setConfig(prev => ({
      ...prev,
      provider,
      endpoint: providerDefaults[provider]?.endpoint || '',
      model: providerDefaults[provider]?.model || ''
    }));
  };

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          color: 'text.primary'
        }
      }}
    >
      <DialogTitle>Chat Configuration</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Provider</InputLabel>
            <Select
              value={config.provider}
              label="Provider"
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="anthropic">Anthropic</MenuItem>
              <MenuItem value="ollama">Ollama (Local)</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="API Key"
            type="password"
            value={config.apiKey}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder={config.provider === 'ollama' ? 'Not required for Ollama' : 'Enter your API key'}
            disabled={config.provider === 'ollama'}
          />

          <TextField
            fullWidth
            label="Endpoint URL"
            value={config.endpoint}
            onChange={(e) => handleInputChange('endpoint', e.target.value)}
            placeholder="API endpoint URL"
          />

          <TextField
            fullWidth
            label="Model"
            value={config.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            placeholder="Model name"
          />

          <Divider />

          <TextField
            fullWidth
            label="System Prompt"
            multiline
            rows={3}
            value={config.systemPrompt}
            onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
            placeholder="System prompt for the AI assistant"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Temperature"
              type="number"
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              value={config.temperature}
              onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Tokens"
              type="number"
              inputProps={{ min: 1, max: 4000 }}
              value={config.maxTokens}
              onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
              sx={{ flex: 1 }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            Configuration is saved to local storage and will persist between sessions.
            {config.provider !== 'ollama' && !config.apiKey && (
              <><br /><strong>Note:</strong> An API key is required to make actual API calls when not running in FileMaker.</>
            )}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: 'text.primary' }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatConfig;