'use client';
import { useMemo } from 'react';

interface ContributionGraphProps {
  data?: Record<string, number>;
}

export function ContributionGraph({ data }: ContributionGraphProps) {
  const weeks = 52;
  const days = 7;
  const cellSize = 12;
  const gap = 3;

  const graphData = useMemo(() => {
    if (data) return data;
    // Generate demo data
    const d: Record<string, number> = {};
    const today = new Date();
    for (let i = 0; i < weeks * days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const rand = Math.random();
      d[key] = rand < 0.3 ? 0 : rand < 0.5 ? Math.floor(Math.random() * 3) + 1 : rand < 0.75 ? Math.floor(Math.random() * 6) + 3 : rand < 0.9 ? Math.floor(Math.random() * 10) + 6 : Math.floor(Math.random() * 15) + 10;
    }
    return d;
  }, [data]);

  const getLevel = (count: number): number => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
  };

  const colors = ['var(--graph-0)', 'var(--graph-1)', 'var(--graph-2)', 'var(--graph-3)', 'var(--graph-4)'];
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7) + 1);

  // Get month labels
  const months: { label: string; x: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + w * 7);
    if (date.getMonth() !== lastMonth) {
      lastMonth = date.getMonth();
      months.push({ label: date.toLocaleDateString('en', { month: 'short' }), x: w * (cellSize + gap) + 30 });
    }
  }

  const totalContributions = Object.values(graphData).reduce((a, b) => a + b, 0);

  return (
    <div className="card p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold">{totalContributions.toLocaleString()}</span> contributions in the last year
        </p>
      </div>
      <svg width={weeks * (cellSize + gap) + 40} height={days * (cellSize + gap) + 30} className="block">
        {/* Month labels */}
        {months.map((m, i) => (
          <text key={i} x={m.x} y={12} className="fill-slate-400 dark:fill-slate-500" fontSize="10" fontFamily="sans-serif">{m.label}</text>
        ))}

        {/* Day labels */}
        {dayLabels.map((label, i) => (
          label && <text key={i} x={0} y={20 + i * (cellSize + gap) + cellSize - 2} className="fill-slate-400 dark:fill-slate-500" fontSize="10" fontFamily="sans-serif">{label}</text>
        ))}

        {/* Cells */}
        {Array.from({ length: weeks }, (_, w) =>
          Array.from({ length: days }, (_, d) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + w * 7 + d);
            if (date > today) return null;
            const key = date.toISOString().split('T')[0];
            const count = graphData[key] || 0;
            const level = getLevel(count);
            return (
              <rect
                key={`${w}-${d}`}
                x={30 + w * (cellSize + gap)}
                y={20 + d * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={colors[level]}
                className="cursor-pointer hover:stroke-slate-400 dark:hover:stroke-slate-500 hover:stroke-1 transition-colors"
              >
                <title>{`${count} contributions on ${date.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}</title>
              </rect>
            );
          })
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span>Less</span>
        {colors.map((c, i) => (
          <span key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
