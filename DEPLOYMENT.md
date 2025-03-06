# Deployment of fm_chat_ui

This document describes the deployment process for fm_chat_ui.

## Environment Setup

The application requires the following environment variables to be set:

*   `VITE_OPENAI_API_KEY`: OpenAI API key (required for OpenAI)
*   `VITE_ANTHROPIC_API_KEY`: Anthropic API key (required for Anthropic)
*   `VITE_DEEPSEEK_API_KEY`: Deepseek API key (required for Deepseek)
*   `VITE_GEMINI_API_KEY`: Gemini API key (required for Gemini)
*   `VITE_DEFAULT_PROVIDER`: Default LLM provider (optional, defaults to OpenAI)
*   `VITE_ENABLE_AGENTS`: Enable/disable LLM agents and tools (optional, defaults to false). When agents are enabled and no default agent is specified, the system will use a default agent named "default".
## Dependencies

The application has the following dependencies:

*   Node.js
*   npm or yarn

## Deployment Steps

1.  Build the application: `npm run build`
2.  Copy the contents of the `dist` directory to your web server.
3.  Configure your web server to serve the application.
4.  Set the environment variables.

## CI/CD Workflows

CI/CD workflows can be set up using tools like GitHub Actions, GitLab CI, or Jenkins. The following steps are typically involved in a CI/CD workflow:

1.  Code changes are pushed to the repository.
2.  The CI/CD tool automatically builds the application.
3.  The CI/CD tool runs the tests.
4.  If the tests pass, the CI/CD tool deploys the application to the web server.

Example GitHub Actions workflow:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
      - run: npm install
      - run: npm run build
      - run: # Add deployment steps here