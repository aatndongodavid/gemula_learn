// Stockage local des projets. Rien ne quitte le navigateur.
// Plusieurs projets peuvent coexister : utile aux consultants et aux incubateurs.

import { useEffect, useState } from 'preact/hooks';
import { normaliser, projetVide, type Projet } from './model';

const CLE_PROJETS = 'gemula-learn:projets:v2';
const CLE_ACTIF = 'gemula-learn:actif';

interface Etat { projets: Record<string, Projet>; actif: string; }

const ecouteurs = new Set<() => void>();
let etat: Etat | null = null;
let minuterie: ReturnType<typeof setTimeout> | undefined;

function lire(): Etat {
  let projets: Record<string, Projet> = {};
  let actif = '';
  try {
    const brut = localStorage.getItem(CLE_PROJETS);
    if (brut) {
      const data = JSON.parse(brut) as Record<string, Partial<Projet>>;
      for (const [id, p] of Object.entries(data)) projets[id] = normaliser({ ...p, id });
    }
    actif = localStorage.getItem(CLE_ACTIF) || '';
  } catch { /* stockage indisponible : on travaille en mémoire */ }
  if (!projets[actif]) {
    const ids = Object.keys(projets).sort((a, b) => projets[b].majLe.localeCompare(projets[a].majLe));
    if (ids.length) actif = ids[0];
    else { const p = projetVide(); projets = { [p.id]: p }; actif = p.id; }
  }
  return { projets, actif };
}

function courant(): Etat {
  if (!etat) etat = typeof window === 'undefined' ? (() => { const p = projetVide(); return { projets: { [p.id]: p }, actif: p.id }; })() : lire();
  return etat;
}

function sauver() {
  clearTimeout(minuterie);
  minuterie = setTimeout(() => {
    try {
      localStorage.setItem(CLE_PROJETS, JSON.stringify(courant().projets));
      localStorage.setItem(CLE_ACTIF, courant().actif);
    } catch { /* quota dépassé ou stockage bloqué */ }
  }, 250);
}

function notifier() { ecouteurs.forEach((f) => f()); }

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CLE_PROJETS || e.key === CLE_ACTIF) { etat = lire(); notifier(); }
  });
  window.addEventListener('beforeunload', () => {
    try {
      localStorage.setItem(CLE_PROJETS, JSON.stringify(courant().projets));
      localStorage.setItem(CLE_ACTIF, courant().actif);
    } catch { /* rien */ }
  });
}

export function projetActif(): Projet { const e = courant(); return e.projets[e.actif]; }
export function listeProjets(): Projet[] {
  return Object.values(courant().projets).sort((a, b) => b.majLe.localeCompare(a.majLe));
}

/** Modifie le projet actif. La fonction reçoit une copie qu'elle peut muter. */
export function modifier(fn: (p: Projet) => void) {
  const e = courant();
  const copie = structuredClone(e.projets[e.actif]);
  fn(copie);
  copie.majLe = new Date().toISOString();
  etat = { ...e, projets: { ...e.projets, [e.actif]: copie } };
  sauver();
  notifier();
}

export function remplacer(p: Projet) {
  const e = courant();
  const n = normaliser({ ...p, id: e.actif, majLe: new Date().toISOString() });
  etat = { ...e, projets: { ...e.projets, [e.actif]: n } };
  sauver();
  notifier();
}

export function nouveauProjet(p: Projet = projetVide()) {
  const e = courant();
  const n = normaliser({ ...p, majLe: new Date().toISOString() });
  etat = { projets: { ...e.projets, [n.id]: n }, actif: n.id };
  sauver();
  notifier();
}

export function activer(id: string) {
  const e = courant();
  if (!e.projets[id]) return;
  etat = { ...e, actif: id };
  sauver();
  notifier();
}

export function dupliquer() {
  const p = structuredClone(projetActif());
  p.id = Math.random().toString(36).slice(2, 10);
  p.identite.projet = `${p.identite.projet || 'Projet'} (copie)`;
  nouveauProjet(p);
}

export function supprimer(id: string) {
  const e = courant();
  const projets = { ...e.projets };
  delete projets[id];
  if (!Object.keys(projets).length) { const p = projetVide(); projets[p.id] = p; }
  const actif = projets[e.actif] ? e.actif : Object.keys(projets)[0];
  etat = { projets, actif };
  sauver();
  notifier();
}

/** Abonne un composant au projet actif. Le premier rendu côté client relit le stockage. */
export function useProjet(): Projet {
  const [, setV] = useState(0);
  useEffect(() => {
    const f = () => setV((v) => v + 1);
    ecouteurs.add(f);
    f();
    return () => { ecouteurs.delete(f); };
  }, []);
  return projetActif();
}

export function useListe(): { projets: Projet[]; actif: string } {
  useProjet();
  return { projets: listeProjets(), actif: courant().actif };
}
