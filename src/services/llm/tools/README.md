# Adding New Tools

This document explains how to add new tools to the LLM services.

## Tool Structure

Each tool must be a JavaScript object with the following properties:

```javascript
{
  name: 'tool_name', // Unique tool identifier
  description: 'Tool description', // Used by LLM to understand tool purpose
  progressText: 'Performing math calculations...', // the text that will be rendered when it is called
  parameters: { // JSON Schema defining tool inputs
    type: 'object',
    properties: {
      // Parameter definitions
    },
    required: ['param1', 'param2']
  },
  execute: async (args) => {
    // Tool implementation
    return result;
  }
}
```

## Creating a New Tool

1. Create a new file in `src/services/llm/tools/`
2. Implement the tool following the structure above
3. Export the tool as default

Example:
```javascript
// src/services/llm/tools/myTool.js
export default {
  name: 'my_tool',
  description: 'My custom tool',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    },
    required: ['input']
  },
  execute: async ({ input }) => {
    // Tool logic here
    return `Processed: ${input}`;
  }
};
```

## Registering the Tool

1. Open `src/services/llm/tools/index.js`
2. Import your new tool
3. Add it to the tools object

Example:
```javascript
import exampleTool from './exampleTool';
import myTool from './myTool';

const tools = {
  exampleTool,
  myTool
};
```

## Best Practices

1. Keep tool names unique and descriptive
2. Use clear parameter names and descriptions
3. Handle errors gracefully
4. Keep tools focused on single responsibilities
5. Document complex tools with comments

## Testing Tools

1. Start a chat session
2. Ask the LLM to use your tool
3. Verify the tool's output

Example:
"Use my_tool with input 'test'"