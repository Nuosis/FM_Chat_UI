import exampleTool from './exampleTool';
import sqlGeneratorTool from './SQLGeneratorTool';
import { FileMakerToolAdapter } from './FileMakerToolAdapter';
import { inFileMaker } from '../../../utils/filemaker';

const fileMakerAdapter = new FileMakerToolAdapter();
// Define local tools object for export
const localTools = {
  exampleTool,
  sqlGeneratorTool
};

const validateTool = (tool) => {
  // Check if tool is defined and is an object
  if (!tool || typeof tool !== 'object') {
    return false;
  }
  // Required properties for a valid tool
  const requiredProps = ['name', 'description', 'parameters', 'execute'];
  return requiredProps.every(prop => tool[prop] !== undefined);
};

export const registerTools = async (service) => {
  let registeredCount = 0;
  
  // Register local tools
  const tools = [exampleTool, sqlGeneratorTool];
  const validTools = tools.filter(validateTool);
  
  validTools.forEach(tool => {
    registeredCount++; // Count valid tools regardless of registration success
    try {
      service.registerTool(tool);
    } catch (error) {
      console.error(`Failed to register tool ${tool.name}:`, error);
      // Don't decrement count - we still want to count valid tools even if registration fails
    }
  });

  // Only try to register FileMaker tools if we're in FileMaker
  if (inFileMaker) {
    try {
      const tools = await fileMakerAdapter.registerTools();
      const validTools = tools.filter(validateTool);
      
      validTools.forEach(tool => {
        try {
          service.registerTool({
            ...tool,
            execute: async (args) => fileMakerAdapter.executeTool(tool.name, args)
          });
          registeredCount++;
        } catch (error) {
          console.error(`Failed to register FileMaker tool ${tool.name}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to register FileMaker tools:', error);
    }
  }

  return {
    success: registeredCount > 0,
    toolCount: registeredCount
  };
};

// Export local tools for direct access
// FileMaker tools are only available through service registration
export default localTools;