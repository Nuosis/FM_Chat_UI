import axios from 'axios';
import { store } from '../../redux/store';
import { createLog } from '../../redux/slices/appSlice';

// Create base axios instance for LLM services
const createLLMInstance = (config = {}) => {
  const instance = axios.create({
    timeout: 120000, // 2 minute timeout for LLM responses
    ...config
  });

  // Add request interceptor for logging
  instance.interceptors.request.use(
    async (config) => {
      store.dispatch(createLog(`LLM Request: ${config.method?.toUpperCase()} ${config.url}`, 'debug'));
      store.dispatch(createLog(`Request Headers: ${JSON.stringify(config.headers)}`, 'debug'));
      
      // Configure for streaming if specified
      if (config.data?.stream === true) {
        config.responseType = 'text';
      }
      
      return config;
    },
    (error) => {
      store.dispatch(createLog(`LLM Request Error: ${error.message}`, 'error'));
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => {
      // Don't log streaming responses to avoid spam
      if (!response.config.responseType === 'text') {
        store.dispatch(createLog(`LLM Response Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, 'debug'));
      }
      return response;
    },
    async (error) => {
      // Handle timeout error specifically
      if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
        store.dispatch(createLog('LLM request timed out after 2 minutes', 'error'));
        return Promise.reject(new Error('LLM request timed out after 2 minutes'));
      }

      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      const config = error.config;
      
      store.dispatch(createLog(`LLM Error Details:
Status: ${status}
URL: ${config.method?.toUpperCase()} ${config.url}
Message: ${message}
Response Data: ${JSON.stringify(error.response?.data)}`, 'error'));
      
      return Promise.reject(error);
    }
  );

  return instance;
};

export default createLLMInstance;