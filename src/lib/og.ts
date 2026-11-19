/** File name of a page's Open Graph image: "/" → "home", "/projects/x/" → "projects-x". */
export const ogSlug = (pathname: string): string =>
  pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').replace(/\//g, '-') || 'home';
