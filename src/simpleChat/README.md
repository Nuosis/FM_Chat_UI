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

## FileMaker Script Setup

To use the chat with FileMaker, you need to create a script named "AI * Make Call" in your FileMaker database. This script should:

1.  Accept a JSON parameter containing the configuration and user message.
2.  Make an API call to the LLM endpoint specified in the configuration.
3.  Return the LLM's response as a JSON object.

Here's an example of what the "AI * Make Call" script might look like:

```filemaker
# Set Variable [ $config ; Get(ScriptParameter) ]
# Set Variable [ $apiKey ; JSONGetElement ( $config ; "apiKey" ) ]
# Set Variable [ $endpoint ; JSONGetElement ( $config ; "endpoint" ) ]
# Set Variable [ $payload ; JSONGetElement ( $config ; "payload" ) ]
# Set Variable [ $contentType ; "application/json" ]
# Insert from URL [
#   Target: $response ;
#   URL: $endpoint ;
#   cURL options: "-X POST --header \"Content-Type: application/json\" --header \"Authorization: Bearer " &amp; $apiKey &amp; "\" --data @" &amp; Quote ( $payload )
#   ; Automatically encode URL: Off
# ]
# Set Variable [ $result ; JSONFormatElements ( $response ) ]
# Exit Script [ Text Result: $result ]
```

**Note:** This is just an example. You may need to adjust the script based on your specific LLM provider and API requirements.

## Building for Production

To build the application for production:

```
npm run build
```

This will create a `dist` directory with the compiled assets.