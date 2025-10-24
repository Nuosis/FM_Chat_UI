import { useState, useEffect, useRef } from 'react';
import { Snackbar, Slide } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ProgressText from './ProgressText';
import ChatConfig from './ChatConfig';
import {
  sendMessage,
  initializeConfig
} from '../service/processRouter';
import { getFileMakerStatus } from '../service/filemaker';
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
import { Send as SendIcon, Delete as DeleteIcon, Settings as SettingsIcon } from '@mui/icons-material';

const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

const LLMChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [isFileMaker, setIsFileMaker] = useState(false);
  const messagesEndRef = useRef(null);

  const handleClearChat = () => {
    setMessages([]);
    setClearDialogOpen(false);
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleConfigSave = (newConfig) => {
    console.log(`Config saved (FileMaker env: ${isFileMaker}):`, newConfig);
    
    // Provide user feedback based on environment
    if (isFileMaker) {
      console.log("Configuration updated for FileMaker environment");
    } else {
      console.log("Configuration updated for standalone environment");
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeConfig();
        const fileMakerStatus = await getFileMakerStatus();
        setIsFileMaker(fileMakerStatus);
      } catch (error) {
        console.error('Error initializing config:', error);
        setError('Failed to initialize configuration');
      }
    };
    
    initialize();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for progress updates from FileMaker
    const handleProgressUpdate = (event) => {
      const { text } = event.detail;
      console.log("Received progress update:", text);
      
      // Update the last assistant message if it's a progress message
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' &&
            (typeof lastMessage.content === 'object' || lastMessage.content.includes('Thinking'))) {
          return [...prev.slice(0, -1), {
            role: 'assistant',
            content: <ProgressText text={text} />
          }];
        }
        return prev;
      });
    };

    window.addEventListener('progressUpdate', handleProgressUpdate);
    
    return () => {
      window.removeEventListener('progressUpdate', handleProgressUpdate);
    };
  }, []);

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
        console.log(`Environment: ${isFileMaker ? 'FileMaker' : 'Standalone'}`);
        
        // Use the sendMessage function which handles all the complexity
        const result = await sendMessage(input);
        
        // sendMessage returns the processed content directly
        const assistantContent = result;
        
        // Update the UI with the response
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: assistantContent
        }]);
        
      } catch (error) {
        console.error(`Error calling API:`, error);
        console.error('Error type:', typeof error);
        console.error('Error message:', error.message);
        console.error('Error toString:', error.toString());
        
        // Check if the error message looks like JSON
        let errorMessage = error.message || error.toString() || 'Unknown error occurred';
        
        // If the error message looks like JSON, it might be a valid response being treated as an error
        if (errorMessage.startsWith('{') && errorMessage.includes('"choices"')) {
          console.warn('⚠️ ERROR MESSAGE LOOKS LIKE VALID JSON RESPONSE!');
          console.warn('This suggests the valid response is being treated as an error somewhere.');
          console.warn('Raw error message:', errorMessage);
          
          // Try to parse and process it as a valid response
          try {
            const parsedResponse = JSON.parse(errorMessage);
            if (parsedResponse.choices && parsedResponse.choices[0] && parsedResponse.choices[0].message) {
              console.log('✅ Successfully parsed JSON from error message');
              const content = parsedResponse.choices[0].message.content;
              setMessages(prev => [...prev.slice(0, -1), {
                role: 'assistant',
                content: content
              }]);
              return; // Exit early, don't show error
            }
          } catch (parseError) {
            console.error('Failed to parse JSON from error message:', parseError);
          }
        }
        
        setError(errorMessage);
        setMessages(prev => [...prev.slice(0, -1), {
          role: 'assistant',
          content: `Error: ${errorMessage}. Please try again.`
        }]);
      }

    } catch (err) {
      console.error('Error in chat completion:', err);
      console.error('Outer error type:', typeof err);
      console.error('Outer error message:', err.message);
      console.error('Outer error toString:', err.toString());
      
      // Check if the error message looks like JSON
      let errorMessage = err.message || err.toString() || 'Unknown error occurred';
      
      // If the error message looks like JSON, it might be a valid response being treated as an error
      if (errorMessage.startsWith('{') && errorMessage.includes('"choices"')) {
        console.warn('⚠️ OUTER ERROR MESSAGE LOOKS LIKE VALID JSON RESPONSE!');
        console.warn('This suggests the valid response is being treated as an error somewhere.');
        console.warn('Raw error message:', errorMessage);
        
        // Try to parse and process it as a valid response
        try {
          const parsedResponse = JSON.parse(errorMessage);
          if (parsedResponse.choices && parsedResponse.choices[0] && parsedResponse.choices[0].message) {
            console.log('✅ Successfully parsed JSON from outer error message');
            const content = parsedResponse.choices[0].message.content;
            setMessages(prev => [...prev.slice(0, -1), {
              role: 'assistant',
              content: content
            }]);
            return; // Exit early, don't show error
          }
        } catch (parseError) {
          console.error('Failed to parse JSON from outer error message:', parseError);
        }
      }
      
      setError(errorMessage);
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `Error: ${errorMessage}. Please try again.`
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
            onClick={() => setConfigDialogOpen(true)}
            color="primary"
            sx={{
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <SettingsIcon />
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

      <ChatConfig
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onSave={handleConfigSave}
      />
    </Box>
  );
};

export default LLMChat;