// エントリポイント。reduced-motion / WebGL2 非対応時は three / troika /
// postprocessing のいずれの import にも到達しない(§10 禁止事項)。
export async function initGL(): Promise<void> {
  if (typeof window === "undefined") return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return; // ここで早期 return。この後の動的 import は一切実行されない。

  const canvas = document.createElement("canvas");
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2");
  } catch {
    gl = null;
  }
  if (!gl) return; // WebGL2 コンテキスト取得失敗時も OFF 相当(静的ページのまま)

  const showHud =
    import.meta.env.DEV && typeof location !== "undefined" && location.hash === "#perf";

  const works = Array.from(document.querySelectorAll<HTMLElement>(".work-card[data-index]"))
    .filter((el) => el.dataset.index !== undefined && el.matches("[href^='/works/']"))
    .map((el) => ({
      id: el.getAttribute("href")?.replace("/works/", "") ?? "",
      title: el.querySelector("h3")?.textContent?.trim() ?? "",
      summary: el.querySelector("p")?.textContent?.trim() ?? "",
      tech: Array.from(el.querySelectorAll("ul li")).map((li) => li.textContent?.trim() ?? ""),
    }));

  const posts = Array.from(document.querySelectorAll<HTMLElement>(".blog-card")).map((el) => ({
    id: el.getAttribute("href")?.replace("/blog/", "") ?? "",
    title: el.querySelector("h3")?.textContent?.trim() ?? "",
    date: el.dataset.date ?? "",
  }));

  const { startEngine } = await import("./engine");
  await startEngine({ works, posts, showHud });
}
