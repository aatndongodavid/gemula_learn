// Moteur de calcul financier de Gemula Learn.
// Fonctions pures : un projet en entrée, des séries mensuelles et des indicateurs en sortie.
// Aucune dépendance à l'interface, ce qui permet de tester chaque règle.

import type { ChocActif, Projet, Scenario } from './model';

export const HORIZON = 36;

export type NomScenario = 'prudent' | 'base' | 'ambitieux';

export interface Mois {
  m: number;
  /** Unités vendues (vente), abonnés actifs (mrr) ou boîtiers vendus (mrr_boitier) */
  volume: number;
  nouveaux: number;
  abonnes: number;
  ca: number;
  coutsVariables: number;
  margeBrute: number;
  chargesFixes: number;
  marketing: number;
  salaires: number;
  cnps: number;
  ebe: number;
  amortissements: number;
  interets: number;
  chargesExceptionnelles: number;
  resultatAvantImpot: number;
  impot: number;
  resultatNet: number;
  // Trésorerie
  encaissementsClients: number;
  tvaCollectee: number;
  tvaDeductible: number;
  tvaPayee: number;
  investissements: number;
  apports: number;
  emprunt: number;
  remboursementCapital: number;
  fluxExploitation: number;
  fluxNet: number;
  /** Flux net sans apports, subvention ni prêt : sert au besoin de financement */
  fluxSansFinancement: number;
  tresorerie: number;
  cumulSansFinancement: number;
}

export interface Annee {
  annee: number;
  ca: number;
  coutsVariables: number;
  margeBrute: number;
  chargesFixes: number;
  personnel: number;
  ebe: number;
  amortissements: number;
  interets: number;
  impot: number;
  resultatNet: number;
  caf: number;
  annuites: number;
  tresorerieFin: number;
}

export interface Indicateurs {
  besoinFinancement: number;
  moisCreux: number | null;
  financementTotal: number;
  couvertureBesoin: number | null;
  ruptureTresorerie: number | null;
  premierMoisRentable: number | null;
  moisRetourInvestissement: number | null;
  tauxMargeVariable: number;
  seuilRentabiliteAnnuel: number | null;
  pointMortJours: number | null;
  dscrAn1: number | null;
  autofinancementPct: number | null;
  moisSalaireCible: number | null;
  ltv: number | null;
  cac: number | null;
  ltvSurCac: number | null;
  paybackCacMois: number | null;
  investissementInitial: number;
}

export interface Resultat {
  mois: Mois[];
  annees: Annee[];
  indicateurs: Indicateurs;
}

const r0 = (x: number) => (Number.isFinite(x) ? x : 0);

/** Multiplicateur de volume au mois m (1 au mois 1). */
export function facteurCroissance(p: Projet, m: number): number {
  const c = p.croissance;
  const coups = [1, 1.25, 1.05, 1.3, 1.1, 1.35, 1.15, 1.4, 1.2, 1.45, 1.25, 1.5];
  const taux = { prudent: 0.05, regulier: 0.1, plateau: 0, perso: (c.tauxPerso || 0) / 100, coups: 0 }[c.profil] ?? 0;
  const an1 = (k: number) => (c.profil === 'coups' ? coups[Math.min(k, 12) - 1] : Math.pow(1 + taux, k - 1));
  if (m <= 12) return an1(m);
  const base12 = an1(12);
  const r2 = Math.pow(1 + (c.an2Pct || 0) / 100, 1 / 12) - 1;
  const r3 = Math.pow(1 + (c.an3Pct || 0) / 100, 1 / 12) - 1;
  if (m <= 24) return base12 * Math.pow(1 + r2, m - 12);
  return base12 * Math.pow(1 + r2, 12) * Math.pow(1 + r3, m - 24);
}

/** Échéancier d'un prêt : différé en intérêts seuls, puis annuités constantes. Débloqué au mois 1. */
export function echeancierPret(montant: number, tauxAnnuelPct: number, dureeMois: number, differeMois: number) {
  const lignes: { m: number; interets: number; capital: number; restant: number }[] = [];
  if (montant <= 0 || dureeMois <= 0) return lignes;
  const i = tauxAnnuelPct / 100 / 12;
  const n = Math.max(1, dureeMois - differeMois);
  const annuite = i > 0 ? (montant * i) / (1 - Math.pow(1 + i, -n)) : montant / n;
  let restant = montant;
  for (let m = 1; m <= dureeMois; m++) {
    const interets = restant * i;
    let capital = m <= differeMois ? 0 : annuite - interets;
    if (m === dureeMois) capital = restant;
    restant -= capital;
    lignes.push({ m, interets, capital, restant: Math.max(0, restant) });
  }
  return lignes;
}

interface Effets {
  volume: number;
  prix: number;
  couts: number;
  fixeSup: number;
  salaireSup: number;
  exceptionnel: number;
  unitesSup: number;
  perteAbonnes: number;
  retard: boolean;
}

function effetsChocs(chocs: ChocActif[], m: number): Effets {
  const e: Effets = { volume: 1, prix: 1, couts: 1, fixeSup: 0, salaireSup: 0, exceptionnel: 0, unitesSup: 0, perteAbonnes: 0, retard: false };
  for (const c of chocs) {
    const dans = m >= c.mois && m < c.mois + Math.max(1, c.duree);
    const depuis = m >= c.mois;
    switch (c.type) {
      case 'zeroVente': if (dans) e.volume *= 0; break;
      case 'moisDifficile': if (dans) e.volume *= 1 - c.valeur / 100; break;
      case 'perteClients':
        if (dans) e.volume *= 1 - c.valeur / 100;
        if (m === c.mois) e.perteAbonnes = Math.max(e.perteAbonnes, c.valeur / 100);
        break;
      case 'hausseCouts': if (depuis) e.couts *= 1 + c.valeur / 100; break;
      case 'nouvelleCharge': if (depuis) e.fixeSup += c.valeur; break;
      case 'recrutement': if (depuis) e.salaireSup += c.valeur; break;
      case 'panne': if (m === c.mois) e.exceptionnel += c.valeur; break;
      case 'commandeGroupe': if (dans) e.unitesSup += c.valeur; break;
      case 'haussePrix': if (depuis) e.prix *= 1 + c.valeur / 100; break;
      case 'retardEncaissement': if (dans) e.retard = true; break;
    }
  }
  return e;
}

export interface OptionsCalcul {
  scenario?: NomScenario;
  chocs?: ChocActif[];
  /** Variation relative appliquée pour l'analyse de sensibilité */
  ajustements?: { prix?: number; volume?: number; couts?: number; fixes?: number };
}

export function calculer(p: Projet, opts: OptionsCalcul = {}): Resultat {
  const sc: Scenario =
    opts.scenario === 'prudent' ? p.scenarios.prudent : opts.scenario === 'ambitieux' ? p.scenarios.ambitieux : { volumePct: 100, coutsPct: 100 };
  const aj = { prix: 1, volume: 1, couts: 1, fixes: 1, ...opts.ajustements };
  const kVol = (sc.volumePct / 100) * aj.volume;
  const kCout = (sc.coutsPct / 100) * aj.couts;
  const chocs = opts.chocs || [];
  const f = p.fiscalite;
  const fiscal = f.active;
  const tva = fiscal && f.tvaAssujetti ? f.tauxTVA / 100 : 0;
  const pret = echeancierPret(p.financement.pretMontant, p.financement.pretTauxAnnuelPct, p.financement.pretDureeMois, p.financement.pretDiffereMois);

  const cvCommun = p.coutsVariables.reduce((s, c) => s + r0(c.montant), 0);
  const produits = p.produits.filter((x) => x.quantiteM1 > 0 || x.prix > 0);
  const qteM1Tot = produits.reduce((s, x) => s + r0(x.quantiteM1), 0);
  // Prix et coût moyens pondérés : servent aux unités ajoutées par une commande de groupe
  const prixMoyen = qteM1Tot > 0 ? produits.reduce((s, x) => s + x.prix * x.quantiteM1, 0) / qteM1Tot : produits[0]?.prix || 0;
  const cuMoyen = qteM1Tot > 0 ? produits.reduce((s, x) => s + x.coutUnitaire * x.quantiteM1, 0) / qteM1Tot : produits[0]?.coutUnitaire || 0;

  const mois: Mois[] = [];
  let abonnes = p.modele === 'mrr' ? r0(p.mrr.abonnesInitiaux) : 0;
  const ventesBoitier: number[] = [];
  let tresorerie = 0;
  let cumulSansFin = 0;
  let creditTVA = 0;
  let tvaDue = 0;
  let caReporte = 0;
  let acomptesAnnee = 0;
  let resultatAnnee = 0;
  let deficitReportable = 0;

  for (let m = 1; m <= HORIZON; m++) {
    const e = effetsChocs(chocs, m);
    const g = facteurCroissance(p, m) * kVol;
    let volume = 0, nouveaux = 0, ca = 0, cv = 0;

    if (p.modele === 'vente') {
      for (const x of produits) {
        const q = Math.round(x.quantiteM1 * g * e.volume);
        volume += q;
        ca += q * x.prix * e.prix * aj.prix;
        cv += q * (x.coutUnitaire + cvCommun) * kCout * e.couts;
      }
      if (e.unitesSup > 0) {
        volume += e.unitesSup;
        ca += e.unitesSup * prixMoyen * e.prix * aj.prix;
        cv += e.unitesSup * (cuMoyen + cvCommun) * kCout * e.couts;
      }
    } else if (p.modele === 'mrr') {
      const churn = Math.min(1, Math.max(0, p.mrr.churnPct / 100));
      nouveaux = p.mrr.nouveauxM1 * g * e.volume + e.unitesSup;
      abonnes = (m === 1 ? abonnes : abonnes * (1 - churn)) * (1 - e.perteAbonnes) + nouveaux;
      volume = abonnes;
      // Un mois sans activité suspend aussi la facturation des abonnés
      const facturation = e.volume === 0 ? 0 : 1;
      ca = abonnes * p.mrr.prix * e.prix * aj.prix * facturation;
      cv = abonnes * (p.mrr.coutVariable + cvCommun) * kCout * e.couts;
    } else {
      const b = p.boitier;
      const churn = Math.min(1, Math.max(0, b.churnPct / 100));
      const boitiers = Math.round(b.ventesM1 * g * e.volume) + e.unitesSup;
      ventesBoitier.push(boitiers);
      const idx = m - 1 - Math.max(0, Math.round(b.delaiMois));
      nouveaux = idx >= 0 ? ventesBoitier[idx] : 0;
      abonnes = (m === 1 ? 0 : abonnes * (1 - churn)) * (1 - e.perteAbonnes) + nouveaux;
      volume = boitiers;
      const facturation = e.volume === 0 ? 0 : 1;
      ca = (boitiers * b.prix + abonnes * b.prixAbonnement * facturation) * e.prix * aj.prix;
      cv = (boitiers * (b.coutVariable + cvCommun) + abonnes * b.coutVariableAbonnement) * kCout * e.couts;
    }

    const chargesFixes = p.chargesFixes.reduce((s, c) => s + (m >= (c.moisDebut || 1) ? r0(c.montant) : 0), 0) * aj.fixes + e.fixeSup;
    const fixesTVA = p.chargesFixes.reduce((s, c) => s + (m >= (c.moisDebut || 1) && c.soumisTVA ? r0(c.montant) : 0), 0) * aj.fixes;
    const marketing = r0(p.marketingMensuel);
    const masse = p.personnel.map((x) => ({ brut: m >= (x.moisDebut || 1) ? r0(x.effectif) * r0(x.salaireBrut) : 0, unit: x.salaireBrut, eff: m >= (x.moisDebut || 1) ? r0(x.effectif) : 0 }));
    const salaires = masse.reduce((s, x) => s + x.brut, 0) + e.salaireSup;
    const cnps = fiscal
      ? (masse.reduce((s, x) => s + x.eff * Math.min(x.unit, f.plafondCNPS), 0) + Math.min(e.salaireSup, f.plafondCNPS)) * (f.tauxCNPSPatronal / 100)
      : 0;
    const amortissements = p.equipements.reduce((s, x) => {
      const debut = x.moisAchat || 1;
      const duree = Math.max(1, x.dureeMois || 1);
      return s + (m >= debut && m < debut + duree ? (x.quantite * x.prixUnitaire) / duree : 0);
    }, 0);
    const investissements = p.equipements.reduce((s, x) => s + ((x.moisAchat || 1) === m ? x.quantite * x.prixUnitaire : 0), 0);
    const echeance = pret[m - 1];
    const interets = echeance?.interets || 0;
    const remboursementCapital = echeance?.capital || 0;

    const margeBrute = ca - cv;
    const ebe = margeBrute - chargesFixes - marketing - salaires - cnps;
    const resultatAvantImpot = ebe - amortissements - interets - e.exceptionnel;

    // Impôt
    let impot = 0;
    if (fiscal) {
      if (f.regime === 'igs') {
        impot = (ca * f.tauxIGS) / 100;
      } else {
        const acompte = (ca * f.tauxMinimum) / 100;
        acomptesAnnee += acompte;
        impot = acompte;
        resultatAnnee += resultatAvantImpot;
        if (m % 12 === 0) {
          // Clôture d'exercice : l'impôt sur les sociétés est le plus élevé de l'IS et du minimum déjà versé
          let base = resultatAnnee;
          if (base > 0) {
            const imputable = Math.min(base, deficitReportable);
            base -= imputable;
            deficitReportable -= imputable;
          } else {
            deficitReportable += -base;
            base = 0;
          }
          const is = (base * f.tauxIS) / 100;
          impot += Math.max(0, is - acomptesAnnee);
          acomptesAnnee = 0;
          resultatAnnee = 0;
        }
      }
    }
    const resultatNet = resultatAvantImpot - impot;

    // TVA : collectée sur les ventes, déductible sur les achats variables, les charges soumises et les équipements.
    // Le solde est versé le mois suivant ; un crédit se reporte.
    const tvaCollectee = ca * tva;
    const tvaDeductible = (cv + fixesTVA + investissements + e.exceptionnel) * tva;
    const tvaPayee = tvaDue;
    let solde = tvaCollectee - tvaDeductible - creditTVA;
    if (solde < 0) { creditTVA = -solde; solde = 0; } else creditTVA = 0;
    tvaDue = solde;

    // Encaissements clients : un choc de retard décale le chiffre d'affaires d'un mois
    const caTTC = ca * (1 + tva);
    let encaissementsClients: number;
    if (e.retard) { encaissementsClients = caReporte; caReporte = caTTC; }
    else { encaissementsClients = caTTC + caReporte; caReporte = 0; }

    const decaissementsExploitation =
      cv * (1 + tva) + (chargesFixes - fixesTVA) + fixesTVA * (1 + tva) + marketing + salaires + cnps + impot + tvaPayee + e.exceptionnel * (1 + tva);
    const fluxExploitation = encaissementsClients - decaissementsExploitation - interets;
    const apports = m === 1 ? r0(p.financement.apport) + r0(p.financement.subvention) : 0;
    const emprunt = m === 1 ? r0(p.financement.pretMontant) : 0;
    const invTTC = investissements * (1 + tva);
    const fluxSansFinancement = fluxExploitation + interets - invTTC;
    const fluxNet = fluxExploitation - invTTC + apports + emprunt - remboursementCapital;
    tresorerie += fluxNet;
    cumulSansFin += fluxSansFinancement;

    mois.push({
      m, volume, nouveaux, abonnes, ca, coutsVariables: cv, margeBrute, chargesFixes, marketing, salaires, cnps, ebe,
      amortissements, interets, chargesExceptionnelles: e.exceptionnel, resultatAvantImpot, impot, resultatNet,
      encaissementsClients, tvaCollectee, tvaDeductible, tvaPayee, investissements: invTTC, apports, emprunt,
      remboursementCapital, fluxExploitation, fluxNet, fluxSansFinancement, tresorerie, cumulSansFinancement: cumulSansFin
    });
  }

  const annees: Annee[] = [1, 2, 3].map((a) => {
    const sl = mois.slice((a - 1) * 12, a * 12);
    const s = (k: keyof Mois) => sl.reduce((t, x) => t + (x[k] as number), 0);
    const resultatNet = s('resultatNet');
    return {
      annee: a,
      ca: s('ca'),
      coutsVariables: s('coutsVariables'),
      margeBrute: s('margeBrute'),
      chargesFixes: s('chargesFixes') + s('marketing'),
      personnel: s('salaires') + s('cnps'),
      ebe: s('ebe'),
      amortissements: s('amortissements'),
      interets: s('interets'),
      impot: s('impot'),
      resultatNet,
      caf: resultatNet + s('amortissements'),
      annuites: s('interets') + s('remboursementCapital'),
      tresorerieFin: sl[sl.length - 1].tresorerie
    };
  });

  return { mois, annees, indicateurs: indicateurs(p, mois, annees) };
}

function indicateurs(p: Projet, mois: Mois[], annees: Annee[]): Indicateurs {
  let minCumul = 0, moisCreux: number | null = null;
  mois.forEach((x) => { if (x.cumulSansFinancement < minCumul) { minCumul = x.cumulSansFinancement; moisCreux = x.m; } });
  const besoinFinancement = Math.max(0, -minCumul);
  const fin = p.financement;
  const financementTotal = r0(fin.apport) + r0(fin.subvention) + r0(fin.pretMontant);
  const rupture = mois.find((x) => x.tresorerie < -0.5)?.m ?? null;
  const premierMoisRentable = mois.find((x) => x.resultatNet > 0)?.m ?? null;
  let retour: number | null = null;
  if (besoinFinancement > 0) {
    const apresCreux = mois.filter((x) => moisCreux !== null && x.m > moisCreux);
    retour = apresCreux.find((x) => x.cumulSansFinancement >= 0)?.m ?? null;
  } else retour = mois[0] && mois[0].cumulSansFinancement >= 0 ? 1 : null;

  const a1 = annees[0];
  const tauxMargeVariable = a1.ca > 0 ? a1.margeBrute / a1.ca : 0;
  const fixesAn1 = a1.chargesFixes + a1.personnel + a1.amortissements + a1.interets;
  const seuil = tauxMargeVariable > 0 ? fixesAn1 / tauxMargeVariable : null;
  const pointMortJours = seuil !== null && a1.ca > 0 ? Math.round((seuil / a1.ca) * 360) : null;
  const dscrAn1 = a1.annuites > 0 ? (a1.ebe - a1.impot) / a1.annuites : null;
  const autofinancementPct = financementTotal > 0 ? ((r0(fin.apport) + r0(fin.subvention)) / financementTotal) * 100 : null;
  const moisSalaireCible = p.salaireCible > 0 ? mois.find((x) => x.ebe >= p.salaireCible)?.m ?? null : null;
  const investissementInitial = p.equipements.reduce((s, x) => s + x.quantite * x.prixUnitaire, 0);

  // Économie unitaire des modèles à abonnement
  let ltv: number | null = null, cac: number | null = null, payback: number | null = null;
  if (p.modele !== 'vente') {
    const churn = (p.modele === 'mrr' ? p.mrr.churnPct : p.boitier.churnPct) / 100;
    const margeMensuelle = p.modele === 'mrr'
      ? p.mrr.prix - p.mrr.coutVariable
      : p.boitier.prixAbonnement - p.boitier.coutVariableAbonnement;
    const margeInitiale = p.modele === 'mrr_boitier' ? p.boitier.prix - p.boitier.coutVariable : 0;
    ltv = churn > 0 ? margeInitiale + margeMensuelle / churn : null;
    const nouveauxAn1 = mois.slice(0, 12).reduce((s, x) => s + x.nouveaux, 0);
    const marketingAn1 = r0(p.marketingMensuel) * 12;
    cac = nouveauxAn1 > 0 && marketingAn1 > 0 ? marketingAn1 / nouveauxAn1 : null;
    payback = cac !== null && margeMensuelle > 0 ? Math.max(0, cac - margeInitiale) / margeMensuelle : null;
  }
  return {
    besoinFinancement, moisCreux, financementTotal,
    couvertureBesoin: besoinFinancement > 0 ? financementTotal / besoinFinancement : null,
    ruptureTresorerie: rupture, premierMoisRentable, moisRetourInvestissement: retour,
    tauxMargeVariable, seuilRentabiliteAnnuel: seuil, pointMortJours, dscrAn1, autofinancementPct,
    moisSalaireCible, ltv, cac, ltvSurCac: ltv !== null && cac ? ltv / cac : null, paybackCacMois: payback,
    investissementInitial
  };
}

/** Les trois scénarios d'un coup. */
export function calculerScenarios(p: Projet, chocs: ChocActif[] = []) {
  return {
    prudent: calculer(p, { scenario: 'prudent', chocs }),
    base: calculer(p, { scenario: 'base', chocs }),
    ambitieux: calculer(p, { scenario: 'ambitieux', chocs })
  };
}

export interface LigneSensibilite { hypothese: string; bas: number; haut: number; ecart: number; }

/** Impact d'une variation de ±10 % de chaque hypothèse sur le résultat net cumulé de l'année 1. */
export function sensibilite(p: Projet, variation = 0.1): { reference: number; lignes: LigneSensibilite[] } {
  const ref = calculer(p).annees[0].resultatNet;
  const cas: [string, keyof NonNullable<OptionsCalcul['ajustements']>][] = [
    ['Prix de vente', 'prix'], ['Volumes vendus', 'volume'], ['Coûts variables', 'couts'], ['Charges fixes', 'fixes']
  ];
  const lignes = cas.map(([hypothese, k]) => {
    const bas = calculer(p, { ajustements: { [k]: 1 - variation } }).annees[0].resultatNet - ref;
    const haut = calculer(p, { ajustements: { [k]: 1 + variation } }).annees[0].resultatNet - ref;
    return { hypothese, bas, haut, ecart: Math.abs(haut - bas) };
  }).sort((a, b) => b.ecart - a.ecart);
  return { reference: ref, lignes };
}

/** Plan de financement initial : emplois et ressources. */
export function planFinancement(p: Projet, r: Resultat) {
  const tva = p.fiscalite.active && p.fiscalite.tvaAssujetti ? p.fiscalite.tauxTVA / 100 : 0;
  const invest = p.equipements.filter((x) => (x.moisAchat || 1) <= 12).reduce((s, x) => s + x.quantite * x.prixUnitaire, 0) * (1 + tva);
  const bfr = Math.max(0, r.indicateurs.besoinFinancement - invest);
  const emplois = [
    { libelle: 'Investissements de la première année (TTC)', montant: invest },
    { libelle: 'Besoin de trésorerie de démarrage', montant: bfr }
  ];
  const f = p.financement;
  const ressources = [
    { libelle: 'Apport du porteur', montant: r0(f.apport) },
    { libelle: 'Subventions et dons', montant: r0(f.subvention) },
    { libelle: 'Prêt bancaire ou microfinance', montant: r0(f.pretMontant) }
  ];
  const totalEmplois = emplois.reduce((s, x) => s + x.montant, 0);
  const totalRessources = ressources.reduce((s, x) => s + x.montant, 0);
  return { emplois, ressources, totalEmplois, totalRessources, ecart: totalRessources - totalEmplois };
}
