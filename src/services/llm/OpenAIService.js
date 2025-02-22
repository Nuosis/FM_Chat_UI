import { BaseLLMService } from './BaseLLMService';
import { store } from '../../redux/store';
import { createLog } from '../../redux/slices/appSlice';

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
      temperature = 0.7
    } = options;

    // Get registered tools and format them for OpenAI
    const registeredTools = Object.values(this.toolsRegistry).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));

    // store.dispatch(createLog({
    //   message: `Sending request with tools: ${JSON.stringify(registeredTools, null, 2)}`,
    //   type: 'debug'
    // }));

    const formattedMessages = messages.map(msg => {
      const formatted = {
        role: msg.role || 'user',
        content: msg.content
      };
      
      if (msg.tool_calls) {
        formatted.tool_calls = msg.tool_calls.map(call => ({
          id: call.id,
          type: 'function',
          function: {
            name: call.function.name,
            arguments: call.function.arguments
          }
        }));
      }
      
      if (msg.tool_call_id) {
        formatted.tool_call_id = msg.tool_call_id;
      }
      
      return formatted;
    });

    // Format tools if provided
    const formattedTools = options.tools?.map(tool => ({
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
      temperature,
      ...(options.tools && { tools: formattedTools }),
      ...(options.tools && { tool_choice: 'auto' })
    };

    store.dispatch(createLog({
      message: `OpenAI request data:\n${JSON.stringify(requestData, null, 2)}`,
      type: 'debug'
    }));

    const response = await this.axios.post(
      this.config.endpoint,
      requestData,
      { headers: this.config.headers }
    );

    store.dispatch(createLog({
      message: `OpenAI response data:\n${JSON.stringify(response.data, null, 2)}`,
      type: 'debug'
    }));

    return response;
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