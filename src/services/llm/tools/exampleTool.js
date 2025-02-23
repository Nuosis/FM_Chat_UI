export default {
  name: 'math_operations',
  description: `Perform basic math operations. Examples:
- "add 3 and 7" → {"operation": "add", "numbers": [3, 7]}
- "subtract 5 from 10" → {"operation": "subtract", "numbers": [10, 5]}
- "multiply 2 by 3" → {"operation": "multiply", "numbers": [2, 3]}
- "divide 10 by 2" → {"operation": "divide", "numbers": [10, 2]}`,
  progressText: 'Performing math calculations...',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: `The math operation to perform. Must be one of:
- "add" (sum numbers)
- "subtract" (subtract numbers in order)
- "multiply" (multiply numbers)
- "divide" (divide numbers in order)`
      },
      numbers: {
        type: 'array',
        items: { type: 'number' },
        minItems: 2,
        description: `Numbers to perform the operation on. Must be:
- An array of at least 2 numbers
- Numbers must be in the correct order for subtraction and division
- Example: [10, 5] means 10 - 5 or 10 / 5`
      }
    },
    required: ['operation', 'numbers']
  },
  execute: async ({ operation, numbers }) => {
    // Validate numbers array
    if (!Array.isArray(numbers) || numbers.length < 2) {
      throw new Error('At least 2 numbers are required');
    }
    
    // Validate each number
    if (numbers.some(n => typeof n !== 'number' || isNaN(n))) {
      throw new Error('All numbers must be valid numbers');
    }

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