// Styles: .fq-lineplot-pic in theme-pop.css (loaded for every page, so tests can import this file).

/* A finished line plot to read (a picture, not the tap-to-plot task): one X stacked over each measurement. Line-plot
   questions show it so the child has a plot to read, on screen and on paper. */

function tickLabel(tick: number, denominator: number): string {
  const whole = Math.floor(tick / denominator); const part = tick % denominator;
  return whole && part ? `${whole} ${part}/${denominator}` : whole ? String(whole) : part ? `${part}/${denominator}` : '0';
}

export function LinePlotPicture({ denominator, wholes, values }: { denominator: number; wholes: number; values: number[] }) {
  const ticks = denominator * wholes;
  const counts = Array.from({ length: ticks + 1 }, (_, tick) => values.filter((value) => value === tick).length);
  const said = counts.flatMap((count, tick) => (count ? [`${count} at ${tickLabel(tick, denominator)}`] : [])).join(', ');
  return (
    <div className="fq-lineplot-pic" role="img" aria-label={`Line plot: ${said}`} data-testid="line-plot-picture">
      <div className="fq-lineplot-pic-grid" style={{ gridTemplateColumns: `repeat(${ticks + 1}, minmax(0, 1fr))` }}>
        {counts.map((count, tick) => (
          <div className="fq-lineplot-pic-tick" key={tick}>
            <span aria-hidden="true">{Array.from({ length: count }, (_, j) => <b key={j}>×</b>)}</span>
            <i />
            <small>{tickLabel(tick, denominator)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
