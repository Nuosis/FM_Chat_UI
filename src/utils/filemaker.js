import { store } from '../redux/store';
import { createLog } from '../redux/slices/appSlice';
/**
 * Process messages array with system prompt
 * @param {Object|string} config - Configuration object or JSON string containing API key, endpoint, and payload
 * @param {string} userContent - Optional user message content to add to the messages array
 * @returns {Object} - The processed configuration object with updated messages array
 */
export const processMessagesWithSystemPrompt = (config, userContent = null) => {
  // Parse config if it's a string
  let configObj;
  try {
    configObj = typeof config === 'string' ? JSON.parse(config) : config;
  } catch (error) {
    console.error("Failed to parse config:", error);
    console.log("config:", config);
    throw new Error(`Failed to parse config: ${error.message}`);
  }

  console.log("handling filmaker as driver. ConfigObj:", configObj);
  
  // Validate the config object
  if (!configObj || typeof configObj !== 'object') {
    console.log("configObj:", configObj);
    throw new Error('Config must be an object');
  }
  
  // Validate payload and messages
  if (!configObj.payload || !configObj.payload.messages) {
    throw new Error('Config must contain payload.messages');
  }
  
  // Validate that messages is an array
  if (!Array.isArray(configObj.payload.messages)) {
    throw new Error('Messages must be an array');
  }
  
  // Validate that the first message is a system message
  if (configObj.payload.messages.length === 0 || configObj.payload.messages[0].role !== 'system') {
    throw new Error('First message must be a system message');
  }
  
  // If user content is provided, add it to the messages array
  if (userContent) {
    configObj.payload.messages.push({
      role: 'user',
      content: userContent
    });
  }
  
  // Store the config in the window object for use by the LLMChat component
  if (typeof window !== 'undefined') {
    console.log("Setting window.fmChatConfig:", configObj);
    window.fmChatConfig = configObj;
  }
  
  return configObj;
};

// Make the function globally available
if (typeof window !== 'undefined') {
  window.processMessagesWithSystemPrompt = processMessagesWithSystemPrompt;
}



// Type checking for FileMaker environment
const isInFileMaker = () => {
  return typeof window !== 'undefined' && (typeof window.FileMaker !== 'undefined' || typeof window.FMGofer !== 'undefined');
};

// Export the flag for checking FileMaker environment
export const inFileMaker = isInFileMaker();

// Only import FMGofer if we're in FileMaker
let FMGofer;
if (inFileMaker) {
  import('fm-gofer').then(module => {
    FMGofer = module.default;
  }).catch(error => {
    console.error('Failed to load FMGofer:', error);
  });
}

// Valid actions for FileMaker operations
const VALID_ACTIONS = ['read', 'update', 'create', 'requestSchema', 'performScript'];

/**
 * Promisified version of FileMaker.PerformScript
 * @param {Object} params - Parameters for the script execution
 * @param {string} params.action - Action type (read, update, create, requestSchema)
 * @param {string} [params.script="JS * Fetch Data"] - Script name to execute
 * @param {Object} [params.scriptParam={}] - Parameters to pass to the script
 * @returns {Promise} - Resolves with the script result or rejects with error
 */
export const performFMScript = async ({
  action,
  script = "JS * Fetch Data",
  parameter = {}
}) => {
  // Validate environment
  if (!inFileMaker) {
    throw new Error('Not in FileMaker environment');
  }

  // Skip action validation for direct script calls
  if (action && !VALID_ACTIONS.includes(action)) {
    throw new Error(`Invalid action: ${action}. Must be one of: ${VALID_ACTIONS.join(', ')}`);
  }

  // If FMGofer is available, use it (promise-based)
  if (FMGofer) {
    store.dispatch(createLog({
      message: `FMGofer calling ... :\n${JSON.stringify(script, parameter, null, 2)}`,
      type: 'debug'
    }));
    console.log("FMGofer calling ... ", script, {parameter});
    return FMGofer.PerformScript(script, parameter)
      .then(result => handleFMScriptResult(result))
      .catch(error => {
        console.error('FMGofer script error:', error);
        throw error;
      });
  }

  // Otherwise use FileMaker object (callback-based)
  return new Promise((resolve, reject) => {
    try {
      console.log("FileMaker calling ... ", script, parameter);
      FileMaker.PerformScript(script, parameter);
      // Note: Since FileMaker.PerformScript is not promise-based,
      // the actual response will need to be handled via a callback
      // mechanism set up in the component
      resolve();
    } catch (error) {
      console.error('FileMaker script error:', error);
      reject(error);
    }
  });
};

/**
 * Handle script result from FileMaker
 * @param {string} result - JSON string from FileMaker
 * @returns {Object} Parsed result
 */
export const handleFMScriptResult = (result) => {
  try {
    if (!result) {
      throw new Error('Empty result from FileMaker');
    }
    // Handle both JSON strings and objects
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    console.log("call result: ", parsedResult);
    
    // Check for FileMaker errors
    if (parsedResult.error) {
      const error = new Error(parsedResult.message || 'Unknown FileMaker error');
      error.code = 'FM_ERROR';
      error.details = parsedResult.details;
      throw error;
    }
    
    return parsedResult;
  } catch (error) {
    console.error('Error handling FileMaker result:', error);
    throw error;
  }
};