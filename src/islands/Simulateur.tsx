import { useMemo, useState } from 'preact/hooks';
import { modifier, useProjet } from '../lib/store';
import { calculer, calculerScenarios, sensibilite, type NomScenario, type Resultat } from '../lib/engine';
import type { ChocActif, ProfilCroissance, Projet } from '../lib/model';
import { CHOCS } from '../lib/chocs';
import { alertes, lecture } from '../lib/analyse';
import { fcfa, libelleMois, libelleMoisLong, nombre, signe } from '../lib/format';
import { prompt } from '../lib/prompts';
import { Alertes, Bloc, Kpi, Num, NumInput, PromptBox } from './ui';
import { BarChart, LineChart, PALETTE_SITE, Tornado } from './charts';

const PROFILS: { v: ProfilCroissance; t: string; d: string }[] = [
  { v: 'prudent', t: 'Démarrage prudent', d: '+5 % par mois' },
  { v: 'regulier', t: 'Croissance régulière', d: '+10 % par mois' },
  { v: 'coups', t: 'Par à-coups', d: 'Mois forts, mois calmes' },
  { v: 'plateau', t: 'Plateau stable', d: 'Volume constant' },
  { v: 'perso', t: 'Personnalisé', d: 'Votre taux mensuel' }
];

function Tableau({ p, r, vue }: { p: Projet; r: Resultat; vue: '12' | '36' }) {
  if (vue === '36') {
    const lignes: [string, (a: Resultat['annees'][number]) => number, boolean?][] = [
      ['Chiffre d’affaires', (a) => a.ca, true], ['Coûts variables', (a) => -a.coutsVariables], ['Marge brute', (a) => a.margeBrute, true],
      ['Charges fixes et marketing', (a) => -a.chargesFixes], ['Personnel (salaires + CNPS)', (a) => -a.personnel], ['Excédent brut d’exploitation', (a) => a.ebe, true],
      ['Amortissements', (a) => -a.amortissements], ['Intérêts', (a) => -a.interets], ['Impôts', (a) => -a.impot], ['Résultat net', (a) => a.resultatNet, true],
      ['Capacité d’autofinancement', (a) => a.caf], ['Trésorerie en fin d’année', (a) => a.tresorerieFin, true]
    ];
    return (
      <div class="table-wrap">
        <table class="t">
          <thead><tr><th>En FCFA</th>{r.annees.map((a) => <th class="num">Année {a.annee}</th>)}</tr></thead>
          <tbody>
            {lignes.map(([l, f, fort]) => (
              <tr style={fort ? 'font-weight: 600' : ''}><td>{l}</td>{r.annees.map((a) => <td class={`num ${f(a) < 0 && fort ? 'neg' : ''}`}>{nombre(f(a))}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const m12 = r.mois.slice(0, 12);
  const unite = p.modele === 'vente' ? 'Unités' : p.modele === 'mrr' ? 'Abonnés' : 'Boîtiers';
  return (
    <div class="table-wrap">
      <table class="t">
        <thead><tr><th>Mois</th><th class="num">{unite}</th><th class="num">CA</th><th class="num">Coûts var.</th><th class="num">Charges fixes</th><th class="num">Résultat net</th><th class="num">Trésorerie</th></tr></thead>
        <tbody>
          {m12.map((m) => (
            <tr>
              <td>{libelleMois(p.identite.debut, m.m)}</td>
              <td class="num">{nombre(m.volume)}</td>
              <td class="num">{nombre(m.ca)}</td>
              <td class="num">{nombre(m.coutsVariables)}</td>
              <td class="num">{nombre(m.chargesFixes + m.marketing + m.salaires + m.cnps)}</td>
              <td class={`num ${m.resultatNet < 0 ? 'neg' : 'pos'}`}>{nombre(m.resultatNet)}</td>
              <td class={`num ${m.tresorerie < 0 ? 'neg' : ''}`}>{nombre(m.tresorerie)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chocs({ p, base }: { p: Projet; base: Resultat }) {
  const actifs = p.chocs;
  const avec = useMemo(() => calculer(p, { chocs: actifs }), [p]);
  const toggle = (type: ChocActif['type']) => modifier((d) => {
    const i = d.chocs.findIndex((c) => c.type === type);
    if (i >= 0) d.chocs.splice(i, 1);
    else { const def = CHOCS.find((c) => c.type === type)!; d.chocs.push({ type, mois: def.moisDefaut, valeur: def.valeur?.defaut ?? 0, duree: def.dureeDefaut }); }
  });
  const setC = (type: ChocActif['type'], k: keyof ChocActif, v: number) => modifier((d) => { const c = d.chocs.find((x) => x.type === type); if (c) (c as any)[k] = v; });
  const ib = base.indicateurs, ia = avec.indicateurs;
  const d = p.identite.debut;
  const delta = avec.annees[0].resultatNet - base.annees[0].resultatNet;
  return (
    <div class="stack" style="--gap: 16px">
      <div class="grid-2">
        {CHOCS.map((c) => {
          const actif = actifs.find((x) => x.type === c.type);
          const ton = c.gravite === 'Sévère' ? 'ko' : c.gravite === 'Modéré' ? 'warn' : 'ok';
          return (
            <div class={`card-flat choc ${actif ? 'on' : ''}`}>
              <div class="row between" style="align-items: flex-start; flex-wrap: nowrap">
                <div>
                  <span class={`tag ${ton}`}>{c.gravite}</span>
                  <div style="font-weight: 600; margin-top: 8px">{c.titre}</div>
                </div>
                <label class="check"><input type="checkbox" checked={!!actif} onChange={() => toggle(c.type)} /><span class="sr-only">Appliquer {c.titre}</span></label>
              </div>
              <p class="xs muted" style="margin-top: 6px">{c.declencheur}</p>
              {actif && (
                <div class="stack" style="--gap: 10px; margin-top: 12px">
                  <p class="xs" style="color: var(--fg-2)">{c.effet}</p>
                  <div class="grid-3" style="grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px">
                    <label class="field-wrap"><span class="hint">{c.duree === 'permanent' ? 'À partir de' : 'Mois'}</span>
                      <select class="field" value={String(actif.mois)} onChange={(e) => setC(c.type, 'mois', Number((e.target as HTMLSelectElement).value))}>
                        {Array.from({ length: 12 }, (_, k) => <option value={String(k + 1)}>{libelleMois(d, k + 1)}</option>)}
                      </select>
                    </label>
                    {c.duree === 'reglable' && <label class="field-wrap"><span class="hint">Durée (mois)</span><NumInput value={actif.duree} min={1} max={12} onChange={(v) => setC(c.type, 'duree', v)} /></label>}
                    {c.valeur && <label class="field-wrap"><span class="hint">{c.valeur.label}</span><NumInput value={actif.valeur} suffix={c.valeur.unite} max={c.valeur.unite === '%' ? 100 : undefined} onChange={(v) => setC(c.type, 'valeur', v)} /></label>}
                  </div>
                  <ul class="xs muted" style="margin: 0; padding-left: 18px">{c.observer.map((o) => <li>{o}</li>)}</ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {actifs.length > 0 && (
        <div class="card" style="border-color: #4a2410">
          <div class="row between"><h3 style="font-size: 1.05rem">Effet de {actifs.length > 1 ? `${actifs.length} chocs combinés` : 'ce choc'}</h3><button type="button" class="btn btn-quiet btn-sm" onClick={() => modifier((x) => { x.chocs = []; })}>Tout retirer</button></div>
          <div class="grid-4" style="margin-top: 14px">
            <Kpi label="Résultat net an 1" value={nombre(avec.annees[0].resultatNet)} sub={`${signe(delta)} FCFA vs base`} tone={delta < 0 ? 'ko' : 'ok'} />
            <Kpi label="Besoin de trésorerie" value={nombre(ia.besoinFinancement)} sub={`base : ${nombre(ib.besoinFinancement)}`} tone="hi" />
            <Kpi label="Trésorerie la plus basse" value={nombre(Math.min(...avec.mois.map((m) => m.tresorerie)))} sub="FCFA" tone={ia.ruptureTresorerie ? 'ko' : 'ok'} />
            <Kpi label="Rupture de trésorerie" value={ia.ruptureTresorerie ? libelleMois(d, ia.ruptureTresorerie) : 'Aucune'} tone={ia.ruptureTresorerie ? 'ko' : 'ok'} />
          </div>
          <div style="margin-top: 16px">
            <LineChart palette={{ ...PALETTE_SITE, series: ['#6B7079', '#FF5000'], dash: [1, 0] }} labels={base.mois.slice(0, 12).map((m) => libelleMois(d, m.m))}
              series={[{ nom: 'Trésorerie sans choc', valeurs: base.mois.slice(0, 12).map((m) => m.tresorerie) }, { nom: 'Trésorerie avec chocs', valeurs: avec.mois.slice(0, 12).map((m) => m.tresorerie) }]} />
          </div>
          <p class="small" style="margin-top: 12px; color: var(--fg-2)">
            {ia.ruptureTresorerie
              ? `La trésorerie ne résiste pas : elle devient négative en ${libelleMoisLong(d, ia.ruptureTresorerie)}. Prévoyez une réserve d’au moins ${fcfa(Math.max(0, -Math.min(...avec.mois.map((m) => m.tresorerie))))} de plus ou réduisez les charges fixes.`
              : 'Le projet absorbe ce scénario sans rupture de trésorerie. Ces chocs apparaîtront dans le dossier comme stress-test réussi.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Simulateur() {
  const p = useProjet();
  const sc = useMemo(() => calculerScenarios(p), [p]);
  const sens = useMemo(() => sensibilite(p), [p]);
  const [vue, setVue] = useState<'12' | '36'>('12');
  const [choix, setChoix] = useState<NomScenario>('base');
  const r = sc[choix];
  const d = p.identite.debut;
  const i = r.indicateurs;
  const [a1, a2, a3] = r.annees;
  const al = alertes(p, sc.base);
  const horizon = vue === '12' ? 12 : 36;
  const labels = r.mois.slice(0, horizon).map((m) => libelleMois(d, m.m));
  const c = p.croissance;

  return (
    <div class="stack" style="--gap: 20px">
      <Alertes liste={al} />

      <Bloc idx="01" titre="Hypothèses de croissance" sous="Comment vos volumes évoluent après le premier mois. Les années 2 et 3 suivent un taux annuel.">
        <div class="grid-3" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))">
          {PROFILS.map((x) => (
            <button type="button" class="choice" aria-pressed={c.profil === x.v} onClick={() => modifier((dd) => { dd.croissance.profil = x.v; })}>
              <div class="c-title">{x.t}</div><div class="c-sub">{x.d}</div>
            </button>
          ))}
        </div>
        <div class="grid-3" style="margin-top: 16px">
          {c.profil === 'perso' && <Num label="Croissance mensuelle (année 1)" value={c.tauxPerso} onChange={(v) => modifier((dd) => { dd.croissance.tauxPerso = v; })} suffix="%" max={100} />}
          <Num label="Croissance des volumes en année 2" value={c.an2Pct} onChange={(v) => modifier((dd) => { dd.croissance.an2Pct = v; })} suffix="% / an" max={500} />
          <Num label="Croissance des volumes en année 3" value={c.an3Pct} onChange={(v) => modifier((dd) => { dd.croissance.an3Pct = v; })} suffix="% / an" max={500} />
        </div>
        <details class="fold" style="margin-top: 16px">
          <summary><span>Réglage des scénarios prudent et ambitieux</span></summary>
          <div class="fold-body grid-2">
            <div class="grid-2">
              <Num label="Prudent : volumes" value={p.scenarios.prudent.volumePct} onChange={(v) => modifier((dd) => { dd.scenarios.prudent.volumePct = v; })} suffix="% base" max={100} />
              <Num label="Prudent : coûts variables" value={p.scenarios.prudent.coutsPct} onChange={(v) => modifier((dd) => { dd.scenarios.prudent.coutsPct = v; })} suffix="% base" max={300} />
            </div>
            <div class="grid-2">
              <Num label="Ambitieux : volumes" value={p.scenarios.ambitieux.volumePct} onChange={(v) => modifier((dd) => { dd.scenarios.ambitieux.volumePct = v; })} suffix="% base" max={500} />
              <Num label="Ambitieux : coûts variables" value={p.scenarios.ambitieux.coutsPct} onChange={(v) => modifier((dd) => { dd.scenarios.ambitieux.coutsPct = v; })} suffix="% base" max={300} />
            </div>
          </div>
        </details>
        <PromptBox titre="Choisir mon scénario" texte={prompt('croissance').texte(p)} />
      </Bloc>

      <Bloc idx="02" titre="Projection" actions={
        <div class="row" style="gap: 4px">
          {(['prudent', 'base', 'ambitieux'] as const).map((s) => (
            <button type="button" class="choice" style="width: auto; padding: 6px 12px; font-size: .8125rem" aria-pressed={choix === s} onClick={() => setChoix(s)}>{s === 'base' ? 'Base' : s === 'prudent' ? 'Prudent' : 'Ambitieux'}</button>
          ))}
        </div>
      }>
        <div class="grid-4">
          <Kpi label="CA cumulé à 12 mois" value={nombre(a1.ca)} sub="FCFA" />
          <Kpi label="Résultat net an 1 / an 2 / an 3" value={nombre(a1.resultatNet)} sub={`${nombre(a2.resultatNet)} · ${nombre(a3.resultatNet)}`} tone={a1.resultatNet >= 0 ? 'ok' : 'ko'} />
          <Kpi label="Besoin de trésorerie maximal" value={nombre(i.besoinFinancement)} sub={i.moisCreux ? `en ${libelleMoisLong(d, i.moisCreux)}` : 'aucun'} tone="hi" />
          <Kpi label="Trésorerie à 36 mois" value={nombre(a3.tresorerieFin)} sub={i.ruptureTresorerie ? `rupture en ${libelleMois(d, i.ruptureTresorerie)}` : 'sans rupture'} tone={i.ruptureTresorerie ? 'ko' : 'ok'} />
        </div>
        <div class="row between" style="margin: 24px 0 8px">
          <h3 style="font-size: 1rem">Trésorerie cumulée des trois scénarios</h3>
          <div class="row" style="gap: 4px">
            <button type="button" class="choice" style="width: auto; padding: 6px 12px; font-size: .8125rem" aria-pressed={vue === '12'} onClick={() => setVue('12')}>12 mois</button>
            <button type="button" class="choice" style="width: auto; padding: 6px 12px; font-size: .8125rem" aria-pressed={vue === '36'} onClick={() => setVue('36')}>3 ans</button>
          </div>
        </div>
        <LineChart palette={PALETTE_SITE} labels={labels} titre="Trésorerie cumulée"
          series={[
            { nom: 'Prudent', valeurs: sc.prudent.mois.slice(0, horizon).map((m) => m.tresorerie) },
            { nom: 'Base', valeurs: sc.base.mois.slice(0, horizon).map((m) => m.tresorerie) },
            { nom: 'Ambitieux', valeurs: sc.ambitieux.mois.slice(0, horizon).map((m) => m.tresorerie) }
          ]} />
        <h3 style="font-size: 1rem; margin: 24px 0 8px">Revenus et coûts du mois ({choix === 'base' ? 'base' : choix})</h3>
        <BarChart palette={{ ...PALETTE_SITE, bars: ['#FF5000', '#34363B'] }} labels={labels}
          series={[
            { nom: 'Revenus', valeurs: r.mois.slice(0, horizon).map((m) => m.ca) },
            { nom: 'Coûts totaux', valeurs: r.mois.slice(0, horizon).map((m) => m.ca - m.resultatNet) }
          ]} />
        <div style="margin-top: 24px"><Tableau p={p} r={r} vue={vue} /></div>
        <div class="prose small" style="margin-top: 20px">{lecture(p, r).map((t) => <p>{t}</p>)}</div>
      </Bloc>

      <Bloc idx="03" titre="Analyse de sensibilité" sous="Effet d'une variation de 10 % de chaque hypothèse sur le résultat net de l'année 1. La barre la plus longue désigne l'hypothèse à sécuriser en priorité.">
        <Tornado lignes={sens.lignes} palette={{ ...PALETTE_SITE, series: ['#FF6B6B', '#4CC38A'] }} />
        <p class="small muted" style="margin-top: 12px">Hypothèse la plus sensible : <strong style="color: var(--fg)">{sens.lignes[0]?.hypothese}</strong>. Une erreur de 10 % sur celle-ci change le résultat de {fcfa(Math.abs(sens.lignes[0]?.haut || 0))}.</p>
        <PromptBox titre="Critique des hypothèses par un analyste crédit" texte={prompt('hypotheses').texte(p)} />
      </Bloc>

      <Bloc idx="04" titre="Stress-tests : dix chocs combinables" sous="Activez un ou plusieurs chocs pour voir si votre trésorerie résiste. Ils s'appliquent au scénario de base.">
        <Chocs p={p} base={sc.base} />
      </Bloc>

      <div class="row" style="justify-content: flex-end"><a href="/strategie" class="btn btn-primary">Continuer vers la stratégie</a></div>
      <style>{`.choc.on { border-color: var(--accent); background: var(--accent-soft); }`}</style>
    </div>
  );
}
