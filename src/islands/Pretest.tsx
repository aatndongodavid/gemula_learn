import { modifier, useProjet } from '../lib/store';
import { QUESTIONS, profil } from '../lib/pretest';
import { Progress } from './ui';

export default function Pretest() {
  const p = useProjet();
  const rep = p.pretest;
  const n = Object.keys(rep).length;
  const pr = profil(rep);
  return (
    <div class="layout-aside">
      <div class="stack" style="--gap: 16px">
        {QUESTIONS.map((q) => (
          <fieldset class="card" style="margin: 0">
            <legend class="sr-only">{q.sit}</legend>
            <div class="row between">
              <span class="xs" style="color: var(--accent-text); font-weight: 600">Situation {q.id}</span>
              <span class="tag">{q.mod}</span>
            </div>
            <h2 style="font-size: 1.05rem; margin: 10px 0 16px">{q.q}</h2>
            <div class="stack" style="--gap: 8px" role="radiogroup">
              {q.o.map((o) => {
                const sel = rep[q.id] === o.k;
                return (
                  <button type="button" role="radio" aria-checked={sel} class="choice"
                    onClick={() => modifier((d) => { d.pretest[q.id] = o.k; })}>
                    <span style="display: flex; gap: 10px">
                      <span class="xs" style="font-weight: 600; color: var(--accent-text); min-width: 14px">{o.k}</span>
                      <span>{o.t}</span>
                    </span>
                    {sel && <span class="c-sub" style="display: block; margin: 8px 0 0 24px">{o.e}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <aside class="aside-sticky stack" style="--gap: 16px">
        <div class="card">
          <div class="row between"><span class="label">Avancement</span><span class="small muted num">{n} / {QUESTIONS.length}</span></div>
          <div style="margin-top: 10px"><Progress value={n / QUESTIONS.length} /></div>
          <div class="grid-3" style="grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px">
            {(['A', 'B', 'C'] as const).map((k) => (
              <div class="card-flat" style="padding: 10px; text-align: center">
                <div class="xs muted">{k === 'A' ? 'Terrain' : k === 'B' ? 'Analytique' : 'À construire'}</div>
                <div style="font-size: 1.3rem; font-weight: 600">{pr.counts[k]}</div>
              </div>
            ))}
          </div>
        </div>
        {pr.complet ? (
          <div class="card" style="border-color: #4a2410">
            <span class="tag accent">{pr.tag}</span>
            <h3 style="margin-top: 12px; font-size: 1.1rem">{pr.titre}</h3>
            <p class="muted small" style="margin-top: 8px">{pr.texte}</p>
            <p class="small" style="margin-top: 12px; color: var(--fg-2)"><strong>Conseil :</strong> {pr.conseil}</p>
            <a href="/canvas" class="btn btn-primary" style="margin-top: 16px; width: 100%">Continuer vers le canvas</a>
          </div>
        ) : (
          <div class="card muted small">Répondez aux {QUESTIONS.length} situations pour découvrir votre profil. Il n'y a pas de bonne réponse : seulement votre point de départ réel.</div>
        )}
      </aside>
    </div>
  );
}
