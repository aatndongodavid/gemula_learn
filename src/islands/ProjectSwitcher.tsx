import { useRef } from 'preact/hooks';
import { activer, dupliquer, nouveauProjet, projetActif, supprimer, useListe } from '../lib/store';
import { depuisAncienFormat, normaliser, projetVide, type Projet } from '../lib/model';
import { projetDemo } from '../lib/demo';
import { slug } from '../lib/format';
import { toast } from './ui';

export function exporterJSON(p: Projet) {
  const blob = new Blob([JSON.stringify({ typeDocument: 'GEMULA_LEARN_PROJET', ...p }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gemula-learn-${slug(p.identite.projet)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importerJSON(fichier: File, onDone?: () => void) {
  fichier.text().then((t) => {
    try {
      const data = JSON.parse(t);
      const ancien = depuisAncienFormat(data);
      const p = ancien || (data.version === 2 || data.typeDocument === 'GEMULA_LEARN_PROJET' ? normaliser({ ...data, id: undefined }) : null);
      if (!p) { toast('Fichier non reconnu'); return; }
      nouveauProjet({ ...p, id: Math.random().toString(36).slice(2, 10) });
      toast(ancien ? 'Projet de l’ancien outil importé' : 'Projet importé');
      onDone?.();
    } catch { toast('Fichier JSON invalide'); }
  });
}

export default function ProjectSwitcher() {
  const { projets, actif } = useListe();
  const ref = useRef<HTMLDetailsElement>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const courant = projets.find((p) => p.id === actif);
  const fermer = () => ref.current?.removeAttribute('open');
  return (
    <details class="switcher" ref={ref}>
      <summary class="btn btn-ghost btn-sm" aria-label="Changer de projet">
        <span class="sw-name">{courant?.identite.projet || 'Projet sans nom'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div class="sw-menu card" role="menu">
        <div class="xs muted" style="margin-bottom: 6px">Mes projets ({projets.length})</div>
        <div class="sw-list">
          {projets.map((p) => (
            <button type="button" role="menuitemradio" aria-checked={p.id === actif} class="sw-item"
              onClick={() => { activer(p.id); fermer(); }}>
              <span>{p.identite.projet || 'Projet sans nom'}</span>
              <span class="xs muted">{new Date(p.majLe).toLocaleDateString('fr-FR')}</span>
            </button>
          ))}
        </div>
        <hr class="divider" style="margin: 10px 0" />
        <div class="sw-actions">
          <button type="button" class="btn btn-quiet btn-sm" onClick={() => { nouveauProjet(projetVide()); fermer(); toast('Nouveau projet créé'); }}>Nouveau projet</button>
          <button type="button" class="btn btn-quiet btn-sm" onClick={() => { dupliquer(); fermer(); toast('Projet dupliqué'); }}>Dupliquer</button>
          <button type="button" class="btn btn-quiet btn-sm" onClick={() => { nouveauProjet(projetDemo()); fermer(); toast('Projet d’exemple chargé'); }}>Charger l’exemple</button>
          <button type="button" class="btn btn-quiet btn-sm" onClick={() => { exporterJSON(projetActif()); fermer(); }}>Exporter (JSON)</button>
          <button type="button" class="btn btn-quiet btn-sm" onClick={() => fichier.current?.click()}>Importer (JSON)</button>
          <button type="button" class="btn btn-quiet btn-sm" style="color: var(--danger)"
            onClick={() => {
              if (confirm(`Supprimer définitivement « ${courant?.identite.projet || 'Projet sans nom'} » de ce navigateur ?`)) { supprimer(actif); fermer(); toast('Projet supprimé'); }
            }}>Supprimer</button>
        </div>
        <input ref={fichier} type="file" accept="application/json,.json" class="hidden"
          onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) importerJSON(f, fermer); (e.target as HTMLInputElement).value = ''; }} />
      </div>
      <style>{`
        .switcher { position: relative; }
        .switcher > summary { list-style: none; max-width: 220px; }
        .switcher > summary::-webkit-details-marker { display: none; }
        .sw-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
        @media (max-width: 520px) { .sw-name { max-width: 84px; } }
        .sw-menu { position: absolute; right: 0; top: calc(100% + 8px); width: min(320px, calc(100vw - 32px)); padding: 12px; z-index: 60; background: var(--surface); box-shadow: 0 20px 50px rgba(0,0,0,.5); }
        .sw-list { display: flex; flex-direction: column; gap: 2px; max-height: 240px; overflow: auto; }
        .sw-item { display: flex; justify-content: space-between; gap: 8px; align-items: center; text-align: left; border: 0; background: transparent; padding: 8px 10px; border-radius: 8px; cursor: pointer; color: var(--fg-2); font-size: .875rem; }
        .sw-item:hover { background: var(--surface-2); }
        .sw-item[aria-checked='true'] { background: var(--accent-soft); color: var(--fg); }
        .sw-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; }
        .sw-actions .btn { justify-content: flex-start; }
      `}</style>
    </details>
  );
}

