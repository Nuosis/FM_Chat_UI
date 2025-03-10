# Simple Chat Application

A simplified version of the FM_Chat_UI project, focusing on the `processMessagesWithSystemPrompt` functionality.

## Features

- Simple chat interface with message history
- Support for FileMaker integration via `processMessagesWithSystemPrompt`
- Markdown rendering for chat messages
- Code syntax highlighting

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the simpleChat directory:
   ```
   cd src/simpleChat
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

### Basic Chat

Simply type your message in the input field and press Enter or click the Send button.

### Using with FileMaker

To use the chat with FileMaker integration, you need to call the `processMessagesWithSystemPrompt` function with a configuration object:

```javascript
// Example configuration object
const config = {
  apiKey: "your-api-key",
  endpoint: "https://api.example.com",
  payload: {
    messages: [
      {
        role: "system",
        content: "You are a helpful AI assistant."
      }
    ]
  }
};

// Process the config with user content
const processedConfig = window.processMessagesWithSystemPrompt(config, "Hello, how are you?");
```

The function will:
1. Validate the configuration
2. Add the user message to the messages array
3. Store the configuration in the window object for use by the LLMChat component
4. Return the processed configuration

## Building for Production

To build the application for production:

```
npm run build
```

This will create a `dist` directory with the compiled assets.