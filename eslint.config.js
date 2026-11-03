import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'public/mockServiceWorker.js',
      '.specify',
      'specs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { files: ['**/*.gen.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  {
    // Constitution II: domain is pure and framework-free.
    files: ['src/domain/**/*.ts'],
    ignores: ['src/domain/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'react/*'], message: 'Domain must not depend on React.' },
            { group: ['msw', 'msw/*'], message: 'Domain must not depend on the mock layer.' },
            {
              group: ['@/api/*', '@/mocks/*', '@/features/*', '@/app/*', '@/observability/*'],
              message: 'Domain must not import app-specific modules.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Inject `now` instead of calling Date.now() in domain code.',
        },
        { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: 'Inject `now`.' },
        { selector: "MemberExpression[object.name='localStorage']", message: 'No storage in domain.' },
        { selector: "CallExpression[callee.name='fetch']", message: 'No network in domain.' },
      ],
    },
  },
  {
    // Layering: UI never reaches into the mock backend.
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/mocks/*'], message: 'Features talk to the API client only.' }] },
      ],
    },
  },
)
