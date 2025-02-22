// Type checking for FileMaker environment
const isInFileMaker = () => {
  return typeof window !== 'undefined' && (typeof window.FileMaker !== 'undefined' || typeof window.FMGofer !== 'undefined');
};

// Export the flag for checking FileMaker environment
export const inFileMaker = isInFileMaker();

// Only import FMGofer if we're in FileMaker
let FMGofer;
if (inFileMaker) {
  import('fm-gofer').then(module => {
    FMGofer = module.default;
  }).catch(error => {
    console.error('Failed to load FMGofer:', error);
  });
}

// Valid actions for FileMaker operations
const VALID_ACTIONS = ['read', 'update', 'create', 'requestSchema', 'script'];

/**
 * Promisified version of FileMaker.PerformScript
 * @param {Object} params - Parameters for the script execution
 * @param {string} params.action - Action type (read, update, create, requestSchema)
 * @param {string} [params.script="JS * Fetch Data"] - Script name to execute
 * @param {Object} [params.scriptParam={}] - Parameters to pass to the script
 * @returns {Promise} - Resolves with the script result or rejects with error
 */
export const performFMScript = async ({
  action,
  script = "JS * Fetch Data",
  scriptParam = {}
}) => {
  // Validate environment
  if (!inFileMaker) {
    throw new Error('Not in FileMaker environment');
  }

  // Skip parameter preparation for ai * tools script
  const parameter = script === 'ai * tools'
    ? '' // No parameters for ai * tools
    : JSON.stringify({
        ...(action && { action }), // Only include action if provided
        ...scriptParam,
        version: "vLatest"
      });

  // Skip action validation for direct script calls
  if (action && !VALID_ACTIONS.includes(action)) {
    throw new Error(`Invalid action: ${action}. Must be one of: ${VALID_ACTIONS.join(', ')}`);
  }

  // If FMGofer is available, use it (promise-based)
  if (FMGofer) {
    console.log("FMGofer calling ... ", script, parameter);
    return FMGofer.PerformScript(script, parameter)
      .then(result => handleFMScriptResult(result))
      .catch(error => {
        console.error('FMGofer script error:', error);
        throw error;
      });
  }

  // Otherwise use FileMaker object (callback-based)
  return new Promise((resolve, reject) => {
    try {
      console.log("FileMaker calling ... ", script, parameter);
      FileMaker.PerformScript(script, parameter);
      // Note: Since FileMaker.PerformScript is not promise-based,
      // the actual response will need to be handled via a callback
      // mechanism set up in the component
      resolve();
    } catch (error) {
      console.error('FileMaker script error:', error);
      reject(error);
    }
  });
};

/**
 * Handle script result from FileMaker
 * @param {string} result - JSON string from FileMaker
 * @returns {Object} Parsed result
 */
export const handleFMScriptResult = (result) => {
  try {
    if (!result) {
      throw new Error('Empty result from FileMaker');
    }
    // Handle both JSON strings and objects
    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    console.log("call result: ", parsedResult);
    
    // Check for FileMaker errors
    if (parsedResult.error) {
      const error = new Error(parsedResult.message || 'Unknown FileMaker error');
      error.code = 'FM_ERROR';
      error.details = parsedResult.details;
      throw error;
    }
    
    return parsedResult;
  } catch (error) {
    console.error('Error handling FileMaker result:', error);
    throw error;
  }
};