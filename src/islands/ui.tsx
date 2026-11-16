// Briques d'interface partagées par les îlots.
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { calculer, calculerScenarios } from '../lib/engine';
import type { Projet } from '../lib/model';
import type { Alerte } from '../lib/analyse';
import { decimal } from '../lib/format';

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string) {
  let el = document.getElementById('gl-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gl-toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el?.classList.add('hidden'), 2400);
}

export async function copier(texte: string, message = 'Copié dans le presse-papiers') {
  try { await navigator.clipboard.writeText(texte); toast(message); }
  catch { toast('Copie impossible : sélectionnez le texte manuellement'); }
}

interface FieldProps { label: string; hint?: string; children: ComponentChildren; id?: string; class?: string }
export function Field({ label, hint, children, class: c }: FieldProps) {
  return (
    <label class={`field-wrap ${c || ''}`}>
      <span class="label">{label}</span>
      {children}
      {hint && <span class="hint">{hint}</span>}
    </label>
  );
}

export function Text(props: { label: string; value: string; onInput: (v: string) => void; placeholder?: string; hint?: string; class?: string }) {
  return (
    <Field label={props.label} hint={props.hint} class={props.class}>
      <input class="field" type="text" value={props.value} placeholder={props.placeholder}
        onInput={(e) => props.onInput((e.target as HTMLInputElement).value)} />
    </Field>
  );
}

export function Area(props: { label: string; value: string; onInput: (v: string) => void; placeholder?: string; hint?: string; rows?: number }) {
  return (
    <Field label={props.label} hint={props.hint}>
      <textarea class="field" rows={props.rows || 3} value={props.value} placeholder={props.placeholder}
        onInput={(e) => props.onInput((e.target as HTMLTextAreaElement).value)} />
    </Field>
  );
}

/** Champ numérique : accepte « 1 200 000 » ou « 1200000 », n'autorise pas de valeur négative par défaut. */
export function NumInput(props: { value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number; step?: number; label?: string; class?: string }) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const affiche = brouillon ?? (props.value ? decimal(props.value) : '');
  const commit = (s: string) => {
    const n = Number(s.replace(/\s| | /g, '').replace(',', '.'));
    let v = Number.isFinite(n) ? n : 0;
    if (props.min !== undefined) v = Math.max(props.min, v);
    else v = Math.max(0, v);
    if (props.max !== undefined) v = Math.min(props.max, v);
    props.onChange(v);
  };
  const input = (
    <input class={`field num ${props.class || ''}`} type="text" inputMode="decimal" value={affiche} placeholder="0"
      aria-label={props.label}
      onInput={(e) => { const s = (e.target as HTMLInputElement).value; setBrouillon(s); commit(s); }}
      onBlur={() => setBrouillon(null)} />
  );
  return props.suffix ? <span class="suffix-wrap">{input}<span class="suffix">{props.suffix}</span></span> : input;
}

export function Num(props: { label: string; value: number; onChange: (v: number) => void; suffix?: string; hint?: string; min?: number; max?: number }) {
  return (
    <Field label={props.label} hint={props.hint}>
      <NumInput value={props.value} onChange={props.onChange} suffix={props.suffix} min={props.min} max={props.max} />
    </Field>
  );
}

export function Select<T extends string | number>(props: { label: string; value: T; options: { v: T; t: string }[]; onChange: (v: T) => void; hint?: string }) {
  return (
    <Field label={props.label} hint={props.hint}>
      <select class="field" value={String(props.value)}
        onChange={(e) => {
          const raw = (e.target as HTMLSelectElement).value;
          const opt = props.options.find((o) => String(o.v) === raw);
          if (opt) props.onChange(opt.v);
        }}>
        {props.options.map((o) => <option value={String(o.v)}>{o.t}</option>)}
      </select>
    </Field>
  );
}

export function Kpi(props: { label: string; value: string; sub?: string; tone?: 'hi' | 'ok' | 'ko' | '' }) {
  return (
    <div class={`kpi ${props.tone || ''}`}>
      <div class="k-label">{props.label}</div>
      <div class="k-value">{props.value}</div>
      {props.sub && <div class="k-sub">{props.sub}</div>}
    </div>
  );
}

export function Bloc(props: { idx?: string; titre: string; sous?: string; id?: string; children: ComponentChildren; actions?: ComponentChildren }) {
  return (
    <section class="card" id={props.id} style="scroll-margin-top: 88px">
      <div class="row between" style="align-items: flex-start">
        <div class="block-title">{props.idx && <span class="idx">{props.idx}</span>}<h2>{props.titre}</h2></div>
        {props.actions}
      </div>
      {props.sous && <p class="block-sub">{props.sous}</p>}
      {!props.sous && <div style="height: 16px" />}
      {props.children}
    </section>
  );
}

export function PromptBox(props: { titre: string; texte: string }) {
  return (
    <details class="fold" style="margin-top: 16px">
      <summary><span>Master Prompt · {props.titre}</span></summary>
      <div class="fold-body">
        <pre class="prompt">{props.texte}</pre>
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => copier(props.texte, 'Prompt copié : collez-le dans votre assistant IA')}>Copier le prompt</button>
      </div>
    </details>
  );
}

export function Alertes({ liste, max }: { liste: Alerte[]; max?: number }) {
  if (!liste.length) return null;
  return (
    <div class="stack" style="--gap: 8px">
      {liste.slice(0, max ?? liste.length).map((a) => (
        <div class={`alert ${a.niveau}`} role={a.niveau === 'bloquant' ? 'alert' : undefined}>
          <span class="a-ico" />
          <span>{a.message} {a.lien && <a href={a.lien}>Corriger</a>}</span>
        </div>
      ))}
    </div>
  );
}

export function DelBtn({ onClick, label = 'Supprimer la ligne' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" class="btn btn-quiet btn-icon" aria-label={label} title={label} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}

export function AddBtn({ onClick, children }: { onClick: () => void; children: ComponentChildren }) {
  return <button type="button" class="btn btn-ghost btn-sm" style="margin-top: 12px" onClick={onClick}>+ {children}</button>;
}

export const useCalcul = (p: Projet) => useMemo(() => calculer(p), [p]);
export const useScenarios = (p: Projet) => useMemo(() => calculerScenarios(p), [p]);

export function Skeleton() { return <div class="skeleton">Chargement du projet…</div>; }

export function Progress({ value }: { value: number }) {
  return <div class="progress" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.round(value * 100)}%` }} /></div>;
}
