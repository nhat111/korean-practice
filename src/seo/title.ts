// Document title and canonical URL for an app route. Pure; Layout applies them.

export interface TitleText {
  defaultTitle: string;
  titleSuffix: string;
  titles: Record<string, string>;
  sectionTitles: Record<string, string>;
}

export function pageTitle(pathname: string, t: TitleText): string {
  const exact = t.titles[pathname];
  if (exact) return exact + t.titleSuffix;
  const section = Object.keys(t.sectionTitles).find((p) => pathname.startsWith(p));
  return section ? t.sectionTitles[section] + t.titleSuffix : t.defaultTitle;
}

/** Always the production origin, so copies on other hosts (kodevtalk.vercel.app) point search engines here. */
export function canonicalUrl(site: string, pathname: string): string {
  return site + (pathname === '' ? '/' : pathname);
}
