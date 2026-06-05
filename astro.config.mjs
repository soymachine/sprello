import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  site: 'https://soymachine.github.io',
  base: '/sprello',
  integrations: [react(), tailwind()],
});
