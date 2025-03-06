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
    console.log(`Formatting ${Object.keys(this.toolsRegistry).length} tools for Gemini request`);
    
    // Log each tool's parameters before formatting
    Object.entries(this.toolsRegistry).forEach(([name, tool], index) => {
      console.log(`Tool ${index} - ${name}:`);
      console.log(`Parameters type: ${tool.parameters?.type}`);
      if (tool.parameters?.properties) {
        console.log(`Properties keys: ${Object.keys(tool.parameters.properties).join(', ')}`);
        
        // Check for object type properties without defined properties
        Object.entries(tool.parameters.properties).forEach(([propName, propDef]) => {
          if (propDef.type === 'object' && (!propDef.properties || Object.keys(propDef.properties).length === 0)) {
            console.log(`WARNING: Property "${propName}" is type "object" but has no properties defined`);
          }
        });
      } else {
        console.log(`No properties defined for tool parameters`);
      }
    });
    
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

    // Log detailed information about tools in the request
    if (requestData.tools && requestData.tools.length > 0) {
      console.log(`Detailed tool information in final request:`);
      requestData.tools.forEach((tool, index) => {
        const funcDecl = tool.function_declarations[0];
        console.log(`Tool[${index}]: ${funcDecl.name}`);
        
        if (funcDecl.parameters && funcDecl.parameters.properties) {
          Object.entries(funcDecl.parameters.properties).forEach(([propName, propDef]) => {
            console.log(`  Property "${propName}": type=${propDef.type}`);
            
            // Check for object properties without defined sub-properties
            if (propDef.type === 'object') {
              if (!propDef.properties || Object.keys(propDef.properties).length === 0) {
                console.log(`  ERROR: Property "${propName}" is type "object" but has no properties defined`);
                console.log(`  This will cause a 400 error with Gemini API`);
              } else {
                console.log(`  Property "${propName}" has ${Object.keys(propDef.properties).length} sub-properties`);
              }
            }
          });
        }
      });
    }
    
    store.dispatch(createLog({
      message: `Gemini request data:\n${JSON.stringify(requestData, null, 2)}`,
      type: 'debug'
    }));

    try {
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
    } catch (error) {
      console.error('Gemini API Error:', error);
      
      // Log detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error Response Data:', error.response.data);
        console.error('Error Response Status:', error.response.status);
        console.error('Error Response Headers:', error.response.headers);
        
        // Log the detailed error message
        if (error.response.data && error.response.data.error) {
          console.error('Detailed Error Message:', error.response.data.error.message);
          console.error('Error Code:', error.response.data.error.code);
          console.error('Error Status:', error.response.data.error.status);
        }
        
        store.dispatch(createLog({
          message: `Gemini API Error Response Data: ${JSON.stringify(error.response.data, null, 2)}`,
          type: 'error'
        }));
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error Request:', error.request);
        
        store.dispatch(createLog({
          message: 'Gemini API Error: No response received from server',
          type: 'error'
        }));
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error Message:', error.message);
        
        store.dispatch(createLog({
          message: `Gemini API Error: ${error.message}`,
          type: 'error'
        }));
      }
      
      throw error;
    }
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