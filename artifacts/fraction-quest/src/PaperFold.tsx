import type { CSSProperties, ReactElement } from 'react';

/** Static picture of folding steps (for puzzles and paper): flat strip → folded once → folded again… then "open it". */
export function FoldIllustration({ folds }: { folds: number[] }) {
  const steps = folds.reduce<number[]>((list, f) => [...list, list[list.length - 1] * f], [1]);
  const W = 120; const gap = 36; const H = 30;
  let x = 4;
  const parts: ReactElement[] = [];
  steps.forEach((p, i) => {
    const w = W / p;
    const layers = Math.min(p, 6);
    const group: ReactElement[] = [];
    for (let k = layers - 1; k >= 0; k--) group.push(<rect key={`${i}-${k}`} className="fold-layer" x={x + k * 3} y={14 + k * 3} width={w} height={H} />);
    group.push(<text key={`t${i}`} x={x + w / 2} y={8} textAnchor="middle">{i === 0 ? 'Start' : `Fold ${i}`}</text>);
    parts.push(<g key={`g${i}`} className="fold-step" style={{ '--i': i * 2 } as CSSProperties}>{group}</g>);
    x += w + layers * 3 + 6;
    if (i < steps.length - 1) {
      parts.push(<path key={`a${i}`} className="fold-arrow fold-step" style={{ '--i': i * 2 + 1 } as CSSProperties} d={`M${x} ${14 + H / 2} h${gap - 14} m-6 -5 l6 5 l-6 5`} />);
      x += gap;
    }
  });
  parts.push(<path key="open" className="fold-arrow fold-step" style={{ '--i': steps.length * 2 - 1 } as CSSProperties} d={`M${x} ${14 + H / 2} h${gap - 14} m-6 -5 l6 5 l-6 5`} />);
  x += gap;
  parts.push(<text key="q" x={x + 14} y={14 + H / 2 + 6} textAnchor="middle" className="fold-question fold-step" style={{ '--i': steps.length * 2 } as CSSProperties}>Open?</text>);
  x += 36;
  return (
    <svg className="fq-svg-fold" viewBox={`0 0 ${x} ${14 + H + 22}`} role="img" aria-label={`A paper strip folded ${folds.length} times, then opened`}>
      {parts}
    </svg>
  );
}
