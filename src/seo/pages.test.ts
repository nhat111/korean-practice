import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { vi } from '../i18n/vi';
import { MESSAGE_TOPICS } from '../practice/decks';
import type { EmailExercise, MessageExercise, Scenario } from '../types';
import { buildEmailGuide, buildInterviewGuide, buildMessageGuide, buildRobots, buildSitemap, esc, GUIDE_PAGES, interviewGroup, shortTitle, SITEMAP_ROUTES } from './pages';
import { canonicalUrl, pageTitle } from './title';

const SITE = 'https://kodevtalk.nhatlab.com';
const load = <T,>(name: string) => (JSON.parse(readFileSync(`public/data/${name}`, 'utf8')) as { items: T[] }).items;
const scenarios = load<Scenario>('scenarios.json');
const emails = load<EmailExercise>('emails.json');
const messages = load<MessageExercise>('messages.json');

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

describe('email and message guides', () => {
  const emailHtml = buildEmailGuide(SITE, emails, vi.seo.emailGuide);
  const messageHtml = buildMessageGuide(SITE, messages, MESSAGE_TOPICS, { ...vi.seo.messageGuide, topics: vi.messages.topics });

  it('has one card per item, a self canonical and links into the app', () => {
    expect(emailHtml).toContain(`<link rel="canonical" href="${SITE}${GUIDE_PAGES.email.path}">`);
    expect(emailHtml.match(/<article class="card"/g)).toHaveLength(emails.length);
    for (const e of emails) expect(emailHtml).toContain(`href="/emails/${e.id}"`);
    expect(messageHtml).toContain(`<link rel="canonical" href="${SITE}${GUIDE_PAGES.messages.path}">`);
    expect(messageHtml.match(/<article class="card"/g)).toHaveLength(messages.length);
    for (const t of new Set(messages.map((m) => m.topic))) expect(messageHtml).toContain(`href="/messages?topic=${t}"`);
  });

  it('links every guide page to the others', () => {
    for (const html of [emailHtml, messageHtml, buildInterviewGuide(SITE, scenarios, vi.seo.interviewGuide)]) {
      const self = html.match(/rel="canonical" href="[^"]+(\/hoc\/[^"]+)"/)?.[1];
      for (const g of Object.values(GUIDE_PAGES)) if (g.path !== self) expect(html).toContain(`<a href="${g.path}">`);
    }
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
