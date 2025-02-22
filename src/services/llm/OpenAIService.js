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

    const chatModels = response.data.data
      .filter(model => model.id.includes('gpt'))
      .filter(model => !model.id.includes('instruct'))
      .map(model => model.id);

    return chatModels;
  }

  async formatAndSendRequest(messages, options = {}) {
    const { 
      model = import.meta.env.VITE_DEFAULT_MODEL, 
      temperature = 0.7,
      tools 
    } = options;

    const formattedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      temperature,
      ...(tools && tools.length > 0 && { tools }),
      tool_choice: tools && tools.length > 0 ? 'auto' : undefined
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

    const message = choices[0].message;
    return {
      content: message.content,
      role: message.role,
      provider: this.provider,
      tool_calls: message.tool_calls,
      raw: response.data
    };
  }
}

// Singleton instance
const openAIService = new OpenAIService();
export default openAIService;