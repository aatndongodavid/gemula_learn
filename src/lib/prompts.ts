// Master Prompts : consignes prêtes à copier dans un assistant IA, préremplies avec les données du projet.

import type { Projet } from './model';
import { calculer, sensibilite } from './engine';
import { fcfa, pct } from './format';

const v = (s: string | number | undefined) => (s === undefined || s === '' || s === 0 ? 'non renseigné' : String(s));
const modeleTxt = { vente: 'vente unique', mrr: 'abonnement mensuel', mrr_boitier: 'boîtier + abonnement mensuel' };

export interface MasterPrompt { cle: string; titre: string; module: string; texte: (p: Projet) => string }

const ctx = (p: Projet) => {
  const i = p.identite;
  return `Projet : ${v(i.projet)}, secteur ${v(i.secteur)}, à ${v(i.localisation) === 'non renseigné' ? 'Douala (Cameroun)' : i.localisation}. Modèle économique : ${modeleTxt[p.modele]}.`;
};

export const PROMPTS: MasterPrompt[] = [
  {
    cle: 'probleme', titre: 'Problème et segment', module: 'canvas',
    texte: (p) => `Tu es un consultant en entrepreneuriat qui connaît le marché camerounais.\n${ctx(p)}\nProblème perçu : ${v(p.canvas.probleme)}\nSegment cible : ${v(p.canvas.segment)}\n\nPropose 5 formulations plus précises du problème réel, chacune associée à un segment ultra-précis (lieu, âge, revenu, situation). Classe les 3 meilleures combinaisons selon le potentiel de marché et la facilité d’accès, et indique pour chacune une question à poser à 10 clients pour la valider.`
  },
  {
    cle: 'solution', titre: 'Solution et proposition de valeur', module: 'canvas',
    texte: (p) => `Tu es un conseiller en développement produit.\n${ctx(p)}\nProblème : ${v(p.canvas.probleme)}\nSegment : ${v(p.canvas.segment)}\nSolution envisagée : ${v(p.canvas.solution)}\nProposition de valeur : ${v(p.canvas.valeur)}\n\nPropose 5 variantes de solution réalisables avec peu de moyens. Pour chacune, écris une proposition de valeur différenciante en une phrase et la version minimale testable en 30 jours. Recommande la meilleure.`
  },
  {
    cle: 'canaux', titre: 'Canaux de distribution', module: 'canvas',
    texte: (p) => `Tu es un expert en distribution en Afrique centrale.\n${ctx(p)}\nSolution : ${v(p.canvas.solution)}\nSegment : ${v(p.canvas.segment)}\nCanal principal : ${v(p.canvas.canalPrincipal)} ; canal secondaire : ${v(p.canvas.canalSecondaire)}\n\nListe 5 canaux adaptés avec, pour chacun, le coût de mise en place en FCFA, le délai avant les premières ventes et la compétence requise. Recommande les 2 meilleurs et un plan d’action sur 4 semaines.`
  },
  {
    cle: 'prix', titre: 'Stratégie de prix', module: 'canvas',
    texte: (p) => `Tu es un analyste en stratégie de prix.\n${ctx(p)}\nPrix envisagé : ${v(p.canvas.prixHypothese)} ; fréquence d’achat : ${v(p.canvas.frequence)}\nSegment : ${v(p.canvas.segment)}\n\nVérifie la cohérence de ce prix avec le pouvoir d’achat du segment et les prix des concurrents. Propose 3 niveaux de prix (bas, moyen, premium) avec le volume nécessaire pour être rentable, puis recommande le plus réaliste.`
  },
  {
    cle: 'couts', titre: 'Structure de coûts', module: 'canvas',
    texte: (p) => `Tu es un expert-comptable au Cameroun.\n${ctx(p)}\nCoûts déjà identifiés : ${v(p.canvas.couts)}\n\nListe de façon exhaustive les coûts variables et fixes typiques de cette activité avec une fourchette réaliste en FCFA, les équipements de départ et leur durée d’amortissement. Signale les 3 postes que les débutants sous-estiment le plus (y compris CNPS, patente, impôt).`
  },
  {
    cle: 'concurrents', titre: 'Analyse concurrentielle', module: 'bpc',
    texte: (p) => `Tu es un analyste de marché.\n${ctx(p)}\nSolution : ${v(p.canvas.solution)}\nConcurrents déjà identifiés : ${p.concurrents.map((c) => `${c.nom} (${c.positionPrix}, faiblesse : ${c.pointFaible})`).join(' ; ') || 'aucun'}\n\nIdentifie les acteurs formels et informels qui répondent déjà à ce besoin, leur positionnement prix et leurs faiblesses. Propose un positionnement différenciant et une matrice SWOT du projet.`
  },
  {
    cle: 'hypotheses', titre: 'Critique des hypothèses chiffrées', module: 'simulateur',
    texte: (p) => {
      const r = calculer(p);
      const [a1, a2, a3] = r.annees;
      const s = sensibilite(p);
      return `Tu es un analyste crédit d’une banque camerounaise.\n${ctx(p)}\nRésultats du modèle (scénario de base) :\n- Chiffre d’affaires : ${fcfa(a1.ca)} (an 1), ${fcfa(a2.ca)} (an 2), ${fcfa(a3.ca)} (an 3)\n- Résultat net : ${fcfa(a1.resultatNet)} (an 1), ${fcfa(a2.resultatNet)} (an 2), ${fcfa(a3.resultatNet)} (an 3)\n- Taux de marge sur coûts variables : ${pct(r.indicateurs.tauxMargeVariable * 100)}\n- Besoin de trésorerie maximal : ${fcfa(r.indicateurs.besoinFinancement)}\n- Hypothèse la plus sensible : ${s.lignes[0]?.hypothese}\n\nIdentifie les 5 hypothèses les plus fragiles, explique pourquoi un comité de crédit les contesterait, et propose comment les prouver (devis, lettres d’intention, prévente, enquête).`;
    }
  },
  {
    cle: 'croissance', titre: 'Choix du scénario de croissance', module: 'simulateur',
    texte: (p) => `Tu es un conseiller en stratégie de croissance.\n${ctx(p)}\nSegment : ${v(p.canvas.segment)} ; canal : ${v(p.canvas.canalPrincipal)}\n\nParmi ces profils (démarrage prudent 5 %/mois, croissance régulière 10 %/mois, croissance par à-coups, plateau stable), recommande le plus réaliste pour ce projet et justifie. Indique les 2 facteurs qui feraient passer d’un scénario à l’autre et les indicateurs à suivre chaque mois.`
  },
  {
    cle: 'risques', titre: 'Risques et parades', module: 'strategie',
    texte: (p) => `Tu es un consultant en gestion des risques.\n${ctx(p)}\nForces : ${v(p.rapport.forces)}\nFaiblesses : ${v(p.rapport.faiblesses)}\nMenaces : ${v(p.rapport.menaces)}\nRisques déjà identifiés : ${p.risques.map((r) => r.risque).join(' ; ') || 'aucun'}\n\nÉtablis une matrice des 8 principaux risques (opérationnels, financiers, juridiques, marché) avec probabilité (1 à 3), impact (1 à 3) et une parade concrète et peu coûteuse pour chacun.`
  },
  {
    cle: 'redaction', titre: 'Rédaction du dossier', module: 'dossier',
    texte: (p) => {
      const r = calculer(p);
      return `Tu es un consultant senior chargé de rédiger un dossier de financement professionnel.\nDonnées du projet :\n${JSON.stringify({ identite: p.identite, canvas: p.canvas, rapport: p.rapport, annees: r.annees.map((a) => ({ annee: a.annee, ca: Math.round(a.ca), resultatNet: Math.round(a.resultatNet), tresorerieFin: Math.round(a.tresorerieFin) })), besoinFinancement: Math.round(r.indicateurs.besoinFinancement), financement: p.financement }, null, 2)}\n\nRédige une présentation du projet en 1 page pour un banquier : le problème, la solution, le marché, le modèle économique, les chiffres clés et la demande de financement. Ton sobre, phrases courtes, aucun superlatif. Termine par 3 forces et 2 points de vigilance.`;
    }
  }
];

export const prompt = (cle: string) => PROMPTS.find((x) => x.cle === cle)!;

export function tousLesPrompts(p: Projet): string {
  return PROMPTS.map((x) => `### ${x.titre}\n\n${x.texte(p)}`).join('\n\n---\n\n');
}
