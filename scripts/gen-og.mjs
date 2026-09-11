// OGP 画像 (public/og.png) を生成する。デザイン変更時に `node scripts/gen-og.mjs` で再生成する。
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <radialGradient id="glow" cx="18%" cy="85%" r="75%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.45"/>
      <stop offset="55%" stop-color="#059669" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0a0a0b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0a0b"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="80" y="300" width="120" height="4" fill="#34d399"/>
  <text x="80" y="250" font-family="Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="#f4f4f5" letter-spacing="-3">Yudai Harada</text>
  <text x="80" y="370" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#a1a1aa">Portfolio &amp; Blog</text>
  <text x="80" y="550" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#10b981">my-homepage.pages.dev</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/og.png");
console.log("wrote public/og.png");
