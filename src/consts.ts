export const SITE_TITLE = "Yudai Harada" as const;
export const SITE_DESCRIPTION = "Yudai Harada のポートフォリオ兼ブログ。" as const;

export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Works", href: "/works" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
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
