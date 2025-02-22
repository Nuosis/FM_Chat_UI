import exampleTool from './exampleTool';
import sqlGeneratorTool from './SQLGeneratorTool';
import { FileMakerToolAdapter } from './FileMakerToolAdapter';
import { inFileMaker } from '../../../utils/filemaker';

const fileMakerAdapter = new FileMakerToolAdapter();
const localTools = {
  exampleTool,
  sqlGeneratorTool
};

export const registerTools = async (service) => {
  // Register local tools
  Object.values(localTools).forEach(tool => {
    try {
      service.registerTool(tool);
    } catch (error) {
      console.error(`Failed to register tool ${tool.name}:`, error);
    }
  });

  // Only try to register FileMaker tools if we're in FileMaker
  if (inFileMaker) {
    try {
      const tools = await fileMakerAdapter.registerTools();
      console.log({tools})
      tools.forEach(tool => {
        try {
          service.registerTool({
            ...tool,
            execute: async (args) => fileMakerAdapter.executeTool(tool.name, args)
          });
        } catch (error) {
          console.error(`Failed to register FileMaker tool ${tool.name}:`, error);
        }
      });

      return {
        success: true,
        toolCount: Object.keys(localTools).length + tools.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        toolCount: Object.keys(localTools).length
      };
    }
  }

  // If not in FileMaker, just return success with local tools
  return {
    success: true,
    toolCount: Object.keys(localTools).length
  };
};

// Export local tools for direct access
// FileMaker tools are only available through service registration
export default localTools;