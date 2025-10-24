/**
 * Process Router Module
 * Coordinates between FileMaker and OpenAI integrations, handles configuration management
 */

import { inFileMaker, getFileMakerStatus, processMessagesWithSystemPrompt, executeFileMakerScript } from './filemaker.js';
import { makeDirectAPICall, processAPIResponse, createDefaultOpenAIConfig, validateAPIConfig, generateHeaders } from './openai.js';

/**
 * Load configuration from localStorage and convert to fmChatConfig format
 * @returns {Promise<Object>} The loaded configuration
 */
export const loadConfigFromStorage = async () => {
  const fileMakerStatus = await getFileMakerStatus();
  
  // In FileMaker environment, prioritize FileMaker-provided config
  if (fileMakerStatus && typeof window !== 'undefined' && window.fmChatConfig) {
    console.log("Using FileMaker-provided config:", window.fmChatConfig);
    return window.fmChatConfig;
  }

  // Load from localStorage for standalone or when no FileMaker config exists
  if (typeof window !== 'undefined') {
    const savedConfig = localStorage.getItem('chatConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        // Convert to fmChatConfig format
        const fmConfig = {
          apiKey: parsedConfig.apiKey,
          endpoint: parsedConfig.endpoint,
          provider: parsedConfig.provider,
          headers: generateHeaders(parsedConfig.provider, '{{API_KEY}}'),
          payload: {
            model: parsedConfig.model,
            temperature: parsedConfig.temperature,
            max_tokens: parsedConfig.maxTokens,
            messages: [
              {
                role: "system",
                content: parsedConfig.systemPrompt
              }
            ]
          }
        };
        window.fmChatConfig = fmConfig;
        console.log(`Loaded config from localStorage (FileMaker env: ${fileMakerStatus}):`, fmConfig);
        return fmConfig;
      } catch (error) {
        console.error('Error parsing saved config:', error);
        return await createDefaultConfig();
      }
    } else {
      return await createDefaultConfig();
    }
  }
  return await createDefaultConfig();
};

/**
 * Create default configuration
 * @returns {Promise<Object>} The default configuration
 */
export const createDefaultConfig = async () => {
  const defaultConfig = createDefaultOpenAIConfig();
  const fileMakerStatus = await getFileMakerStatus();
  
  // Only save to localStorage if not in FileMaker (to avoid overriding FileMaker config)
  if (!fileMakerStatus && typeof window !== 'undefined') {
    localStorage.setItem('chatConfig', JSON.stringify(defaultConfig));
  }
  
  // Create fmChatConfig format
  const fmConfig = {
    apiKey: defaultConfig.apiKey,
    endpoint: defaultConfig.endpoint,
    provider: defaultConfig.provider,
    headers: generateHeaders(defaultConfig.provider, '{{API_KEY}}'),
    payload: {
      model: defaultConfig.model,
      temperature: defaultConfig.temperature,
      max_tokens: defaultConfig.maxTokens,
      messages: [
        {
          role: "system",
          content: defaultConfig.systemPrompt
        }
      ]
    }
  };
  
  if (typeof window !== 'undefined') {
    window.fmChatConfig = fmConfig;
  }
  
  console.log(`Created default config (FileMaker env: ${fileMakerStatus}):`, fmConfig);
  return fmConfig;
};

/**
 * Initialize configuration on startup
 */
export const initializeConfig = async () => {
  const fileMakerStatus = await getFileMakerStatus();
  console.log("FileMaker environment detected:", fileMakerStatus);
  return loadConfigFromStorage();
};

/**
 * Route message processing based on environment
 * @param {string} script - Script name for FileMaker calls
 * @param {Object} parameter - Parameters to pass
 * @returns {Promise} - The response from FileMaker or API
 */
export const routeMessage = async (script = "AI * Make Call", parameter = {}) => {
  // Use the improved FileMaker detection
  const inFileMakerEnv = await getFileMakerStatus();
  
  // If not in FileMaker, try to make direct API call
  if (!inFileMakerEnv) {
    console.log("Not in FileMaker environment, attempting direct API call");
    console.log("Parameter received:", parameter);
    
    // Check if we have a valid config for direct API calls
    if (validateAPIConfig(parameter)) {
      console.log("Valid API configuration found, making direct API call");
      try {
        return await makeDirectAPICall(parameter);
      } catch (error) {
        console.error('Direct API call failed:', error);
        throw error;
      }
    } else {
      console.log("No valid API configuration found:");
      console.log("- Has apiKey:", parameter?.hasOwnProperty('apiKey'));
      console.log("- apiKey value:", parameter?.apiKey);
      console.log("- Has endpoint:", parameter?.hasOwnProperty('endpoint'));
      console.log("- endpoint value:", parameter?.endpoint);
      console.log("- Has payload:", parameter?.hasOwnProperty('payload'));
      
      return Promise.resolve({
        success: true,
        message: "Simulated response - No API key configured",
        content: "Please configure your API key in the settings to make actual API calls."
      });
    }
  }

  // If we're in FileMaker, use FileMaker script execution
  return await executeFileMakerScript(script, parameter);
};

/**
 * Process response and extract content, updating conversation history
 * @param {Object} result - The raw API response
 * @returns {string} - The extracted content
 */
export const processResponse = (result) => {
  const assistantContent = processAPIResponse(result);
  
  // Add the assistant's response to the fmChatConfig messages array
  if (typeof window !== 'undefined' && window.fmChatConfig && window.fmChatConfig.payload && window.fmChatConfig.payload.messages) {
    window.fmChatConfig.payload.messages.push({
      role: 'assistant',
      content: assistantContent
    });
  }
  
  return assistantContent;
};

/**
 * Main communication interface - handles both FileMaker scripts and direct API calls
 * @param {string} userInput - The user's message
 * @returns {Promise<string>} - The processed response content
 */
export const sendMessage = async (userInput) => {
  // Ensure we have a valid configuration
  if (typeof window !== 'undefined' && !window.fmChatConfig) {
    await loadConfigFromStorage();
  }

  // Create a deep clone of the config to avoid modifying the original
  const config = JSON.parse(JSON.stringify(window.fmChatConfig));
  
  // Validate the config
  if (!config.payload || !config.payload.messages || !Array.isArray(config.payload.messages) || config.payload.messages.length === 0) {
    throw new Error('Invalid config: payload.messages must be a non-empty array');
  }
  
  // Validate that the first message is a system message
  if (config.payload.messages[0].role !== 'system') {
    throw new Error('Invalid config: first message must be a system message');
  }
  
  const fileMakerStatus = await getFileMakerStatus();
  console.log(`${fileMakerStatus ? 'Calling FileMaker script' : 'Making API call'} with config:`, config);
  
  // Process messages and get the updated config
  const processedConfig = processMessagesWithSystemPrompt(config, userInput);
  
  // Route the message based on environment
  const result = await routeMessage("AI * Make Call", processedConfig);
  
  console.log("Response received:", result);
  
  // Process and return the response content
  return processResponse(result);
};

/**
 * Global progress text update function for FileMaker callbacks
 * @param {string} text - The progress text to display
 */
const updateProgressText = (text) => {
  console.log("Progress update from FileMaker:", text);
  
  // Dispatch a custom event that LLMChat can listen to
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('progressUpdate', {
      detail: { text }
    });
    window.dispatchEvent(event);
  }
};

// Make updateProgressText globally available for FileMaker callbacks
if (typeof window !== 'undefined') {
  window.updateProgressText = updateProgressText;
}

// Export environment detection for external use
export { inFileMaker };