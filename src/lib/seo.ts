/**
 * Structured data (schema.org JSON-LD) for search engines. Every page gets one @graph with:
 * - the WebSite and the Person (Rakibul) it is about, with his job, employer, school, skills,
 *   certificates and profiles elsewhere, so Google can tie them into one entity,
 * - a ProfilePage on Home and About,
 * - breadcrumbs on every page below Home,
 * - plus anything page-specific (a project, a gallery) passed in by the page.
 * Facts come only from src/content/site.json.
 */
import site from '../content/site.json';

/** Names shown in breadcrumbs for each top-level section. */
const SECTION: Record<string, string> = {
  about: 'About',
  projects: 'Projects',
  writing: 'Blog',
  certificates: 'Certificates',
  cv: 'CV',
  qa: 'QA report',
  activity: 'Activity',
  gallery: 'Gallery',
};

/** Topics Rakibul works on, for `knowsAbout` (also the site's keyword set). */
export const TOPICS = [
  'Software quality assurance',
  'Test automation',
  'Playwright',
  'TypeScript',
  'JavaScript',
  'End-to-end testing',
  'API testing',
  'Regression testing',
  'Cross-browser testing',
  'Performance testing',
  'Apache JMeter',
  'Postman',
  'CI/CD',
  'GitHub Actions',
  'Docker',
  'WordPress plugin testing',
  'WooCommerce',
];

export function graph(opts: { origin: string; path: string; title: string; description: string; extra?: object[] }) {
  const { origin, path, title, description, extra = [] } = opts;
  const url = (p: string) => new URL(p, origin).href;
  const personId = url('/#person');
  const websiteId = url('/#website');
  const job = site.experience[0]!;
  const edu = site.education[0]!;

  const person = {
    '@type': 'Person',
    '@id': personId,
    name: site.name,
    alternateName: ['Md. Rakibul Islam', 'Rakib'],
    givenName: site.firstName,
    familyName: 'Islam',
    jobTitle: site.role,
    description: site.summary,
    url: url('/'),
    image: url('/portrait/photo.webp'),
    email: `mailto:${site.email}`,
    telephone: site.phone,
    address: { '@type': 'PostalAddress', addressLocality: 'Dhaka', addressCountry: 'BD' },
    worksFor: { '@type': 'Organization', name: job.company, url: 'https://wppool.dev/' },
    hasOccupation: {
      '@type': 'Occupation',
      name: 'QA Automation Engineer',
      occupationLocation: { '@type': 'Country', name: 'Bangladesh' },
      skills: site.skills.map((s) => s.name).join(', '),
    },
    alumniOf: { '@type': 'CollegeOrUniversity', name: edu.school, url: 'https://www.bubt.edu.bd/' },
    knowsAbout: TOPICS,
    knowsLanguage: site.languages.map((l) => l.name),
    hasCredential: site.certifications.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c.title,
      credentialCategory: 'certificate',
      recognizedBy: { '@type': 'Organization', name: c.issuer },
      dateCreated: c.date,
      ...(c.verify ? { url: c.verify } : {}),
    })),
    sameAs: [site.links.linkedin, site.links.github, site.links.medium, site.links.wordpress],
  };

  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    url: url('/'),
    name: `${site.name} · ${site.role}`,
    alternateName: 'Rakibul Islam portfolio',
    inLanguage: 'en',
    publisher: { '@id': personId },
  };

  const page: Record<string, unknown> = {
    '@type': path === '/' || path === '/about/' ? 'ProfilePage' : 'WebPage',
    '@id': url(path),
    url: url(path),
    name: title,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': websiteId },
    about: { '@id': personId },
    ...(path === '/' || path === '/about/' ? { mainEntity: { '@id': personId } } : {}),
  };

  // Breadcrumbs: Home › Section › Page.
  const parts = path.split('/').filter(Boolean);
  const nodes: object[] = [website, person, page];
  if (parts.length) {
    const items = [{ name: 'Home', item: url('/') }];
    if (SECTION[parts[0]!]) items.push({ name: SECTION[parts[0]!]!, item: url(`/${parts[0]}/`) });
    if (parts.length > 1) items.push({ name: title.split(' | ')[0]!, item: url(path) });
    page.breadcrumb = { '@id': url(`${path}#breadcrumb`) };
    nodes.push({
      '@type': 'BreadcrumbList',
      '@id': url(`${path}#breadcrumb`),
      itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.item })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': [...nodes, ...extra] };
}
