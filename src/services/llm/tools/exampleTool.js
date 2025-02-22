export default {
  name: 'math_operations',
  description: 'Perform basic math operations',
  progressText: 'Performing math calculations...',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The math operation to perform'
      },
      numbers: {
        type: 'array',
        items: { type: 'number' },
        minItems: 2,
        description: 'Numbers to perform the operation on'
      }
    },
    required: ['operation', 'numbers']
  },
  execute: async ({ operation, numbers }) => {
    switch (operation) {
      case 'add':
        return numbers.reduce((sum, num) => sum + num, 0);
      case 'subtract':
        return numbers.reduce((diff, num) => diff - num);
      case 'multiply':
        return numbers.reduce((product, num) => product * num, 1);
      case 'divide':
        return numbers.reduce((quotient, num) => quotient / num);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
};