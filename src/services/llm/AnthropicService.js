import { BaseLLMService } from './BaseLLMService';

export class AnthropicService extends BaseLLMService {
  constructor() {
    super('ANTHROPIC');
    this.lastContent = '';
  }

  initialize() {
    super.initialize();
    this.lastContent = '';
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
      temperature,
      stream: false
    };

    return this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );
  }

  async formatAndSendStreamingRequest(messages, options = {}, onUpdate) {
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
      temperature,
      stream: true
    };

    const response = await this.axios.post(
      this.config.endpoint,
      requestData,
      {
        headers: {
          ...this.config.headers,
          'Accept': 'text/event-stream',
        },
        responseType: 'text',
        onDownloadProgress: (progressEvent) => {
          const chunk = progressEvent.event.target.responseText;
          if (!chunk) return;

          // Split the chunk into lines and process each SSE event
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const json = JSON.parse(data);
                const content = json.content?.[0]?.text;
                if (content) {
                  // Only send new content
                  if (this.lastContent && content.startsWith(this.lastContent)) {
                    const newContent = content.slice(this.lastContent.length);
                    if (newContent) {
                      onUpdate(newContent);
                    }
                  } else {
                    onUpdate(content);
                  }
                  this.lastContent = content;
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }
    );

    // Reset state and return final response format
    const finalContent = this.lastContent;
    this.lastContent = '';
    
    return {
      content: finalContent,
      role: 'assistant',
      provider: this.provider,
      raw: response.data
    };
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