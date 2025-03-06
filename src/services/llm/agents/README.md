# Agent System

This directory contains the implementation of the agent system for the FM Chat UI application. The agent system allows you to create and manage agents that can be assigned specific roles, tools, and structured output requirements.

## Overview

The agent system consists of the following components:

- **Agent**: A class that represents an agent with a specific role, tools, and structured output requirements.
- **AgentManager**: A class that manages multiple agents and provides methods for creating, initializing, and executing tasks with agents.
- **AgentExecutorTool**: A tool that allows the LLM to create and use agents.

## Usage

### Creating an Agent Manager

```javascript
import { createAgentManager } from './agents';
import llmServiceFactory from './index';

// Get the LLM service
const llmService = llmServiceFactory.getService('openai');

// Create an agent manager
const agentManager = createAgentManager(llmService);
```

### Creating an Agent

```javascript
// Create an agent with a specific role and tools
const agent = agentManager.createAgent({
  name: 'data_analyst',
  role: 'You are a data analyst who specializes in analyzing and interpreting complex data.',
  tools: ['math_operations', 'sql_generator'],
  outputSchema: {
    type: 'object',
    properties: {
      analysis: {
        type: 'string',
        description: 'Analysis of the data'
      },
      recommendations: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Recommendations based on the analysis'
      }
    },
    required: ['analysis', 'recommendations']
  }
});

// Initialize the agent
await agent.initialize();
```

### Executing a Task with an Agent

```javascript
// Execute a task with the agent
const result = await agentManager.executeTask(
  'data_analyst',
  'Analyze the sales data for Q1 2025 and provide recommendations for improving sales in Q2.',
  {}, // Additional options
  (progressText) => {
    // Progress update callback
    console.log(progressText);
  }
);

console.log(result);
```

### Using the AgentExecutorTool

The AgentExecutorTool allows the LLM to create and use agents. It provides the following actions:

- **create**: Create a new agent with a specific role and tools.
- **execute**: Execute a task with an existing agent.
- **feedback**: Provide feedback to an agent.

Example of using the AgentExecutorTool:

```
Use the agent_executor tool to create a data analyst agent:

{
  "action": "create",
  "agentName": "data_analyst",
  "agentRole": "You are a data analyst who specializes in analyzing and interpreting complex data.",
  "tools": ["math_operations", "sql_generator"],
  "outputSchema": {
    "type": "object",
    "properties": {
      "analysis": {
        "type": "string",
        "description": "Analysis of the data"
      },
      "recommendations": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Recommendations based on the analysis"
      }
    },
    "required": ["analysis", "recommendations"]
  }
}

Now use the agent_executor tool to execute a task with the data analyst agent:

{
  "action": "execute",
  "agentName": "data_analyst",
  "task": "Analyze the sales data for Q1 2025 and provide recommendations for improving sales in Q2."
}
```

## Structured Output

Agents can be configured with a structured output schema using JSON Schema. This allows you to define the expected structure of the agent's response.

Example:

```javascript
const outputSchema = {
  type: 'object',
  properties: {
    analysis: {
      type: 'string',
      description: 'Analysis of the data'
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'string'
      },
      description: 'Recommendations based on the analysis'
    }
  },
  required: ['analysis', 'recommendations']
};
```

The agent will attempt to format its response according to this schema. If the response is not valid JSON, the agent will return the raw response.

## Feedback Loop

Agents can receive feedback to improve their performance over time. You can add feedback to an agent using the `addFeedback` method:

```javascript
agentManager.addFeedback('data_analyst', 'Your analysis was very thorough, but your recommendations could be more specific.');
```

The feedback is stored in the agent's feedback history and can be used to improve the agent's performance in future tasks.