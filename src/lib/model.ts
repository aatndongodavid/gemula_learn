// Modèle de données d'un projet Gemula Learn.
// Tous les montants sont en francs CFA (XAF), hors taxes quand la TVA est activée.
// Les mois sont numérotés à partir de 1 (mois de démarrage de l'activité).

export type Modele = 'vente' | 'mrr' | 'mrr_boitier';
export type ProfilCroissance = 'prudent' | 'regulier' | 'coups' | 'plateau' | 'perso';
export type Reponse = 'A' | 'B' | 'C';
export type RegimeFiscal = 'igs' | 'reel';

export interface Identite {
  projet: string;
  promoteur: string;
  secteur: string;
  localisation: string;
  formeJuridique: string;
  contact: string;
  /** Mois de démarrage, format AAAA-MM */
  debut: string;
}

export interface Canvas {
  probleme: string;
  segment: string;
  solution: string;
  valeur: string;
  canalPrincipal: string;
  canalSecondaire: string;
  prixHypothese: string;
  frequence: string;
  couts: string;
  metrique: string;
  objectif1Mois: string;
}

export interface Produit { id: string; nom: string; prix: number; coutUnitaire: number; quantiteM1: number; }
export interface CoutVariable { id: string; libelle: string; montant: number; }
export interface Equipement { id: string; libelle: string; quantite: number; prixUnitaire: number; dureeMois: number; moisAchat: number; }
export interface Poste { id: string; poste: string; effectif: number; salaireBrut: number; moisDebut: number; }
export interface ChargeFixe { id: string; libelle: string; montant: number; moisDebut: number; soumisTVA: boolean; }
export interface Concurrent { id: string; nom: string; positionPrix: string; pointFaible: string; }
export interface Cible { id: string; profil: string; nombreMois: number; frequence: string; }
export interface Risque { id: string; risque: string; probabilite: 1 | 2 | 3; impact: 1 | 2 | 3; parade: string; }
export interface Jalon { id: string; mois: number; jalon: string; indicateur: string; }

export interface Mrr { prix: number; coutVariable: number; abonnesInitiaux: number; nouveauxM1: number; churnPct: number; }
export interface Boitier {
  prix: number; coutVariable: number; ventesM1: number;
  prixAbonnement: number; coutVariableAbonnement: number; delaiMois: number; churnPct: number;
}

export interface Croissance {
  profil: ProfilCroissance;
  /** Taux mensuel en % pour le profil personnalisé */
  tauxPerso: number;
  /** Croissance annuelle des volumes en année 2 et 3, en % */
  an2Pct: number;
  an3Pct: number;
}

export interface Financement {
  apport: number;
  subvention: number;
  pretMontant: number;
  pretTauxAnnuelPct: number;
  pretDureeMois: number;
  pretDiffereMois: number;
}

export interface Fiscalite {
  active: boolean;
  tvaAssujetti: boolean;
  tauxTVA: number;
  regime: RegimeFiscal;
  tauxIGS: number;
  tauxIS: number;
  tauxMinimum: number;
  tauxCNPSPatronal: number;
  plafondCNPS: number;
}

export interface Scenario { volumePct: number; coutsPct: number; }

export type TypeChoc =
  | 'zeroVente' | 'perteClients' | 'hausseCouts' | 'nouvelleCharge' | 'moisDifficile'
  | 'recrutement' | 'panne' | 'commandeGroupe' | 'haussePrix' | 'retardEncaissement';

export interface ChocActif { type: TypeChoc; mois: number; valeur: number; duree: number; }

export interface Rapport {
  objectif: string;
  delaiLancement: string;
  contraintes: string;
  forces: string;
  faiblesses: string;
  opportunites: string;
  menaces: string;
}

export interface Projet {
  version: 2;
  id: string;
  majLe: string;
  identite: Identite;
  pretest: Partial<Record<number, Reponse>>;
  canvas: Canvas;
  modele: Modele;
  produits: Produit[];
  coutsVariables: CoutVariable[];
  mrr: Mrr;
  boitier: Boitier;
  equipements: Equipement[];
  personnel: Poste[];
  chargesFixes: ChargeFixe[];
  marketingMensuel: number;
  concurrents: Concurrent[];
  cibles: Cible[];
  croissance: Croissance;
  financement: Financement;
  fiscalite: Fiscalite;
  scenarios: { prudent: Scenario; ambitieux: Scenario };
  salaireCible: number;
  chocs: ChocActif[];
  rapport: Rapport;
  risques: Risque[];
  jalons: Jalon[];
}

export const uid = () => Math.random().toString(36).slice(2, 10);

function moisCourant(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Valeurs fiscales indicatives pour le Cameroun (2026). Elles se modifient dans l'outil
 * et doivent être vérifiées avec un expert-comptable avant tout engagement.
 */
export const FISCALITE_CAMEROUN: Fiscalite = {
  active: true,
  tvaAssujetti: false,
  tauxTVA: 19.25,
  regime: 'igs',
  tauxIGS: 5,
  tauxIS: 33,
  tauxMinimum: 2.2,
  tauxCNPSPatronal: 12.95,
  plafondCNPS: 750000
};

export function projetVide(): Projet {
  return {
    version: 2,
    id: uid(),
    majLe: new Date().toISOString(),
    identite: { projet: '', promoteur: '', secteur: '', localisation: '', formeJuridique: '', contact: '', debut: moisCourant() },
    pretest: {},
    canvas: {
      probleme: '', segment: '', solution: '', valeur: '', canalPrincipal: '', canalSecondaire: '',
      prixHypothese: '', frequence: '', couts: '', metrique: '', objectif1Mois: ''
    },
    modele: 'vente',
    produits: [{ id: uid(), nom: '', prix: 0, coutUnitaire: 0, quantiteM1: 0 }],
    coutsVariables: [],
    mrr: { prix: 0, coutVariable: 0, abonnesInitiaux: 0, nouveauxM1: 0, churnPct: 5 },
    boitier: { prix: 0, coutVariable: 0, ventesM1: 0, prixAbonnement: 0, coutVariableAbonnement: 0, delaiMois: 1, churnPct: 5 },
    equipements: [],
    personnel: [],
    chargesFixes: [
      { id: uid(), libelle: 'Loyer / local', montant: 0, moisDebut: 1, soumisTVA: false },
      { id: uid(), libelle: 'Électricité / eau', montant: 0, moisDebut: 1, soumisTVA: true },
      { id: uid(), libelle: 'Internet / téléphone', montant: 0, moisDebut: 1, soumisTVA: true },
      { id: uid(), libelle: 'Patente et taxes communales', montant: 0, moisDebut: 1, soumisTVA: false }
    ],
    marketingMensuel: 0,
    concurrents: [],
    cibles: [],
    croissance: { profil: 'regulier', tauxPerso: 8, an2Pct: 25, an3Pct: 15 },
    financement: { apport: 0, subvention: 0, pretMontant: 0, pretTauxAnnuelPct: 12, pretDureeMois: 24, pretDiffereMois: 3 },
    fiscalite: { ...FISCALITE_CAMEROUN },
    scenarios: { prudent: { volumePct: 60, coutsPct: 110 }, ambitieux: { volumePct: 140, coutsPct: 100 } },
    salaireCible: 0,
    chocs: [],
    rapport: { objectif: '', delaiLancement: '', contraintes: '', forces: '', faiblesses: '', opportunites: '', menaces: '' },
    risques: [],
    jalons: []
  };
}

/** Complète un projet importé ou ancien avec les champs manquants. */
export function normaliser(p: Partial<Projet>): Projet {
  const base = projetVide();
  const out = { ...base, ...p } as Projet;
  for (const k of ['identite', 'canvas', 'mrr', 'boitier', 'croissance', 'financement', 'fiscalite', 'rapport'] as const) {
    (out as any)[k] = { ...(base as any)[k], ...((p as any)[k] || {}) };
  }
  out.scenarios = {
    prudent: { ...base.scenarios.prudent, ...(p.scenarios?.prudent || {}) },
    ambitieux: { ...base.scenarios.ambitieux, ...(p.scenarios?.ambitieux || {}) }
  };
  for (const k of ['produits', 'coutsVariables', 'equipements', 'personnel', 'chargesFixes', 'concurrents', 'cibles', 'chocs', 'risques', 'jalons'] as const) {
    if (!Array.isArray(out[k])) (out as any)[k] = (base as any)[k];
  }
  out.version = 2;
  if (!out.id) out.id = uid();
  return out;
}

/** Convertit un export JSON de l'ancien outil (DATAIKOS LEARN) vers le format actuel. */
export function depuisAncienFormat(data: any): Projet | null {
  if (!data || (data.typeDocument !== 'DATAIKOS_PRETEST_PROJET' && data.typeDocument !== 'BPC')) return null;
  const lc = data.leanCanvas || {};
  const b = data.typeDocument === 'BPC' ? data : data.bpc || {};
  const p = projetVide();
  const id = b.identite || lc.identite || {};
  p.identite = { ...p.identite, projet: id.projet || '', promoteur: id.promoteur || '', secteur: id.secteur || '', localisation: id.localisation || '' };
  p.canvas = {
    ...p.canvas,
    probleme: lc.probleme || '', segment: lc.segmentCible || '', solution: lc.solution || '', valeur: lc.propositionValeur || '',
    canalPrincipal: lc.canalPrincipal || '', canalSecondaire: lc.canalSecondaire || '', prixHypothese: String(lc.prixVente || ''),
    frequence: lc.frequenceAchat || '', couts: lc.structureCouts || '', metrique: lc.metriqueSucces || '', objectif1Mois: lc.objectif1Mois || ''
  };
  const n = (v: any) => Number(v) || 0;
  if (Array.isArray(b.equipements)) p.equipements = b.equipements.map((e: any) => ({ id: uid(), libelle: e.nom || e.label || '', quantite: n(e.nombre || e.nb) || 1, prixUnitaire: n(e.valeur || e.val), dureeMois: n(e.dureeMois || e.duree) || 24, moisAchat: 1 }));
  if (Array.isArray(b.personnel)) p.personnel = b.personnel.map((e: any) => ({ id: uid(), poste: e.poste || e.label || '', effectif: n(e.nombre || e.nb) || 1, salaireBrut: n(e.salaireMensuel || e.sal), moisDebut: 1 }));
  if (Array.isArray(b.produits)) p.produits = b.produits.map((e: any) => ({ id: uid(), nom: e.nom || '', prix: n(e.prixVente || e.prix), coutUnitaire: 0, quantiteM1: n(e.quantiteMois || e.qte) }));
  if (Array.isArray(b.coutsVariables)) p.coutsVariables = b.coutsVariables.map((e: any) => ({ id: uid(), libelle: e.nom || e.label || '', montant: n(e.coutUnitaire || e.cout) }));
  if (data.profilPretest) { /* le détail des réponses n'était pas exporté */ }
  return p;
}
