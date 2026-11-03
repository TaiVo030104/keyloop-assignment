import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup/vitest.setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'tests/contract/**/*.test.ts'],
      testTimeout: 15000,
      coverage: {
        provider: 'v8',
        include: ['src/domain/**'],
        exclude: ['src/domain/**/*.test.ts', 'src/domain/*.testutil.ts', 'src/domain/index.ts', 'src/domain/types.ts'],
        thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
      },
    },
  }),
)
