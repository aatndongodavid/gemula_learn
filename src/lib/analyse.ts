// Lecture des résultats : alertes de cohérence, score de bancabilité, verdict et commentaire rédigé.

import type { Projet } from './model';
import type { Resultat } from './engine';
import { fcfa, libelleMoisLong, pct, decimal } from './format';

export type Niveau = 'bloquant' | 'attention' | 'info';
export interface Alerte { niveau: Niveau; message: string; lien?: string }

export function alertes(p: Projet, r: Resultat): Alerte[] {
  const out: Alerte[] = [];
  const cvCommun = p.coutsVariables.reduce((s, c) => s + (c.montant || 0), 0);
  if (p.modele === 'vente') {
    const actifs = p.produits.filter((x) => x.nom || x.prix || x.quantiteM1);
    if (!actifs.length || actifs.every((x) => !x.prix || !x.quantiteM1))
      out.push({ niveau: 'bloquant', message: 'Aucun produit n’a à la fois un prix et une quantité : le chiffre d’affaires est nul.', lien: '/bpc#revenus' });
    for (const x of actifs) {
      if (x.prix > 0 && x.prix <= x.coutUnitaire + cvCommun)
        out.push({ niveau: 'bloquant', message: `« ${x.nom || 'Produit sans nom'} » est vendu ${fcfa(x.prix)} pour un coût unitaire de ${fcfa(x.coutUnitaire + cvCommun)} : chaque vente fait perdre de l’argent.`, lien: '/bpc#revenus' });
    }
  } else if (p.modele === 'mrr') {
    if (!p.mrr.prix) out.push({ niveau: 'bloquant', message: 'Le prix de l’abonnement n’est pas renseigné.', lien: '/bpc#revenus' });
    if (!p.mrr.nouveauxM1 && !p.mrr.abonnesInitiaux) out.push({ niveau: 'bloquant', message: 'Aucun abonné de départ ni nouvel abonné par mois.', lien: '/bpc#revenus' });
    if (!p.mrr.churnPct) out.push({ niveau: 'attention', message: 'Un taux d’attrition (churn) de 0 % est irréaliste. Retenez au moins 2 à 5 % par mois.', lien: '/bpc#revenus' });
    if (p.mrr.prix && p.mrr.prix <= p.mrr.coutVariable) out.push({ niveau: 'bloquant', message: 'L’abonnement coûte plus cher à servir qu’il ne rapporte.', lien: '/bpc#revenus' });
  } else {
    const b = p.boitier;
    if (!b.prix && !b.prixAbonnement) out.push({ niveau: 'bloquant', message: 'Ni le prix du boîtier ni celui de l’abonnement ne sont renseignés.', lien: '/bpc#revenus' });
    if (!b.churnPct) out.push({ niveau: 'attention', message: 'Un taux d’attrition (churn) de 0 % est irréaliste.', lien: '/bpc#revenus' });
  }
  for (const e of p.equipements) {
    if (e.prixUnitaire > 0 && !e.dureeMois) out.push({ niveau: 'attention', message: `Durée d’amortissement manquante pour « ${e.libelle} ».`, lien: '/bpc#equipements' });
  }
  const i = r.indicateurs;
  if (i.ruptureTresorerie !== null)
    out.push({ niveau: 'bloquant', message: `La trésorerie devient négative en ${libelleMoisLong(p.identite.debut, i.ruptureTresorerie)} : le financement prévu ne couvre pas le besoin.`, lien: '/bpc#financement' });
  if (p.financement.pretMontant > 0 && p.financement.pretDureeMois <= p.financement.pretDiffereMois)
    out.push({ niveau: 'attention', message: 'La durée du prêt doit être supérieure au différé.', lien: '/bpc#financement' });
  if (i.dscrAn1 !== null && i.dscrAn1 < 1.2)
    out.push({ niveau: 'attention', message: i.dscrAn1 < 0
      ? 'En année 1, l\u2019exploitation ne dégage pas de quoi payer les échéances du prêt : elles sont couvertes par la trésorerie de départ. Un différé plus long ou un prêt plus tardif est à négocier.'
      : `Capacité de remboursement faible (couverture ${decimal(i.dscrAn1)}). Les banques attendent au moins 1,2.`, lien: '/bpc#financement' });
  if (!p.fiscalite.active)
    out.push({ niveau: 'info', message: 'La fiscalité est désactivée : les résultats sont surestimés.', lien: '/bpc#fiscalite' });
  if (i.ltvSurCac !== null && i.ltvSurCac < 3)
    out.push({ niveau: 'attention', message: `Rapport LTV/CAC de ${decimal(i.ltvSurCac)} : un client rapporte moins de 3 fois ce qu’il coûte à acquérir.`, lien: '/bpc#marche' });
  return out;
}

export interface Critere { critere: string; valeur: string; seuil: string; ok: boolean | null; poids: number }

/** Grille inspirée des critères d'analyse crédit des banques et microfinances. */
export function bancabilite(p: Projet, r: Resultat) {
  const i = r.indicateurs;
  const [a1, a2] = r.annees;
  const besoin = i.besoinFinancement;
  const criteres: Critere[] = [
    {
      critere: 'Trésorerie toujours positive sur 36 mois', poids: 25,
      valeur: i.ruptureTresorerie === null ? 'Oui' : `Rupture en ${libelleMoisLong(p.identite.debut, i.ruptureTresorerie)}`,
      seuil: 'Aucune rupture', ok: i.ruptureTresorerie === null
    },
    {
      critere: 'Apport personnel et subventions', poids: 15,
      valeur: i.autofinancementPct === null ? 'Aucun financement' : pct(i.autofinancementPct),
      seuil: '≥ 30 % des ressources', ok: i.autofinancementPct === null ? (besoin === 0 ? true : false) : i.autofinancementPct >= 30
    },
    {
      critere: 'Capacité de remboursement (année 1)', poids: 20,
      valeur: i.dscrAn1 === null ? 'Sans emprunt' : decimal(i.dscrAn1),
      seuil: '≥ 1,2', ok: i.dscrAn1 === null ? null : i.dscrAn1 >= 1.2
    },
    {
      critere: 'Résultat net de l’année 2', poids: 15,
      valeur: fcfa(a2.resultatNet), seuil: 'Positif', ok: a2.resultatNet > 0
    },
    {
      critere: 'Point mort atteint en année 1', poids: 15,
      valeur: i.pointMortJours === null ? 'Non atteint' : `${i.pointMortJours} jours`,
      seuil: '≤ 360 jours', ok: i.pointMortJours !== null && i.pointMortJours <= 360
    },
    {
      critere: 'Taux de marge sur coûts variables', poids: 10,
      valeur: pct(i.tauxMargeVariable * 100), seuil: '≥ 30 %', ok: a1.ca > 0 && i.tauxMargeVariable >= 0.3
    }
  ];
  const evalues = criteres.filter((c) => c.ok !== null);
  const total = evalues.reduce((s, c) => s + c.poids, 0);
  const obtenu = evalues.reduce((s, c) => s + (c.ok ? c.poids : 0), 0);
  const score = total > 0 ? Math.round((obtenu / total) * 100) : 0;
  const niveau = score >= 80 ? 'Bancable' : score >= 55 ? 'À consolider' : 'À revoir';
  return { criteres, score, niveau };
}

/** Commentaire rédigé des résultats, réutilisé à l'écran et dans le dossier PDF. */
export function lecture(p: Projet, r: Resultat): string[] {
  const i = r.indicateurs;
  const [a1, a2, a3] = r.annees;
  const d = p.identite.debut;
  const nom = p.identite.projet || 'Le projet';
  const out: string[] = [];
  if (a1.ca <= 0) {
    out.push('Les hypothèses de revenus ne sont pas encore renseignées. Complétez le chiffrage pour obtenir une lecture des résultats.');
    return out;
  }
  out.push(
    `${nom} réalise ${fcfa(a1.ca)} de chiffre d’affaires la première année, ${fcfa(a2.ca)} la deuxième et ${fcfa(a3.ca)} la troisième. ` +
    `Le résultat net s’établit à ${fcfa(a1.resultatNet)} en année 1, ${fcfa(a2.resultatNet)} en année 2 et ${fcfa(a3.resultatNet)} en année 3.`
  );
  out.push(
    i.premierMoisRentable
      ? `Le premier mois bénéficiaire est ${libelleMoisLong(d, i.premierMoisRentable)}. ` +
        (i.pointMortJours !== null && i.pointMortJours <= 360
          ? `Le point mort annuel est atteint après environ ${i.pointMortJours} jours d’activité, pour un seuil de ${fcfa(i.seuilRentabiliteAnnuel || 0)} de chiffre d’affaires.`
          : `Sur l’année 1, le chiffre d’affaires reste sous le seuil de rentabilité${i.seuilRentabiliteAnnuel ? ` de ${fcfa(i.seuilRentabiliteAnnuel)}` : ''}.`)
      : 'Aucun mois n’est bénéficiaire sur les 36 mois simulés : le modèle doit être revu avant toute recherche de financement.'
  );
  if (i.besoinFinancement > 0) {
    out.push(
      `Le besoin de trésorerie maximal est de ${fcfa(i.besoinFinancement)}, atteint en ${libelleMoisLong(d, i.moisCreux || 1)}. ` +
      (i.financementTotal > 0
        ? `Les ressources prévues (${fcfa(i.financementTotal)}) le couvrent ${i.couvertureBesoin !== null && i.couvertureBesoin >= 1 ? `${decimal(i.couvertureBesoin)} fois.` : 'insuffisamment.'}`
        : 'Aucune ressource de financement n’est encore prévue.') +
      (i.moisRetourInvestissement ? ` Les sommes engagées sont récupérées en ${libelleMoisLong(d, i.moisRetourInvestissement)}.` : '')
    );
  } else {
    out.push('L’activité s’autofinance dès le démarrage : aucun besoin de trésorerie n’apparaît.');
  }
  if (i.ruptureTresorerie !== null)
    out.push(`Attention : la trésorerie devient négative en ${libelleMoisLong(d, i.ruptureTresorerie)}. Il faut augmenter l’apport, négocier un prêt ou décaler des dépenses.`);
  if (i.ltv !== null)
    out.push(`Un abonné rapporte ${fcfa(i.ltv)} de marge sur sa durée de vie` + (i.cac !== null ? ` pour un coût d’acquisition de ${fcfa(i.cac)}, soit un rapport de ${decimal(i.ltvSurCac || 0)}.` : '.'));
  if (p.salaireCible > 0)
    out.push(i.moisSalaireCible
      ? `Le porteur peut se verser ${fcfa(p.salaireCible)} par mois à partir de ${libelleMoisLong(d, i.moisSalaireCible)}.`
      : `L’activité ne dégage pas encore ${fcfa(p.salaireCible)} par mois pour rémunérer le porteur sur la période.`);
  return out;
}

/** Avancement de chaque module (0 à 1). */
export function avancement(p: Projet) {
  const rempli = (v: unknown) => typeof v === 'number' ? v > 0 : !!String(v ?? '').trim();
  const part = (xs: unknown[]) => xs.filter(rempli).length / xs.length;
  const c = p.canvas;
  const revenus = p.modele === 'vente' ? p.produits.some((x) => x.prix > 0 && x.quantiteM1 > 0)
    : p.modele === 'mrr' ? p.mrr.prix > 0 && (p.mrr.nouveauxM1 > 0 || p.mrr.abonnesInitiaux > 0)
    : p.boitier.prix > 0 && p.boitier.ventesM1 > 0;
  return {
    pretest: Object.keys(p.pretest).length / 10,
    canvas: part([p.identite.projet, c.probleme, c.segment, c.solution, c.valeur, c.canalPrincipal, c.prixHypothese, c.couts, c.metrique]),
    bpc: part([revenus ? 1 : 0, p.equipements.length + p.personnel.length, p.chargesFixes.some((x) => x.montant > 0) ? 1 : 0, p.financement.apport + p.financement.pretMontant + p.financement.subvention, p.concurrents.length]),
    strategie: part([c.probleme && p.rapport.forces, p.rapport.menaces, p.risques.length, p.jalons.length])
  };
}
