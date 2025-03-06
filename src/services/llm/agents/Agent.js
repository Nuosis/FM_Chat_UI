/**
 * Agent class for managing tools and interactions with LLM services
 */
export class Agent {
  /**
   * Create a new agent
   * @param {Object} config - Agent configuration
   * @param {string} config.name - Agent name
   * @param {string} config.role - Agent role description
   * @param {string[]} config.tools - Array of tool names to assign to this agent
   * @param {Object} config.outputSchema - JSON Schema for structured output (optional)
   * @param {Object} config.llmService - LLM service instance
   */
  constructor(config) {
    this.name = config.name;
    this.role = config.role;
    this.tools = config.tools || [];
    this.outputSchema = config.outputSchema;
    this.llmService = config.llmService;
    this.history = [];
    this.feedback = [];
  }

  /**
   * Initialize the agent with the LLM service
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.llmService) {
      throw new Error('LLM service is required');
    }

    // Validate that all tools exist in the LLM service
    const availableTools = this.llmService.getTools();
    const availableToolNames = availableTools.map(tool => tool.name);
    
    for (const toolName of this.tools) {
      if (!availableToolNames.includes(toolName)) {
        throw new Error(`Tool not found: ${toolName}`);
      }
    }
  }

  /**
   * Execute a task with the agent
   * @param {string} task - Task description
   * @param {Object} options - Additional options
   * @param {Function} onUpdate - Callback for progress updates
   * @returns {Promise<Object>} - Task result
   */
  async executeTask(task, options = {}, onUpdate = null) {
    // Create system message with agent role and output schema if defined
    const systemMessage = this.createSystemMessage();
    
    // Create user message with task
    const userMessage = {
      role: 'user',
      content: task
    };
    
    // Create messages array
    const messages = [
      systemMessage,
      ...this.history,
      userMessage
    ];
    
    // Add tool configuration to options
    const toolOptions = {
      ...options,
      tools: this.getToolsForLLM()
    };
    
    // Send message to LLM service
    const response = await this.llmService.sendMessage(messages, toolOptions, onUpdate);
    
    // Add task and response to history
    this.history.push(userMessage);
    this.history.push({
      role: 'assistant',
      content: response.content
    });
    
    // Parse structured output if schema is defined
    let result = response;
    if (this.outputSchema && response.content) {
      try {
        result = this.parseStructuredOutput(response.content);
      } catch (error) {
        console.error('Error parsing structured output:', error);
      }
    }
    
    return result;
  }

  /**
   * Create system message with agent role and output schema
   * @returns {Object} - System message
   */
  createSystemMessage() {
    let content = `You are ${this.name}, ${this.role}`;
    
    // Add output schema instructions if defined
    if (this.outputSchema) {
      content += `\n\nPlease provide your response in the following JSON format:\n\`\`\`json\n${JSON.stringify(this.outputSchema, null, 2)}\n\`\`\``;
    }
    
    return {
      role: 'system',
      content
    };
  }

  /**
   * Get tools configuration for LLM service
   * @returns {Array} - Tools configuration
   */
  getToolsForLLM() {
    const availableTools = this.llmService.getTools();
    return availableTools.filter(tool => this.tools.includes(tool.name));
  }

  /**
   * Parse structured output from LLM response
   * @param {string} content - LLM response content
   * @returns {Object} - Parsed structured output
   */
  parseStructuredOutput(content) {
    // Extract JSON from markdown code blocks if present
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = content.match(jsonRegex);
    
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        throw new Error(`Invalid JSON in response: ${error.message}`);
      }
    }
    
    // Try parsing the entire content as JSON
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Response is not valid JSON: ${error.message}`);
    }
  }

  /**
   * Add feedback for the agent
   * @param {string} feedback - Feedback text
   */
  addFeedback(feedback) {
    this.feedback.push({
      timestamp: new Date().toISOString(),
      feedback
    });
  }

  /**
   * Clear agent history
   */
  clearHistory() {
    this.history = [];
  }
}