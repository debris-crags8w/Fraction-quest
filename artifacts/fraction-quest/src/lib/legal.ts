/* The privacy and terms pages (public/privacy.html, public/terms.html): plain pages anyone can open, the app stores
   included, without signing in. */
export const legalUrl = (page: 'privacy' | 'terms') => `${import.meta.env?.BASE_URL ?? '/'}${page}.html`;
