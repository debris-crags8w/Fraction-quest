import React from 'react';
/** A ruler with a blue strip lined up at zero (ruler questions in lessons and practice). Inch numbers only: the
    strip's end sits at a tick with no number, so the picture never gives the length away. */
export function RulerPicture({ denominator, wholes, end }: { denominator: number; wholes: number; end: number }) {
  const ticks = denominator * wholes;
  return (
    <div className="fq-ruler-picture" role="img" data-testid="ruler-picture"
      aria-label={`A ruler from 0 to ${wholes} inches, each inch cut into ${denominator} equal spaces. A blue strip starts at 0.`}>
      <div className="fq-ruler-track">
        <span className="fq-ruler-strip" style={{ width: `${(end / ticks) * 100}%` }} />
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <span key={i} className={`fq-ruler-tick ${i % denominator === 0 ? 'inch' : ''}`} style={{ left: `${(i / ticks) * 100}%` }} aria-hidden="true">
            <i />{i % denominator === 0 && <span>{i / denominator}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
