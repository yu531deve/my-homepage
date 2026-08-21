interface SplitOptions {
  mask?: boolean;
}

/**
 * 英字テキストを単語単位でラップしたうえで文字単位の span に分割する。
 * GSAP SplitText(有料プラグイン)を使わずに自前実装。
 *
 * - 元テキストは aria-label として要素に残し、分割された内部は aria-hidden にする
 * - 単語は split-word span で包み、改行で単語が割れないようにする
 * - 半角スペースは split-space span(幅 0.28em)として扱う
 * - 各文字 span には --i カスタムプロパティ(インデックス)を付与する
 * - 冪等: data-split="true" の要素は再分割しない
 */
export function splitChars(el: HTMLElement, charClass: string, options: SplitOptions = {}): HTMLElement[] {
  if (el.dataset.split === "true") {
    return Array.from(el.querySelectorAll<HTMLElement>(`.${charClass}`));
  }

  const originalText = el.textContent ?? "";
  el.setAttribute("aria-label", originalText);
  el.dataset.split = "true";
  el.innerHTML = "";

  const wrapper = document.createElement("span");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.display = "inline-block";

  const words = originalText.split(" ");
  const chars: HTMLElement[] = [];
  let globalIndex = 0;

  words.forEach((word, wordIndex) => {
    const wordSpan = document.createElement("span");
    wordSpan.className = "split-word";
    wordSpan.style.display = "inline-block";
    wordSpan.style.whiteSpace = "nowrap";

    for (const ch of word) {
      const charSpan = document.createElement("span");
      charSpan.className = charClass;
      charSpan.style.display = "inline-block";
      charSpan.style.willChange = "transform";
      charSpan.style.setProperty("--i", String(globalIndex));
      charSpan.textContent = ch;

      if (options.mask) {
        const mask = document.createElement("span");
        mask.className = "split-mask";
        mask.style.display = "inline-block";
        mask.style.overflow = "hidden";
        mask.appendChild(charSpan);
        wordSpan.appendChild(mask);
      } else {
        wordSpan.appendChild(charSpan);
      }

      chars.push(charSpan);
      globalIndex += 1;
    }

    wrapper.appendChild(wordSpan);

    if (wordIndex < words.length - 1) {
      const spaceSpan = document.createElement("span");
      spaceSpan.className = "split-space";
      spaceSpan.style.display = "inline-block";
      spaceSpan.style.width = "0.28em";
      spaceSpan.textContent = " ";
      wrapper.appendChild(spaceSpan);
    }
  });

  el.appendChild(wrapper);

  return chars;
}
