import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/dist-test/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/.aws-sam/**',
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
);
