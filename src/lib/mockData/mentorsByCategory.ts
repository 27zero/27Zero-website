// TEMP: mock data — swap en Etapa 6 (GROQ)
// `edtechMentor` agrupado por categoría (Essential / Investor / Founders), para la
// página EdTech Mentor. No reutiliza `edtechMentor.ts` (Home/About): ese mock es plano,
// sin categoría — acá la categorización es un dato nuevo que ese shape no tiene.
//
// El featured usa el MISMO objeto que el primer item de "essential" — no es un mock
// aparte, es la duplicación intencional del vanilla (el featured y la primera card de
// Essential muestran el mismo contenido). Se referencia el objeto, no se copia.
//
// Categorías con "Essencial" corregido a "Essential" en id/label — inconsistencia
// interna del propio vanilla (el `h2` de esa sección ya decía "Essential series" bien,
// solo el pill/anchor tenían el typo). Confirmado, no se replica el typo — a diferencia
// de "Performace Review" en EdTech Marketing, que sí era consistente en todas sus
// apariciones.

export interface MentorMock {
  href: string;
  tag: string;
  role: string;
  name: string;
  avatarInitials: string;
  title: string;
}

export interface MentorCategory {
  /** `id` del `.category-anchor` y `data-filter` del pill correspondiente. */
  id: string;
  /** Texto base del `h2` (Lora), sin la palabra de acento. */
  heading: string;
  /** Palabra final del `h2`, en `<span class="inter-accent">` (Inter). Siempre "Interviews" hoy. */
  headingAccent: string;
  subtext: string;
  items: MentorMock[];
}

/** Placeholder repetido en las 18 cards + el featured (19 instancias en total, igual que el vanilla). */
const JULIE_KELLEHER: MentorMock = {
  href: '#',
  tag: 'Tag',
  role: 'Founder At Kelleher Consulting Group',
  name: 'Julie Kelleher',
  avatarInitials: 'JK',
  title: "A Market-First Mindset in EdTech: Julie Kelleher's Blueprint for Success",
};

const buildItems = (): MentorMock[] => Array.from({ length: 6 }, () => ({ ...JULIE_KELLEHER }));

export const MENTORS_BY_CATEGORY: MentorCategory[] = [
  {
    id: 'essential',
    heading: 'Essential series',
    headingAccent: 'Interviews',
    subtext: 'Pearls of wisdom from seasoned EdTech Leaders.',
    items: buildItems(),
  },
  {
    id: 'investor',
    heading: 'Investor Series',
    headingAccent: 'Interviews',
    subtext: 'The Impact of Investment in EdTech, hosted by Phill Miller',
    items: buildItems(),
  },
  {
    id: 'founders',
    heading: 'Founders Series',
    headingAccent: 'Interviews',
    subtext: 'Conversations with EdTech founders about growth and impact.',
    items: buildItems(),
  },
];

/** El featured: mismo objeto que el primer item de "essential" — no un mock aparte. */
export const FEATURED_MENTOR: MentorMock = MENTORS_BY_CATEGORY[0].items[0];
