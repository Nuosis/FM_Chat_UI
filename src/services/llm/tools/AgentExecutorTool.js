import { createAgentManager } from '../agents';

/**
 * Tool for executing tasks with agents
 */
export default {
  name: 'agent_executor',
  description: `Execute a task with a specific agent. This tool allows you to:
1. Create a new agent with a specific role and tools
2. Execute a task with an existing agent
3. Provide feedback to an agent`,
  progressText: 'Working with agent...',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'execute', 'feedback'],
        description: 'The action to perform: create a new agent, execute a task with an agent, or provide feedback'
      },
      agentName: {
        type: 'string',
        description: 'The name of the agent to create or use'
      },
      agentRole: {
        type: 'string',
        description: 'For create action: The role description for the agent'
      },
      tools: {
        type: 'array',
        items: { type: 'string' },
        description: 'For create action: Array of tool names to assign to the agent'
      },
      outputSchema: {
        type: 'object',
        description: 'For create action: JSON Schema for structured output (optional)'
      },
      task: {
        type: 'string',
        description: 'For execute action: The task description to execute with the agent'
      },
      feedback: {
        type: 'string',
        description: 'For feedback action: Feedback text for the agent'
      }
    },
    required: ['action', 'agentName']
  },
  execute: async function({ action, agentName, agentRole, tools, outputSchema, task, feedback }, context) {
    // Get the LLM service from context
    const llmService = context.llmService;
    if (!llmService) {
      throw new Error('LLM service not available in context');
    }
    
    // Create agent manager if it doesn't exist in context
    if (!context.agentManager) {
      context.agentManager = createAgentManager(llmService);
    }
    
    const agentManager = context.agentManager;
    
    switch (action) {
      case 'create':
        // Validate required parameters for create action
        if (!agentRole) {
          throw new Error('agentRole is required for create action');
        }
        
        // Create the agent
        try {
          const agent = agentManager.createAgent({
            name: agentName,
            role: agentRole,
            tools: tools || [],
            outputSchema
          });
          
          // Initialize the agent
          await agent.initialize();
          
          return {
            success: true,
            message: `Agent ${agentName} created successfully`,
            agent: {
              name: agent.name,
              role: agent.role,
              tools: agent.tools
            }
          };
        } catch (error) {
          throw new Error(`Failed to create agent: ${error.message}`);
        }
      
      case 'execute':
        // Validate required parameters for execute action
        if (!task) {
          throw new Error('task is required for execute action');
        }
        
        // Execute the task with the agent
        try {
          const result = await agentManager.executeTask(agentName, task);
          
          return {
            success: true,
            result
          };
        } catch (error) {
          throw new Error(`Failed to execute task: ${error.message}`);
        }
      
      case 'feedback':
        // Validate required parameters for feedback action
        if (!feedback) {
          throw new Error('feedback is required for feedback action');
        }
        
        // Add feedback for the agent
        try {
          agentManager.addFeedback(agentName, feedback);
          
          return {
            success: true,
            message: `Feedback added for agent ${agentName}`
          };
        } catch (error) {
          throw new Error(`Failed to add feedback: ${error.message}`);
        }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
};