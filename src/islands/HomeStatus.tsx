import { useProjet, nouveauProjet } from '../lib/store';
import { avancement } from '../lib/analyse';
import { ETAPES } from '../lib/nav';
import { projetDemo } from '../lib/demo';
import { Progress, toast } from './ui';

export function DemoButton() {
  return (
    <button type="button" class="btn btn-ghost" onClick={() => { nouveauProjet(projetDemo()); toast('Exemple chargé dans un nouveau projet'); location.href = '/simulateur'; }}>
      Explorer un exemple chiffré
    </button>
  );
}

export default function HomeStatus() {
  const p = useProjet();
  const a = avancement(p);
  const parEtape = [a.pretest, a.canvas, a.bpc, a.bpc >= 0.4 ? 1 : 0, a.strategie, null];
  return (
    <div class="grid-3">
      {ETAPES.map((e, i) => (
        <a href={e.href} class="card card-hover etape">
          <div class="row between">
            <span class="step-num">{String(i + 1).padStart(2, '0')}</span>
            {parEtape[i] !== null && <span class={`tag ${parEtape[i]! >= 1 ? 'ok' : parEtape[i]! > 0 ? 'accent' : ''}`}>{parEtape[i]! >= 1 ? 'Terminé' : parEtape[i]! > 0 ? 'En cours' : 'À faire'}</span>}
          </div>
          <h3 style="margin-top: 14px; font-size: 1.1rem">{e.titre}</h3>
          <p class="muted small" style="margin-top: 6px">{e.desc}</p>
          {parEtape[i] !== null && <div style="margin-top: 16px"><Progress value={Math.min(1, parEtape[i]!)} /></div>}
        </a>
      ))}
    </div>
  );
}
