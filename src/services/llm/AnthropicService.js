import { BaseLLMService } from './BaseLLMService';

export class AnthropicService extends BaseLLMService {
  constructor() {
    super('ANTHROPIC');
  }

  initialize() {
    super.initialize();
  }

  async formatAndSendRequest(messages, options = {}) {
    const { model = 'claude-3-opus-20240229', temperature = 0.7 } = options;

    // Convert chat history to Anthropic format
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const requestData = {
      model,
      messages: formattedMessages,
      max_tokens: 4096,
      temperature
    };

    return this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );
  }

  parseResponse(response) {
    const { content } = response.data;
    if (!content) {
      throw new Error('No response from Anthropic');
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