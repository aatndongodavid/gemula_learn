// Document imprimable (dossier, plan financier, BPC, simulation), mis en page avec Paged.js.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useProjet } from '../lib/store';
import { calculer, calculerScenarios, planFinancement, sensibilite, type Resultat } from '../lib/engine';
import { alertes, bancabilite, lecture } from '../lib/analyse';
import { profil } from '../lib/pretest';
import { defChoc } from '../lib/chocs';
import { dateLongue, decimal, fcfa, libelleMois, libelleMoisLong, milliers, nombre, pct, slug } from '../lib/format';
import type { Projet } from '../lib/model';
import { BarChart, LineChart, PALETTE_DOC, Tornado } from './charts';
import { criticite, niveauRisque } from './Strategie';
import docCss from '../styles/doc.css?raw';

type TypeDoc = 'complet' | 'financier' | 'bpc' | 'simulation';
const TITRES: Record<TypeDoc, { surtitre: string; sous: string; court: string }> = {
  complet: { surtitre: 'Dossier de financement', sous: 'Projet, marché, plan financier, risques et feuille de route', court: 'Dossier de financement' },
  financier: { surtitre: 'Plan financier', sous: 'Hypothèses, résultats, trésorerie et financement sur trois ans', court: 'Plan financier' },
  bpc: { surtitre: 'Business Probability Canvas', sous: 'Ressources, offre, coûts, marché et rentabilité', court: 'Business Probability Canvas' },
  simulation: { surtitre: 'Simulation et stress-tests', sous: 'Scénarios, sensibilité et résistance aux chocs', court: 'Simulation et stress-tests' }
};

const MODELE_TXT = { vente: 'Vente unique', mrr: 'Abonnement mensuel', mrr_boitier: 'Boîtier et abonnement mensuel' };

/** Logo officiel Gemula, utilisé tel quel. */
const LOGO = '/logo-gemula.png';

const T = (s?: string) => (s && s.trim() ? s : null);
const Champ = ({ t, v }: { t: string; v?: string }) => (
  <div class="champ"><div class="t">{t}</div><p>{T(v) ?? <span class="vide">Non renseigné</span>}</p></div>
);

interface Ctx { p: Projet; r: Resultat; sc: ReturnType<typeof calculerScenarios>; }
interface Section { id: string; titre: string; sous: { id: string; titre: string }[]; rendu: (c: Ctx, n: number) => ComponentChildren }

/* ---------------- Contenu des chapitres ---------------- */

function synthese(): Section {
  return {
    id: 'synthese', titre: 'Synthèse exécutive',
    sous: [{ id: 'these', titre: 'Le projet en une page' }, { id: 'chiffres', titre: 'Les chiffres clés' }, { id: 'verdict', titre: 'Avis de bancabilité' }, { id: 'lecture', titre: 'Lecture des résultats' }],
    rendu: ({ p, r }, n) => {
      const i = r.indicateurs;
      const [a1, , a3] = r.annees;
      const b = bancabilite(p, r);
      const c = p.canvas;
      return (
        <>
          <h2 id="these"><span class="n">{n}.1</span>Le projet en une page</h2>
          {T(c.probleme) && <p><strong>Le problème.</strong> {c.probleme}</p>}
          {T(c.solution) && <p><strong>La solution.</strong> {c.solution}</p>}
          {T(c.valeur) && <p><strong>Ce qui la distingue.</strong> {c.valeur}</p>}
          {T(c.segment) && <p><strong>Pour qui.</strong> {c.segment}</p>}
          {T(p.rapport.objectif) && <p><strong>L’objectif.</strong> {p.rapport.objectif}</p>}
          <h2 id="chiffres"><span class="n">{n}.2</span>Les chiffres clés</h2>
          <div class="chiffres">
            <div><div class="v">{nombre(a1.ca)}</div><div class="l">FCFA de chiffre d’affaires la première année</div></div>
            <div><div class="v">{nombre(a3.resultatNet)}</div><div class="l">FCFA de résultat net en année 3</div></div>
            <div><div class="v">{nombre(i.besoinFinancement)}</div><div class="l">FCFA de besoin de trésorerie maximal</div></div>
            <div><div class="v">{i.premierMoisRentable ? libelleMois(p.identite.debut, i.premierMoisRentable) : '—'}</div><div class="l">premier mois bénéficiaire</div></div>
          </div>
          <h2 id="verdict"><span class="n">{n}.3</span>Avis de bancabilité</h2>
          <div class="encadre">
            <div class="titre">Score de bancabilité Gemula Learn</div>
            <div class="score">
              <div class="n">{b.score}<small> / 100</small></div>
              <div>
                <div class="niv">{b.niveau}</div>
                <p style="margin-top: 1.5mm; text-align: left">{b.criteres.filter((x) => x.ok === true).length} critères satisfaits sur {b.criteres.filter((x) => x.ok !== null).length}. Le détail figure au dernier chapitre.</p>
              </div>
            </div>
          </div>
          <h2 id="lecture"><span class="n">{n}.4</span>Lecture des résultats</h2>
          {lecture(p, r).map((t) => <p>{t}</p>)}
        </>
      );
    }
  };
}

function marche(): Section {
  return {
    id: 'marche', titre: 'Marché et positionnement',
    sous: [{ id: 'probleme', titre: 'Problème, cible et solution' }, { id: 'canaux', titre: 'Canaux et prix' }, { id: 'concurrence', titre: 'La concurrence' }, { id: 'cibles', titre: 'Les clients cibles' }],
    rendu: ({ p }, n) => {
      const c = p.canvas;
      return (
        <>
          <h2 id="probleme"><span class="n">{n}.1</span>Problème, cible et solution</h2>
          <Champ t="Problème" v={c.probleme} />
          <Champ t="Segment cible" v={c.segment} />
          <Champ t="Solution" v={c.solution} />
          <Champ t="Proposition de valeur" v={c.valeur} />
          <h2 id="canaux"><span class="n">{n}.2</span>Canaux et prix</h2>
          <table>
            <thead><tr><th class="col-libelle">Rubrique</th><th>Hypothèse retenue</th></tr></thead>
            <tbody>
              <tr><td>Canal principal</td><td>{T(c.canalPrincipal) ?? '—'}</td></tr>
              <tr><td>Canal secondaire</td><td>{T(c.canalSecondaire) ?? '—'}</td></tr>
              <tr><td>Prix envisagé</td><td>{T(c.prixHypothese) ?? '—'}</td></tr>
              <tr><td>Fréquence d’achat</td><td>{T(c.frequence) ?? '—'}</td></tr>
              <tr><td>Indicateur de succès</td><td>{T(c.metrique) ?? '—'}{T(c.objectif1Mois) ? ` · objectif à un mois : ${c.objectif1Mois}` : ''}</td></tr>
            </tbody>
          </table>
          <h2 id="concurrence"><span class="n">{n}.3</span>La concurrence</h2>
          {p.concurrents.length ? (
            <table>
              <thead><tr><th>Concurrent</th><th>Position prix</th><th>Point faible</th></tr></thead>
              <tbody>{p.concurrents.map((x) => <tr><td>{x.nom}</td><td>{x.positionPrix || '—'}</td><td>{x.pointFaible || '—'}</td></tr>)}</tbody>
            </table>
          ) : <p class="note">Aucun concurrent renseigné.</p>}
          <h2 id="cibles"><span class="n">{n}.4</span>Les clients cibles</h2>
          {p.cibles.length ? (
            <table>
              <thead><tr><th>Profil</th><th class="num">Nombre par mois</th><th>Fréquence</th></tr></thead>
              <tbody>{p.cibles.map((x) => <tr><td>{x.profil}</td><td class="num">{nombre(x.nombreMois)}</td><td>{x.frequence || '—'}</td></tr>)}</tbody>
            </table>
          ) : <p class="note">Aucun profil client renseigné.</p>}
        </>
      );
    }
  };
}

function modele(): Section {
  return {
    id: 'modele', titre: 'Modèle économique',
    sous: [{ id: 'offre', titre: 'L’offre et les prix' }, { id: 'unitaire', titre: 'Économie unitaire' }],
    rendu: ({ p, r }, n) => {
      const cvCommun = p.coutsVariables.reduce((s, c) => s + c.montant, 0);
      const i = r.indicateurs;
      return (
        <>
          <p>Le projet repose sur le modèle <strong>{MODELE_TXT[p.modele].toLowerCase()}</strong>. {p.modele === 'vente' ? 'Chaque client paie à l’acte.' : 'Le revenu se renouvelle chaque mois tant que l’abonné reste client ; l’attrition (churn) mesure la part qui part chaque mois.'}</p>
          <h2 id="offre"><span class="n">{n}.1</span>L’offre et les prix</h2>
          <p class="unite">Les montants sont exprimés en francs CFA{p.fiscalite.active && p.fiscalite.tvaAssujetti ? ' hors taxes' : ''}.</p>
          {p.modele === 'vente' ? (
            <table>
              <thead><tr><th>Produit ou service</th><th class="num">Prix</th><th class="num">Coût unitaire</th><th class="num">Marge unitaire</th><th class="num">Quantité au mois 1</th></tr></thead>
              <tbody>{p.produits.filter((x) => x.nom || x.prix).map((x) => <tr><td>{x.nom || '—'}</td><td class="num">{nombre(x.prix)}</td><td class="num">{nombre(x.coutUnitaire + cvCommun)}</td><td class="num">{nombre(x.prix - x.coutUnitaire - cvCommun)}</td><td class="num">{nombre(x.quantiteM1)}</td></tr>)}</tbody>
            </table>
          ) : p.modele === 'mrr' ? (
            <table>
              <thead><tr><th class="col-libelle">Paramètre</th><th class="num">Valeur</th></tr></thead>
              <tbody>
                <tr><td>Abonnement mensuel</td><td class="num">{nombre(p.mrr.prix)}</td></tr>
                <tr><td>Coût de service par abonné</td><td class="num">{nombre(p.mrr.coutVariable + cvCommun)}</td></tr>
                <tr><td>Abonnés au démarrage</td><td class="num">{nombre(p.mrr.abonnesInitiaux)}</td></tr>
                <tr><td>Nouveaux abonnés au mois 1</td><td class="num">{nombre(p.mrr.nouveauxM1)}</td></tr>
                <tr><td>Attrition mensuelle</td><td class="num">{pct(p.mrr.churnPct, 1)}</td></tr>
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr><th class="col-libelle">Paramètre</th><th class="num">Valeur</th></tr></thead>
              <tbody>
                <tr><td>Prix du boîtier</td><td class="num">{nombre(p.boitier.prix)}</td></tr>
                <tr><td>Coût du boîtier</td><td class="num">{nombre(p.boitier.coutVariable + cvCommun)}</td></tr>
                <tr><td>Boîtiers vendus au mois 1</td><td class="num">{nombre(p.boitier.ventesM1)}</td></tr>
                <tr><td>Abonnement mensuel</td><td class="num">{nombre(p.boitier.prixAbonnement)}</td></tr>
                <tr><td>Coût de service par abonné</td><td class="num">{nombre(p.boitier.coutVariableAbonnement)}</td></tr>
                <tr><td>Délai avant abonnement</td><td class="num">{p.boitier.delaiMois} mois</td></tr>
                <tr><td>Attrition mensuelle</td><td class="num">{pct(p.boitier.churnPct, 1)}</td></tr>
              </tbody>
            </table>
          )}
          {p.coutsVariables.length > 0 && (
            <>
              <h3>Coûts variables communs à chaque unité</h3>
              <table>
                <thead><tr><th>Désignation</th><th class="num">Coût par unité</th></tr></thead>
                <tbody>{p.coutsVariables.map((x) => <tr><td>{x.libelle}</td><td class="num">{nombre(x.montant)}</td></tr>)}</tbody>
                <tfoot><tr><td>Total</td><td class="num">{nombre(cvCommun)}</td></tr></tfoot>
              </table>
            </>
          )}
          <h2 id="unitaire"><span class="n">{n}.2</span>Économie unitaire</h2>
          <table>
            <thead><tr><th class="col-libelle">Indicateur</th><th class="num">Valeur</th><th>Lecture</th></tr></thead>
            <tbody>
              <tr><td>Taux de marge sur coûts variables</td><td class="num">{pct(i.tauxMargeVariable * 100)}</td><td>Part de chaque franc vendu qui reste pour couvrir les charges fixes.</td></tr>
              <tr><td>Seuil de rentabilité annuel</td><td class="num">{i.seuilRentabiliteAnnuel ? nombre(i.seuilRentabiliteAnnuel) : '—'}</td><td>Chiffre d’affaires à réaliser pour couvrir toutes les charges.</td></tr>
              <tr><td>Point mort</td><td class="num">{i.pointMortJours !== null && i.pointMortJours <= 360 ? `${i.pointMortJours} jours` : 'Non atteint en année 1'}</td><td>Date de l’année à laquelle le seuil est franchi.</td></tr>
              {i.ltv !== null && <tr><td>Valeur d’un client (LTV)</td><td class="num">{nombre(i.ltv)}</td><td>Marge générée par un client sur sa durée de vie.</td></tr>}
              {i.ltv !== null && <tr><td>Coût d’acquisition (CAC)</td><td class="num">{i.cac !== null ? nombre(i.cac) : '—'}</td><td>Budget marketing divisé par les nouveaux clients.</td></tr>}
              {i.ltvSurCac !== null && <tr><td>Rapport LTV / CAC</td><td class="num">{decimal(i.ltvSurCac)}</td><td>Au-dessus de 3, l’acquisition est rentable.</td></tr>}
              {i.paybackCacMois !== null && <tr><td>Retour sur le coût d’acquisition</td><td class="num">{decimal(i.paybackCacMois)} mois</td><td>Temps pour qu’un client rembourse ce qu’il a coûté.</td></tr>}
            </tbody>
          </table>
        </>
      );
    }
  };
}

function ressources(): Section {
  return {
    id: 'ressources', titre: 'Ressources et investissements',
    sous: [{ id: 'equipements', titre: 'Équipements' }, { id: 'personnel', titre: 'Personnel' }, { id: 'charges', titre: 'Charges fixes' }],
    rendu: ({ p }, n) => {
      const inv = p.equipements.reduce((s, x) => s + x.quantite * x.prixUnitaire, 0);
      const am = p.equipements.reduce((s, x) => s + (x.dureeMois ? (x.quantite * x.prixUnitaire) / x.dureeMois : 0), 0);
      return (
        <>
          <p class="unite">Les montants sont exprimés en francs CFA.</p>
          <h2 id="equipements"><span class="n">{n}.1</span>Équipements</h2>
          {p.equipements.length ? (
            <table>
              <thead><tr><th>Équipement</th><th class="num">Qté</th><th class="num">Prix unitaire</th><th class="num">Total</th><th class="num">Durée</th><th>Achat</th><th class="num">Amort. / mois</th></tr></thead>
              <tbody>{p.equipements.map((x) => <tr><td>{x.libelle}</td><td class="num">{x.quantite}</td><td class="num">{nombre(x.prixUnitaire)}</td><td class="num">{nombre(x.quantite * x.prixUnitaire)}</td><td class="num">{x.dureeMois} mois</td><td>{libelleMois(p.identite.debut, x.moisAchat)}</td><td class="num">{nombre(x.dureeMois ? (x.quantite * x.prixUnitaire) / x.dureeMois : 0)}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={3}>Total</td><td class="num">{nombre(inv)}</td><td colSpan={2}></td><td class="num">{nombre(am)}</td></tr></tfoot>
            </table>
          ) : <p class="note">Aucun équipement prévu.</p>}
          <h2 id="personnel"><span class="n">{n}.2</span>Personnel</h2>
          {p.personnel.length ? (
            <table>
              <thead><tr><th>Poste</th><th class="num">Effectif</th><th class="num">Salaire brut</th><th>Embauche</th><th class="num">Coût mensuel{p.fiscalite.active ? ' (avec CNPS)' : ''}</th></tr></thead>
              <tbody>{p.personnel.map((x) => {
                const cnps = p.fiscalite.active ? Math.min(x.salaireBrut, p.fiscalite.plafondCNPS) * p.fiscalite.tauxCNPSPatronal / 100 : 0;
                return <tr><td>{x.poste}</td><td class="num">{x.effectif}</td><td class="num">{nombre(x.salaireBrut)}</td><td>{libelleMois(p.identite.debut, x.moisDebut)}</td><td class="num">{nombre(x.effectif * (x.salaireBrut + cnps))}</td></tr>;
              })}</tbody>
            </table>
          ) : <p class="note">Aucun salarié prévu.</p>}
          <h2 id="charges"><span class="n">{n}.3</span>Charges fixes</h2>
          <table>
            <thead><tr><th>Charge</th><th class="num">Montant mensuel</th><th>Depuis</th></tr></thead>
            <tbody>
              {p.chargesFixes.filter((x) => x.montant > 0).map((x) => <tr><td>{x.libelle}</td><td class="num">{nombre(x.montant)}</td><td>{libelleMois(p.identite.debut, x.moisDebut)}</td></tr>)}
              {p.marketingMensuel > 0 && <tr><td>Marketing et communication</td><td class="num">{nombre(p.marketingMensuel)}</td><td>{libelleMois(p.identite.debut, 1)}</td></tr>}
            </tbody>
            <tfoot><tr><td>Total à pleine charge</td><td class="num">{nombre(p.chargesFixes.reduce((s, x) => s + x.montant, 0) + p.marketingMensuel)}</td><td></td></tr></tfoot>
          </table>
        </>
      );
    }
  };
}

const PROFIL_TXT = { prudent: 'démarrage prudent, +5 % par mois', regulier: 'croissance régulière, +10 % par mois', coups: 'croissance par à-coups', plateau: 'volume stable', perso: '' };

function hypotheses(p: Projet) {
  const f = p.financement, fi = p.fiscalite, c = p.croissance;
  const lignes: [string, string][] = [
    ['Démarrage de l’activité', libelleMoisLong(p.identite.debut, 1)],
    ['Modèle économique', MODELE_TXT[p.modele]],
    ['Croissance en année 1', c.profil === 'perso' ? `${decimal(c.tauxPerso)} % par mois` : PROFIL_TXT[c.profil]],
    ['Croissance des volumes en années 2 et 3', `${decimal(c.an2Pct)} % puis ${decimal(c.an3Pct)} % par an`],
    ['Scénario prudent', `volumes à ${p.scenarios.prudent.volumePct} % et coûts variables à ${p.scenarios.prudent.coutsPct} % de la base`],
    ['Scénario ambitieux', `volumes à ${p.scenarios.ambitieux.volumePct} % et coûts variables à ${p.scenarios.ambitieux.coutsPct} % de la base`],
    ['Apport et subventions', `${fcfa(f.apport + f.subvention)} encaissés au premier mois`],
    ['Prêt', f.pretMontant > 0 ? `${fcfa(f.pretMontant)} à ${decimal(f.pretTauxAnnuelPct)} % sur ${f.pretDureeMois} mois, dont ${f.pretDiffereMois} de différé` : 'Aucun'],
    ['Fiscalité', !fi.active ? 'Non prise en compte' : fi.regime === 'igs' ? `Impôt général synthétique à ${decimal(fi.tauxIGS)} % du chiffre d’affaires` : `Impôt sur les sociétés à ${decimal(fi.tauxIS)} %, minimum de perception de ${decimal(fi.tauxMinimum)} % du CA, report des déficits`],
    ['TVA', fi.active && fi.tvaAssujetti ? `${decimal(fi.tauxTVA)} %, reversée le mois suivant ; prix saisis hors taxes` : 'Non assujetti'],
    ['Cotisations sociales', fi.active ? `CNPS patronale de ${decimal(fi.tauxCNPSPatronal)} % dans la limite de ${fcfa(fi.plafondCNPS)} par salarié` : 'Non prises en compte'],
    ['Rémunération visée du porteur', p.salaireCible > 0 ? `${fcfa(p.salaireCible)} par mois` : 'Non précisée']
  ];
  return lignes;
}

function planFinancier(): Section {
  return {
    id: 'financier', titre: 'Plan financier à 12 et 36 mois',
    sous: [{ id: 'hypotheses', titre: 'Hypothèses' }, { id: 'resultat', titre: 'Compte de résultat sur trois ans' }, { id: 'mensuel', titre: 'Les douze premiers mois' }, { id: 'tresorerie', titre: 'Trajectoire de trésorerie' }, { id: 'financement', titre: 'Plan de financement' }],
    rendu: ({ p, r, sc }, n) => {
      const d = p.identite.debut;
      const plan = planFinancement(p, r);
      const lignes: [string, (a: Resultat['annees'][number]) => number, boolean?][] = [
        ['Chiffre d’affaires', (a) => a.ca, true], ['Coûts variables', (a) => a.coutsVariables], ['Marge sur coûts variables', (a) => a.margeBrute, true],
        ['Charges fixes et marketing', (a) => a.chargesFixes], ['Personnel et cotisations', (a) => a.personnel], ['Excédent brut d’exploitation', (a) => a.ebe, true],
        ['Amortissements', (a) => a.amortissements], ['Intérêts d’emprunt', (a) => a.interets], ['Impôts', (a) => a.impot], ['Résultat net', (a) => a.resultatNet, true],
        ['Capacité d’autofinancement', (a) => a.caf], ['Trésorerie en fin d’année', (a) => a.tresorerieFin, true]
      ];
      const m12 = r.mois.slice(0, 12);
      const lab12 = m12.map((m) => libelleMois(d, m.m).replace(/\s\d+$/, ''));
      return (
        <>
          <h2 id="hypotheses"><span class="n">{n}.1</span>Hypothèses</h2>
          <p>Le modèle couvre trente-six mois à partir de {libelleMoisLong(d, 1)}. Il est recalculé à chaque modification dans Gemula Learn ; chaque hypothèse ci-dessous peut être ajustée.</p>
          <table>
            <thead><tr><th class="col-libelle">Hypothèse</th><th>Valeur retenue dans le scénario de base</th></tr></thead>
            <tbody>{hypotheses(p).map(([a, b]) => <tr><td>{a}</td><td>{b}</td></tr>)}</tbody>
          </table>
          <h2 id="resultat"><span class="n">{n}.2</span>Compte de résultat sur trois ans</h2>
          <p class="unite">Les montants sont exprimés en milliers de francs CFA.</p>
          <table>
            <thead><tr><th class="col-libelle">Poste</th>{r.annees.map((a) => <th class="num">Année {a.annee}</th>)}</tr></thead>
            <tbody>{lignes.map(([l, f, fort]) => <tr class={fort ? 'fort' : ''}><td>{l}</td>{r.annees.map((a) => <td class={`num ${f(a) < 0 ? 'neg' : ''}`}>{milliers(f(a))}</td>)}</tr>)}</tbody>
          </table>
          <h2 id="mensuel"><span class="n">{n}.3</span>Les douze premiers mois</h2>
          <p class="unite">Les montants sont exprimés en milliers de francs CFA.</p>
          <table>
            <thead><tr><th>Mois</th><th class="num">{p.modele === 'vente' ? 'Unités' : p.modele === 'mrr' ? 'Abonnés' : 'Boîtiers'}</th><th class="num">Chiffre d’affaires</th><th class="num">Coûts totaux</th><th class="num">Résultat du mois</th><th class="num">Flux de trésorerie</th><th class="num">Trésorerie cumulée</th></tr></thead>
            <tbody>{m12.map((m) => <tr><td>{libelleMois(d, m.m)}</td><td class="num">{nombre(m.volume)}</td><td class="num">{milliers(m.ca)}</td><td class="num">{milliers(m.ca - m.resultatNet)}</td><td class={`num ${m.resultatNet < 0 ? 'neg' : ''}`}>{milliers(m.resultatNet)}</td><td class={`num ${m.fluxNet < 0 ? 'neg' : ''}`}>{milliers(m.fluxNet)}</td><td class={`num ${m.tresorerie < 0 ? 'neg' : ''}`}>{milliers(m.tresorerie)}</td></tr>)}</tbody>
          </table>
          <p class="note">Le flux de trésorerie du premier mois inclut les apports, le prêt et les achats d’équipements. Le résultat tient compte des amortissements, qui ne sortent pas de la trésorerie.</p>
          <h2 id="tresorerie"><span class="n">{n}.4</span>Trajectoire de trésorerie</h2>
          <div class="graphe">
            <LineChart palette={PALETTE_DOC} hauteur={330} labels={sc.base.mois.slice(0, 12).map((m) => libelleMois(d, m.m).replace(/\s\d+$/, ''))}
              series={[
                { nom: 'Trésorerie cumulée, scénario prudent', valeurs: sc.prudent.mois.slice(0, 12).map((m) => m.tresorerie) },
                { nom: 'Scénario de base', valeurs: sc.base.mois.slice(0, 12).map((m) => m.tresorerie) },
                { nom: 'Scénario ambitieux', valeurs: sc.ambitieux.mois.slice(0, 12).map((m) => m.tresorerie) }
              ]} />
          </div>
          <div class="graphe">
            <BarChart palette={{ ...PALETTE_DOC, bars: ['#C8642A', '#E8DCC8'] }} hauteur={300} labels={lab12}
              series={[{ nom: 'Revenus du mois, scénario de base', valeurs: m12.map((m) => m.ca) }, { nom: 'Coûts du mois, scénario de base', valeurs: m12.map((m) => m.ca - m.resultatNet) }]} />
          </div>
          <h2 id="financement"><span class="n">{n}.5</span>Plan de financement</h2>
          <p class="unite">Les montants sont exprimés en francs CFA.</p>
          <table>
            <thead><tr><th class="col-libelle">Besoins</th><th class="num">Montant</th><th class="col-libelle">Ressources</th><th class="num">Montant</th></tr></thead>
            <tbody>
              {[0, 1, 2].map((k) => (
                <tr>
                  <td>{plan.emplois[k]?.libelle ?? ''}</td><td class="num">{plan.emplois[k] ? nombre(plan.emplois[k].montant) : ''}</td>
                  <td>{plan.ressources[k]?.libelle ?? ''}</td><td class="num">{plan.ressources[k] ? nombre(plan.ressources[k].montant) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Total des besoins</td><td class="num">{nombre(plan.totalEmplois)}</td><td>Total des ressources</td><td class="num">{nombre(plan.totalRessources)}</td></tr></tfoot>
          </table>
          <p>{plan.ecart >= 0 ? `Les ressources couvrent les besoins avec une marge de sécurité de ${fcfa(plan.ecart)}.` : `Il manque ${fcfa(-plan.ecart)} pour couvrir les besoins : le financement doit être complété avant le lancement.`} Le besoin de trésorerie de démarrage correspond au creux de trésorerie qui n’est pas déjà expliqué par les investissements.</p>
        </>
      );
    }
  };
}

function scenarios(): Section {
  return {
    id: 'scenarios', titre: 'Scénarios et stress-tests',
    sous: [{ id: 'trois', titre: 'Les trois scénarios à 12 et 36 mois' }, { id: 'sensibilite', titre: 'Sensibilité et lucidité' }, { id: 'chocs', titre: 'Résistance aux chocs' }],
    rendu: ({ p, sc }, n) => {
      const ind: [string, (r: Resultat, h: 12 | 36) => string][] = [
        ['Chiffre d’affaires cumulé', (r, h) => milliers(r.mois.slice(0, h).reduce((s, m) => s + m.ca, 0))],
        ['Résultat net cumulé', (r, h) => milliers(r.mois.slice(0, h).reduce((s, m) => s + m.resultatNet, 0))],
        ['Trésorerie en fin de période', (r, h) => milliers(r.mois[h - 1].tresorerie)],
        ['Besoin de trésorerie maximal', (r) => milliers(r.indicateurs.besoinFinancement)],
        ['Premier mois bénéficiaire', (r) => (r.indicateurs.premierMoisRentable ? libelleMois(p.identite.debut, r.indicateurs.premierMoisRentable) : '—')]
      ];
      const s = sensibilite(p);
      const avec = p.chocs.length ? calculer(p, { chocs: p.chocs }) : null;
      return (
        <>
          <h2 id="trois"><span class="n">{n}.1</span>Les trois scénarios à 12 et 36 mois</h2>
          <p class="unite">Les montants sont exprimés en milliers de francs CFA.</p>
          <table>
            <thead>
              <tr class="groupe"><th></th><th colSpan={3}>À 12 mois</th><th colSpan={3}>À 36 mois</th></tr>
              <tr><th>Indicateur</th><th class="num">Prudent</th><th class="num">Base</th><th class="num">Ambitieux</th><th class="num">Prudent</th><th class="num">Base</th><th class="num">Ambitieux</th></tr>
            </thead>
            <tbody>{ind.map(([l, f]) => <tr><td>{l}</td>{([12, 36] as const).flatMap((h) => [sc.prudent, sc.base, sc.ambitieux].map((r) => <td class="num">{f(r, h)}</td>))}</tr>)}</tbody>
          </table>
          <p>Le scénario prudent retient {p.scenarios.prudent.volumePct} % des volumes de base et des coûts variables à {p.scenarios.prudent.coutsPct} %. Le scénario ambitieux retient {p.scenarios.ambitieux.volumePct} % des volumes. {sc.prudent.indicateurs.ruptureTresorerie ? `Dans le scénario prudent, la trésorerie devient négative en ${libelleMoisLong(p.identite.debut, sc.prudent.indicateurs.ruptureTresorerie)} : c’est la situation à préparer avec le partenaire financier.` : 'Même dans le scénario prudent, la trésorerie reste positive sur toute la période.'}</p>
          <h2 id="sensibilite"><span class="n">{n}.2</span>Sensibilité et lucidité</h2>
          <p>Le graphique montre l’effet d’une erreur de 10 % sur chaque hypothèse, sur le résultat net de la première année ({fcfa(s.reference)} dans le scénario de base). L’hypothèse la plus sensible est <strong>{(s.lignes[0]?.hypothese || '').toLowerCase()}</strong> : c’est elle qu’il faut prouver en priorité, par des devis, des préventes ou des lettres d’intention.</p>
          <div class="graphe"><Tornado lignes={s.lignes} palette={{ ...PALETTE_DOC, series: ['#B9A88F', '#C8642A'] }} /></div>
          <h2 id="chocs"><span class="n">{n}.3</span>Résistance aux chocs</h2>
          {avec ? (
            <>
              <p>{p.chocs.length > 1 ? `Les ${p.chocs.length} chocs suivants ont été appliqués ensemble` : 'Le choc suivant a été appliqué'} au scénario de base.</p>
              <table>
                <thead><tr><th>Choc</th><th>Période</th><th>Paramètre</th></tr></thead>
                <tbody>{p.chocs.map((c) => {
                  const def = defChoc(c.type);
                  return <tr><td>{def.titre}</td><td>{def.duree === 'permanent' ? `dès ${libelleMois(p.identite.debut, c.mois)}` : def.duree === 'ponctuel' ? libelleMois(p.identite.debut, c.mois) : `${libelleMois(p.identite.debut, c.mois)}, ${c.duree} mois`}</td><td>{def.valeur ? `${nombre(c.valeur)} ${def.valeur.unite}` : '—'}</td></tr>;
                })}</tbody>
              </table>
              <table>
                <thead><tr><th class="col-libelle">Indicateur</th><th class="num">Sans choc</th><th class="num">Avec chocs</th></tr></thead>
                <tbody>
                  <tr><td>Résultat net de l’année 1</td><td class="num">{nombre(sc.base.annees[0].resultatNet)}</td><td class="num">{nombre(avec.annees[0].resultatNet)}</td></tr>
                  <tr><td>Besoin de trésorerie maximal</td><td class="num">{nombre(sc.base.indicateurs.besoinFinancement)}</td><td class="num">{nombre(avec.indicateurs.besoinFinancement)}</td></tr>
                  <tr><td>Trésorerie la plus basse sur 12 mois</td><td class="num">{nombre(Math.min(...sc.base.mois.slice(0, 12).map((m) => m.tresorerie)))}</td><td class="num">{nombre(Math.min(...avec.mois.slice(0, 12).map((m) => m.tresorerie)))}</td></tr>
                </tbody>
              </table>
              <div class="encadre">
                <div class="titre">Conclusion du stress-test</div>
                <p>{avec.indicateurs.ruptureTresorerie ? `La trésorerie ne résiste pas : elle devient négative en ${libelleMoisLong(p.identite.debut, avec.indicateurs.ruptureTresorerie)}. Une réserve supplémentaire de ${fcfa(Math.max(0, -Math.min(...avec.mois.map((m) => m.tresorerie))))} serait nécessaire.` : 'Le projet absorbe ces chocs sans rupture de trésorerie.'}</p>
              </div>
            </>
          ) : <p class="note">Aucun choc n’a été appliqué dans le simulateur. Les stress-tests de Gemula Learn permettent de vérifier la résistance du projet à dix imprévus courants.</p>}
        </>
      );
    }
  };
}

function strategie(): Section {
  return {
    id: 'strategie', titre: 'Stratégie et risques',
    sous: [{ id: 'swot', titre: 'Analyse SWOT' }, { id: 'risques', titre: 'Risques et parades' }, { id: 'route', titre: 'Feuille de route' }],
    rendu: ({ p }, n) => {
      const r = p.rapport;
      const risques = [...p.risques].sort((a, b) => criticite(b) - criticite(a));
      return (
        <>
          <h2 id="swot"><span class="n">{n}.1</span>Analyse SWOT</h2>
          <div class="swot">
            <div><div class="t">Forces</div><p>{T(r.forces) ?? <span class="vide">Non renseigné</span>}</p></div>
            <div><div class="t">Faiblesses</div><p>{T(r.faiblesses) ?? <span class="vide">Non renseigné</span>}</p></div>
            <div><div class="t">Opportunités</div><p>{T(r.opportunites) ?? <span class="vide">Non renseigné</span>}</p></div>
            <div><div class="t">Menaces</div><p>{T(r.menaces) ?? <span class="vide">Non renseigné</span>}</p></div>
          </div>
          {(T(r.contraintes) || T(r.delaiLancement) || T(p.identite.formeJuridique)) && (
            <table>
              <thead><tr><th class="col-libelle">Cadre</th><th>Contenu</th></tr></thead>
              <tbody>
                {T(p.identite.formeJuridique) && <tr><td>Forme juridique</td><td>{p.identite.formeJuridique}</td></tr>}
                {T(r.delaiLancement) && <tr><td>Délai de lancement</td><td>{r.delaiLancement}</td></tr>}
                {T(r.contraintes) && <tr><td>Contraintes réglementaires</td><td>{r.contraintes}</td></tr>}
              </tbody>
            </table>
          )}
          <h2 id="risques"><span class="n">{n}.2</span>Risques et parades</h2>
          {risques.length ? (
            <table>
              <thead><tr><th>Risque</th><th class="num">Probabilité</th><th class="num">Impact</th><th>Criticité</th><th>Parade</th></tr></thead>
              <tbody>{risques.map((x) => <tr><td>{x.risque}</td><td class="num">{x.probabilite} / 3</td><td class="num">{x.impact} / 3</td><td>{niveauRisque(criticite(x))}</td><td>{x.parade || '—'}</td></tr>)}</tbody>
            </table>
          ) : <p class="note">Aucun risque renseigné.</p>}
          <h2 id="route"><span class="n">{n}.3</span>Feuille de route</h2>
          {p.jalons.length ? (
            <table>
              <thead><tr><th>Échéance</th><th>Jalon</th><th>Indicateur de réussite</th></tr></thead>
              <tbody>{[...p.jalons].sort((a, b) => a.mois - b.mois).map((x) => <tr><td>{libelleMois(p.identite.debut, x.mois)}</td><td>{x.jalon}</td><td>{x.indicateur || '—'}</td></tr>)}</tbody>
            </table>
          ) : <p class="note">Aucun jalon renseigné.</p>}
        </>
      );
    }
  };
}

function bancable(): Section {
  return {
    id: 'bancabilite', titre: 'Bancabilité et points de vigilance',
    sous: [{ id: 'criteres', titre: 'Grille de bancabilité' }, { id: 'vigilance', titre: 'Points de vigilance' }],
    rendu: ({ p, r }, n) => {
      const b = bancabilite(p, r);
      const al = alertes(p, r);
      return (
        <>
          <h2 id="criteres"><span class="n">{n}.1</span>Grille de bancabilité</h2>
          <p>La grille reprend les critères qu’un analyste crédit examine en premier. Le score pondère chaque critère selon son importance ; un critère sans objet, comme la capacité de remboursement sans emprunt, est exclu du calcul.</p>
          <table>
            <thead><tr><th>Critère</th><th>Valeur du projet</th><th>Attendu</th><th class="num">Poids</th><th>Statut</th></tr></thead>
            <tbody>{b.criteres.map((c) => <tr><td>{c.critere}</td><td>{c.valeur}</td><td>{c.seuil}</td><td class="num">{c.poids}</td><td class={c.ok === null ? 'na' : c.ok ? 'ok' : 'ko'}>{c.ok === null ? 'Sans objet' : c.ok ? 'Satisfait' : 'À améliorer'}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={3}>Score de bancabilité</td><td class="num" colSpan={2}>{b.score} / 100 · {b.niveau}</td></tr></tfoot>
          </table>
          <h2 id="vigilance"><span class="n">{n}.2</span>Points de vigilance</h2>
          {al.length ? (
            <div class="encadre">
              <div class="titre">À traiter avant le comité de crédit</div>
              <ol>{al.map((a) => <li>{a.message}</li>)}</ol>
            </div>
          ) : <p>Aucune incohérence n’a été détectée dans les hypothèses saisies.</p>}
          <p class="note">Les résultats sont des projections établies à partir des hypothèses du porteur. Les taux fiscaux et sociaux sont indicatifs et doivent être confirmés par un expert-comptable ou l’administration fiscale.</p>
        </>
      );
    }
  };
}

function annexes(): Section {
  return {
    id: 'annexes', titre: 'Annexes',
    sous: [{ id: 'profil', titre: 'Profil du porteur' }, { id: 'glossaire', titre: 'Glossaire' }, { id: 'signatures', titre: 'Visa' }],
    rendu: ({ p }, n) => {
      const pr = profil(p.pretest);
      return (
        <>
          <h2 id="profil"><span class="n">{n}.1</span>Profil du porteur</h2>
          {pr.complet ? <p>Le pré-test Gemula Learn situe le porteur dans le <strong>{pr.tag.toLowerCase()}</strong> ({pr.counts.A} réponses terrain, {pr.counts.B} analytiques, {pr.counts.C} à construire). {pr.texte}</p> : <p class="note">Le pré-test n’a pas été complété.</p>}
          <h2 id="glossaire"><span class="n">{n}.2</span>Glossaire</h2>
          <dl class="glossaire">
            <dt>Besoin de trésorerie maximal</dt><dd>Le point le plus bas de la trésorerie cumulée hors apports et emprunts : la somme minimale à réunir avant de lancer l’activité.</dd>
            <dt>Capacité d’autofinancement (CAF)</dt><dd>Résultat net augmenté des amortissements : l’argent réellement dégagé par l’activité.</dd>
            <dt>Capacité de remboursement</dt><dd>Excédent brut d’exploitation après impôt, divisé par les échéances du prêt de l’année. Les banques attendent au moins 1,2.</dd>
            <dt>Excédent brut d’exploitation (EBE)</dt><dd>Ce qui reste des ventes après les coûts variables, les charges fixes et le personnel, avant amortissements, intérêts et impôts.</dd>
            <dt>Point mort</dt><dd>Moment de l’année où le chiffre d’affaires cumulé couvre toutes les charges.</dd>
            <dt>LTV et CAC</dt><dd>Marge générée par un client sur sa durée de vie, et coût pour l’acquérir.</dd>
            <dt>Attrition (churn)</dt><dd>Part des abonnés qui résilient chaque mois.</dd>
          </dl>
          <h2 id="signatures"><span class="n">{n}.3</span>Visa</h2>
          <div class="signatures">
            <div><div class="t">Le porteur du projet</div><p>{T(p.identite.promoteur) ?? '________________________'}</p><p>Date : ____ / ____ / ________</p><p>Signature :</p></div>
            <div><div class="t">Le conseiller ou l’analyste</div><p>Nom : ________________________</p><p>Date : ____ / ____ / ________</p><p>Visa :</p></div>
          </div>
        </>
      );
    }
  };
}

function sectionsPour(doc: TypeDoc): Section[] {
  switch (doc) {
    case 'financier': return [planFinancier(), scenarios(), bancable()];
    case 'bpc': return [modele(), ressources(), marche(), bancable()];
    case 'simulation': return [scenarios(), planFinancier()];
    default: return [synthese(), marche(), modele(), ressources(), planFinancier(), scenarios(), strategie(), bancable(), annexes()];
  }
}

/* ---------------- Mise en page ---------------- */

function Contenu({ p, doc }: { p: Projet; doc: TypeDoc }) {
  const r = useMemo(() => calculer(p), [p]);
  const sc = useMemo(() => calculerScenarios(p), [p]);
  const sections = sectionsPour(doc);
  const t = TITRES[doc];
  const nom = T(p.identite.projet) ?? 'Projet sans nom';
  const ref = `GL-${new Date().getFullYear()}-${slug(nom).slice(0, 10).toUpperCase()}`;
  const ctx: Ctx = { p, r, sc };
  const fiche: [string, string][] = [
    ['Projet', [nom, T(p.identite.secteur)].filter(Boolean).join(', ')],
    ['Nature du document', t.surtitre + ' : ' + t.sous.charAt(0).toLowerCase() + t.sous.slice(1)],
    ['Porteur', T(p.identite.promoteur) ?? '—'],
    ['Localisation', T(p.identite.localisation) ?? '—'],
    ['Forme juridique', T(p.identite.formeJuridique) ?? 'À préciser'],
    ['Modèle économique', MODELE_TXT[p.modele]],
    ['Horizon du modèle', `36 mois à partir de ${libelleMoisLong(p.identite.debut, 1)}`],
    ['Date d’édition', dateLongue()],
    ['Référence', ref],
    ['Classification', 'Confidentiel. La diffusion exige l’accord du porteur.'],
    ['Outil', 'Gemula Learn, gemula.org']
  ];
  return (
    <div class="doc">
      <section class="couverture">
        <div class="cadre-ext" /><div class="cadre-int" />
        <div class="logo-couv"><img src={LOGO} alt="Gemula" width="900" height="578" /></div>
        <div class="surtitre">{t.surtitre}</div>
        <div class="soustitre">{t.sous}</div>
        <h1>{nom}</h1>
        <div class="trait" />
        {T(p.canvas.valeur) && <div class="devise">{p.canvas.valeur}</div>}
        {T(p.canvas.solution) && <p class="resume">{p.canvas.solution}</p>}
        <div class="pied">
          <div class="meta">{dateLongue()}{T(p.identite.localisation) ? ` · ${p.identite.localisation.split(',').pop()!.trim()}` : ''}</div>
          {T(p.identite.promoteur) && <div class="prepare">Préparé par {p.identite.promoteur}, porteur du projet</div>}
          <div class="losanges">◆◆◆</div>
          <div class="confidentiel">Document confidentiel · Pour nous les gems</div>
        </div>
      </section>

      <section class="liminaire">
        <div class="entete"><img src={LOGO} alt="Gemula" width="900" height="578" /><span>{nom}</span></div>
        <div class="label-section">Fiche du document</div>
        <div class="trait-court" />
        <table>
          <thead><tr><th style="width: 30%">Rubrique</th><th>Contenu</th></tr></thead>
          <tbody>{fiche.map(([a, b]) => <tr><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table>
        <h2 class="titre-liminaire">Conventions de lecture</h2>
        <p>Les montants sont exprimés en francs CFA (XAF). Les tableaux détaillés les présentent en milliers de francs CFA, ce que rappelle la mention placée au-dessus de chacun. Le mois 1 correspond au mois de démarrage de l’activité.</p>
        <p>Trois scénarios sont calculés : prudent, de base et ambitieux. Sauf mention contraire, les chiffres cités sont ceux du scénario de base. Les impôts, la TVA et les cotisations sociales suivent les règles indicatives retenues dans l’outil.</p>
        <div class="encadre">
          <div class="titre">Principe directeur</div>
          <p>{T(p.rapport.objectif) ?? 'Chaque hypothèse de ce dossier est chiffrée, datée et vérifiable. Les projections ne remplacent pas les preuves : devis, préventes et lettres d’intention les rendent crédibles.'}</p>
        </div>
      </section>

      <nav class="sommaire">
        <h1>Table des matières</h1>
        <div class="double-trait" />
        <ol>
          {sections.map((s, k) => (
            <li class="ch">
              <a href={`#ch-${s.id}`}><span class="n">{String(k + 1).padStart(2, '0')}</span>{s.titre}</a>
              <ol class="sous">{s.sous.map((x, j) => <li><a href={`#${s.id}-${x.id}`}><span class="n">{k + 1}.{j + 1}</span><span class="t">{x.titre}</span></a></li>)}</ol>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((s, k) => (
        <section class="chapitre" id={`ch-${s.id}`}>
          <header>
            <span class="label-section">Chapitre {String(k + 1).padStart(2, '0')}</span>
            <h1>{s.titre}</h1>
            <div class="double-trait" />
          </header>
          {s.rendu(ctx, k + 1)}
        </section>
      ))}
    </div>
  );
}

export default function Document() {
  const p = useProjet();
  const params = new URLSearchParams(location.search);
  const doc = (['complet', 'financier', 'bpc', 'simulation'].includes(params.get('doc') || '') ? params.get('doc') : 'complet') as TypeDoc;
  const source = useRef<HTMLDivElement>(null);
  const cible = useRef<HTMLDivElement>(null);
  const [etat, setEtat] = useState<'prep' | 'pret' | 'erreur'>('prep');
  const [pages, setPages] = useState(0);
  const lance = useRef(false);

  useEffect(() => {
    document.title = `${TITRES[doc].court} · ${p.identite.projet || 'Projet'} · Gemula Learn`;
    if (lance.current) return;
    lance.current = true;
    // Laisse Preact rendre le contenu, puis attend les polices avant la pagination.
    const t = setTimeout(async () => {
      try {
        await document.fonts.ready;
        const { Previewer } = await import('pagedjs');
        const previewer = new Previewer();
        const contenu = source.current!.cloneNode(true) as HTMLElement;
        // Ancres uniques : chaque sous-section est préfixée par l'identifiant de son chapitre.
        contenu.querySelectorAll('section.chapitre').forEach((sec) => {
          const pre = sec.id.replace(/^ch-/, '');
          sec.querySelectorAll('h2[id]').forEach((h) => { h.id = `${pre}-${h.id}`; });
        });
        // Les tableaux courts ne sont jamais coupés entre deux pages.
        contenu.querySelectorAll('table').forEach((t) => { if ((t as HTMLTableElement).rows.length <= 16) t.classList.add('court'); });
        source.current!.remove();
        const flow = await previewer.preview(contenu.innerHTML, [{ [location.origin + '/doc.css']: docCss }], cible.current!);
        setPages(flow.total);
        setEtat('pret');
      } catch (e) {
        console.error(e);
        setEtat('erreur');
      }
    }, 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div class="barre no-print">
        <a href="/dossier" class="b-lien">← Retour au dossier</a>
        <span class="b-titre">{TITRES[doc].court}{etat === 'pret' ? ` · ${pages} pages` : ''}</span>
        <span class="b-actions">
          {etat === 'prep' && <span class="b-etat">Mise en page…</span>}
          {etat === 'erreur' && <span class="b-etat">La mise en page a échoué. Rechargez la page.</span>}
          <button type="button" class="b-btn" disabled={etat !== 'pret'} onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
        </span>
      </div>
      <div ref={source} class="source"><Contenu p={p} doc={doc} /></div>
      <div ref={cible} class="pages" />
    </>
  );
}
