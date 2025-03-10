import { useState, useEffect, useRef } from 'react';
import { Snackbar, Slide } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ProgressText from './ProgressText';
import { performFMScript, processMessagesWithSystemPrompt } from './filemaker';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { Send as SendIcon, Delete as DeleteIcon } from '@mui/icons-material';

const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

const LLMChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const handleClearChat = () => {
    setMessages([]);
    setClearDialogOpen(false);
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    console.log(`User input: ${input}`);

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      let assistantMessage = { role: 'assistant', content: <ProgressText text="Thinking..." /> };
      setMessages(prev => [...prev, assistantMessage]);

      try {
        // Check if we have a config from FileMaker
        console.log("Checking for window.fmChatConfig:", window.fmChatConfig);
        
        // If no config exists in the window object, create a default one
        if (!window.fmChatConfig) {
          console.log("No FileMaker config found, creating default config");
          window.fmChatConfig = {
            apiKey: "demo-key",
            endpoint: "https://api.example.com",
            payload: {
              messages: [
                {
                  role: "system",
                  content: "You are a helpful AI assistant."
                }
              ]
            }
          };
        }
        
        // Create a deep clone of the config to avoid modifying the original
        let config = JSON.parse(JSON.stringify(window.fmChatConfig));
        
        console.log("Using config:", config);
        
        // Validate the config
        if (!config.payload || !config.payload.messages || !Array.isArray(config.payload.messages) || config.payload.messages.length === 0) {
          throw new Error('Invalid config: payload.messages must be a non-empty array');
        }
        
        // Validate that the first message is a system message
        if (config.payload.messages[0].role !== 'system') {
          throw new Error('Invalid config: first message must be a system message');
        }
        
        // Call FileMaker script with the config and user input
        console.log(`Calling FileMaker script "Make Call" with config:`, config);
        
        const result = await performFMScript({
          script: "Make Call",
          parameter: processMessagesWithSystemPrompt(config, input)
        });
        
        console.log("FileMaker response:", result);
        
        // Extract the assistant's response content based on the response format
        let assistantContent = "No response received from FileMaker.";
        
        // Handle different response formats from various LLM providers
        if (result) {
          console.log("Processing FileMaker response:", result);
          
          // OpenAI format
          if (result.choices && result.choices.length > 0 && result.choices[0].message) {
            assistantContent = result.choices[0].message.content;
          }
          // Ollama format
          else if (result.message && result.message.content) {
            assistantContent = result.message.content;
          }
          // Direct content field
          else if (result.content) {
            assistantContent = result.content;
          }
          
          // Add the assistant's response to the fmChatConfig messages array
          if (window.fmChatConfig && window.fmChatConfig.payload && window.fmChatConfig.payload.messages) {
            window.fmChatConfig.payload.messages.push({
              role: 'assistant',
              content: assistantContent
            });
          }
        }
        
        // Update the UI with the response
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: assistantContent
        }]);
        
      } catch (error) {
        console.error(`Error calling FileMaker: ${error.message}`);
        setError(error.message);
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `Error: ${error.message}. Please try again.`
        }]);
      }

    } catch (err) {
      console.error('Error in chat completion:', err);
      setError(err.message);
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `Error: ${err.message}. Please try again.`
      }]);
    }
  };

  return (
    <Box sx={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      color: 'text.primary',
      minHeight: '100vh'
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
            disabled={!input.trim()}
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
          <IconButton
            onClick={() => setClearDialogOpen(true)}
            color="error"
            disabled={messages.length === 0}
            sx={{
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle>Clear Chat</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear all chat messages? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setClearDialogOpen(false)}
            sx={{ color: 'text.primary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClearChat}
            color="error"
            variant="contained"
          >
            Clear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LLMChat;