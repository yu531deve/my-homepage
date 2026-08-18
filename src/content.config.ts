import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const works = defineCollection({
  loader: glob({ base: "./src/content/works", pattern: "**/*.md" }),
  schema: z.object({
    // 作品名
    title: z.string(),
    // 一覧カード用の1文サマリ(本文とは別。80字程度まで)
    summary: z.string(),
    // 使用技術タグ
    tech: z.array(z.string()).default([]),
    // 制作期間(任意)。例: "2025.06 - 現在"
    period: z.string().optional(),
    // 外部リンク。すべて任意
    links: z
      .object({
        repo: z.string().url().optional(),
        site: z.string().url().optional(),
        article: z.string().url().optional(),
      })
      .default({}),
    // サムネイル画像パス(public 配下, 例: "/images/works/diary.png")。当面は未設定でよい
    thumbnail: z.string().optional(),
    // メインページ(/)への掲載対象か
    featured: z.boolean().default(false),
    // 一覧の並び順。小さいほど先頭
    order: z.number().default(999),
    // 準備中フラグ。true の場合カードに "準備中" バッジを出す
    wip: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    // 公開日。frontmatter には YYYY-MM-DD で書く
    date: z.coerce.date(),
    tags: z.array(z.enum(["tech", "learning", "diary", "devlog"])).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { works, blog };
