# My Homepage

Portfolio site under construction.

## 技術スタック

- [Astro](https://astro.build)（TypeScript strict）
- [Tailwind CSS](https://tailwindcss.com)（v4 / `@tailwindcss/vite`）
- [GSAP](https://gsap.com) + ScrollTrigger（スクロール連動演出）
- [Prettier](https://prettier.io)（`prettier-plugin-astro` / `prettier-plugin-tailwindcss`）

## プロジェクト構成

```text
/
├── public/
├── src/
│   ├── components/   # Header / Footer など共通コンポーネント
│   ├── layouts/       # BaseLayout
│   ├── pages/          # ルーティング（/, /works, /about, /blog, /contact 他）
│   ├── styles/         # global.css（Tailwind + デザイントークン）
│   └── consts.ts       # サイト共通定数
└── package.json
```

## コマンド

| コマンド | 内容 |
| :--- | :--- |
| `npm install` | 依存パッケージのインストール |
| `npm run dev` | 開発サーバー起動（`localhost:4321`） |
| `npm run build` | 本番ビルド（`./dist/`） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run astro ...` | Astro CLI（`astro add` / `astro check` 等） |
| `npm run format` | Prettier で整形 |
| `npm run format:check` | Prettier の整形チェックのみ |
