import { BaseLLMService } from './BaseLLMService';
import { getProviderEndpoint } from '../../../utils/providerEndpoints';
import createLLMInstance from './axiosLLM';

export class OllamaService extends BaseLLMService {
  constructor() {
    super('OLLAMA');
  }

  // Override initialize since Ollama doesn't need an API key
  initialize() {
    const config = getProviderEndpoint('OLLAMA');
    if (!config) {
      throw new Error('Invalid provider: OLLAMA');
    }
    this.axios = createLLMInstance();
    this.config = config;
  }

  async fetchModels() {
    const response = await this.axios.get(this.config.modelsEndpoint);
    return response.data.models.map(model => model.name);
  }

  async formatAndSendRequest(messages, options = {}) {
    const { model = 'llama2' } = options;

    // Convert chat history to Ollama format
    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    };

    return this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );
  }

  parseResponse(response) {
    const { message } = response.data;
    if (!message) {
      throw new Error('No response from Ollama');
    }

    return {
      content: message.content,
      role: message.role,
      provider: this.provider,
      raw: response.data
    };
  }
}

// Singleton instance
const ollamaService = new OllamaService();
export default ollamaService;