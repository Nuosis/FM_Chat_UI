import { BaseLLMService } from './BaseLLMService';
import { store } from '../../redux/store';
import { createLog } from '../../redux/slices/appSlice';

export class GeminiService extends BaseLLMService {
  constructor() {
    super('GEMINI');
  }

  async fetchModels() {
    // Gemini doesn't have a models endpoint like OpenAI
    // Return a static list of available models
    return [
      'gemini-2.0-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-Lite'
    ];
  }

  async formatAndSendRequest(messages, options = {}) {
    const {
      model = 'gemini-2.0-flash',
      temperature = 0.7
    } = options;

    // Get registered tools and format them for Gemini
    const registeredTools = Object.values(this.toolsRegistry).map(tool => ({
      function_declarations: [{
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }]
    }));

    // Format messages for Gemini API
    // Gemini uses a different format than OpenAI
    const formattedMessages = messages.map(msg => {
      let role = msg.role === 'assistant' ? 'model' : msg.role;
      
      // Convert system messages to user messages
      if (msg.role === 'system') {
        role = 'user';
      }

      const formatted = {
        role,
        parts: [{ text: msg.content || '' }]
      };
      
      // Handle tool calls
      if (msg.tool_calls) {
        formatted.parts.push({
          function_call: {
            name: msg.tool_calls[0].function.name,
            args: JSON.parse(msg.tool_calls[0].function.arguments)
          }
        });
      }
      
      // Handle tool responses
      if (msg.tool_call_id) {
        formatted.parts.push({
          function_response: {
            name: msg.name,
            response: { result: msg.content }
          }
        });
      }
      
      return formatted;
    });

    const requestData = {
      contents: formattedMessages,
      generationConfig: {
        temperature,
      },
      tools: registeredTools.length > 0 ? registeredTools : undefined
    };

    store.dispatch(createLog({
      message: `Gemini request data:\n${JSON.stringify(requestData, null, 2)}`,
      type: 'debug'
    }));

    const response = await this.axios.post(
      `${this.config.endpoint}/${model}:generateContent`,
      requestData,
      { headers: this.config.headers }
    );

    store.dispatch(createLog({
      message: `Gemini response data:\n${JSON.stringify(response.data, null, 2)}`,
      type: 'debug'
    }));

    return response;
  }

  parseResponse(response) {
    const { data } = response;
    
    if (!data || !data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini');
    }

    const candidate = data.candidates[0];
    const content = candidate.content;
    
    if (!content || !content.parts || content.parts.length === 0) {
      throw new Error('Invalid response format from Gemini');
    }

    // Extract text content
    const textContent = content.parts.find(part => part.text)?.text || '';
    
    // Extract tool calls if present
    const functionCall = content.parts.find(part => part.function_call);
    let toolCalls = [];
    
    if (functionCall) {
      toolCalls = [{
        id: `call_${Date.now()}`, // Gemini doesn't provide IDs, so we generate one
        type: 'function',
        function: {
          name: functionCall.function_call.name,
          arguments: JSON.stringify(functionCall.function_call.args)
        }
      }];
    }

    return {
      content: textContent,
      role: 'assistant',
      provider: this.provider,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      raw: data
    };
  }
}

// Singleton instance
const geminiService = new GeminiService();
export default geminiService;