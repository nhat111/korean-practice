import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { vi } from '../i18n/vi';
import type { Scenario } from '../types';
import { buildInterviewGuide, buildRobots, buildSitemap, esc, GUIDE_PAGES, interviewGroup, shortTitle, SITEMAP_ROUTES } from './pages';
import { canonicalUrl, pageTitle } from './title';

const SITE = 'https://kodevtalk.nhatlab.com';
const scenarios = (JSON.parse(readFileSync('public/data/scenarios.json', 'utf8')) as { items: Scenario[] }).items;

describe('robots and sitemap', () => {
  it('points robots.txt at the sitemap', () => {
    expect(buildRobots(SITE)).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it('lists absolute URLs with lastmod', () => {
    const xml = buildSitemap(SITE, ['/', '/scenarios'], '2026-10-20');
    expect(xml).toContain(`<loc>${SITE}/</loc>`);
    expect(xml).toContain(`<loc>${SITE}/scenarios</loc>`);
    expect(xml.match(/<lastmod>2026-10-20<\/lastmod>/g)).toHaveLength(2);
  });

  it('only lists routes that have a page title', () => {
    for (const r of SITEMAP_ROUTES) if (r !== '/') expect(vi.seo.titles[r], r).toBeTruthy();
  });
});

describe('interview guide', () => {
  const html = buildInterviewGuide(SITE, scenarios, vi.seo.interviewGuide);
  const interviews = scenarios.filter((s) => s.category === 'interview');

  it('has a self canonical and one card per interview scenario', () => {
    expect(html).toContain(`<link rel="canonical" href="${SITE}${GUIDE_PAGES.interview.path}">`);
    expect(html.match(/<article class="card"/g)).toHaveLength(interviews.length);
    for (const s of interviews) expect(html).toContain(`href="/scenarios/${s.id}"`);
  });

  it('puts the technical scenarios in their sections', () => {
    expect(interviewGroup('interview-nexacro-excel')).toBe('nexacro');
    expect(interviewGroup('interview-xplatform-migration')).toBe('nexacro');
    expect(interviewGroup('interview-springboot-basics')).toBe('java');
    expect(interviewGroup('interview-brse-role')).toBe('brse');
    expect(interviewGroup('interview-qa-bug-report')).toBe('qa');
    expect(interviewGroup('interview-self-intro')).toBe('general');
  });

  it('escapes content', () => {
    expect(esc('<b a="1">&')).toBe('&lt;b a=&quot;1&quot;&gt;&amp;');
    expect(html).not.toMatch(/<\/script>[^<]*<\/script>/);
  });

  it('shortens prefixed titles only', () => {
    expect(shortTitle('Phỏng vấn: kiến thức Java cơ bản')).toBe('kiến thức Java cơ bản');
    expect(shortTitle('Phỏng vấn BrSE: vai trò cầu nối')).toBe('vai trò cầu nối');
    expect(shortTitle('Không có tiền tố')).toBe('Không có tiền tố');
  });
});

describe('page title and canonical', () => {
  it('uses exact, section and default titles', () => {
    expect(pageTitle('/scenarios', vi.seo)).toBe(vi.seo.titles['/scenarios'] + vi.seo.titleSuffix);
    expect(pageTitle('/scenarios/interview-spring', vi.seo)).toBe(vi.seo.sectionTitles['/scenarios/'] + vi.seo.titleSuffix);
    expect(pageTitle('/', vi.seo)).toBe(vi.seo.defaultTitle);
  });

  it('always points at the production origin', () => {
    expect(canonicalUrl(SITE, '/grammar')).toBe(`${SITE}/grammar`);
    expect(canonicalUrl(SITE, '')).toBe(`${SITE}/`);
  });
});
