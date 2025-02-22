import { handleFMScriptResult, inFileMaker } from '../../../utils/filemaker';

// Global variable and function for FileMaker to call with the result
window.toolRegistrationResult = null;
window.registerToolsCallback = (result) => {
  try {
    const tools = JSON.parse(result);
    // Add execute function to each tool
    const toolsWithExecute = tools.map(tool => ({
      ...tool,
      execute: async (parameters) => {
        const adapter = new FileMakerToolAdapter();
        return adapter.executeTool(tool.name, parameters);
      }
    }));
    window.toolRegistrationResult = toolsWithExecute;
  } catch (error) {
    console.error('Error parsing tool registration result:', error);
    window.toolRegistrationResult = [];
  }
};

export class FileMakerToolAdapter {
  async executeTool(toolName, parameters) {
    if (!inFileMaker) {
      throw new Error('FileMaker tools are only available in FileMaker environment');
    }

    try {
      const response = await performFMScript({
        action: 'performScript',
        script: `ai * tools * ${toolName}`,
        scriptParam: {
          ...parameters
        }
      });
      return handleFMScriptResult(response);
    } catch (error) {
      throw new Error(`FileMaker tool execution failed: ${error.message}`);
    }
  }

  async registerTools() {
    if (!inFileMaker) {
      return []; // Return empty array in non-FileMaker environment
    }
    console.log("fetching tools from FileMaker");
    try {
      console.log('Attempting to fetch tools from FileMaker...');
      if (!window.FileMaker) {
        throw new Error('FileMaker not available');
      }
      
      // Reset the result before calling the script
      window.toolRegistrationResult = null;
      
      console.log('Calling ai * ListTools...');
      window.FileMaker.PerformScript('ai * ListTools', '{}');
      
      // Wait for the result to be set
      let attempts = 0;
      while (!window.toolRegistrationResult && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!window.toolRegistrationResult) {
        console.error('No result received from FileMaker after 5 seconds');
        return [];
      }
      
      console.log('Received result:', window.toolRegistrationResult);
      return handleFMScriptResult(window.toolRegistrationResult);
    } catch (error) {
      console.error('Error fetching tools:', error);
      throw new Error(`Failed to fetch FileMaker tools: ${error.message}`);
    }
  }
}