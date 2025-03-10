# fm_chat_ui

## Description

fm_chat_ui is a React application that provides a chat interface for interacting with various Large Language Models (LLMs). It supports OpenAI, Anthropic, Deepseek, Gemini, and Ollama. The application uses Redux for state management and Material UI for styling. It can be integrated with FileMaker databases using the `fm-gofer` library.

## Setup Instructions

1.  Clone the repository: `git clone <repository_url>`
2.  Install dependencies: `npm install`
3.  Set up environment variables:
    *   `VITE_OPENAI_API_KEY`: OpenAI API key (required for OpenAI)
    *   `VITE_ANTHROPIC_API_KEY`: Anthropic API key (required for Anthropic)
    *   `VITE_DEEPSEEK_API_KEY`: Deepseek API key (required for Deepseek)
    *   `VITE_GEMINI_API_KEY`: Gemini API key (required for Gemini)
    *   `VITE_DEFAULT_PROVIDER`: Default LLM provider (optional, defaults to OpenAI)
    *   `VITE_SHOW_HEADER`: Control header visibility (optional, defaults to true)
    *   `VITE_USE_FM_INTEGRATION`: Enable FileMaker integration (optional, defaults to false)
4.  Start the development server: `npm run dev`
## Key Features

*   Chat interface for interacting with LLMs
*   Support for OpenAI, Anthropic, Deepseek, Gemini, and Ollama
*   Redux for state management
*   Material UI for styling
*   Integration with FileMaker databases (using `fm-gofer`)
*   Tool registration for LLM services
*   Logging with different log types (INFO, SUCCESS, WARNING, ERROR)
*   Dark/light mode support
*   Configurable UI with feature flags

## Feature Flags

The application supports several feature flags that can be configured in the `.env` file:

*   `VITE_ENABLE_AGENTS`: Enable/disable LLM agents and tools (default: false)
*   `VITE_SHOW_HEADER`: Show/hide the application header (default: true) If true user can change the provider and model and view logs
*   `VITE_USE_FM_INTEGRATION`: Enable/disable FileMaker integration for direct LLM calls (default: false)

These flags can be set to `true` or `false` in the `.env` file. The header visibility can also be toggled at runtime using the settings dialog or the Alt+H keyboard shortcut. When agents are enabled and no default agent is specified, the system will use a default agent named "default".
*   Dark/light mode support

## FileMaker Integration

The application supports integration with FileMaker using the `fm-gofer` library. When the `VITE_USE_FM_INTEGRATION` flag is set to `true`, the application will use FileMaker to handle LLM requests instead of making direct API calls.

### Using System Prompts with FileMaker

You can pass a messages array containing a system prompt to the LLMChat component using "processMessagesWithSystemPrompt". The system prompt will be included in the messages sent to the LLM. Here's how to use this feature:

1. Set `VITE_USE_FM_INTEGRATION=true` in the `.env` file
2. Set `VITE_SHOW_HEADER=false` to hide the header (optional)
3. Pass a messages array to the component with the following structure:
   ```javascript
   {
     messages: [
       {
         role: 'system',
         content: 'You are a helpful assistant.'
       }
     ]
   }
   ```
4. When a user submits a message, the full messages array (including both system and user messages) will be passed to the FileMaker script "Make Call" via FMGofer
5. The script should process the messages and return a response, which will be rendered in the chat interface

### FileMaker Script Integration

The application uses the `performFMScript` function to call FileMaker scripts. When a user submits a message, the application will:

1. Check if FileMaker integration is enabled
2. Prepare the messages array with the system prompt and user message
3. Call the FileMaker script "Make Call" with the full messages array as the parameter
4. Render the response from FileMaker

The FileMaker script should return a JSON object with a `content` property containing the LLM response.

### Global Functions for FileMaker

The application provides the following global functions for use in FileMaker:

* `processMessagesWithSystemPrompt(config, userContent)`: Validates and processes a configuration object or JSON string containing API key, endpoint, and payload with a system prompt. This function is available globally and can be called directly from FileMaker web viewers.
  * `config`: An object or JSON string containing API key, endpoint, and payload with messages
  * `userContent`: (Optional) User message content to add to the messages array

Example usage in FileMaker JavaScript:
```javascript
// Create a config object with API key, endpoint, and payload
const config = {
  apiKey: "",
  endPoint: "http://localhost:2222/v1/chat/completions",
  payload: {
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      }
    ],
    model: "qwq-32b",
    stream: false,
    temperature: 0.07
  }
};

// Process the config with user content
const processedConfig = window.processMessagesWithSystemPrompt(config, "Hello, how are you?");
```

The expected configuration object structure is:
```javascript
{
  apiKey: "",                   // API key for the LLM service
  endPoint: "",                 // Endpoint URL for the LLM service
  payload: {
    messages: [                 // Array of messages
      {
        role: "system",         // First message must be a system message
        content: "..."          // System prompt content
      }
    ],
    model: "model-name",        // LLM model name
    stream: false,              // Whether to stream the response
    temperature: 0.7            // Temperature for the LLM
  }
}
```

## Dependencies

*   @emotion/react
*   @emotion/styled
*   @mui/icons-material
*   @mui/material
*   @reduxjs/toolkit
*   @vitejs/plugin-react
*   axios
*   fm-gofer
*   node-sql-parser
*   react
*   react-dom
*   react-markdown
*   react-redux
*   react-syntax-highlighter
*   uuid
*   vite

## Development Dependencies

*   @testing-library/react
*   @testing-library/user-event
*   @testing-library/jest-dom
*   @vitest/coverage-v8
*   jsdom
*   redux-mock-store
*   vitest