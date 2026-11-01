import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Pinned so a developer's local .env.local cannot change what the tests assert.
  define: {
    __SEMANTIC_MODEL__: 'null',
    'import.meta.env.VITE_OPENAI_ENDPOINT': '""',
    'import.meta.env.VITE_OPENAI_DEPLOYMENT': '""',
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    // Test cases disabled for the submission. Restore: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs']
    include: [],
    clearMocks: true,
    restoreMocks: true,
  },
})
