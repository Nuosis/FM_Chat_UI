# API Reference for fm_chat_ui

This document provides a reference for the API endpoints used by fm_chat_ui.

## LLM Provider Endpoints

The application uses different LLM providers, each with its own API endpoint. The following table lists the API endpoints for each provider:

| Provider  | Endpoint                                      | Authentication                               |
| --------- | --------------------------------------------- | -------------------------------------------- |
| OpenAI    | `https://api.openai.com/v1/chat/completions` | API key in the `Authorization` header       |
| Anthropic | `https://api.anthropic.com/v1/messages`      | API key in the `x-api-key` header           |
| Deepseek  | `https://api.deepseek.com/v1/chat/completions`| API key in the `Authorization` header       |
| Gemini    | `https://generativelanguage.googleapis.com/v1beta/models` | API key in the `x-goog-api-key` header      |
| Ollama    | `http://localhost:11434/api/chat`             | No authentication required                  |

For more details on the request and response formats for each provider, please refer to the provider's official documentation.

## FileMaker API

The application can interact with FileMaker databases using the `fm-gofer` library. The following table lists the available FileMaker API endpoints:

| Endpoint | Description                                  | Request Format | Response Format |
| -------- | -------------------------------------------- | -------------- | --------------- |
| TBD      | To be documented after further investigation | TBD            | TBD             |

## Authentication

The application uses API keys for authentication with the LLM providers. The API keys should be set as environment variables:

*   `VITE_OPENAI_API_KEY`: OpenAI API key
*   `VITE_ANTHROPIC_API_KEY`: Anthropic API key
*   `VITE_DEEPSEEK_API_KEY`: Deepseek API key
*   `VITE_GEMINI_API_KEY`: Gemini API key

Ollama does not require an API key.

## Examples

Examples of how to use the API endpoints will be added in future versions of this document.