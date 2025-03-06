import { Agent } from './Agent';
import { AgentManager } from './AgentManager';

export { Agent, AgentManager };

/**
 * Create an agent manager for the given LLM service
 * @param {Object} llmService - LLM service instance
 * @returns {AgentManager} - Agent manager instance
 */
export const createAgentManager = (llmService) => {
  return new AgentManager(llmService);
};