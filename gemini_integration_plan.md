# Gemini Integration Plan

## Overview

This document outlines the plan for integrating Google's Gemini into the existing LLM service. The goal is to replicate the functionality of the OpenAI integration for Gemini, including support for multi-turn conversations, tool use, and configuration via environment variables.

## Plan

1.  **Create `GeminiService.js`:**

    *   Create a new file `src/services/llm/GeminiService.js`.
    *   This file will contain the `GeminiService` class, which will handle communication with the Gemini API.

2.  **Implement `GeminiService` class:**

    *   Extend the `BaseLLMService` class.
    *   Implement the constructor, setting the provider name to "GEMINI".
    *   Implement the `fetchModels` method (if applicable for Gemini API).
    *   Implement the `formatAndSendRequest` method to format the messages and options for the Gemini API.
    *   Implement the `parseResponse` method to parse the response from the Gemini API.

3.  **Configure API endpoint and headers:**

    *   Define the API endpoint and headers for the Gemini API in the `GeminiService` class.
    *   These should be configurable via environment variables.

4.  **Implement `formatAndSendRequest`:**

    *   This method should take the messages and options as input and format them into the request format expected by the Gemini API.
    *   It should also handle the formatting of tools, similar to how `OpenAIService` does.

5.  **Implement `parseResponse`:**

    *   This method should take the response from the Gemini API and parse it into a standard format that can be used by the rest of the application.
    *   It should extract the content, role, and tool calls from the response.

6.  **Add Gemini to `LLMServiceFactory`:**

    *   Import the `GeminiService` in `src/services/llm/index.js`.
    *   Add an entry for "gemini" in the `services` object, mapping it to the `GeminiService` instance.

7.  **Update API key retrieval:**

    *   Update the `getApiKeyFromEnv` method in `LLMServiceFactory` to include an entry for "gemini", retrieving the API key from the `VITE_GEMINI_API_KEY` environment variable.

8.  **Register Gemini tools:**

    *   In the `initializeService` method in `LLMServiceFactory`, ensure that the tools are registered for the Gemini service.

9.  **Update environment variables:**

    *   Add the `VITE_GEMINI_API_KEY` environment variable to the `.env` file.
    *   Consider adding other environment variables for configuring the Gemini service, such as model name and temperature.

10. **Test Gemini integration:**

    *   Test the Gemini integration to ensure that it is working correctly.
    *   This should include testing multi-turn conversations, tool use, and error handling.

## Mermaid Diagram

```mermaid
graph LR
    A[Start] --> B{Create GeminiService.js};
    B --> C{Implement GeminiService class};
    C --> D{Configure API endpoint and headers};
    D --> E{Implement formatAndSendRequest};
    E --> F{Implement parseResponse};
    F --> G{Add Gemini to LLMServiceFactory};
    G --> H{Update API key retrieval};
    H --> I{Register Gemini tools};
    I --> J{Update environment variables};
    J --> K{Test Gemini integration};
    K --> L[End];

    subgraph GeminiService.js
    C --> D;
    D --> E;
    E --> F;
    end

    subgraph LLMServiceFactory
    G --> H;
    I --> G;
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style L fill:#f9f,stroke:#333,stroke-width:2px