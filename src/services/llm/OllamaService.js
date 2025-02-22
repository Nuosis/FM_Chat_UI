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
    const { model = 'llama2', temperature = 0.7 } = options;

    // Convert chat history to Ollama format
    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      options: {
        temperature,
        top_p: 0.9
      }
    };

    const response = await this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );

    return response.data;
  }

  parseResponse(response) {
    if (!response || !response.message) {
      throw new Error('Invalid response from Ollama');
    }

    return {
      content: response.message.content,
      role: 'assistant',
      provider: this.provider,
      raw: response
    };
  }
}

// Singleton instance
const ollamaService = new OllamaService();
export default ollamaService;