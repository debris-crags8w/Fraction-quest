import React, { type ReactNode } from 'react';

/* Shows fractions in text the way math books (and LaTeX's \frac) do: the top number over a bar
   over the bottom number. "3/4" → ³⁄₄ stacked, "1 and 3/4" → 1 ³⁄₄, "?/12" → a blank over 12. */

// "1 and 3/4" (mixed number), "1 2/3" (mixed, single-digit whole), or "3/4" / "?/12" / "2/?".
const TOKEN = /(\d+) and (\d+|\?)\/(\d+|\?)|\b(\d) (\d+)\/(\d+)\b|(\d+|\?)\/(\d+|\?)/g;

export function StackedFraction({ top, bottom }: { top: string; bottom: string }) {
  const say = (part: string) => (part === '?' ? 'blank' : part);
  return (
    <span className="fq-mfrac" role="math" aria-label={`${say(top)} over ${say(bottom)}`}>
      <span className="n" aria-hidden="true">{top}</span>
      <span className="d" aria-hidden="true">{bottom}</span>
    </span>
  );
}

function Mixed({ whole, top, bottom }: { whole: string; top: string; bottom: string }) {
  return (
    <span className="fq-mixed" role="math" aria-label={`${whole} and ${top} over ${bottom}`}>
      <span aria-hidden="true">{whole}</span>
      <span aria-hidden="true"><StackedFraction top={top} bottom={bottom} /></span>
    </span>
  );
}

/** Renders text with every fraction stacked. Plain text passes through unchanged. */
export function MathText({ text }: { text: string | undefined | null }) {
  if (!text) return null;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    if (m[1]) out.push(<Mixed key={at} whole={m[1]} top={m[2]} bottom={m[3]} />);
    else if (m[4]) out.push(<Mixed key={at} whole={m[4]} top={m[5]} bottom={m[6]} />);
    else out.push(<StackedFraction key={at} top={m[7]} bottom={m[8]} />);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
