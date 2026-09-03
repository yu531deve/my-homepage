import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";

export const GET: APIRoute = async (context) => {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  return rss({
    title: `${SITE_TITLE} | Blog`,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    })),
    customData: "<language>ja</language>",
  });
};
