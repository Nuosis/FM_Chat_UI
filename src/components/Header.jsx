import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Stack,
  Typography,
  Collapse,
  CircularProgress,
  TextField
} from '@mui/material';
import { Settings as SettingsIcon, Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { createLog, LogType } from '../redux/slices/appSlice';
import {
  setTemperature,
  setSystemInstructions,
  setProvider,
  setModel
} from '../redux/slices/llmSlice';
import llmServiceFactory from '../services/llm';

const Header = ({ isCollapsed, onToggleCollapse, setActiveComponent, activeComponent }) => {
  const dispatch = useDispatch();
  const llmSettings = useSelector(state => state.llm);
  const components = ['LLMChat', 'Log'];
  const [providers] = useState(() => {
    const factory = llmServiceFactory;
    return Object.entries(factory.services).map(([key, service]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      provider: key
    }));
  });
  
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initialize provider and model from environment variables
  useEffect(() => {
    const initializeProviderAndModel = async () => {
      const defaultProvider = import.meta.env.VITE_DEFAULT_PROVIDER?.toLowerCase();
      const defaultModel = import.meta.env.VITE_DEFAULT_MODEL;

      if (defaultProvider && providers.find(p => p.provider === defaultProvider)) {
        // Set provider in Redux state
        dispatch(setProvider(defaultProvider));
        
        // Fetch models for the provider
        setIsLoadingModels(true);
        try {
          const service = await llmServiceFactory.initializeService(defaultProvider);
          const availableModels = await service.getModels();
          setModels(availableModels);
          
          // Set model if available
          if (defaultModel && availableModels.includes(defaultModel)) {
            dispatch(setModel(defaultModel));
          } else if (availableModels.length > 0) {
            dispatch(setModel(availableModels[0]));
          }
        } catch (error) {
          console.error('Error fetching models:', error);
          dispatch(createLog(`Failed to fetch models: ${error.message}`, LogType.ERROR));
        } finally {
          setIsLoadingModels(false);
        }
      }
    };

    initializeProviderAndModel();
  }, [dispatch, providers]);

  const handleProviderChange = async (event) => {
    const provider = event.target.value;
    dispatch(setProvider(provider));
    setModels([]);
    setIsLoadingModels(true);
    
    try {
      const service = await llmServiceFactory.initializeService(provider);
      const availableModels = await service.getModels();
      setModels(availableModels);
      
      // Set first model as default if available
      if (availableModels.length > 0) {
        dispatch(setModel(availableModels[0]));
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      dispatch(createLog(`Failed to fetch models: ${error.message}`, LogType.ERROR));
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelChange = (event) => {
    const model = event.target.value;
    if (models.includes(model)) {
      dispatch(setModel(model));
    } else {
      dispatch(setModel(''));
    }
  };

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      height: 72,
      bgcolor: 'background.default'
    }}>
     <Box
       sx={{
         position: 'fixed',
         top: 0,
         left: 0,
         right: 0,
         height: 'auto',
         transform: isCollapsed ? 'translateX(100%)' : 'translateX(0)',
         transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
         bgcolor: 'background.paper',
         borderBottom: 1,
         borderColor: 'divider',
         boxShadow: 2,
         zIndex: 1,
         display: 'flex',
         alignItems: 'center',
         p: 2,
         px: 3,
         '@media (max-width: 600px)': {
           px: 2
         }
       }}
      >
        <Box sx={{
          display: 'flex',
          gap: 2,
          width: '100%',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }}>
          <FormControl sx={{ width: 200 }}>
            <InputLabel>AI Provider</InputLabel>
            <Select
              value={llmSettings.provider || ''}
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
              value={models.includes(llmSettings.model) ? llmSettings.model : ''}
              label="Model"
              onChange={handleModelChange}
              disabled={!llmSettings.provider || isLoadingModels}
              sx={{
                bgcolor: 'background.paper',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider'
                }
              }}
            >
              {isLoadingModels ? (
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography>Loading models...</Typography>
                  </Box>
                </MenuItem>
              ) : (
                models.map(model => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {components
            .filter(comp => comp !== activeComponent)
            .map(comp => (
              <Button
                key={comp}
                variant="outlined"
                onClick={() => setActiveComponent(comp)}
                sx={{
                  color: 'primary.main',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover'
                  }
                }}
              >
                {comp}
              </Button>
            ))}
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ color: 'primary.main' }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      <IconButton
        onClick={onToggleCollapse}
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          color: 'primary.main',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '50%',
          boxShadow: 1,
          zIndex: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
      >
        {isCollapsed ? <MenuIcon /> : <CloseIcon />}
      </IconButton>

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

export default Header;