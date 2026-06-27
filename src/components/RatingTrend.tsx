// Rating-over-time sparkline for /history — pure server-rendered SVG, no deps,
// no client JS. Plots completed-interview ratings oldest→newest on a fixed 1..10
// scale so progress is comparable at a glance. Dots are tinted with the same
// green/amber/rose bands used by the history score badges; threshold guides at
// 5 and 8 echo those bands. Rendered only when there are ≥2 rated sessions.
import type { LevelId, MethodologyId } from "@/lib/types";

export interface TrendPoint {
  rating: number; // 1..10
  date: string; // ISO created_at
  level: string; // short label, e.g. "L5"
  framework: string; // methodology name, e.g. "STAR"
  levelId: LevelId;
  methodologyId: MethodologyId;
}

// Match the history badge bands: ≥8 strong, ≥5 mixed, else weak.
function dotColor(rating: number): string {
  if (rating >= 8) return "#34d399"; // emerald-400
  if (rating >= 5) return "#fbbf24"; // amber-400
  return "#fb7185"; // rose-400
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Geometry (viewBox units; scales fluidly to the card width).
const W = 600;
const H = 140;
const PAD_L = 28; // room for the y-axis labels
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 22; // room for the x-axis date labels
const Y_MIN = 1;
const Y_MAX = 10;

function x(i: number, n: number): number {
  if (n <= 1) return PAD_L + (W - PAD_L - PAD_R) / 2;
  return PAD_L + ((W - PAD_L - PAD_R) * i) / (n - 1);
}

function y(rating: number): number {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, rating));
  const t = (clamped - Y_MIN) / (Y_MAX - Y_MIN);
  return H - PAD_B - t * (H - PAD_T - PAD_B);
}

export default function RatingTrend({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return null;

  const n = points.length;
  const first = points[0].rating;
  const last = points[n - 1].rating;
  const delta = last - first;
  const deltaLabel =
    delta > 0 ? `up ${delta}` : delta < 0 ? `down ${Math.abs(delta)}` : "no change";

  const line = points.map((p, i) => `${x(i, n)},${y(p.rating)}`).join(" ");

  // Soft fill under the line for a sparkline feel.
  const area = `${PAD_L},${H - PAD_B} ${line} ${x(n - 1, n)},${H - PAD_B}`;

  const summary = `Rating trend over ${n} completed interviews: from ${first} to ${last} out of 10 (${deltaLabel}).`;

  return (
    <figure className="deck-card flex flex-col gap-2 p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Rating trend</span>
        <span className="text-xs text-muted">
          {n} completed ·{" "}
          <span
            className={
              delta > 0 ? "text-emerald-300" : delta < 0 ? "text-rose-300" : "text-muted"
            }
          >
            {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "■ even"}
          </span>{" "}
          since first
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={summary}
        preserveAspectRatio="none"
      >
        {/* Threshold guides at the band edges (8 strong, 5 mixed). */}
        {[5, 8].map((g) => (
          <g key={g}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--edge)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <text x={4} y={y(g) + 4} fontSize={11} fill="var(--muted)">
              {g}
            </text>
          </g>
        ))}
        {/* Baseline axis labels for the scale extremes. */}
        <text x={4} y={y(Y_MIN) + 4} fontSize={11} fill="var(--muted)">
          {Y_MIN}
        </text>
        <text x={4} y={y(Y_MAX) + 4} fontSize={11} fill="var(--muted)">
          {Y_MAX}
        </text>

        {/* Area fill + trend line. */}
        <polygon points={area} fill="#7c5cff" fillOpacity={0.1} />
        <polyline
          points={line}
          fill="none"
          stroke="#7c5cff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points, tinted by band, with a hover tooltip. */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i, n)} cy={y(p.rating)} r={4} fill={dotColor(p.rating)}>
              <title>{`${fmtDate(p.date)} · ${p.level} ${p.framework} → ${p.rating}/10`}</title>
            </circle>
          </g>
        ))}

        {/* First/last date markers along the x-axis. */}
        <text x={PAD_L} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="start">
          {fmtDate(points[0].date)}
        </text>
        <text x={W - PAD_R} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="end">
          {fmtDate(points[n - 1].date)}
        </text>
      </svg>
    </figure>
  );
}
