import { BaseLLMService } from './BaseLLMService';

export class AnthropicService extends BaseLLMService {
  constructor(apiKey) {
    super('ANTHROPIC');
    this.apiKey = apiKey;
    this.tools = [];
  }

  registerTool(tool) {
    this.tools.push(tool);
  }

  initialize(apiKey) {
    super.initialize(apiKey);
  }

  async getModels() {
    if (!this.axios || !this.config) {
      throw new Error('Service not initialized');
    }

    try {
      const response = await this.axios.post('/anthropic/models', {
        apiKey: this.apiKey
      });
      
      if (!response?.data?.data) {
        throw new Error('API Error');
      }
      
      return response.data.data.map(model => model.id);
    } catch (error) {
      if (error.message === 'API Error') {
        throw error;
      }
      throw new Error('API Error');
    }
  }

  async sendMessage(messages, options = {}) {
    if (!messages || messages.length === 0) {
      throw new Error('No messages provided');
    }

    if (!options.model) {
      throw new Error('Model is required');
    }

    const { model, temperature = 0.7 } = options;

    // Convert chat history to Anthropic format
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'assistant' : msg.role,
      content: msg.content
    }));

    const requestData = {
      apiKey: this.apiKey,
      messages: formattedMessages,
      model,
      temperature
    };

    // Add tools if any are registered
    if (this.tools && this.tools.length > 0) {
      requestData.tools = this.tools.map(tool => ({
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
      const response = await this.axios.post('/anthropic/messages', requestData);
      
      // Ensure response has proper structure
      if (!response || !response.data) {
        throw new Error('Invalid response from Anthropic API');
      }

      // Parse and format response for consistency
      return this.parseResponse(response);
    } catch (error) {
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

    // Handle Anthropic native format
    if (response.data.content) {
      const { content } = response.data;
      if (!Array.isArray(content) || content.length === 0) {
        throw new Error('Invalid response format from Anthropic');
      }
      
      // Extract first content block
      const firstContent = content[0];
      
      return {
        content: firstContent.text || '',
        role: 'assistant',
        provider: 'ANTHROPIC',
        raw: response.data
      };
    }

    // Handle OpenAI-compatible format
    if (response.data.choices) {
      const choice = response.data.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response format from Anthropic');
      }
      
      return {
        content: choice.message.content || '',
        role: choice.message.role || 'assistant',
        provider: 'ANTHROPIC',
        tool_calls: choice.message.tool_calls || [],
        raw: response.data
      };
    }

    throw new Error('Invalid response format from Anthropic');
  }
}

// Singleton instance
const anthropicService = new AnthropicService();
export default anthropicService;