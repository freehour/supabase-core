import { defineConfig } from 'eslint/config';

import { createConfig } from '@freehour/eslint-rules';


export default defineConfig(
    await createConfig({
        node: true,
        stylistic: true,
        imports: true,
    }),
    {
        files: ['lib/**/*.{ts,tsx}'],
        ignores: ['vite.config.ts'],
    },
);
