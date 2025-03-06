import { Agent } from './Agent';
import { store } from '../../../redux/store';
import { createLog } from '../../../redux/slices/appSlice';

/**
 * AgentManager class for managing multiple agents
 */
export class AgentManager {
  /**
   * Create a new agent manager
   * @param {Object} llmService - LLM service instance
   */
  constructor(llmService) {
    this.llmService = llmService;
    this.agents = {};
  }

  /**
   * Create a new agent
   * @param {Object} config - Agent configuration
   * @param {string} config.name - Agent name
   * @param {string} config.role - Agent role description
   * @param {string[]} config.tools - Array of tool names to assign to this agent
   * @param {Object} config.outputSchema - JSON Schema for structured output (optional)
   * @returns {Agent} - Created agent
   */
  createAgent(config) {
    if (!config.name) {
      throw new Error('Agent name is required');
    }

    if (this.agents[config.name]) {
      throw new Error(`Agent with name ${config.name} already exists`);
    }

    const agent = new Agent({
      ...config,
      llmService: this.llmService
    });

    this.agents[config.name] = agent;
    store.dispatch(createLog(`Created agent: ${config.name}`, 'debug'));
    
    return agent;
  }

  /**
   * Get an agent by name
   * @param {string} name - Agent name
   * @returns {Agent} - Agent instance
   */
  getAgent(name) {
    const agent = this.agents[name];
    if (!agent) {
      throw new Error(`Agent not found: ${name}`);
    }
    return agent;
  }

  /**
   * Initialize all agents
   * @returns {Promise<void>}
   */
  async initializeAgents() {
    for (const name in this.agents) {
      try {
        await this.agents[name].initialize();
        store.dispatch(createLog(`Initialized agent: ${name}`, 'debug'));
      } catch (error) {
        store.dispatch(createLog(`Failed to initialize agent ${name}: ${error.message}`, 'error'));
      }
    }
  }

  /**
   * Execute a task with a specific agent
   * @param {string} agentName - Agent name
   * @param {string} task - Task description
   * @param {Object} options - Additional options
   * @param {Function} onUpdate - Callback for progress updates
   * @returns {Promise<Object>} - Task result
   */
  async executeTask(agentName, task, options = {}, onUpdate = null) {
    const agent = this.getAgent(agentName);
    
    try {
      store.dispatch(createLog(`Executing task with agent ${agentName}: ${task}`, 'debug'));
      const result = await agent.executeTask(task, options, onUpdate);
      store.dispatch(createLog(`Task completed by agent ${agentName}`, 'debug'));
      return result;
    } catch (error) {
      store.dispatch(createLog(`Error executing task with agent ${agentName}: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Add feedback for an agent
   * @param {string} agentName - Agent name
   * @param {string} feedback - Feedback text
   */
  addFeedback(agentName, feedback) {
    const agent = this.getAgent(agentName);
    agent.addFeedback(feedback);
    store.dispatch(createLog(`Added feedback for agent ${agentName}`, 'debug'));
  }

  /**
   * Get all available agents
   * @returns {Object} - Map of agent names to agent instances
   */
  getAgents() {
    return { ...this.agents };
  }

  /**
   * Remove an agent
   * @param {string} name - Agent name
   */
  removeAgent(name) {
    if (!this.agents[name]) {
      throw new Error(`Agent not found: ${name}`);
    }
    
    delete this.agents[name];
    store.dispatch(createLog(`Removed agent: ${name}`, 'debug'));
  }
}