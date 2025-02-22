import { BaseLLMService } from './BaseLLMService';

export class OpenAIService extends BaseLLMService {
  constructor() {
    super('OPENAI');
  }

  async fetchModels() {
    const response = await this.axios.get(
      this.config.modelsEndpoint,
      { headers: this.config.headers }
    );

    // Filter for only chat models
    const chatModels = response.data.data
      .filter(model => model.id.includes('gpt'))
      .filter(model => !model.id.includes('instruct'))
      .map(model => model.id);

    return chatModels;
  }

  async formatAndSendRequest(messages, options = {}) {
    const { model = import.meta.env.VITE_DEFAULT_MODEL } = options;

    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages
    };

    return this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );
  }

  parseResponse(response) {
    const { choices } = response.data;
    if (!choices || choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    return {
      content: choices[0].message.content,
      role: choices[0].message.role,
      provider: this.provider,
      raw: response.data
    };
  }
}

// Singleton instance
const openAIService = new OpenAIService();
export default openAIService;