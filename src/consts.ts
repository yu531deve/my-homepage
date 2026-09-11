/**
 * GitHub Pages のプロジェクトページはサブパス(/my-homepage)配下に公開されるため、
 * サイト内リンクと public/ のアセットは必ずこの関数を通す。
 * 開発時は BASE_URL が "/" なのでそのまま動く。
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_TITLE = "Yudai Harada" as const;
export const SITE_DESCRIPTION = "Yudai Harada のポートフォリオ兼ブログ。" as const;

export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Works", href: withBase("/works") },
  { label: "About", href: withBase("/about") },
  { label: "Blog", href: withBase("/blog") },
  { label: "Contact", href: withBase("/contact") },
];

export type SocialLink = {
  label: string;
  href: string;
};

export const SOCIAL_LINKS: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/yu531deve" },
  { label: "X", href: "https://x.com/Yudai531deve" },
];

export const BLOG_TAGS = ["tech", "learning", "diary", "devlog"] as const;
export type BlogTag = (typeof BLOG_TAGS)[number];

export const BLOG_TAG_LABELS: Record<BlogTag, string> = {
  tech: "技術",
  learning: "学習ログ",
  diary: "雑記",
  devlog: "開発日誌",
};
