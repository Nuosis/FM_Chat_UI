import { Agent } from './Agent';
import { AgentManager } from './AgentManager';

// Feature flags from environment variables
const enableAgents = import.meta.env.VITE_ENABLE_AGENTS === 'true';
const defaultAgentName = import.meta.env.VITE_DEFAULT_AGENT;

export { Agent, AgentManager };

/**
 * Create an agent manager for the given LLM service
 * Only creates the manager if agents are enabled via VITE_ENABLE_AGENTS
 * @param {Object} llmService - LLM service instance
 * @returns {AgentManager|null} - Agent manager instance or null if agents are disabled
 */
export const createAgentManager = (llmService) => {
  if (!enableAgents) {
    console.log('Agents are disabled via VITE_ENABLE_AGENTS environment variable');
    return null;
  }
  return new AgentManager(llmService);
};

/**
 * Initialize the default agent
 * @param {AgentManager} agentManager - Agent manager instance
 * @returns {Promise<Agent|null>} - Default agent instance or null if agents are disabled
 */
export const initializeDefaultAgent = async (agentManager) => {
  if (!enableAgents) {
    return null;
  }

  // Use the specified agent name or "default" if not specified
  const agentName = defaultAgentName || "default";

  try {
    console.log(`Initializing agent: ${agentName}`);
    
    // Check if the agent already exists
    try {
      return agentManager.getAgent(agentName);
    } catch (error) {
      // Agent doesn't exist, create it
      console.log(`Creating agent: ${agentName}`);
      
      // Get available tools from the LLM service
      const availableTools = agentManager.llmService.getTools();
      const toolNames = availableTools.map(tool => tool.name);
      
      // Create the agent with all available tools
      const agent = agentManager.createAgent({
        name: agentName,
        role: "I am an AI assistant that helps users with their tasks. I can use various tools to accomplish complex tasks.",
        tools: toolNames
      });
      
      // Initialize the agent
      await agent.initialize();
      console.log(`Agent ${agentName} initialized with tools: ${toolNames.join(', ')}`);
      
      return agent;
    }
  } catch (error) {
    console.error(`Error initializing agent: ${error.message}`);
    return null;
  }
};