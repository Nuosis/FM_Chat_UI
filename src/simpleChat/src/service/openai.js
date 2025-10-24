/**
 * OpenAI API Integration Module
 * Handles direct API calls to OpenAI and other compatible providers
 */

/**
 * Make direct API call to OpenAI or compatible provider
 * @param {Object} config - Configuration object with API key, endpoint, and payload
 * @returns {Promise} - API response
 */
export const makeDirectAPICall = async (config) => {
  if (!config.apiKey) {
    throw new Error('API key is required for direct API calls');
  }

  if (!config.endpoint) {
    throw new Error('API endpoint is required for direct API calls');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  // Set authorization header based on provider
  if (config.endpoint.includes('openai.com')) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  } else if (config.endpoint.includes('anthropic.com')) {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    // Default to Bearer token for other providers
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  console.log('Making direct API call to:', config.endpoint);
  console.log('Payload:', config.payload);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(config.payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Direct API response:', result);
    
    // Check if the response contains an error even with 200 status
    if (result.error) {
      console.error('API returned error in response body:', result.error);
      // Return the result as-is so processAPIResponse can handle the error formatting
    }
    
    return result;
  } catch (error) {
    console.error('Direct API call error:', error);
    throw error;
  }
};

/**
 * Process API response and extract content
 * @param {Object} result - The raw API response
 * @returns {string} - The extracted content
 */
export const processAPIResponse = (result) => {
  let assistantContent = "No response received.";
  
  // Handle different response formats from various LLM providers
  if (result) {
    console.log("Processing API response:", result);
    console.log("Response type:", typeof result);
    
    // If result is a string, try to parse it as JSON
    let parsedResult = result;
    if (typeof result === 'string') {
      try {
        parsedResult = JSON.parse(result);
        console.log("Parsed string response:", parsedResult);
      } catch (error) {
        console.error("Failed to parse response as JSON:", error);
        // If it's not valid JSON, treat it as plain text content
        return result;
      }
    }
    
    // Check for error responses first
    if (parsedResult.error) {
      const errorMessage = parsedResult.error.message || 'Unknown API error';
      const errorType = parsedResult.error.type || '';
      const errorCode = parsedResult.error.code || '';
      
      console.error("API Error Response:", parsedResult.error);
      
      // Format error message for display
      let formattedError = `API Error: ${errorMessage}`;
      if (errorType) formattedError += ` (Type: ${errorType})`;
      if (errorCode) formattedError += ` (Code: ${errorCode})`;
      
      return formattedError;
    }
    
    // FileMaker messages array format - extract last assistant message
    if (Array.isArray(parsedResult)) {
      console.log("Detected messages array format from FileMaker");
      // Find the last assistant message in the array
      for (let i = parsedResult.length - 1; i >= 0; i--) {
        const message = parsedResult[i];
        if (message && message.role === 'assistant' && message.content) {
          console.log("Extracted assistant content from messages array:", message.content);
          assistantContent = message.content;
          break;
        }
      }
    }
    // OpenAI format
    else if (parsedResult.choices && parsedResult.choices.length > 0 && parsedResult.choices[0].message && parsedResult.choices[0].message.content) {
      assistantContent = parsedResult.choices[0].message.content;
    }
    // Anthropic format
    else if (parsedResult.content && Array.isArray(parsedResult.content) && parsedResult.content[0] && parsedResult.content[0].text) {
      assistantContent = parsedResult.content[0].text;
    }
    // Ollama format
    else if (parsedResult.message && parsedResult.message.content) {
      assistantContent = parsedResult.message.content;
    }
    // Direct content field
    else if (parsedResult.content) {
      assistantContent = parsedResult.content;
    }
    // Simulated response format
    else if (parsedResult.message && typeof parsedResult.message === 'string') {
      assistantContent = parsedResult.message;
    }
    else {
      // If we can't extract content, log the structure for debugging
      console.warn("Unable to extract content from response. Response structure:", Object.keys(parsedResult));
    }
  }
  
  return assistantContent;
};

/**
 * Create default OpenAI configuration
 * @returns {Object} Default configuration object
 */
export const createDefaultOpenAIConfig = () => {
  return {
    provider: 'openai',
    apiKey: '',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1-nano',
    systemPrompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
    maxTokens: 1000
  };
};

/**
 * Generate headers array based on provider
 * @param {string} provider - The provider name (openai, anthropic, etc.)
 * @param {string} apiKey - The API key (will be replaced with {{API_KEY}} placeholder)
 * @returns {Array} - Array of header strings
 */
export const generateHeaders = (provider, apiKey = '{{API_KEY}}') => {
  const headers = ['content-type: application/json'];
  
  switch (provider) {
    case 'openai':
      headers.push(`authorization: Bearer ${apiKey}`);
      break;
    case 'anthropic':
      headers.push(`x-api-key: ${apiKey}`);
      headers.push('anthropic-version: 2023-06-01');
      break;
    case 'ollama':
      // Ollama typically doesn't require authentication headers
      break;
    default:
      // Default to Bearer token for custom providers
      headers.push(`authorization: Bearer ${apiKey}`);
      break;
  }
  
  return headers;
};

/**
 * Validate API configuration
 * @param {Object} config - Configuration to validate
 * @returns {boolean} - Whether configuration is valid
 */
export const validateAPIConfig = (config) => {
  return config &&
         config.hasOwnProperty('apiKey') &&
         config.apiKey &&
         config.apiKey.trim() !== '' &&
         config.hasOwnProperty('endpoint') &&
         config.endpoint &&
         config.hasOwnProperty('payload') &&
         config.payload;
};