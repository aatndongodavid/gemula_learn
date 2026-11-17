// Graphiques SVG sans dépendance. Les couleurs sont passées en paramètre :
// thème sombre sur le site, palette terracotta dans les documents imprimés.

export interface Palette { text: string; grid: string; axis: string; series: string[]; dash?: number[]; fs?: number }

export const PALETTE_SITE: Palette = { text: '#9A9FA8', grid: '#212226', axis: '#34363B', series: ['#6B7079', '#FF5000', '#F7F8F8'], dash: [0, 0, 1] };
export const PALETTE_DOC: Palette = { text: '#7A6A5A', grid: '#E8DCC8', axis: '#B9A88F', series: ['#7A6A5A', '#C8642A', '#2A2118'], dash: [0, 0, 1], fs: 1.55 };

/** Position horizontale de chaque entrée de légende, selon la longueur des libellés. */
function legende(noms: string[], fs: number, debut: number) {
  const xs: number[] = [];
  let x = debut;
  for (const n of noms) { xs.push(x); x += 40 * fs + n.length * 6.6 * fs; }
  return xs;
}

function echelle(min: number, max: number) {
  if (min === max) { max = min + 1; }
  const brut = (max - min) / 4;
  const p = Math.pow(10, Math.floor(Math.log10(Math.abs(brut) || 1)));
  const pas = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= brut) || brut;
  const lo = Math.floor(min / pas) * pas;
  const hi = Math.ceil(max / pas) * pas;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + pas / 2; v += pas) ticks.push(Math.round(v * 1e6) / 1e6);
  return { lo, hi, ticks };
}

function unite(maxAbs: number) {
  if (maxAbs >= 1e6) return { d: 1e6, l: 'Millions de FCFA' };
  if (maxAbs >= 1e3) return { d: 1e3, l: 'Milliers de FCFA' };
  return { d: 1, l: 'FCFA' };
}
const fmtTick = (v: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v);

interface Serie { nom: string; valeurs: number[] }

export function LineChart({ series, labels, palette, hauteur = 320, titre }: { series: Serie[]; labels: string[]; palette: Palette; hauteur?: number; titre?: string }) {
  const fs = palette.fs || 1;
  const W = 960, H = hauteur, L = 56 + 16 * fs, R = 40, T = 40 + 16 * fs, B = 22 + 12 * fs;
  const all = series.flatMap((s) => s.valeurs);
  const u = unite(Math.max(...all.map(Math.abs), 1));
  const sc = echelle(Math.min(0, ...all) / u.d, Math.max(0, ...all) / u.d);
  const n = labels.length;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, n - 1);
  const y = (v: number) => T + (H - T - B) * (1 - (v / u.d - sc.lo) / (sc.hi - sc.lo));
  const pasLabel = n > 18 ? 3 : n > 12 ? 2 : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titre || series.map((s) => s.nom).join(', ')} style="width: 100%; height: auto; display: block">
      <text x={14} y={T + (H - T - B) / 2} fill={palette.text} font-size={11 * (palette.fs || 1)} transform={`rotate(-90 14 ${T + (H - T - B) / 2})`} text-anchor="middle">{u.l}</text>
      {sc.ticks.map((t) => (
        <g>
          <line x1={L} x2={W - R} y1={y(t * u.d)} y2={y(t * u.d)} stroke={t === 0 ? palette.axis : palette.grid} stroke-width={t === 0 ? 1.2 : 1} />
          <text x={L - 8} y={y(t * u.d) + 4 * fs} fill={palette.text} font-size={11 * (palette.fs || 1)} text-anchor="end">{fmtTick(t)}</text>
        </g>
      ))}
      {labels.map((l, i) => i % pasLabel === 0 && <text x={x(i)} y={H - 6} fill={palette.text} font-size={11 * (palette.fs || 1)} text-anchor="middle">{l}</text>)}
      {series.map((s, k) => {
        const c = palette.series[k % palette.series.length];
        const d = s.valeurs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
        const dashed = palette.dash?.[k] === 1;
        return (
          <g>
            <path d={d} fill="none" stroke={c} stroke-width={k === 1 ? 2.6 : 1.8} stroke-dasharray={dashed ? '5 4' : undefined} stroke-linejoin="round" />
            {n <= 13 && s.valeurs.map((v, i) => <circle cx={x(i)} cy={y(v)} r={k === 1 ? 3.2 : 2.4} fill={c} />)}
          </g>
        );
      })}
      {series.map((s, k) => (
        <g transform={`translate(${legende(series.map((x) => x.nom), palette.fs || 1, L + 8)[k]}, 18)`}>
          <line x1={0} x2={22} y1={0} y2={0} stroke={palette.series[k % palette.series.length]} stroke-width="2.4" stroke-dasharray={palette.dash?.[k] === 1 ? '5 4' : undefined} />
          <text x={28} y={4 * (palette.fs || 1)} fill={palette.text} font-size={11.5 * (palette.fs || 1)}>{s.nom}</text>
        </g>
      ))}
    </svg>
  );
}

export function BarChart({ series, labels, palette, hauteur = 300, titre }: { series: Serie[]; labels: string[]; palette: Palette & { bars?: string[] }; hauteur?: number; titre?: string }) {
  const fs = palette.fs || 1;
  const W = 960, H = hauteur, L = 56 + 16 * fs, R = 24, T = 34 + 14 * fs, B = 22 + 12 * fs;
  const all = series.flatMap((s) => s.valeurs);
  const u = unite(Math.max(...all.map(Math.abs), 1));
  const sc = echelle(Math.min(0, ...all) / u.d, Math.max(0, ...all) / u.d);
  const n = labels.length;
  const slot = (W - L - R) / n;
  const bw = Math.min(16, (slot * 0.7) / series.length);
  const y = (v: number) => T + (H - T - B) * (1 - (v / u.d - sc.lo) / (sc.hi - sc.lo));
  const couleurs = palette.bars || palette.series;
  const pasLabel = n > 18 ? 3 : n > 12 ? 2 : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titre || series.map((s) => s.nom).join(', ')} style="width: 100%; height: auto; display: block">
      <text x={14} y={T + (H - T - B) / 2} fill={palette.text} font-size={11 * (palette.fs || 1)} transform={`rotate(-90 14 ${T + (H - T - B) / 2})`} text-anchor="middle">{u.l}</text>
      {sc.ticks.map((t) => (
        <g>
          <line x1={L} x2={W - R} y1={y(t * u.d)} y2={y(t * u.d)} stroke={t === 0 ? palette.axis : palette.grid} />
          <text x={L - 8} y={y(t * u.d) + 4 * fs} fill={palette.text} font-size={11 * (palette.fs || 1)} text-anchor="end">{fmtTick(t)}</text>
        </g>
      ))}
      {labels.map((l, i) => (
        <g>
          {series.map((s, k) => {
            const v = s.valeurs[i];
            const x0 = L + i * slot + (slot - bw * series.length) / 2 + k * bw;
            const y0 = y(Math.max(0, v)), y1 = y(Math.min(0, v));
            return <rect x={x0} y={y0} width={bw - 1} height={Math.max(0.5, y1 - y0)} fill={couleurs[k % couleurs.length]} rx="1.5" />;
          })}
          {i % pasLabel === 0 && <text x={L + i * slot + slot / 2} y={H - 6} fill={palette.text} font-size={11 * (palette.fs || 1)} text-anchor="middle">{l}</text>}
        </g>
      ))}
      {series.map((s, k) => (
        <g transform={`translate(${legende(series.map((x) => x.nom), palette.fs || 1, L + 8)[k]}, 16)`}>
          <rect x={0} y={-6} width={12} height={12} rx="2" fill={couleurs[k % couleurs.length]} />
          <text x={18} y={4 * (palette.fs || 1)} fill={palette.text} font-size={11.5 * (palette.fs || 1)}>{s.nom}</text>
        </g>
      ))}
    </svg>
  );
}

/** Barres horizontales de sensibilité (tornade). */
export function Tornado({ lignes, palette }: { lignes: { hypothese: string; bas: number; haut: number }[]; palette: Palette }) {
  const fs = palette.fs || 1;
  const W = 960, rowH = 30 + 10 * fs, L = 110 + 60 * fs, R = 20, T = 14 + 10 * fs;
  const H = T + lignes.length * rowH + 10;
  const max = Math.max(1, ...lignes.flatMap((l) => [Math.abs(l.bas), Math.abs(l.haut)]));
  const cx = L + (W - L - R) / 2;
  const s = (v: number) => (v / max) * ((W - L - R) / 2 - 50 - 30 * fs);
  const f = (v: number) => (v > 0 ? '+' : '') + new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(v / 1000)) + ' k';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sensibilité du résultat de l'année 1" style="width: 100%; height: auto; display: block">
      <text x={cx - 8} y={10 * fs} fill={palette.text} font-size={11 * (palette.fs || 1)} text-anchor="end">Hypothèse −10 %</text>
      <text x={cx + 8} y={10 * fs} fill={palette.text} font-size={11 * (palette.fs || 1)}>Hypothèse +10 %</text>
      <line x1={cx} x2={cx} y1={T - 4} y2={H - 6} stroke={palette.axis} />
      {lignes.map((l, i) => {
        const yy = T + i * rowH + 8;
        const a = s(l.bas), b = s(l.haut);
        return (
          <g>
            <text x={0} y={yy + 11 + 4 * fs} fill={palette.text} font-size={12 * (palette.fs || 1)}>{l.hypothese}</text>
            <rect x={Math.min(cx, cx + a)} y={yy} width={Math.abs(a)} height={22} fill={l.bas < 0 ? palette.series[0] : palette.series[1]} rx="2" />
            <rect x={Math.min(cx, cx + b)} y={yy} width={Math.abs(b)} height={22} fill={l.haut < 0 ? palette.series[0] : palette.series[1]} rx="2" />
            <text x={cx + Math.min(a, b) - 6} y={yy + 11 + 4 * fs} fill={palette.text} font-size={11 * (palette.fs || 1)} text-anchor="end">{f(Math.min(l.bas, l.haut))}</text>
            <text x={cx + Math.max(a, b) + 6} y={yy + 11 + 4 * fs} fill={palette.text} font-size={11 * (palette.fs || 1)}>{f(Math.max(l.bas, l.haut))}</text>
          </g>
        );
      })}
    </svg>
  );
}
