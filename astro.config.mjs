// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // TODO: 独自ドメイン確定時に差し替える
  site: "https://my-homepage.pages.dev",
  vite: {
    plugins: [tailwindcss()]
  }
});