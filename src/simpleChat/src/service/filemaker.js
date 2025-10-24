/**
 * FileMaker Integration Module
 * Handles FileMaker-specific functionality, environment detection, and script execution
 */

// Import FMGofer module
import FMGoferModule from 'fm-gofer';

/**
 * Type checking for FileMaker environment
 */
const isInFileMaker = () => {
  // Check for actual FileMaker environment indicators
  if (typeof window === 'undefined') return false;
  
  // Check for native FileMaker object
  if (typeof window.FileMaker !== 'undefined') return true;
  
  // Check for FileMaker WebViewer context by looking for specific FileMaker properties
  // These are properties that only exist in actual FileMaker WebViewer context
  if (window.location && window.location.protocol === 'fmp:') return true;
  if (window.navigator && window.navigator.userAgent && window.navigator.userAgent.includes('FileMaker')) return true;
  
  // Check if we're in a FileMaker Go context
  if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.FileMaker) return true;
  
  return false;
};

/**
 * Poll for FileMaker object availability with timeout
 * @param {number} timeout - Maximum time to poll in milliseconds (default: 1000ms)
 * @param {number} interval - Polling interval in milliseconds (default: 50ms)
 * @returns {Promise<boolean>} - Promise that resolves to true if FileMaker is detected
 */
const pollForFileMaker = (timeout = 1000, interval = 50) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkFileMaker = () => {
      if (isInFileMaker()) {
        console.log(`FileMaker object detected after ${Date.now() - startTime}ms`);
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime >= timeout) {
        console.log(`FileMaker object not detected after ${timeout}ms timeout`);
        resolve(false);
        return;
      }
      
      setTimeout(checkFileMaker, interval);
    };
    
    checkFileMaker();
  });
};

// Initialize FileMaker detection state
let fileMakerDetected = isInFileMaker();
let fileMakerPollingPromise = null;

// If not immediately detected, start polling
if (!fileMakerDetected && typeof window !== 'undefined') {
  fileMakerPollingPromise = pollForFileMaker().then((detected) => {
    fileMakerDetected = detected;
    // Update the FMGofer setup if FileMaker is detected
    if (detected && typeof window !== 'undefined' && !window.FMGofer && typeof FMGoferModule !== 'undefined') {
      window.FMGofer = FMGoferModule;
    }
    return detected;
  });
}

// Export the flag for checking FileMaker environment (initial state)
export const inFileMaker = fileMakerDetected;

/**
 * Get current FileMaker detection status, waiting for polling if necessary
 * @returns {Promise<boolean>} - Promise that resolves to the FileMaker detection status
 */
export const getFileMakerStatus = async () => {
  if (fileMakerDetected) {
    return true;
  }
  
  if (fileMakerPollingPromise) {
    const result = await fileMakerPollingPromise;
    fileMakerDetected = result;
    return result;
  }
  
  return fileMakerDetected;
};

// Only set FMGofer to window if we're actually in FileMaker
if (isInFileMaker() && typeof window !== 'undefined') {
  window.FMGofer = FMGoferModule;
}

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

  console.log("handling filemaker as driver. ConfigObj:", configObj);
  
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

/**
 * Execute FileMaker script
 * @param {string} script - Script name to execute
 * @param {Object} parameter - Parameters to pass to the script
 * @returns {Promise} - Script execution result
 */
export const executeFileMakerScript = async (script, parameter) => {
  console.log("In FileMaker environment, proceeding with FileMaker script calls");
  
  // Ensure FMGofer is available if we're in FileMaker
  if (!window.FMGofer && typeof FMGoferModule !== 'undefined') {
    console.log("Setting up FMGofer for FileMaker environment");
    window.FMGofer = FMGoferModule;
  }
  
  // Prefer FMGofer for async operations (promise-based)
  if (typeof window.FMGofer !== 'undefined' && window.FMGofer.PerformScript) {
    console.log("Using FMGofer for async script call:", script, {parameter});
    try {
      return window.FMGofer.PerformScript(script, parameter)
        .then(result => {
          console.log("FMGofer script result:", result);
          return handleFMScriptResult(result);
        })
        .catch(error => {
          console.error('FMGofer script error:', error);
          
          // FMGofer bug fix: Check if the "error" is actually a valid JSON response
          const errorString = error.message || error.toString() || error;
          
          if (typeof errorString === 'string' && errorString.includes('"choices"')) {
            console.log('🔧 FMGofer bug detected: Valid JSON response rejected as error. Fixing...');
            
            try {
              const validResponse = JSON.parse(errorString);
              console.log('✅ Successfully recovered valid response from FMGofer error');
              return handleFMScriptResult(validResponse);
            } catch (parseError) {
              console.error('❌ Failed to parse JSON from FMGofer error:', parseError);
              throw error;
            }
          }
          
          // If it's not a JSON response, it's a real error
          throw error;
        });
    } catch (error) {
      console.error('Error calling FMGofer.PerformScript:', error);
      // Fall back to sync FileMaker call
    }
  }

  // Fall back to sync FileMaker.PerformScript (callback-based)
  if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
    console.log("Using FileMaker.PerformScript for sync script call:", script, parameter);
    return new Promise((resolve, reject) => {
      try {
        // For sync calls, we need to set up a callback mechanism
        // The script result will need to be handled via a global callback
        window.FileMaker.PerformScript(script, parameter);
        
        // Since FileMaker.PerformScript is synchronous and doesn't return a value,
        // we resolve immediately. The actual response handling should be done
        // via FileMaker's callback mechanism in the calling component
        resolve({
          success: true,
          message: "FileMaker script executed (sync)",
          note: "Response will be handled via FileMaker callback mechanism"
        });
      } catch (error) {
        console.error('FileMaker.PerformScript error:', error);
        reject(error);
      }
    });
  }

  // If we get here, we're in FileMaker but neither FMGofer nor FileMaker objects are available
  console.error("FileMaker environment detected but no FileMaker objects available");
  console.log("Available objects:", {
    FMGofer: typeof window.FMGofer,
    FileMaker: typeof window.FileMaker,
    FMGoferModule: typeof FMGoferModule
  });
  throw new Error('FileMaker environment detected but no FileMaker objects available');
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
    let parsedResult;
    if (typeof result === 'string') {
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Raw string that failed to parse:", result);
        throw new Error(`Failed to parse FileMaker result as JSON: ${parseError.message}`);
      }
    } else {
      parsedResult = result;
    }
    
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

// Make the function globally available
if (typeof window !== 'undefined') {
  window.processMessagesWithSystemPrompt = processMessagesWithSystemPrompt;
}

/**
 * Process FileMaker payload with tool call execution
 * Pops the last message, extracts and executes JavaScript code from tool calls,
 * and returns the result as a tool call response in the messages chain
 * @param {Object} payload - The FileMaker payload containing callbackName, parameter, and promiseID
 * @returns {Promise<Object>} - Promise that resolves to the updated payload with executed code result
 */
export const processToolCallExecution = async (payload) => {
  try {
    console.log("Processing tool call execution for payload:", payload);
    
    // Validate payload structure
    if (!payload || !payload.parameter || !payload.parameter.payload || !payload.parameter.payload.messages) {
      throw new Error('Invalid payload structure: missing required fields');
    }
    
    const messages = payload.parameter.payload.messages;
    
    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is empty or invalid');
    }
    
    // Pop the last message
    const lastMessage = messages.pop();
    console.log("Popped last message:", lastMessage);
    
    // Validate the last message has tool calls
    if (!lastMessage || !lastMessage.tool_calls || !Array.isArray(lastMessage.tool_calls)) {
      throw new Error('Last message does not contain valid tool calls');
    }
    
    // Extract code from the first tool call (assuming execute_javascript function)
    const toolCall = lastMessage.tool_calls[0];
    if (!toolCall || !toolCall.function || toolCall.function.name !== 'execute_javascript') {
      throw new Error('Tool call is not an execute_javascript function');
    }
    
    // Parse the function arguments to get the code
    let functionArgs;
    try {
      functionArgs = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      throw new Error(`Failed to parse tool call arguments: ${error.message}`);
    }
    
    if (!functionArgs.code) {
      throw new Error('No code found in tool call arguments');
    }
    
    console.log("Executing JavaScript code:", functionArgs.code);
    
    // Execute the JavaScript code safely with enhanced error handling
    let executionResult;
    let executionError = null;
    
    try {
      // Handle the escaped newlines in the code string
      let codeToExecute = functionArgs.code.replace(/\\n/g, '\n');
      console.log("Original code to execute:", codeToExecute);
      
      // Create a function that wraps the code and returns the last expression
      const lines = codeToExecute.split('\n').map(line => line.trim()).filter(line => line);
      console.log("Code lines:", lines);
      
      // Build the function code
      let functionCode = '';
      for (let i = 0; i < lines.length - 1; i++) {
        functionCode += lines[i] + '\n';
      }
      
      // Handle the last line - if it's just a variable name, return it
      const lastLine = lines[lines.length - 1];
      if (lastLine && !lastLine.includes('=') && !lastLine.includes('(') && !lastLine.includes(';')) {
        functionCode += `return ${lastLine};`;
      } else if (lastLine.endsWith(';')) {
        functionCode += `return ${lastLine.slice(0, -1)};`;
      } else {
        functionCode += `return ${lastLine};`;
      }
      
      console.log("Function code to execute:", functionCode);
      
      // Create and execute the function
      const executeCode = new Function(functionCode);
      executionResult = executeCode();
      console.log("Code execution result:", executionResult);
      
    } catch (error) {
      console.error("Code execution error:", error);
      executionError = error;
      
      // Provide rich error reporting and suggestions
      let errorMessage = `Error executing code: ${error.message}`;
      let suggestions = [];
      
      // Analyze the error and provide specific suggestions
      if (error.message.includes('is not defined')) {
        const variableName = error.message.match(/(\w+) is not defined/)?.[1];
        suggestions.push(`Variable '${variableName}' is not defined. Check if it's declared before use.`);
        suggestions.push("Ensure all variables are properly declared with 'const', 'let', or 'var'.");
      } else if (error.message.includes('Unexpected token')) {
        suggestions.push("Syntax error detected. Check for missing semicolons, brackets, or quotes.");
        suggestions.push("Verify that the JavaScript code is properly formatted.");
      } else if (error.message.includes('Cannot read property') || error.message.includes('Cannot read properties')) {
        suggestions.push("Attempting to access a property of null or undefined.");
        suggestions.push("Add null/undefined checks before accessing object properties.");
      } else if (error.message.includes('is not a function')) {
        suggestions.push("Attempting to call something that is not a function.");
        suggestions.push("Check that the method exists and is properly defined.");
      } else {
        suggestions.push("Review the JavaScript code for syntax and logic errors.");
        suggestions.push("Consider breaking down complex expressions into simpler steps.");
      }
      
      // Create detailed error response
      const errorDetails = {
        type: 'CODE_EXECUTION_ERROR',
        message: error.message,
        stack: error.stack,
        code: functionArgs.code,
        suggestions: suggestions,
        timestamp: new Date().toISOString()
      };
      
      console.error("Detailed error information:", errorDetails);
      
      executionResult = {
        error: true,
        message: errorMessage,
        details: errorDetails,
        suggestions: suggestions
      };
    }
    
    // Create the tool call response message with enhanced error handling
    let toolCallResponse;
    
    if (executionError) {
      // If there was an execution error, provide detailed feedback
      toolCallResponse = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          error: true,
          message: executionResult.message,
          suggestions: executionResult.suggestions,
          details: {
            type: executionResult.details.type,
            originalError: executionResult.details.message,
            code: executionResult.details.code,
            timestamp: executionResult.details.timestamp
          }
        }, null, 2)
      };
    } else {
      // Normal successful execution
      toolCallResponse = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: String(executionResult)
      };
    }
    
    // Add the tool call response to the messages array
    messages.push(toolCallResponse);
    
    console.log("Added tool call response:", toolCallResponse);
    
    // Create the updated parameter (only the parameter key, not callbackName and promiseID)
    const updatedParameter = {
      ...payload.parameter,
      payload: {
        ...payload.parameter.payload,
        messages: messages
      }
    };
    
    console.log("Updated parameter created, calling FileMaker script...");
    
    // Execute FileMaker script "AI * Make Call" with only the parameter
    const scriptResult = await executeFileMakerScript('AI * Make Call', updatedParameter);
    
    console.log("FileMaker script execution completed:", scriptResult);
    
    return {
      success: true,
      executionResult: executionResult,
      scriptResult: scriptResult,
      updatedParameter: updatedParameter
    };
    
  } catch (error) {
    console.error('Error in processToolCallExecution:', error);
    throw error;
  }
};

// Make handleFMScriptResult globally available for FileMaker callbacks
if (typeof window !== 'undefined') {
  window.handleFMScriptResult = handleFMScriptResult;
}

// Make processToolCallExecution globally available
if (typeof window !== 'undefined') {
  window.processToolCallExecution = processToolCallExecution;
}