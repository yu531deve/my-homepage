// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // GitHub Pages(プロジェクトページ)で公開する。独自ドメイン確定時に差し替える
  site: "https://yu531deve.github.io",
  base: "/my-homepage",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
