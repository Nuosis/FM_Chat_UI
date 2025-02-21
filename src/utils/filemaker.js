import FMGofer from 'fm-gofer';

/**
 * Utility for handling FileMaker script calls
 */

// Type checking for FileMaker environment
const isInFileMaker = () => {
  return typeof FileMaker !== 'undefined' || typeof FMGofer !== 'undefined';
};

// Valid actions for FileMaker operations
const VALID_ACTIONS = ['read', 'update', 'create', 'requestSchema'];

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
  if (!isInFileMaker()) {
    throw new Error('Not in FileMaker environment');
  }

  // Validate action
  if (!action) {
    throw new Error('Action is required for FileMaker script execution');
  }
  if (!VALID_ACTIONS.includes(action)) {
    throw new Error(`Invalid action: ${action}. Must be one of: ${VALID_ACTIONS.join(', ')}`);
  }

  // Prepare script parameters
  const parameter = JSON.stringify({
    action,
    ...scriptParam,
    version: "vLatest"
  });

  // If FMGofer is available, use it (promise-based)
  if (typeof FMGofer !== 'undefined') {
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
    const parsedResult = JSON.parse(result);
    
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

// Export a flag for checking FileMaker environment
export const inFileMaker = isInFileMaker();