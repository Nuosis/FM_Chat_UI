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

    // Convert chat history to Ollama format with tool support
    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls })
    }));

    // Get registered tools and format them
    const registeredTools = Object.values(this.toolsRegistry).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      options: {
        temperature,
        top_p: 0.9
      },
      ...(registeredTools.length > 0 && { tools: registeredTools }),
      tool_choice: registeredTools.length > 0 ? 'auto' : undefined
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

    const message = response.message;
    return {
      content: message.content,
      role: 'assistant',
      provider: this.provider,
      tool_calls: message.tool_calls || [],
      raw: response
    };
  }
}

// Singleton instance
const ollamaService = new OllamaService();
export default ollamaService;