---
title: "Diary"
summary: "自作の入試数学問題を分野別に公開し、PDF でも配布する学習サイト。"
tech: ["LaTeX", "TypeScript", "Cloudflare Pages", "GitHub Actions"]
period: "2025 - 現在"
links:
  repo: "https://github.com/yu531deve/diary"
featured: true
order: 1
---

## 概要

自作した入試数学の問題を分野別に Web 公開し、あわせて LaTeX で組版した PDF でもダウンロードできる学習サイト。「解きたい問題をすぐ見つけて、紙でも解ける」状態を目指している。

## 主な機能

- 分野別の問題ブラウジングと全文検索
- LaTeX 原稿から HTML への変換パイプライン
- 分野別の分冊 PDF 生成・ダウンロード
- CI による原稿と公開コンテンツの自動同期

## 技術的なポイント

問題の原本は LaTeX で管理し、そこから Web 用 HTML と配布用 PDF の両方を生成している。原稿を更新して push すると CI が変換とデプロイまで走るため、コンテンツ追加のコストが低い。ホスティングは Cloudflare Pages。

## 現状と今後

収録問題数 1000 問以上を目標に継続して追加中。検索精度の改善と、分野横断の演習セット生成を検討している。
