// Search-engine files built at deploy time (vite.config.ts → seoPlugin): robots.txt,
// sitemap.xml and static HTML guide pages generated from public/data/*.json.
// The app itself is a client-rendered SPA whose content is fetched after load,
// so these pages are what search engines can actually read. Pure; no DOM.

import type { Scenario } from '../types';

/** App routes listed in the sitemap (public, useful without any progress). */
export const SITEMAP_ROUTES = [
  '/',
  '/scenarios',
  '/shadowing',
  '/listening',
  '/interpret',
  '/emails',
  '/messages',
  '/flashcards',
  '/grammar',
  '/typing',
  '/find',
  '/passive',
  '/about',
] as const;

/** Static guide pages: URL path → file emitted into dist/. */
export const GUIDE_PAGES = {
  interview: { path: '/hoc/phong-van-it-tieng-han', file: 'hoc/phong-van-it-tieng-han.html' },
} as const;

export function buildRobots(site: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`;
}

export function buildSitemap(site: string, paths: readonly string[], lastmod: string): string {
  const urls = paths
    .map((p) => `  <url>\n    <loc>${escapeXml(site + p)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Interview sections on the guide page, in order. A scenario goes to the first group whose test matches its id. */
export const INTERVIEW_GROUPS = [
  { key: 'nexacro', test: /nexacro|xplatform/ },
  { key: 'java', test: /java|spring|jpa|mybatis|transaction|batch|unit-test|egovframe|sql|api|git|react|deploy|security/ },
  { key: 'brse', test: /brse|pm-|spec-change|korean-check/ },
  { key: 'qa', test: /qa-/ },
  { key: 'general', test: /./ },
] as const;

export type InterviewGroup = (typeof INTERVIEW_GROUPS)[number]['key'];

/** Display order on the page: general questions first, then the technical rounds. */
const GROUP_ORDER: readonly InterviewGroup[] = ['general', 'java', 'nexacro', 'brse', 'qa'];

export function interviewGroup(id: string): InterviewGroup {
  return INTERVIEW_GROUPS.find((g) => g.test.test(id))?.key ?? 'general';
}

export interface GuideText {
  title: string;
  description: string;
  h1: string;
  intro: string;
  groups: Record<InterviewGroup, string>;
  question: string;
  hint: string;
  answer: string;
  practice: string;
  openApp: string;
  ctaTitle: string;
  ctaText: string;
  count: (n: number) => string;
  footer: string;
}

/** Drops the "Phỏng vấn: " style prefix from a scenario title for use as a heading. */
export function shortTitle(title: string): string {
  return title.replace(/^[^:]{1,25}:\s*/, '');
}

export function buildInterviewGuide(site: string, scenarios: readonly Scenario[], t: GuideText): string {
  const items = scenarios.filter((s) => s.category === 'interview');
  const url = site + GUIDE_PAGES.interview.path;
  const sections = GROUP_ORDER.map((key) => {
    const inGroup = items.filter((s) => interviewGroup(s.id) === key);
    if (inGroup.length === 0) return '';
    const cards = inGroup.map((s) => scenarioCard(s, t)).join('\n');
    return `<section id="${key}">\n<h2>${esc(t.groups[key])} <span class="n">${inGroup.length}</span></h2>\n${cards}\n</section>`;
  }).join('\n');
  const toc = GROUP_ORDER.filter((key) => items.some((s) => interviewGroup(s.id) === key))
    .map((key) => `<a href="#${key}">${esc(t.groups[key])}</a>`)
    .join('');
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: t.h1,
    description: t.description,
    url,
    inLanguage: ['vi', 'ko'],
    educationalLevel: 'TOPIK 3-4',
    isAccessibleForFree: true,
    provider: { '@type': 'Organization', name: 'KoDevTalk', url: site },
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="KoDevTalk">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(site)}/og.jpg">
<meta property="og:locale" content="vi_VN">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fdfbf7">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script type="application/ld+json">${jsonLd}</script>
<style>${CSS}</style>
</head>
<body>
<header class="top"><a class="brand" href="/" lang="ko">코데<b>톡</b><i></i></a><a class="btn" href="/">${esc(t.openApp)}</a></header>
<main>
<p class="kicker mono" lang="ko">// 면접 준비</p>
<h1>${esc(t.h1)}</h1>
<p class="lead">${esc(t.intro)}</p>
<p class="muted mono">${esc(t.count(items.length))}</p>
<nav class="toc">${toc}</nav>
${sections}
<aside class="cta"><h2>${esc(t.ctaTitle)}</h2><p>${esc(t.ctaText)}</p><a class="btn" href="/scenarios?cat=interview">${esc(t.practice)}</a></aside>
</main>
<footer><p>${esc(t.footer)}</p></footer>
</body>
</html>
`;
}

function scenarioCard(s: Scenario, t: GuideText): string {
  const turns = s.turns
    .map(
      (turn) => `<li>
<p class="label">${esc(t.question)}</p>
<p class="ko" lang="ko">${esc(turn.client)}</p>
<p class="hint"><span class="label">${esc(t.hint)}</span> ${esc(turn.hint)}</p>
<p class="label">${esc(t.answer)}</p>
<p class="ko answer" lang="ko">${esc(turn.modelAnswer)}</p>
<p class="vi">${esc(turn.modelAnswerVi)}</p>
</li>`,
    )
    .join('\n');
  return `<article class="card" id="${esc(s.id)}">
<h3>${esc(shortTitle(s.title))}</h3>
<p class="ko-title" lang="ko">${esc(s.titleKo)}</p>
<p class="desc">${esc(s.description)}</p>
<ol>${turns}</ol>
<a class="link" href="/scenarios/${encodeURIComponent(s.id)}">${esc(t.practice)} →</a>
</article>`;
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeXml(s: string): string {
  return esc(s).replace(/'/g, '&apos;');
}

// Same brand as the app (src/index.css): hanji off-white, flag blue, red cursor, mono kickers.
const CSS = `
:root{--bg:#fdfbf7;--card:#fff;--text:#1a1f2e;--muted:#5b6170;--line:#e6e1d8;--primary:#0047a0;--red:#cd2e3a;--soft:#eef3fb}
@media (prefers-color-scheme:dark){:root{--bg:#141824;--card:#1b2030;--text:#e8eaf0;--muted:#a3a9b8;--line:#2c3346;--primary:#7fb0ff;--soft:#1f2a42}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 "Pretendard","Noto Sans KR",system-ui,-apple-system,"Segoe UI",sans-serif}
.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--bg);position:sticky;top:0}
.brand{font-weight:900;font-size:22px;color:var(--text);text-decoration:none}.brand b{color:var(--primary)}
.brand i{display:inline-block;width:3px;height:20px;background:var(--red);margin-left:3px;vertical-align:-3px}
main{max-width:800px;margin:0 auto;padding:16px}
.kicker{color:var(--red);margin:16px 0 0;font-size:14px}
h1{font-size:28px;line-height:1.3;margin:4px 0 12px}
.lead{font-size:17px}
.muted{color:var(--muted);font-size:14px}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 8px}
.toc a{border:1px solid var(--line);border-radius:999px;padding:8px 14px;color:var(--text);text-decoration:none;background:var(--card);min-height:44px;display:inline-flex;align-items:center}
h2{font-size:21px;margin:32px 0 12px}h2 .n{font:14px ui-monospace,Menlo,monospace;color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:0 0 16px}
.card h3{margin:0;font-size:18px}
.ko-title{margin:2px 0 8px;color:var(--muted)}
.desc{margin:0 0 8px}
ol{padding-left:20px;margin:0}li{margin:0 0 16px}
.label{font:12px ui-monospace,Menlo,monospace;color:var(--muted);margin:8px 0 0;text-transform:uppercase;letter-spacing:.04em}
.hint .label{text-transform:none}
.ko{font-size:17px;margin:2px 0}
.answer{background:var(--soft);border-left:3px solid var(--primary);padding:8px 12px;border-radius:0 8px 8px 0}
.vi{color:var(--muted);margin:4px 0 0}
.hint{font-size:14px;color:var(--muted);margin:6px 0 0}
.link{color:var(--primary);font-weight:600;text-decoration:none;display:inline-block;padding:10px 0}
.btn{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:10px;background:var(--primary);color:#fff;text-decoration:none;font-weight:600}
@media (prefers-color-scheme:dark){.btn{color:#0b1220}}
.cta{border:1px solid var(--line);border-radius:14px;padding:16px;margin:32px 0;background:var(--card)}
.cta h2{margin-top:0}
footer{max-width:800px;margin:0 auto;padding:16px 16px 40px;color:var(--muted);font-size:14px}
`;
