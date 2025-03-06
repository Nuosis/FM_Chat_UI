/**
 * Simple example of using the agent system
 */
import llmServiceFactory from '../../index';
import { createAgentManager } from '../index';

/**
 * Run the example
 */
async function runExample() {
  try {
    console.log('Starting agent example...');

    // Get the LLM service
    const provider = process.env.VITE_DEFAULT_PROVIDER || 'openai';
    const llmService = llmServiceFactory.getService(provider);
    await llmServiceFactory.initializeService(provider);
    console.log(`Initialized ${provider} service`);

    // Create an agent manager
    const agentManager = createAgentManager(llmService);
    console.log('Created agent manager');

    // Create a data analyst agent
    const dataAnalyst = agentManager.createAgent({
      name: 'data_analyst',
      role: 'You are a data analyst who specializes in analyzing and interpreting complex data.',
      tools: ['math_operations', 'sql_generator'],
      outputSchema: {
        type: 'object',
        properties: {
          analysis: {
            type: 'string',
            description: 'Analysis of the data'
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Recommendations based on the analysis'
          }
        },
        required: ['analysis', 'recommendations']
      }
    });

    // Initialize the agent
    await dataAnalyst.initialize();
    console.log('Created and initialized data analyst agent');

    // Execute a task with the agent
    console.log('Executing task with data analyst agent...');
    const result = await agentManager.executeTask(
      'data_analyst',
      'Analyze the following sales data and provide recommendations:\n\nQ1: $100,000\nQ2: $120,000\nQ3: $90,000\nQ4: $150,000',
      {}, // Additional options
      (progressText) => {
        if (progressText) {
          console.log(`Progress: ${progressText}`);
        }
      }
    );

    // Display the result
    console.log('\nTask result:');
    console.log(JSON.stringify(result, null, 2));

    // Add feedback to the agent
    agentManager.addFeedback(
      'data_analyst',
      'Your analysis was very thorough, but your recommendations could be more specific.'
    );
    console.log('Added feedback to data analyst agent');

    // Create a content writer agent
    const contentWriter = agentManager.createAgent({
      name: 'content_writer',
      role: 'You are a content writer who specializes in creating engaging and informative content.',
      tools: [] // No tools needed for this agent
    });

    // Initialize the agent
    await contentWriter.initialize();
    console.log('Created and initialized content writer agent');

    // Execute a task with the agent
    console.log('Executing task with content writer agent...');
    const contentResult = await agentManager.executeTask(
      'content_writer',
      'Write a short blog post about the benefits of using AI in business.',
      {}, // Additional options
      (progressText) => {
        if (progressText) {
          console.log(`Progress: ${progressText}`);
        }
      }
    );

    // Display the result
    console.log('\nTask result:');
    console.log(contentResult.content);

    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample();
}

export default runExample;