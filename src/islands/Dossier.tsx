import { useProjet } from '../lib/store';
import { planFinancement } from '../lib/engine';
import { alertes, bancabilite, lecture } from '../lib/analyse';
import { fcfa, nombre } from '../lib/format';
import { prompt, tousLesPrompts } from '../lib/prompts';
import { Alertes, Bloc, copier, PromptBox, useCalcul } from './ui';
import { exporterJSON } from './ProjectSwitcher';

export const DOCUMENTS = [
  { doc: 'complet', titre: 'Dossier de financement complet', desc: 'Page de garde, sommaire, synthèse, marché, plan financier sur 3 ans, scénarios, stress-tests, risques et feuille de route.', pages: '12 à 18 pages' },
  { doc: 'financier', titre: 'Plan financier', desc: 'Hypothèses, compte de résultat, trésorerie mois par mois, plan de financement et bancabilité.', pages: '6 à 8 pages' },
  { doc: 'bpc', titre: 'Business Probability Canvas', desc: 'Ressources, produits, coûts, marché et rentabilité, chiffrés sur deux pages.', pages: '3 à 4 pages' },
  { doc: 'simulation', titre: 'Simulation et stress-tests', desc: 'Les trois scénarios, la sensibilité et l’effet des chocs sur la trésorerie.', pages: '4 à 5 pages' }
];

export default function Dossier() {
  const p = useProjet();
  const r = useCalcul(p);
  const b = bancabilite(p, r);
  const plan = planFinancement(p, r);
  const al = alertes(p, r);
  const bloquants = al.filter((a) => a.niveau === 'bloquant').length;
  const ton = b.score >= 80 ? 'ok' : b.score >= 55 ? 'warn' : 'ko';
  return (
    <div class="stack" style="--gap: 20px">
      <div class="grid-2" style="align-items: stretch">
        <section class="card score">
          <span class="eyebrow">Score de bancabilité</span>
          <div class="row" style="align-items: flex-end; gap: 14px; margin-top: 10px">
            <span class="score-n num">{b.score}</span><span class="muted" style="margin-bottom: 12px">/ 100</span>
            <span class={`tag ${ton}`} style="margin-bottom: 14px">{b.niveau}</span>
          </div>
          <ul class="crit">
            {b.criteres.map((c) => (
              <li>
                <span class={`mark ${c.ok === null ? 'na' : c.ok ? 'ok' : 'ko'}`} aria-hidden="true">{c.ok === null ? '–' : c.ok ? '✓' : '✕'}</span>
                <span class="c-l">{c.critere}<span class="xs muted"> · attendu {c.seuil}</span></span>
                <span class="c-v num small">{c.valeur}</span>
              </li>
            ))}
          </ul>
        </section>
        <section class="card">
          <span class="eyebrow">Plan de financement initial</span>
          <div class="table-wrap" style="margin-top: 14px">
            <table class="t">
              <thead><tr><th>Emplois</th><th class="num">FCFA</th></tr></thead>
              <tbody>{plan.emplois.map((e) => <tr><td>{e.libelle}</td><td class="num">{nombre(e.montant)}</td></tr>)}</tbody>
              <tfoot><tr><td>Total des besoins</td><td class="num">{nombre(plan.totalEmplois)}</td></tr></tfoot>
            </table>
          </div>
          <div class="table-wrap" style="margin-top: 12px">
            <table class="t">
              <thead><tr><th>Ressources</th><th class="num">FCFA</th></tr></thead>
              <tbody>{plan.ressources.map((e) => <tr><td>{e.libelle}</td><td class="num">{nombre(e.montant)}</td></tr>)}</tbody>
              <tfoot><tr><td>Total des ressources</td><td class="num">{nombre(plan.totalRessources)}</td></tr></tfoot>
            </table>
          </div>
          <p class={`small ${plan.ecart < 0 ? '' : 'muted'}`} style={`margin-top: 12px; ${plan.ecart < 0 ? 'color: var(--danger)' : ''}`}>
            {plan.ecart < 0 ? `Il manque ${fcfa(-plan.ecart)} pour couvrir les besoins.` : `Marge de sécurité : ${fcfa(plan.ecart)}.`}
          </p>
        </section>
      </div>

      {al.length > 0 && <Bloc titre="Points à corriger avant de présenter le dossier"><Alertes liste={al} /></Bloc>}

      <Bloc titre="Lecture des résultats" sous="Ce texte est rédigé automatiquement à partir de vos chiffres et repris dans le dossier.">
        <div class="prose">{lecture(p, r).map((t) => <p>{t}</p>)}</div>
      </Bloc>

      <Bloc titre="Documents à imprimer" sous="Chaque document s'ouvre dans un nouvel onglet, mis en page pour l'impression A4. Choisissez « Enregistrer au format PDF » dans la fenêtre d'impression.">
        {bloquants > 0 && <p class="small" style="color: var(--warning); margin-bottom: 14px">{bloquants} point{bloquants > 1 ? 's' : ''} bloquant{bloquants > 1 ? 's' : ''} : le dossier peut être généré, mais corrigez-les avant de le remettre.</p>}
        <div class="grid-2">
          {DOCUMENTS.map((d) => (
            <a class="card-flat doc card-hover" href={`/imprimer?doc=${d.doc}`} target="_blank" rel="noopener">
              <div class="row between"><span style="font-weight: 600">{d.titre}</span><span class="tag">{d.pages}</span></div>
              <p class="xs muted" style="margin-top: 6px">{d.desc}</p>
              <span class="small" style="color: var(--accent-text); margin-top: 10px; display: inline-block">Ouvrir et imprimer →</span>
            </a>
          ))}
        </div>
      </Bloc>

      <Bloc titre="Données et assistant IA">
        <div class="row">
          <button type="button" class="btn btn-ghost" onClick={() => exporterJSON(p)}>Exporter le projet (JSON)</button>
          <button type="button" class="btn btn-ghost" onClick={() => copier(tousLesPrompts(p), 'Tous les Master Prompts sont copiés')}>Copier tous les Master Prompts</button>
        </div>
        <PromptBox titre="Rédaction du dossier pour un banquier" texte={prompt('redaction').texte(p)} />
      </Bloc>
      <style>{`
        .score-n { font-family: Poppins, Inter, sans-serif; font-size: 4rem; line-height: 1; font-weight: 600; letter-spacing: -0.04em; }
        .crit { list-style: none; margin: 18px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .crit li { display: grid; grid-template-columns: 22px 1fr auto; gap: 10px; align-items: baseline; font-size: .9rem; color: var(--fg-2); }
        .mark { font-weight: 700; font-size: .8rem; }
        .mark.ok { color: var(--success); } .mark.ko { color: var(--danger); } .mark.na { color: var(--subtle); }
        .c-v { color: var(--fg); }
        .doc { display: block; }
      `}</style>
    </div>
  );
}
