import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { store } from '../redux/store';
import { Snackbar, Slide } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ProgressText from './ProgressText';
import { createLog, clearLogs, LogType } from '../redux/slices/appSlice';
import llmServiceFactory from '../services/llm';
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
  Slider,
  Stack,
  Typography,
  Alert
} from '@mui/material';
import { Send as SendIcon, Settings as SettingsIcon, Delete as DeleteIcon } from '@mui/icons-material';

const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

const LLMChat = () => {
  const dispatch = useDispatch();
  const llmSettings = useSelector(state => state.llm);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const state = store.getState();
  const schema = state.app.schema;

  const handleClearChat = () => {
    setMessages([]);
    dispatch(clearLogs());
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

    dispatch(createLog(
      `LLM Request:\n${JSON.stringify(input, null, 2)}`,
      LogType.INFO
    ));

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      // Check if user is asking about available tools
      if (input.toLowerCase().includes('what tools') ||
          input.toLowerCase().includes('available tools')) {
        const service = await llmServiceFactory.initializeService(llmSettings.provider);
        const tools = service.getTools();
        
        if (tools.length > 0) {
          const toolList = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Available tools:\n${toolList}`
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'No tools are currently available.'
          }]);
        }
        return;
      }

      let assistantMessage = { role: 'assistant', content: <ProgressText text="Thinking..." /> };
      setMessages(prev => [...prev, assistantMessage]);

      const service = await llmServiceFactory.initializeService(llmSettings.provider);
      const tools = service.getTools();
      
      // Log the request
      const requestPayload = {
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant with deep knowledge about FileMaker. ${JSON.stringify(schema)}. ${llmSettings.systemInstructions}`
          },
          ...messages,
          newMessage
        ],
        model: llmSettings.model,
        temperature: llmSettings.temperature,
        tools: tools
      };
      dispatch(createLog(
        `Messages:\n${JSON.stringify(requestPayload.messages, null, 2)}`,
        LogType.INFO
      ));
      dispatch(createLog(
        `Tools:\n${JSON.stringify(tools, null, 2)}`,
        LogType.INFO
      ));
      
      const startTime = Date.now();
      const response = await service.sendMessage(
        requestPayload.messages,
        {
          model: requestPayload.model,
          temperature: requestPayload.temperature,
          tools: tools
        },
        (progressText) => {
          if (progressText !== null && progressText !== undefined) {
            setMessages(prev => [
              ...prev.slice(0, -1),
              {
                role: 'assistant',
                content: <ProgressText text={progressText} />
              }
            ]);
          }
        }
      );
      
      const processingTime = Date.now() - startTime;
      
      // Log the response
      dispatch(createLog(
        `LLM Response (${processingTime}ms):\n${JSON.stringify(response, null, 2)}`,
        LogType.INFO
      ));

      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: response.content
      }]);

    } catch (err) {
      console.error('Error in chat completion:', err);
      dispatch(createLog(`Chat completion error: ${err.message}`, LogType.ERROR));
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
      mt: { xs: '56px', sm: '72px' },
      minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 72px)' },
      '& .MuiPaper-root': {
        '@media (max-width: 600px)': {
          maxWidth: '85%'
        }
      }
    }}>
      {llmSettings.registeredTools.error && (
        <Alert severity="warning" sx={{ m: 2 }}>
          Some tools failed to register: {llmSettings.registeredTools.error}
        </Alert>
      )}
      
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
