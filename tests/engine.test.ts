import { describe, expect, it } from 'vitest';
import { calculer, echeancierPret, facteurCroissance, sensibilite, planFinancement } from '../src/lib/engine';
import { projetVide, uid, type Projet } from '../src/lib/model';
import { projetDemo } from '../src/lib/demo';
import { bancabilite, alertes } from '../src/lib/analyse';

function simple(): Projet {
  const p = projetVide();
  p.fiscalite.active = false;
  p.chargesFixes = [{ id: uid(), libelle: 'Loyer', montant: 100000, moisDebut: 1, soumisTVA: false }];
  p.produits = [{ id: uid(), nom: 'A', prix: 1000, coutUnitaire: 400, quantiteM1: 300 }];
  p.croissance = { profil: 'plateau', tauxPerso: 0, an2Pct: 0, an3Pct: 0 };
  return p;
}

describe('compte de résultat', () => {
  it('calcule CA, marge et EBE d’un mois simple', () => {
    const r = calculer(simple());
    const m1 = r.mois[0];
    expect(m1.ca).toBe(300000);
    expect(m1.coutsVariables).toBe(120000);
    expect(m1.ebe).toBe(80000);
    expect(r.annees[0].resultatNet).toBe(960000);
  });

  it('amortit un équipement sur sa durée sans le compter dans l’EBE', () => {
    const p = simple();
    p.equipements = [{ id: uid(), libelle: 'Four', quantite: 2, prixUnitaire: 120000, dureeMois: 24, moisAchat: 1 }];
    const r = calculer(p);
    expect(r.mois[0].amortissements).toBe(10000);
    expect(r.mois[23].amortissements).toBe(10000);
    expect(r.mois[24].amortissements).toBe(0);
    expect(r.mois[0].ebe).toBe(80000);
    // L'achat sort de la trésorerie en une fois, au mois d'achat
    expect(r.mois[0].fluxNet).toBe(80000 - 240000);
  });

  it('ajoute les charges sociales patronales plafonnées', () => {
    const p = simple();
    p.fiscalite = { ...p.fiscalite, active: true, regime: 'igs', tauxIGS: 0, tvaAssujetti: false };
    p.personnel = [{ id: uid(), poste: 'Directeur', effectif: 1, salaireBrut: 1000000, moisDebut: 2 }];
    const r = calculer(p);
    expect(r.mois[0].cnps).toBe(0);
    expect(r.mois[1].cnps).toBeCloseTo(750000 * 0.1295, 5);
  });
});

describe('croissance', () => {
  it('applique la croissance mensuelle puis annuelle', () => {
    const p = simple();
    p.croissance = { profil: 'regulier', tauxPerso: 0, an2Pct: 20, an3Pct: 10 };
    expect(facteurCroissance(p, 1)).toBe(1);
    expect(facteurCroissance(p, 12)).toBeCloseTo(Math.pow(1.1, 11));
    expect(facteurCroissance(p, 24) / facteurCroissance(p, 12)).toBeCloseTo(1.2);
    expect(facteurCroissance(p, 36) / facteurCroissance(p, 24)).toBeCloseTo(1.1);
  });
});

describe('abonnements', () => {
  it('fait évoluer les abonnés avec les nouveaux et l’attrition', () => {
    const p = simple();
    p.modele = 'mrr';
    p.mrr = { prix: 5000, coutVariable: 1000, abonnesInitiaux: 100, nouveauxM1: 10, churnPct: 10 };
    const r = calculer(p);
    expect(r.mois[0].abonnes).toBe(110);
    expect(r.mois[1].abonnes).toBeCloseTo(110 * 0.9 + 10);
    expect(r.mois[0].ca).toBe(550000);
  });

  it('calcule la LTV sur la marge et non sur le prix', () => {
    const p = simple();
    p.modele = 'mrr';
    p.marketingMensuel = 50000;
    p.mrr = { prix: 5000, coutVariable: 1000, abonnesInitiaux: 0, nouveauxM1: 10, churnPct: 5 };
    const i = calculer(p).indicateurs;
    expect(i.ltv).toBeCloseTo(4000 / 0.05);
    expect(i.cac).toBeCloseTo(5000);
    expect(i.ltvSurCac).toBeCloseTo(16);
  });

  it('active les abonnements boîtier après le délai', () => {
    const p = simple();
    p.modele = 'mrr_boitier';
    p.boitier = { prix: 20000, coutVariable: 12000, ventesM1: 10, prixAbonnement: 3000, coutVariableAbonnement: 500, delaiMois: 1, churnPct: 0 };
    const r = calculer(p);
    expect(r.mois[0].abonnes).toBe(0);
    expect(r.mois[1].abonnes).toBe(10);
    expect(r.mois[2].abonnes).toBe(20);
    expect(r.mois[1].ca).toBe(10 * 20000 + 10 * 3000);
  });
});

describe('financement et trésorerie', () => {
  it('rembourse exactement le capital emprunté', () => {
    const e = echeancierPret(1000000, 12, 24, 3);
    const capital = e.reduce((s, x) => s + x.capital, 0);
    expect(capital).toBeCloseTo(1000000, 4);
    expect(e[0].capital).toBe(0);
    expect(e[0].interets).toBeCloseTo(10000);
    expect(e[23].restant).toBe(0);
  });

  it('mesure le besoin de financement indépendamment des ressources', () => {
    const p = simple();
    p.equipements = [{ id: uid(), libelle: 'Machine', quantite: 1, prixUnitaire: 500000, dureeMois: 60, moisAchat: 1 }];
    const sans = calculer(p).indicateurs;
    p.financement.apport = 1000000;
    const avec = calculer(p).indicateurs;
    expect(sans.besoinFinancement).toBeCloseTo(500000 - 80000);
    expect(avec.besoinFinancement).toBeCloseTo(sans.besoinFinancement);
    expect(sans.ruptureTresorerie).toBe(1);
    expect(avec.ruptureTresorerie).toBeNull();
  });

  it('verse la TVA nette le mois suivant', () => {
    const p = simple();
    p.fiscalite = { ...p.fiscalite, active: true, tvaAssujetti: true, tauxTVA: 20, regime: 'igs', tauxIGS: 0 };
    const r = calculer(p);
    expect(r.mois[0].tvaPayee).toBe(0);
    expect(r.mois[1].tvaPayee).toBeCloseTo(300000 * 0.2 - 120000 * 0.2);
    // La TVA ne change pas le résultat
    expect(r.mois[0].resultatNet).toBe(80000);
  });

  it('applique l’IS au réel avec le minimum de perception', () => {
    const p = simple();
    p.fiscalite = { ...p.fiscalite, active: true, tvaAssujetti: false, regime: 'reel', tauxIS: 30, tauxMinimum: 2 };
    const r = calculer(p);
    const impotAn1 = r.annees[0].impot;
    expect(impotAn1).toBeCloseTo(960000 * 0.3);
  });

  it('reporte les déficits sur l’exercice suivant', () => {
    const p = simple();
    p.produits[0].quantiteM1 = 100; // perte de 40 000 par mois
    p.fiscalite = { ...p.fiscalite, active: true, regime: 'reel', tauxIS: 30, tauxMinimum: 0 };
    const r = calculer(p);
    expect(r.annees[0].impot).toBe(0);
  });
});

describe('chocs', () => {
  it('annule les ventes du mois touché', () => {
    const r = calculer(simple(), { chocs: [{ type: 'zeroVente', mois: 2, valeur: 0, duree: 1 }] });
    expect(r.mois[1].ca).toBe(0);
    expect(r.mois[2].ca).toBe(300000);
  });
  it('cumule plusieurs chocs', () => {
    const r = calculer(simple(), {
      chocs: [
        { type: 'haussePrix', mois: 1, valeur: 10, duree: 1 },
        { type: 'nouvelleCharge', mois: 3, valeur: 50000, duree: 1 }
      ]
    });
    expect(r.mois[0].ca).toBeCloseTo(330000);
    expect(r.mois[2].chargesFixes).toBe(150000);
  });
  it('décale l’encaissement sans changer le chiffre d’affaires', () => {
    const r = calculer(simple(), { chocs: [{ type: 'retardEncaissement', mois: 2, valeur: 0, duree: 1 }] });
    expect(r.mois[1].ca).toBe(300000);
    expect(r.mois[1].encaissementsClients).toBe(0);
    expect(r.mois[2].encaissementsClients).toBe(600000);
  });
});

describe('scénarios et analyses', () => {
  it('le scénario prudent est inférieur à la base, elle-même inférieure à l’ambitieux', () => {
    const p = projetDemo();
    const ca = (s: 'prudent' | 'base' | 'ambitieux') => calculer(p, { scenario: s }).annees[0].ca;
    expect(ca('prudent')).toBeLessThan(ca('base'));
    expect(ca('base')).toBeLessThan(ca('ambitieux'));
  });
  it('classe les hypothèses par sensibilité', () => {
    const s = sensibilite(simple());
    expect(s.lignes[0].hypothese).toBe('Prix de vente');
    expect(s.lignes[0].haut).toBeCloseTo(360000);
  });
  it('produit un plan de financement et un score pour la démo', () => {
    const p = projetDemo();
    const r = calculer(p);
    const plan = planFinancement(p, r);
    expect(plan.totalRessources).toBe(1200000);
    const b = bancabilite(p, r);
    expect(b.score).toBeGreaterThan(0);
    expect(alertes(p, r).filter((a) => a.niveau === 'bloquant')).toEqual([]);
  });
});
