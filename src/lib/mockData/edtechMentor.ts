// TEMP: mock data — swap en Etapa 6 (GROQ)
// `edtechMentor` compartido entre Home y About: la sección "The EdTech Mentor" es
// duplicado exacto entre ambas páginas (mismo featured + mismos 6 del slider, ver
// design-system-home.md § The EdTech Mentor y design-system-about.md § The EdTech
// Mentor), así que el mock vive acá una sola vez en vez de repetirse por página.
//
// Mismo shape que consumen `FeaturedCard` y `EdtechMentorCard` (Etapa 3) — todavía
// sin acoplar al schema real de Sanity.

export interface MentorPostMock {
  href: string;
  tag: string;
  role: string;
  name: string;
  avatarInitials: string;
  title: string;
}

/** El único con `isFeatured: true` — el que renderiza la `FeaturedCard`. */
export const FEATURED_MENTOR_POST: MentorPostMock = {
  href: '#',
  tag: 'Tag',
  role: 'Founder At Kelleher Consulting Group',
  name: 'Julie Kelleher',
  avatarInitials: 'JK',
  title: "A Market-First Mindset in EdTech: Julie Kelleher's Blueprint for Success",
};

/** Los 6 del slider. En el vanilla repiten el mismo contenido que el featured. */
export const MENTOR_POSTS: MentorPostMock[] = Array.from({ length: 6 }, () => ({ ...FEATURED_MENTOR_POST }));
