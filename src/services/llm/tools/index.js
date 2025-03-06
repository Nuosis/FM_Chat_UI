import exampleTool from './exampleTool';
import sqlGeneratorTool from './SQLGeneratorTool';
import getFileMakerSchemaTool from './GetFileMakerSchemaTool';
import getStructuredDataTool from './GetStructuredDataTool';
import agentExecutorTool from './AgentExecutorTool';
import { FileMakerToolAdapter } from './FileMakerToolAdapter';
import { inFileMaker } from '../../../utils/filemaker';

const fileMakerAdapter = new FileMakerToolAdapter();
// Define local tools object for export
const localTools = {
  exampleTool,
  sqlGeneratorTool,
  agentExecutorTool,
  // getStructuredDataTool,
  // getFileMakerSchemaTool
};

const validateTool = (tool) => {
  // Check if tool is defined and is an object
  if (!tool || typeof tool !== 'object') {
    console.log('Tool validation failed: not an object', tool);
    return false;
  }

  // Required properties for all tools
  const baseProps = ['name', 'description', 'parameters'];
  const hasBaseProps = baseProps.every(prop => {
    const hasProperty = tool[prop] !== undefined;
    if (!hasProperty) {
      console.log(`Tool validation failed: missing ${prop}`, tool);
    }
    return hasProperty;
  });

  if (!hasBaseProps) return false;

  // For FileMaker tools, we add execute later, so don't require it during validation
  if (tool.name.startsWith('ai * tools *')) {
    console.log('Validating FileMaker tool:', tool.name);
    return true;
  }

  // For local tools, require execute property
  const hasExecute = typeof tool.execute === 'function';
  if (!hasExecute) {
    console.log('Tool validation failed: missing execute function', tool);
  }
  return hasExecute;
};

export const registerTools = async (service) => {
  let registeredCount = 0;
  
  // Register local tools
  const tools = [
    exampleTool,
    sqlGeneratorTool,
    agentExecutorTool,
    // getStructuredDataTool,
    // getFileMakerSchemaTool
  ];
  console.log('Attempting to register local tools:', tools.map(t => t.name));
  const validTools = tools.filter(validateTool);
  console.log('Valid local tools:', validTools.map(t => t.name));
  
  validTools.forEach(tool => {
    registeredCount++; // Count valid tools regardless of registration success
    try {
      service.registerTool(tool);
      console.log(`Successfully registered tool: ${tool.name}`);
    } catch (error) {
      console.error(`Failed to register tool ${tool.name}:`, error);
      // Don't decrement count - we still want to count valid tools even if registration fails
    }
  });

  // Only try to register FileMaker tools if we're in FileMaker
  if (inFileMaker) {
    try {
      console.log('Attempting to register FileMaker tools...');
      const tools = await fileMakerAdapter.registerTools();
      console.log('Retrieved FileMaker tools:', tools.map(t => t.name));
      
      const validTools = tools.filter(validateTool);
      console.log('Valid FileMaker tools:', validTools.map(t => t.name));
      
      validTools.forEach(tool => {
        try {
          service.registerTool({
            ...tool,
            execute: async (args) => fileMakerAdapter.executeTool(tool.name, args)
          });
          console.log(`Successfully registered FileMaker tool: ${tool.name}`);
          registeredCount++;
        } catch (error) {
          console.error(`Failed to register FileMaker tool ${tool.name}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to register FileMaker tools:', error);
    }
  } else {
    console.log('Not in FileMaker environment, skipping FileMaker tools');
  }

  return {
    success: registeredCount > 0,
    toolCount: registeredCount
  };
};

// Export local tools for direct access
// FileMaker tools are only available through service registration
export default localTools;