# Changelog for fm_chat_ui

## [1.0.0] - 2023-03-05

### Added

*   Initial release of fm_chat_ui.
*   Chat interface for interacting with LLMs.
*   Support for OpenAI, Anthropic, Deepseek, Gemini, and Ollama.
*   Redux for state management.
*   Material UI for styling.
*   Integration with FileMaker databases (using `fm-gofer`).
*   Tool registration for LLM services.
*   Logging with different log types (INFO, SUCCESS, WARNING, ERROR).
*   Dark/light mode support.

### Fixed

*   N/A

### Changed

*   N/A

### Removed

*   N/A

### Changed

*   Updated default agent implementation to only require `VITE_ENABLE_AGENTS` environment variable. If `VITE_DEFAULT_AGENT` is undefined, the system will use a default agent named "default".