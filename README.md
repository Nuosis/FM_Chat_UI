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