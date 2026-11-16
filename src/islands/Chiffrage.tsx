import { modifier, useProjet } from '../lib/store';
import { uid, FISCALITE_CAMEROUN, type Projet } from '../lib/model';
import { alertes } from '../lib/analyse';
import { fcfa, nombre, pct, libelleMoisLong } from '../lib/format';
import { prompt } from '../lib/prompts';
import { echeancierPret } from '../lib/engine';
import { AddBtn, Alertes, Bloc, DelBtn, Kpi, Num, NumInput, PromptBox, Select, useCalcul } from './ui';
import { ChoixModele } from './CanvasForm';

type ListeCle = 'produits' | 'coutsVariables' | 'equipements' | 'personnel' | 'chargesFixes' | 'concurrents' | 'cibles';

/** Met à jour un champ d'une ligne d'une liste du projet. */
function maj<K extends ListeCle>(cle: K, id: string, champ: string, valeur: unknown) {
  modifier((d) => {
    const ligne = (d[cle] as any[]).find((x) => x.id === id);
    if (ligne) ligne[champ] = valeur;
  });
}
const suppr = (cle: ListeCle, id: string) => modifier((d) => { (d as any)[cle] = (d[cle] as any[]).filter((x) => x.id !== id); });
const ajout = (cle: ListeCle, ligne: object) => modifier((d) => { (d[cle] as any[]).push({ id: uid(), ...ligne }); });

const txt = (cle: ListeCle, id: string, champ: string, v: string, ph = '') => (
  <input class="field" type="text" value={v} placeholder={ph} aria-label={champ} onInput={(e) => maj(cle, id, champ, (e.target as HTMLInputElement).value)} />
);
const nb = (cle: ListeCle, id: string, champ: string, v: number, label: string, max?: number) => (
  <NumInput value={v} label={label} max={max} onChange={(x) => maj(cle, id, champ, x)} />
);
const moisOptions = Array.from({ length: 36 }, (_, i) => i + 1);
const selMois = (cle: ListeCle, id: string, champ: string, v: number) => (
  <select class="field" value={String(v)} aria-label="Mois" onChange={(e) => maj(cle, id, champ, Number((e.target as HTMLSelectElement).value))}>
    {moisOptions.map((m) => <option value={String(m)}>M{m}</option>)}
  </select>
);

function Revenus({ p }: { p: Projet }) {
  const cvCommun = p.coutsVariables.reduce((s, c) => s + c.montant, 0);
  if (p.modele === 'vente') {
    const total = p.produits.reduce((s, x) => s + x.prix * x.quantiteM1, 0);
    return (
      <>
        <div class="table-wrap">
          <table class="t">
            <thead><tr><th>Produit ou service</th><th class="num">Prix de vente</th><th class="num">Coût unitaire</th><th class="num">Quantité au mois 1</th><th class="num">Marge unitaire</th><th></th></tr></thead>
            <tbody>
              {p.produits.map((x) => {
                const marge = x.prix - x.coutUnitaire - cvCommun;
                return (
                  <tr>
                    <td style="min-width: 180px">{txt('produits', x.id, 'nom', x.nom, 'Produit ou service')}</td>
                    <td style="min-width: 120px">{nb('produits', x.id, 'prix', x.prix, 'Prix de vente')}</td>
                    <td style="min-width: 120px">{nb('produits', x.id, 'coutUnitaire', x.coutUnitaire, 'Coût unitaire')}</td>
                    <td style="min-width: 110px">{nb('produits', x.id, 'quantiteM1', x.quantiteM1, 'Quantité au mois 1')}</td>
                    <td class={`num ${marge < 0 ? 'neg' : ''}`}>{nombre(marge)}</td>
                    <td><DelBtn onClick={() => suppr('produits', x.id)} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td colSpan={3}>Chiffre d'affaires du mois 1</td><td class="num" colSpan={2}>{fcfa(total)}</td><td></td></tr></tfoot>
          </table>
        </div>
        <AddBtn onClick={() => ajout('produits', { nom: '', prix: 0, coutUnitaire: 0, quantiteM1: 0 })}>Ajouter un produit</AddBtn>
        <p class="hint" style="margin-top: 10px">Le coût unitaire couvre la matière propre au produit. Les coûts communs à toutes les unités (livraison, emballage, commission) se saisissent dans le bloc suivant. La quantité est celle que vous êtes sûr de vendre le premier mois, pas votre objectif.</p>
      </>
    );
  }
  if (p.modele === 'mrr') {
    const s = (k: keyof Projet['mrr']) => (v: number) => modifier((d) => { d.mrr[k] = v; });
    return (
      <div class="grid-3">
        <Num label="Prix de l'abonnement mensuel" value={p.mrr.prix} onChange={s('prix')} suffix="FCFA" />
        <Num label="Coût de service par abonné et par mois" value={p.mrr.coutVariable} onChange={s('coutVariable')} suffix="FCFA" />
        <Num label="Taux d'attrition mensuel (churn)" value={p.mrr.churnPct} onChange={s('churnPct')} suffix="%" max={100} hint="Part des abonnés qui partent chaque mois." />
        <Num label="Abonnés déjà acquis au démarrage" value={p.mrr.abonnesInitiaux} onChange={s('abonnesInitiaux')} />
        <Num label="Nouveaux abonnés au mois 1" value={p.mrr.nouveauxM1} onChange={s('nouveauxM1')} hint="Évolue ensuite selon le profil de croissance." />
      </div>
    );
  }
  const s = (k: keyof Projet['boitier']) => (v: number) => modifier((d) => { d.boitier[k] = v; });
  return (
    <div class="grid-3">
      <Num label="Prix du boîtier ou de l'installation" value={p.boitier.prix} onChange={s('prix')} suffix="FCFA" />
      <Num label="Coût unitaire du boîtier" value={p.boitier.coutVariable} onChange={s('coutVariable')} suffix="FCFA" />
      <Num label="Boîtiers vendus au mois 1" value={p.boitier.ventesM1} onChange={s('ventesM1')} />
      <Num label="Abonnement mensuel" value={p.boitier.prixAbonnement} onChange={s('prixAbonnement')} suffix="FCFA" />
      <Num label="Coût de service par abonné" value={p.boitier.coutVariableAbonnement} onChange={s('coutVariableAbonnement')} suffix="FCFA" />
      <Num label="Délai avant le premier abonnement" value={p.boitier.delaiMois} onChange={s('delaiMois')} suffix="mois" max={12} />
      <Num label="Taux d'attrition mensuel (churn)" value={p.boitier.churnPct} onChange={s('churnPct')} suffix="%" max={100} />
    </div>
  );
}

function Synthese({ p }: { p: Projet }) {
  const r = useCalcul(p);
  const [a1, a2, a3] = r.annees;
  const i = r.indicateurs;
  const al = alertes(p, r);
  return (
    <div class="stack" style="--gap: 12px">
      <div class="card" style="padding: 18px">
        <div class="row between"><h2 style="font-size: 1rem">Synthèse en direct</h2><span class="tag">Scénario de base</span></div>
        <div class="grid-4" style="grid-template-columns: 1fr 1fr; margin-top: 14px">
          <Kpi label="CA année 1" value={nombre(a1.ca)} sub="FCFA" />
          <Kpi label="Résultat net an 1" value={nombre(a1.resultatNet)} sub="FCFA" tone={a1.resultatNet >= 0 ? 'ok' : 'ko'} />
          <Kpi label="Résultat net an 2" value={nombre(a2.resultatNet)} sub="FCFA" tone={a2.resultatNet >= 0 ? 'ok' : 'ko'} />
          <Kpi label="Résultat net an 3" value={nombre(a3.resultatNet)} sub="FCFA" tone={a3.resultatNet >= 0 ? 'ok' : 'ko'} />
          <Kpi label="Besoin de trésorerie" value={nombre(i.besoinFinancement)} sub={i.moisCreux ? `creux en ${libelleMoisLong(p.identite.debut, i.moisCreux)}` : 'FCFA'} tone="hi" />
          <Kpi label="Marge sur coûts var." value={pct(i.tauxMargeVariable * 100)} />
          <Kpi label="Point mort" value={i.pointMortJours !== null && i.pointMortJours <= 360 ? `${i.pointMortJours} j` : 'Non atteint'} sub="en année 1" />
          <Kpi label="1er mois bénéficiaire" value={i.premierMoisRentable ? `M${i.premierMoisRentable}` : '—'} />
          {i.ltv !== null && <Kpi label="LTV (marge)" value={nombre(i.ltv)} sub="FCFA par client" />}
          {i.ltv !== null && <Kpi label="LTV / CAC" value={i.ltvSurCac !== null ? i.ltvSurCac.toFixed(1).replace('.', ',') : '—'} sub={i.cac ? `CAC ${nombre(i.cac)}` : 'renseignez le marketing'} tone={i.ltvSurCac === null ? '' : i.ltvSurCac >= 3 ? 'ok' : 'ko'} />}
        </div>
        <a href="/simulateur" class="btn btn-primary btn-sm" style="width: 100%; margin-top: 14px">Voir la projection détaillée</a>
      </div>
      <Alertes liste={al} max={5} />
    </div>
  );
}

const SECTIONS = [
  ['revenus', 'Revenus'], ['variables', 'Coûts variables'], ['equipements', 'Équipements'], ['personnel', 'Personnel'],
  ['charges', 'Charges fixes'], ['marche', 'Marché'], ['financement', 'Financement'], ['fiscalite', 'Fiscalité']
];

export default function Chiffrage() {
  const p = useProjet();
  const totalCV = p.coutsVariables.reduce((s, c) => s + c.montant, 0);
  const totalAm = p.equipements.reduce((s, x) => s + (x.dureeMois ? (x.quantite * x.prixUnitaire) / x.dureeMois : 0), 0);
  const totalInv = p.equipements.reduce((s, x) => s + x.quantite * x.prixUnitaire, 0);
  const totalSal = p.personnel.reduce((s, x) => s + x.effectif * x.salaireBrut, 0);
  const totalFixes = p.chargesFixes.reduce((s, x) => s + x.montant, 0) + p.marketingMensuel;
  const f = p.financement;
  const pret = echeancierPret(f.pretMontant, f.pretTauxAnnuelPct, f.pretDureeMois, f.pretDiffereMois);
  const mensualite = pret.find((x) => x.capital > 0);
  const fi = p.fiscalite;
  const setF = (k: keyof Projet['financement']) => (v: number) => modifier((d) => { d.financement[k] = v; });
  const setFi = <K extends keyof Projet['fiscalite']>(k: K) => (v: Projet['fiscalite'][K]) => modifier((d) => { d.fiscalite[k] = v; });

  return (
    <div class="layout-aside">
      <div class="stack" style="--gap: 20px">
        <nav class="card sec-nav" aria-label="Sections du chiffrage">
          {SECTIONS.map(([id, t], k) => <a href={`#${id}`}><span class="n">{String(k + 1).padStart(2, '0')}</span>{t}</a>)}
        </nav>

        <Bloc id="revenus" idx="01" titre="Modèle économique et revenus" sous="Choisissez comment vous gagnez de l'argent, puis décrivez votre point de départ réaliste.">
          <ChoixModele />
          <div style="height: 20px" />
          <Revenus p={p} />
          <div class="grid-2" style="margin-top: 20px">
            <Select label="Mois de démarrage de l'activité" value={p.identite.debut}
              options={Array.from({ length: 24 }, (_, k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 6 + k); const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return { v, t: libelleMoisLong(v, 1) }; })}
              onChange={(v) => modifier((d) => { d.identite.debut = v; })} />
            <Num label="Rémunération mensuelle visée par le porteur" value={p.salaireCible} onChange={(v) => modifier((d) => { d.salaireCible = v; })} suffix="FCFA" hint="Indicateur : à partir de quand l'activité peut vous payer." />
          </div>
        </Bloc>

        <Bloc id="variables" idx="02" titre="Coûts variables communs" sous="Coûts payés à chaque unité vendue, quel que soit le produit : livraison, emballage, commission mobile money…">
          <div class="table-wrap">
            <table class="t">
              <thead><tr><th>Désignation</th><th class="num">Coût par unité</th><th></th></tr></thead>
              <tbody>
                {p.coutsVariables.map((x) => (
                  <tr><td>{txt('coutsVariables', x.id, 'libelle', x.libelle, 'Ex. Livraison')}</td><td style="width: 160px">{nb('coutsVariables', x.id, 'montant', x.montant, 'Coût par unité')}</td><td style="width: 44px"><DelBtn onClick={() => suppr('coutsVariables', x.id)} /></td></tr>
                ))}
                {!p.coutsVariables.length && <tr><td colSpan={3} class="muted small">Aucun coût commun.</td></tr>}
              </tbody>
              <tfoot><tr><td>Total par unité</td><td class="num">{fcfa(totalCV)}</td><td></td></tr></tfoot>
            </table>
          </div>
          <AddBtn onClick={() => ajout('coutsVariables', { libelle: '', montant: 0 })}>Ajouter un coût variable</AddBtn>
        </Bloc>

        <Bloc id="equipements" idx="03" titre="Équipements et investissements" sous="L'achat sort de la trésorerie le mois indiqué ; l'amortissement répartit son coût dans le résultat.">
          <div class="table-wrap">
            <table class="t">
              <thead><tr><th>Équipement</th><th class="num">Qté</th><th class="num">Prix unitaire</th><th class="num">Durée (mois)</th><th>Achat</th><th class="num">Amort. / mois</th><th></th></tr></thead>
              <tbody>
                {p.equipements.map((x) => (
                  <tr>
                    <td style="min-width: 170px">{txt('equipements', x.id, 'libelle', x.libelle, 'Équipement')}</td>
                    <td style="min-width: 70px">{nb('equipements', x.id, 'quantite', x.quantite, 'Quantité')}</td>
                    <td style="min-width: 120px">{nb('equipements', x.id, 'prixUnitaire', x.prixUnitaire, 'Prix unitaire')}</td>
                    <td style="min-width: 90px">{nb('equipements', x.id, 'dureeMois', x.dureeMois, 'Durée d’amortissement')}</td>
                    <td style="min-width: 86px">{selMois('equipements', x.id, 'moisAchat', x.moisAchat)}</td>
                    <td class="num">{nombre(x.dureeMois ? (x.quantite * x.prixUnitaire) / x.dureeMois : 0)}</td>
                    <td><DelBtn onClick={() => suppr('equipements', x.id)} /></td>
                  </tr>
                ))}
                {!p.equipements.length && <tr><td colSpan={7} class="muted small">Aucun équipement.</td></tr>}
              </tbody>
              <tfoot><tr><td colSpan={2}>Total</td><td class="num">{nombre(totalInv)}</td><td colSpan={2}></td><td class="num">{nombre(totalAm)}</td><td></td></tr></tfoot>
            </table>
          </div>
          <AddBtn onClick={() => ajout('equipements', { libelle: '', quantite: 1, prixUnitaire: 0, dureeMois: 36, moisAchat: 1 })}>Ajouter un équipement</AddBtn>
        </Bloc>

        <Bloc id="personnel" idx="04" titre="Personnel" sous="Salaires bruts mensuels. Les cotisations patronales CNPS sont ajoutées automatiquement quand la fiscalité est active.">
          <div class="table-wrap">
            <table class="t">
              <thead><tr><th>Poste</th><th class="num">Effectif</th><th class="num">Salaire brut / mois</th><th>Embauche</th><th class="num">Total / mois</th><th></th></tr></thead>
              <tbody>
                {p.personnel.map((x) => (
                  <tr>
                    <td style="min-width: 170px">{txt('personnel', x.id, 'poste', x.poste, 'Poste')}</td>
                    <td style="min-width: 70px">{nb('personnel', x.id, 'effectif', x.effectif, 'Effectif')}</td>
                    <td style="min-width: 130px">{nb('personnel', x.id, 'salaireBrut', x.salaireBrut, 'Salaire brut')}</td>
                    <td style="min-width: 86px">{selMois('personnel', x.id, 'moisDebut', x.moisDebut)}</td>
                    <td class="num">{nombre(x.effectif * x.salaireBrut)}</td>
                    <td><DelBtn onClick={() => suppr('personnel', x.id)} /></td>
                  </tr>
                ))}
                {!p.personnel.length && <tr><td colSpan={6} class="muted small">Aucun salarié. Pensez à vous rémunérer vous-même si l'activité vous occupe à plein temps.</td></tr>}
              </tbody>
              <tfoot><tr><td colSpan={4}>Masse salariale brute à pleine charge</td><td class="num">{nombre(totalSal)}</td><td></td></tr></tfoot>
            </table>
          </div>
          <AddBtn onClick={() => ajout('personnel', { poste: '', effectif: 1, salaireBrut: 0, moisDebut: 1 })}>Ajouter un poste</AddBtn>
        </Bloc>

        <Bloc id="charges" idx="05" titre="Charges fixes mensuelles" sous="Dépenses qui tombent chaque mois, que vous vendiez ou non.">
          <div class="table-wrap">
            <table class="t">
              <thead><tr><th>Charge</th><th class="num">Montant / mois</th><th>Depuis</th><th>TVA</th><th></th></tr></thead>
              <tbody>
                {p.chargesFixes.map((x) => (
                  <tr>
                    <td style="min-width: 180px">{txt('chargesFixes', x.id, 'libelle', x.libelle, 'Charge')}</td>
                    <td style="min-width: 130px">{nb('chargesFixes', x.id, 'montant', x.montant, 'Montant mensuel')}</td>
                    <td style="min-width: 86px">{selMois('chargesFixes', x.id, 'moisDebut', x.moisDebut)}</td>
                    <td><label class="check" title="Facturée avec TVA récupérable"><input type="checkbox" checked={x.soumisTVA} onChange={(e) => maj('chargesFixes', x.id, 'soumisTVA', (e.target as HTMLInputElement).checked)} /><span class="sr-only">Soumise à TVA</span></label></td>
                    <td><DelBtn onClick={() => suppr('chargesFixes', x.id)} /></td>
                  </tr>
                ))}
                <tr>
                  <td>Marketing et communication</td>
                  <td><NumInput value={p.marketingMensuel} label="Budget marketing mensuel" onChange={(v) => modifier((d) => { d.marketingMensuel = v; })} /></td>
                  <td class="small muted">M1</td><td></td><td></td>
                </tr>
              </tbody>
              <tfoot><tr><td>Total à pleine charge</td><td class="num">{fcfa(totalFixes)}</td><td colSpan={3}></td></tr></tfoot>
            </table>
          </div>
          <AddBtn onClick={() => ajout('chargesFixes', { libelle: '', montant: 0, moisDebut: 1, soumisTVA: false })}>Ajouter une charge fixe</AddBtn>
          <p class="hint" style="margin-top: 10px">Le budget marketing sert aussi à calculer le coût d'acquisition d'un client (CAC) pour les modèles à abonnement.</p>
        </Bloc>

        <Bloc id="marche" idx="06" titre="Marché : concurrents et clients cibles">
          <h3 class="label" style="margin-bottom: 8px">Concurrents</h3>
          <div class="table-wrap">
            <table class="t">
              <thead><tr><th>Concurrent</th><th>Position prix</th><th>Point faible</th><th></th></tr></thead>
              <tbody>
                {p.concurrents.map((x) => (
                  <tr>
                    <td style="min-width: 160px">{txt('concurrents', x.id, 'nom', x.nom, 'Nom ou type d’acteur')}</td>
                    <td style="min-width: 160px">
                      <select class="field" value={x.positionPrix} aria-label="Position prix" onChange={(e) => maj('concurrents', x.id, 'positionPrix', (e.target as HTMLSelectElement).value)}>
                        <option value="">Choisir</option><option>Moins cher que moi</option><option>Prix similaire</option><option>Plus cher que moi</option>
                      </select>
                    </td>
                    <td style="min-width: 160px">{txt('concurrents', x.id, 'pointFaible', x.pointFaible, 'Point faible')}</td>
                    <td><DelBtn onClick={() => suppr('concurrents', x.id)} /></td>
                  </tr>
                ))}
                {!p.concurrents.length && <tr><td colSpan={4} class="muted small">Aucun concurrent : un banquier n'y croira pas. Même l'informel compte.</td></tr>}
              </tbody>
            </table>
          </div>
          <AddBtn onClick={() => ajout('concurrents', { nom: '', positionPrix: '', pointFaible: '' })}>Ajouter un concurrent</AddBtn>
          <h3 class="label" style="margin: 24px 0 8px">Clients cibles</h3>
          <div class="table-wrap">
            <table class="t">
              <thead><tr><th>Profil</th><th class="num">Nombre / mois</th><th>Fréquence</th><th></th></tr></thead>
              <tbody>
                {p.cibles.map((x) => (
                  <tr>
                    <td style="min-width: 180px">{txt('cibles', x.id, 'profil', x.profil, 'Profil client')}</td>
                    <td style="min-width: 100px">{nb('cibles', x.id, 'nombreMois', x.nombreMois, 'Nombre par mois')}</td>
                    <td style="min-width: 160px">
                      <select class="field" value={x.frequence} aria-label="Fréquence" onChange={(e) => maj('cibles', x.id, 'frequence', (e.target as HTMLSelectElement).value)}>
                        <option value="">Choisir</option><option>Achat unique</option><option>1 fois/mois</option><option>2 fois/mois</option><option>1 fois/semaine</option><option>Abonnement mensuel</option>
                      </select>
                    </td>
                    <td><DelBtn onClick={() => suppr('cibles', x.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AddBtn onClick={() => ajout('cibles', { profil: '', nombreMois: 0, frequence: '' })}>Ajouter un profil client</AddBtn>
          <PromptBox titre="Analyse concurrentielle" texte={prompt('concurrents').texte(p)} />
        </Bloc>

        <Bloc id="financement" idx="07" titre="Financement" sous="Les ressources sont encaissées au mois 1. Le besoin de financement est calculé sans elles, pour vérifier qu'elles suffisent.">
          <div class="grid-3">
            <Num label="Apport personnel" value={f.apport} onChange={setF('apport')} suffix="FCFA" />
            <Num label="Subventions et dons" value={f.subvention} onChange={setF('subvention')} suffix="FCFA" />
            <Num label="Montant du prêt" value={f.pretMontant} onChange={setF('pretMontant')} suffix="FCFA" />
            <Num label="Taux d'intérêt annuel" value={f.pretTauxAnnuelPct} onChange={setF('pretTauxAnnuelPct')} suffix="%" max={60} />
            <Num label="Durée totale du prêt" value={f.pretDureeMois} onChange={setF('pretDureeMois')} suffix="mois" max={120} />
            <Num label="Différé de remboursement" value={f.pretDiffereMois} onChange={setF('pretDiffereMois')} suffix="mois" max={24} hint="Intérêts seuls pendant le différé." />
          </div>
          {f.pretMontant > 0 && mensualite && (
            <p class="small muted" style="margin-top: 14px">Mensualité après différé : <strong style="color: var(--fg)">{fcfa(mensualite.capital + mensualite.interets)}</strong>. Coût total du crédit : {fcfa(pret.reduce((s, x) => s + x.interets, 0))}.</p>
          )}
        </Bloc>

        <Bloc id="fiscalite" idx="08" titre="Fiscalité camerounaise" sous="Valeurs indicatives 2026, modifiables. Faites-les valider par un expert-comptable ou le centre des impôts de rattachement."
          actions={<label class="check"><input type="checkbox" checked={fi.active} onChange={(e) => setFi('active')((e.target as HTMLInputElement).checked)} />Activer</label>}>
          {fi.active ? (
            <div class="stack" style="--gap: 20px">
              <div class="grid-2">
                <Select label="Régime d'imposition" value={fi.regime} onChange={setFi('regime')}
                  options={[{ v: 'igs', t: 'Impôt général synthétique (petites entreprises)' }, { v: 'reel', t: 'Régime du réel : impôt sur les sociétés' }]}
                  hint={fi.regime === 'igs' ? 'Impôt calculé sur le chiffre d’affaires.' : 'Acompte mensuel sur le CA, puis régularisation à la clôture avec report des déficits.'} />
                {fi.regime === 'igs'
                  ? <Num label="Taux de l'IGS" value={fi.tauxIGS} onChange={setFi('tauxIGS')} suffix="% du CA" max={20} />
                  : <div class="grid-2"><Num label="Taux de l'IS" value={fi.tauxIS} onChange={setFi('tauxIS')} suffix="%" max={50} /><Num label="Minimum de perception" value={fi.tauxMinimum} onChange={setFi('tauxMinimum')} suffix="% du CA" max={10} /></div>}
              </div>
              <div class="grid-3">
                <Field2 label="TVA">
                  <label class="check"><input type="checkbox" checked={fi.tvaAssujetti} onChange={(e) => setFi('tvaAssujetti')((e.target as HTMLInputElement).checked)} />Assujetti à la TVA</label>
                </Field2>
                {fi.tvaAssujetti && <Num label="Taux de TVA" value={fi.tauxTVA} onChange={setFi('tauxTVA')} suffix="%" max={30} hint="Les prix saisis sont alors hors taxes." />}
                <Num label="Cotisations CNPS patronales" value={fi.tauxCNPSPatronal} onChange={setFi('tauxCNPSPatronal')} suffix="%" max={30} />
                <Num label="Plafond mensuel CNPS" value={fi.plafondCNPS} onChange={setFi('plafondCNPS')} suffix="FCFA" />
              </div>
              <button type="button" class="btn btn-quiet btn-sm" style="align-self: flex-start" onClick={() => modifier((d) => { d.fiscalite = { ...FISCALITE_CAMEROUN, active: true, regime: d.fiscalite.regime, tvaAssujetti: d.fiscalite.tvaAssujetti }; })}>Rétablir les taux par défaut</button>
            </div>
          ) : <p class="muted small">Fiscalité désactivée : aucun impôt, aucune TVA ni cotisation sociale ne sont calculés.</p>}
        </Bloc>

        <div class="row" style="justify-content: flex-end"><a href="/simulateur" class="btn btn-primary">Continuer vers le simulateur</a></div>
      </div>
      <aside class="aside-sticky"><Synthese p={p} /></aside>
      <style>{`
        .sec-nav { display: flex; flex-wrap: wrap; gap: 4px; padding: 10px; position: sticky; top: 72px; z-index: 5; background: rgba(15,16,17,.92); backdrop-filter: blur(12px); }
        .sec-nav a { display: inline-flex; gap: 6px; align-items: center; padding: 6px 10px; border-radius: 8px; font-size: .8125rem; color: var(--muted); }
        .sec-nav a:hover { color: var(--fg); background: var(--surface-2); }
        .sec-nav .n { font-size: .6875rem; font-weight: 600; color: var(--accent-text); }
      `}</style>
    </div>
  );
}

function Field2({ label, children }: { label: string; children: preact.ComponentChildren }) {
  return <div class="field-wrap"><span class="label">{label}</span><div style="min-height: 44px; display: flex; align-items: center">{children}</div></div>;
}
