import { BaseLLMService } from './BaseLLMService';

export class AnthropicService extends BaseLLMService {
  constructor(apiKey) {
    super('ANTHROPIC');
    this.apiKey = apiKey;
  }

  initialize(apiKey) {
    super.initialize(apiKey);
    if (!this.axios) {
      throw new Error('Failed to initialize axios instance');
    }

    // Set up default headers for all requests
    this.axios.defaults.headers.common = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };

    // Ensure headers are properly set
    if (!this.axios.defaults.headers.common['x-api-key']) {
      throw new Error('Failed to set API key in headers');
    }
  }

  async getModels() {
    if (!this.config) {
      throw new Error('Service not initialized');
    }
    
    // Return the predefined models from the provider configuration
    return this.config.models || [];
  }

  async sendMessage(messages, options = {}) {
    if (!this.axios || !this.config) {
      throw new Error('Service not initialized');
    }

    if (!messages || messages.length === 0) {
      throw new Error('No messages provided');
    }

    if (!options.model) {
      throw new Error('Model is required');
    }

    const { model, temperature = 0.7 } = options;

    // Format messages according to Anthropic's API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const requestData = {
      messages: formattedMessages,
      model,
      temperature,
      max_tokens: 1024,
      stream: false
    };

    // Add tools if any are registered
    const registeredTools = Object.values(this.toolsRegistry);
    if (registeredTools.length > 0) {
      requestData.tools = registeredTools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      requestData.tool_choice = 'auto';
    }

    try {
      // Get the current headers and ensure API key is set
      const requestHeaders = {
        ...this.axios.defaults.headers.common,
        'x-api-key': this.apiKey
      };

      console.log('Sending request to Anthropic:', {
        endpoint: this.config.endpoint,
        headers: requestHeaders,
        requestData
      });
      
      const response = await this.axios.post(this.config.endpoint, requestData, {
        headers: requestHeaders
      });
      
      // Ensure response has proper structure
      if (!response || !response.data) {
        throw new Error('Invalid response from Anthropic API');
      }

      // Parse and format response for consistency
      return this.parseResponse(response);
    } catch (error) {
      console.error('Anthropic request error:', {
        error,
        stack: error.stack,
        config: error.config,
        response: error.response
      });
      
      if (error.response) {
        // Handle Anthropic API errors
        const errorMessage = error.response.data?.error?.message ||
                           error.response.data?.message ||
                           error.message;
        throw new Error(`Anthropic API Error: ${errorMessage}`);
      }
      throw new Error(`Network Error: ${error.message}`);
    }
  }

  parseResponse(response) {
    if (!response || !response.data) {
      throw new Error('No response from Anthropic');
    }

    const { data } = response;
    
    // Handle Anthropic's response format
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      throw new Error('Invalid response format from Anthropic');
    }

    // Get the last content block which contains the final response
    const lastContent = data.content[data.content.length - 1];
    
    return {
      content: lastContent.text || '',
      role: 'assistant',
      provider: 'ANTHROPIC',
      raw: data
    };
  }
}

// Singleton instance
const anthropicService = new AnthropicService();
export default anthropicService;