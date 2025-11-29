---
title: Astro Content Collection で外部の GitHub リポジトリを使うだけのローダー
date: 2025-12-11
draft: true
---

Astro の Content Collection はとても便利ですが、マークダウン記事を同一のリポジトリに置きたくないこと、ありますよね。

ちょっとした工夫で外部リポジトリを参照するようにできるのでまとめました。

## デフォルトのローダーについて

Content Collection はデフォルトで `glob` ローダーが使えます

```ts
// Wrap Astro's glob loader, keeping ./content in sync with the repo.
export function github(pattern: string | string[], base: string) {
  ensureContentRepo();
  return glob({ pattern, base });
}

const REPO_URL = "https://github.com/tuatmcc/hp-md-content.git";
const CONTENT_DIR = path.resolve(process.cwd(), "content");

function ensureContentRepo() {
  try {
    if (isGitRepo(CONTENT_DIR)) {
      if (!isCorrectRemote(CONTENT_DIR, REPO_URL)) {
        // Wrong remote configured; start clean.
        reclone();
        return;
      }
      // Try pulling updates. On any failure, start clean.
      try {
        execSync("git pull", { cwd: CONTENT_DIR, stdio: "inherit" });
      } catch {
        reclone();
      }
      return;
    }

    // Not a git repo. If directory exists, it's likely stale; start clean.
    if (fs.existsSync(CONTENT_DIR)) {
      reclone();
      return;
    }

    // No directory; perform a fresh clone.
    clone();
  } catch (_err) {
    // As a last resort, attempt a clean clone.
    try {
      reclone();
    } catch {
      // Swallow to avoid crashing config evaluation; loader will still exist.
      // Consumers can observe missing content if clone also fails.
    }
  }
}
```