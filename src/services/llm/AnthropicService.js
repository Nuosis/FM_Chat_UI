import { BaseLLMService } from './BaseLLMService';

export class AnthropicService extends BaseLLMService {
  constructor(apiKey) {
    super('ANTHROPIC');
    this.apiKey = apiKey;
  }

  initialize(apiKey) {
    super.initialize(apiKey);
  }

  async fetchModels() {
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

  async formatAndSendRequest(messages, options = {}) {
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

    return this.axios.post('/anthropic/messages', requestData);
  }

  parseResponse(response) {
    if (!response.data) {
      throw new Error('No response from Anthropic');
    }

    const { content } = response.data;
    if (!content || !Array.isArray(content) || content.length === 0) {
      throw new Error('Invalid response format from Anthropic');
    }

    return {
      content: content[0].text,
      role: 'assistant',
      provider: this.provider,
      raw: response.data
    };
  }
}

// Singleton instance
const anthropicService = new AnthropicService();
export default anthropicService;