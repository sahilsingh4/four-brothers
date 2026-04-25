import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    settings: { react: { version: 'detect' } },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Catches the exact bug class that crashed the live site:
      // a JSX tag (<X />) referencing a component that wasn't imported.
      // Base no-undef doesn't see JSX identifiers; this rule does.
      'react/jsx-no-undef': 'error',
      // Tells no-unused-vars that a JSX tag reference counts as a use.
      // Without this, `const Foo = (...)` + `<Foo />` reports Foo unused.
      'react/jsx-uses-vars': 'error',
      // Downgrade set-state-in-effect from error → warn. The 13 violations in
      // the codebase are all pre-existing, audited "respond-to-external-trigger"
      // patterns: consume a one-shot prop (DispatchesTab pendingDispatch,
      // ReviewTab pendingFB), autofill a sibling field on prop change but only
      // when the target is empty (FBEditModal billed/paid hours), or reset
      // modal-internal mode on a toggle (InvoicesTab showNewInvoice). Each is
      // a single bounded write — the cascade self-terminates after one render.
      // We still want this rule active so genuinely new cascading-render bugs
      // get flagged in PRs; warn-level keeps it visible without breaking CI.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
