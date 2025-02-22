import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import ProgressText from './ProgressText';
import { createLog, LogType } from '../redux/slices/appSlice';
import llmServiceFactory from '../services/llm';

const LLMAgent = () => {
  const dispatch = useDispatch();
  const llmSettings = useSelector(state => state.llm);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [toolResult, setToolResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const newMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    try {
      // Initial assistant message with progress text
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: <ProgressText text="Processing request..." /> 
      }]);

      const service = await llmServiceFactory.initializeService(llmSettings.provider);
      
      // Send message with tools enabled
      const response = await service.sendMessageWithTools(
        [
          { role: 'system', content: llmSettings.systemInstructions },
          ...messages,
          newMessage
        ],
        {
          model: llmSettings.model,
          temperature: llmSettings.temperature,
          tools: true
        }
      );

      // Handle tool results
      if (response.tool_calls) {
        // Process tool calls
        const toolResponse = await processToolCalls(response.tool_calls);
        setToolResult(toolResponse);
        
        // Show modal if tool requires user input
        if (toolResponse.requiresUserInput) {
          setModalContent({
            title: 'Additional Information Needed',
            content: toolResponse.question
          });
          setShowModal(true);
          return;
        }

        // If tool returns data for visualization
        if (toolResponse.visualizationType) {
          setModalContent({
            title: 'Visualization',
            content: toolResponse.data
          });
          setShowModal(true);
          return;
        }

        // Update messages with tool response
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: toolResponse.message
          }
        ]);
      } else {
        // Regular response
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: 'assistant',
            content: response.content
          }
        ]);
      }
    } catch (err) {
      console.error('Error in agent completion:', err);
      dispatch(createLog(`Agent completion error: ${err.message}`, LogType.ERROR));
      setMessages(prev => [...prev.slice(0, -1), {
        role: 'assistant',
        content: `Error: ${err.message}. Please try again.`
      }]);
    }
  };

  const processToolCalls = async (toolCalls) => {
    // Process each tool call and return appropriate response
    // This would be expanded based on specific tool implementations
    return {
      message: 'Tool processing complete',
      requiresUserInput: false,
      visualizationType: null,
      data: null
    };
  };

  const handleModalClose = () => {
    setShowModal(false);
    setModalContent(null);
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
      {/* Chat Messages */}
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
              {message.content}
            </Paper>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
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
            placeholder="Enter your direction..."
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
        </Box>
      </Box>

      {/* Modal for Tool Results */}
      <Dialog 
        open={showModal} 
        onClose={handleModalClose}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary'
          }
        }}
      >
        <DialogTitle>{modalContent?.title}</DialogTitle>
        <DialogContent>
          {modalContent?.content}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleModalClose}
            sx={{ color: 'primary.main' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LLMAgent;