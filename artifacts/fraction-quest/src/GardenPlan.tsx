import { MathText } from './MathText';
import { gardenSize, type GardenSide } from './garden';

const UNIT = 96; const PAD = 6;
const named = (side: GardenSide) => `${side.whole} ${side.numerator}/${side.denominator}`;
/** Stacked inside the plan: numerator, bar, denominator (never a slash), sized to fit its part. */
function PartLabel({ x, y, w, h, top, bottom }: { x: number; y: number; w: number; h: number; top: number; bottom?: number }) {
  const size = Math.min(17, bottom ? h / 2.5 : h / 1.4, w / 1.6);
  if (!bottom) return <text className="fq-garden-part-label" x={x} y={y} style={{ fontSize: size }}>{top}</text>;
  return (
    <g className="fq-garden-part-label" style={{ fontSize: size }}>
      <text x={x} y={y - size * 0.6}>{top}</text>
      <line x1={x - size / 2} y1={y} x2={x + size / 2} y2={y} />
      <text x={x} y={y + size * 0.65}>{bottom}</text>
    </g>
  );
}

/** A rectangular garden drawn to scale: thick lines at each whole meter, dashed lines at each small part, and the
    four parts of the multiplication in four colors. The side lengths are written outside it; its area never is,
    except on the worked example (`labelParts`). */
export function GardenPlan({ width, height, labelParts = false }: { width: GardenSide; height: GardenSide; labelParts?: boolean }) {
  const w = gardenSize(width) * UNIT; const h = gardenSize(height) * UNIT;
  const wx = width.whole * UNIT; const hy = height.whole * UNIT;
  const across = Array.from({ length: Math.round(gardenSize(width) * width.denominator) - 1 }, (_, i) => (i + 1) * (UNIT / width.denominator));
  const down = Array.from({ length: Math.round(gardenSize(height) * height.denominator) - 1 }, (_, i) => (i + 1) * (UNIT / height.denominator));
  const onMeter = (at: number) => Math.abs(at / UNIT - Math.round(at / UNIT)) < 1e-6;
  const parts = [
    { x: 0, y: 0, w: wx, h: hy, tone: 'whole-whole' },
    { x: wx, y: 0, w: w - wx, h: hy, tone: 'whole-part' },
    { x: 0, y: hy, w: wx, h: h - hy, tone: 'part-whole' },
    { x: wx, y: hy, w: w - wx, h: h - hy, tone: 'part-part' },
  ].filter((part) => part.w > 0 && part.h > 0);
  const label = `A garden plan, ${named(width)} meters by ${named(height)} meters. Thick lines mark each whole meter and dashed lines mark the small parts.`;
  return (
    <div className="fq-garden" data-testid="garden-plan">
      <span className="fq-garden-top" data-testid="garden-width"><MathText text={`${named(width)} m`} /></span>
      <span className="fq-garden-side" data-testid="garden-height"><MathText text={`${named(height)} m`} /></span>
      <svg className="fq-svg-garden" viewBox={`${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`} role="img" aria-label={label}>
        {parts.map((part) => <rect key={part.tone} className={`fq-garden-${part.tone}`} x={part.x} y={part.y} width={part.w} height={part.h} />)}
        {across.map((x) => <line key={`x${x}`} className={onMeter(x) ? 'fq-garden-meter' : 'fq-garden-cut'} x1={x} y1={0} x2={x} y2={h} />)}
        {down.map((y) => <line key={`y${y}`} className={onMeter(y) ? 'fq-garden-meter' : 'fq-garden-cut'} x1={0} y1={y} x2={w} y2={y} />)}
        <rect className="fq-garden-frame" x={0} y={0} width={w} height={h} rx={4} />
        {labelParts && (
          <>
            <PartLabel x={wx / 2} y={hy / 2} w={wx} h={hy} top={width.whole * height.whole} />
            <PartLabel x={wx + (w - wx) / 2} y={hy / 2} w={w - wx} h={hy} top={height.whole * width.numerator} bottom={width.denominator} />
            <PartLabel x={wx / 2} y={hy + (h - hy) / 2} w={wx} h={h - hy} top={width.whole * height.numerator} bottom={height.denominator} />
            <PartLabel x={wx + (w - wx) / 2} y={hy + (h - hy) / 2} w={w - wx} h={h - hy} top={width.numerator * height.numerator} bottom={width.denominator * height.denominator} />
          </>
        )}
      </svg>
    </div>
  );
}
