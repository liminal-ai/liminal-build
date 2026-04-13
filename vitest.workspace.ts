import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'server',
      environment: 'node',
      include: ['tests/service/server/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'client',
      environment: 'jsdom',
      include: ['tests/service/client/**/*.test.ts'],
    },
  },
]);
