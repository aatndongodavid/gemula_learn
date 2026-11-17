const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/** 1 234 567 (espaces fines) */
export const nombre = (x: number) => nf.format(Math.round(x || 0)).replace(/ /g, ' ');
export const decimal = (x: number) => nf1.format(x || 0).replace(/ /g, ' ');
export const fcfa = (x: number) => `${nombre(x)} FCFA`;
/** Montant en milliers, utilisé dans les tableaux du dossier */
export const milliers = (x: number) => nombre((x || 0) / 1000);
export const pct = (x: number, decimales = 0) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimales }).format(x || 0)} %`;
export const signe = (x: number) => (x > 0 ? '+' : '') + nombre(x);

const MOIS_COURTS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function decal(debut: string, m: number) {
  const [a, mo] = (debut || '').split('-').map(Number);
  if (!a || !mo) return null;
  const idx = mo - 1 + (m - 1);
  return { annee: a + Math.floor(idx / 12), mois: ((idx % 12) + 12) % 12 };
}

/** « Mars 27 » pour le mois m d'un projet démarrant en debut (AAAA-MM). */
export function libelleMois(debut: string, m: number): string {
  const d = decal(debut, m);
  return d ? `${MOIS_COURTS[d.mois]} ${String(d.annee).slice(2)}` : `M${m}`;
}
export function libelleMoisLong(debut: string, m: number): string {
  const d = decal(debut, m);
  return d ? `${MOIS_LONGS[d.mois]} ${d.annee}` : `mois ${m}`;
}
export function dateLongue(d = new Date()): string {
  return `${d.getDate()} ${MOIS_LONGS[d.getMonth()]} ${d.getFullYear()}`;
}

export const slug = (s: string) =>
  (s || 'projet').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'projet';
