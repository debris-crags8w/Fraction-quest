import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { AREA_CUTS } from '../../fraction-quest/src/area-shapes';
import type { ModelSpec } from '../../fraction-quest/src/game';
import type { BuildCheck, LearningModel, WorksheetProblem } from '../lib/curriculum';

export type BuildState = { d: number; wholes: number; count: number };
export const blankBuildState = (): BuildState => ({ d: 0, wholes: 1, count: 0 });

const card = { padding: 16, borderRadius: 20, borderWidth: 1, gap: 14 } as const;

export function ModelPreview({ model }: { model: ModelSpec }) {
  const colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    card: { ...card, backgroundColor: colors.card, borderColor: colors.border },
    label: { color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
    caption: { color: colors.foreground, fontSize: 14, lineHeight: 20, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    cell: { flex: 1, minWidth: 16, height: 35, borderRadius: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    dot: { width: 22, height: 22, borderRadius: 12, backgroundColor: colors.secondary },
    tick: { width: 2, height: 30, backgroundColor: colors.border },
    note: { color: colors.mutedForeground, fontSize: 13, lineHeight: 18 },
  }), [colors.background, colors.border, colors.card, colors.foreground, colors.mutedForeground, colors.secondary]);

  const bars = model.kind === 'bars' ? model.bars : [];
  return (
    <View style={styles.card} accessibilityLabel={model.caption ?? 'Fraction model'}>
      <Text style={styles.label}>Fraction model</Text>
      {model.kind === 'bars' && bars.map((bar, barIndex) => (
        <View key={barIndex} style={{ gap: 4 }}>
          <View style={styles.row}>
            {Array.from({ length: bar.denominator }, (_, index) => (
              <View key={index} style={[styles.cell, index < bar.numerator && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
            ))}
          </View>
          {!model.hideLabels && <Text style={styles.note}>{bar.numerator}/{bar.denominator}</Text>}
        </View>
      ))}
      {model.kind === 'set' && (
        <View style={[styles.row, { justifyContent: 'center' }]}>
          {Array.from({ length: model.total }, (_, index) => (
            <View key={index} style={[styles.dot, { opacity: index < (model.selected / model.total) * model.total ? 1 : 0.32 }]} />
          ))}
        </View>
      )}
      {model.kind === 'line' && (
        <View style={{ gap: 8 }}>
          <View style={[styles.row, { flexWrap: 'nowrap', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: 2, borderColor: colors.foreground }]}>
            {Array.from({ length: model.denominator * (model.wholes ?? 1) + 1 }, (_, index) => (
              <View key={index} style={[styles.tick, index === model.numerator && { backgroundColor: colors.primary, height: 40, width: 4 }]} />
            ))}
          </View>
          {!model.hideLabels && <Text style={styles.note}>{model.numerator}/{model.denominator}</Text>}
        </View>
      )}
      {model.kind === 'partition' && (
        <View style={[styles.row, { flexWrap: 'nowrap' }]}>
          {model.parts.map((size, index) => (
            <View key={index} style={[styles.cell, { flex: Math.max(size, 1), backgroundColor: index === 0 ? colors.primary : colors.background }]} />
          ))}
        </View>
      )}
      {model.kind === 'equation' && <Text style={styles.caption}>{model.text}</Text>}
      {model.kind === 'decimal' && (
        <View style={styles.row}>
          {Array.from({ length: 10 }, (_, index) => <View key={index} style={[styles.cell, index < model.tenths && { backgroundColor: colors.primary }]} />)}
        </View>
      )}
      {model.kind === 'area' && (
        <AreaPieces cut={model.cut} shaded={model.shaded} disabled />
      )}
      {!!model.caption && <Text style={styles.note}>{model.caption}</Text>}
    </View>
  );
}

function AreaPieces({ cut, shaded = [], onToggle, disabled = false }: {
  cut: keyof typeof AREA_CUTS; shaded?: number[]; onToggle?: (index: number) => void; disabled?: boolean;
}) {
  const colors = useColors();
  const pieces = AREA_CUTS[cut];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
      {pieces.map((piece, index) => (
        <Pressable key={index} disabled={disabled} accessibilityRole={disabled ? undefined : 'button'}
          accessibilityLabel={`Shape piece ${index + 1}${shaded.includes(index) ? ', shaded' : ''}`}
          onPress={() => onToggle?.(index)}
          style={{ width: 37, height: 37, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: shaded.includes(index) ? colors.primary : colors.background }}>
          <Svg width={28} height={28} viewBox="0 0 1 1">
            <Polygon points={piece.points.map((point) => `${point[0]},${point[1]}`).join(' ')}
              fill={shaded.includes(index) ? colors.primaryForeground : colors.muted}
              stroke={shaded.includes(index) ? colors.primaryForeground : colors.secondary} strokeWidth={0.025} />
          </Svg>
        </Pressable>
      ))}
    </View>
  );
}

function modelPicture(model: LearningModel): ModelSpec {
  if (model.kind === 'bar') {
    return {
      kind: 'bars',
      bars: Array.from({ length: model.wholes }, (_, whole) => ({
        numerator: Math.max(0, Math.min(model.d, model.n - whole * model.d)),
        denominator: model.d,
        named: true,
      })),
    };
  }
  if (model.kind === 'line') {
    return { kind: 'line', numerator: model.n, denominator: model.d, wholes: model.wholes };
  }
  return { kind: 'set', selected: model.n, total: model.total ?? model.d };
}

export function ModelBuilder({ check, kind, value, onChange, title }: {
  check: BuildCheck; kind: LearningModel['kind']; value: BuildState; onChange: (next: BuildState) => void; title: string;
}) {
  const colors = useColors();
  const target = check.target;
  const lineWholes = Math.max(1, Math.ceil(target.n / target.d));
  const maxD = kind === 'line' ? Math.max(12, target.d) : kind === 'set' ? Math.min(target.total ?? 24, 100) : 100;
  const wholeCount = kind === 'line' ? lineWholes : value.wholes;
  const itemCount = kind === 'set' ? value.d : value.d * wholeCount;
  const targetCount = Math.max(0, itemCount);
  const adjust = (key: 'd' | 'wholes' | 'count', change: number) => {
    const nextValue = Math.max(key === 'wholes' ? 1 : 0, Math.min(key === 'd' ? maxD : key === 'wholes' ? 3 : targetCount, value[key] + change));
    const next = { ...value, [key]: nextValue };
    if (key === 'd') next.count = Math.min(next.count, kind === 'set' ? next.d : next.d * wholeCount);
    if (key === 'wholes') next.count = Math.min(next.count, next.d * next.wholes);
    onChange(next);
  };
  const selectCount = (index: number) => onChange({ ...value, count: value.count === index + 1 ? index : index + 1 });
  const control = (label: string, key: 'd' | 'wholes' | 'count', max: number) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <Text style={{ color: colors.foreground, flex: 1, fontSize: 13 }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} disabled={value[key] <= (key === 'wholes' ? 1 : 0)}
        onPress={() => adjust(key, -1)} style={{ padding: 9 }}>
        <Feather name="minus-circle" size={21} color={colors.secondary} />
      </Pressable>
      <Text accessibilityLabel={`${label}: ${value[key]}`} style={{ minWidth: 24, color: colors.foreground, textAlign: 'center', fontWeight: '700' }}>
        {value[key] === 0 && key === 'd' ? '?' : value[key]}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} disabled={value[key] >= max}
        onPress={() => adjust(key, 1)} style={{ padding: 9 }}>
        <Feather name="plus-circle" size={21} color={colors.secondary} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ ...card, backgroundColor: colors.card, borderColor: colors.border }}>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
        {kind === 'line' ? 'Set equal spaces, then tap the jump.' : kind === 'set' ? 'Make equal groups, then choose groups.' : 'Choose equal parts, then tap the pieces.'}
      </Text>
      {control(kind === 'set' ? 'Equal groups' : kind === 'line' ? 'Equal spaces in one whole' : 'Equal parts in one whole', 'd', maxD)}
      {kind === 'bar' && lineWholes > 1 && control('Whole bars', 'wholes', 3)}
      {control(kind === 'line' ? 'Jumps from zero' : kind === 'set' ? 'Groups selected' : 'Parts shaded', 'count', targetCount)}
      {value.d > 0 && (
        kind === 'line' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 10, minWidth: 280, gap: 0 }}>
              {Array.from({ length: Math.min(value.d * wholeCount + 1, 121) }, (_, i) => (
                <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Number line tick ${i}`} onPress={() => onChange({ ...value, count: i })}
                  style={{ width: Math.max(280 / Math.min(value.d * wholeCount, 20), 10), height: 42, borderBottomWidth: 2, borderColor: colors.foreground, alignItems: 'center', justifyContent: 'flex-end' }}>
                  <View style={{ width: i === value.count ? 4 : 2, height: i === value.count ? 27 : 15, backgroundColor: i === value.count ? colors.primary : colors.border }} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : kind === 'set' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {Array.from({ length: value.d }, (_, i) => {
              const total = target.total ?? value.d;
              const groupSize = Math.floor(total / value.d) + (i < total % value.d ? 1 : 0);
              const shown = Math.min(groupSize, 8);
              return (
                <Pressable key={i} accessibilityRole="button"
                  accessibilityLabel={`Group ${i + 1}, ${groupSize} ${groupSize === 1 ? 'object' : 'objects'}${i < value.count ? ', selected' : ''}`}
                  accessibilityState={{ selected: i < value.count }}
                  onPress={() => selectCount(i)}
                  style={{ width: 54, minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: i < value.count ? colors.secondary : colors.border, backgroundColor: i < value.count ? colors.tealSoft : colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontSize: 12 }}>
                    {'●'.repeat(shown)}{groupSize > shown ? '…' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {Array.from({ length: Math.min(value.d * wholeCount, 100) }, (_, i) => (
              <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Part ${i + 1} of ${value.d}`}
                accessibilityState={{ selected: i < value.count }} onPress={() => selectCount(i)}
                style={{ width: `${Math.max(8, 100 / Math.min(value.d, 12) - 2)}%`, height: 34, borderRadius: 7, borderWidth: 1, borderColor: i < value.count ? colors.primary : colors.border, backgroundColor: i < value.count ? colors.primary : colors.background }} />
            ))}
          </View>
        )
      )}
      <Text style={{ color: colors.secondary, fontSize: 13, fontWeight: '700' }}>
        {value.d > 0 ? `${value.count}/${value.d}${kind === 'bar' && value.wholes > 1 ? ` across ${value.wholes} wholes` : ''}` : 'Start by choosing equal parts.'}
      </Text>
    </View>
  );
}

export function WorksheetModelInput({ problem, onReady, disabled }: {
  problem: WorksheetProblem; onReady: (ready: boolean) => void; disabled: boolean;
}) {
  const colors = useColors();
  const model = problem.model;
  const total = model?.kind === 'bar' ? model.d * model.wholes : model?.kind === 'set' ? model.d : model?.kind === 'line' ? model.d * model.wholes + 1 : 0;
  const barTotal = model?.kind === 'bar' ? model.d * model.wholes : 0;
  const [barSelected, setBarSelected] = useState<boolean[]>(() => Array.from({ length: barTotal }, () => false));
  const [barTouched, setBarTouched] = useState(false);
  const [barOrder, setBarOrder] = useState<number[]>([]);
  const [tick, setTick] = useState<number | null>(null);
  const [marks, setMarks] = useState<number[]>([]);
  const [percent, setPercent] = useState(100);
  const [areaSelected, setAreaSelected] = useState<number[]>([]);
  const ruler = problem.rulerTask;
  const plot = problem.linePlotTask;
  const scale = problem.scaleTask;
  const areaTask = problem.areaTask;
  const barGated = !!problem.modelRequired && model?.kind === 'bar';
  const barTask = problem.task ?? { kind: 'copy' as const, n: model?.kind === 'bar' ? model.n : 0 };
  const gated = barGated || !!ruler || !!plot || !!scale || !!areaTask;
  const barReady = !!barGated && model?.kind === 'bar' && barTouched && barSelected.length === barTotal
    && (barTask.kind === 'copy'
      ? barSelected.every((shaded, index) => shaded === (index < model.n))
      : barSelected.filter(Boolean).length === barTask.n);
  const answerReady = !gated || (barGated ? barReady : ruler ? tick === ruler.end : plot
    ? Array.from({ length: plot.denominator * plot.wholes + 1 }, (_, index) => index)
      .every((index) => (marks[index] ?? 0) === plot.values.filter((entry) => entry === index).length)
      && marks.length === plot.denominator * plot.wholes + 1
    : scale ? percent === (scale.numerator / scale.denominator) * 100
      : areaTask ? areaSelected.length === areaTask.n && !areaTask.avoid?.some((index) => areaSelected.includes(index))
        : true);
  const report = (ready: boolean) => onReady(ready);
  useEffect(() => { onReady(answerReady); }, [answerReady, onReady]);

  if (!gated && !problem.task && !model && !problem.area) return null;
  return (
    <View style={{ ...card, padding: 14, backgroundColor: colors.card, borderColor: colors.border }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' }}>
        {gated ? 'Build the model before answering' : 'Explore the model'}
      </Text>
      {barGated && model?.kind === 'bar' ? (
        <View style={{ gap: 13 }}>
          <ModelPreview model={modelPicture(model)} />
          <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19, fontWeight: '600' }}>
            {barTask.kind === 'copy' ? 'Copy the shaded bar above. Tap parts to color or clear them.'
              : barTask.kind === 'count' ? 'Tap every part as you count it, one at a time.'
                : `Shade ${barTask.n} ${barTask.n === 1 ? 'part' : 'parts'} of the bar.`}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {barSelected.map((shaded, index) => {
              const part = index % model.d + 1;
              const whole = Math.floor(index / model.d) + 1;
              return (
                <Pressable key={index} disabled={disabled} accessibilityRole="button"
                  accessibilityState={{ selected: shaded }}
                  accessibilityLabel={`Part ${part} of ${model.d} in whole ${whole}${shaded ? ', shaded' : ''}`}
                  onPress={() => {
                    const next = [...barSelected];
                    next[index] = !next[index];
                    setBarSelected(next);
                    setBarTouched(true);
                    setBarOrder((order) => order.includes(index) ? order.filter((at) => at !== index) : [...order, index]);
                    const ready = barTask.kind === 'copy'
                      ? next.every((value, at) => value === (at < model.n))
                      : next.filter(Boolean).length === barTask.n;
                    report(ready);
                  }}
                  style={{ width: `${Math.max(8, 100 / Math.min(model.d, 12) - 2)}%`, minWidth: 23, height: 36, borderRadius: 7, borderWidth: 1, borderColor: shaded ? colors.primary : colors.border, backgroundColor: shaded ? colors.primary : colors.background, alignItems: 'center', justifyContent: 'center' }}>
                  {barTask.kind === 'count' && shaded
                    ? <Text style={{ color: colors.primaryForeground, fontWeight: '800', fontSize: 12 }}>{barOrder.indexOf(index) + 1}</Text>
                    : null}
                </Pressable>
              );
            })}
          </View>
          <Text accessibilityLiveRegion="polite" style={{ color: barReady ? colors.success : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>
            {barTask.kind === 'count' && !barReady && barOrder.length ? `Counted ${barOrder.length}. ` : ''}
            {barReady ? barTask.kind === 'copy' ? 'Your bar matches! Now build your answer.' : barTask.kind === 'count' ? 'You counted every part! Now build your answer.' : 'Nice shading! Now build your answer.'
              : barTask.kind === 'copy' ? 'Match the shaded parts to open the answer tiles.'
                : barTask.kind === 'count' ? 'Count every part to open the answer tiles.' : 'Shade the requested parts to open the answer tiles.'}
          </Text>
        </View>
      ) : areaTask && problem.area ? (
        <AreaPieces cut={problem.area.cut} shaded={areaSelected} onToggle={(index) => {
          const next = areaSelected.includes(index) ? areaSelected.filter((item) => item !== index) : [...areaSelected, index];
          setAreaSelected(next);
          report(next.length === areaTask.n && !areaTask.avoid?.some((item) => next.includes(item)));
        }} disabled={disabled} />
      ) : ruler ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {Array.from({ length: ruler.denominator * ruler.wholes + 1 }, (_, index) => (
            <Pressable key={index} disabled={disabled} onPress={() => { setTick(index); report(index === ruler.end); }}
              style={{ padding: 8, borderRadius: 10, backgroundColor: tick === index ? colors.primary : colors.muted }}>
              <Text style={{ color: tick === index ? colors.primaryForeground : colors.foreground }}>{index}</Text>
            </Pressable>
          ))}
        </View>
      ) : plot ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: plot.denominator * plot.wholes + 1 }, (_, index) => {
            const target = plot.values.filter((value) => value === index).length;
            const current = marks[index] ?? 0;
            return (
              <Pressable key={index} disabled={disabled} onPress={() => {
                const next = [...marks]; next[index] = current >= plot.values.length ? 0 : current + 1; setMarks(next);
                report(Array.from({ length: plot.denominator * plot.wholes + 1 }, (_, i) => i)
                  .every((i) => (next[i] ?? 0) === plot.values.filter((entry) => entry === i).length));
              }} style={{ padding: 9, borderRadius: 10, backgroundColor: colors.muted }}>
                <Text style={{ color: colors.foreground }}>{index}: {'×'.repeat(current)}{target === current ? ' ✓' : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : scale ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease the scale amount" disabled={disabled} onPress={() => { const next = Math.max(0, percent - 5); setPercent(next); report(next === (scale.numerator / scale.denominator) * 100); }}><Feather name="minus-circle" size={28} color={colors.secondary} /></Pressable>
          <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>{percent}% of {scale.whole}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Increase the scale amount" disabled={disabled} onPress={() => { const next = Math.min(200, percent + 5); setPercent(next); report(next === (scale.numerator / scale.denominator) * 100); }}><Feather name="plus-circle" size={28} color={colors.secondary} /></Pressable>
        </View>
      ) : problem.area ? (
        <AreaPieces cut={problem.area.cut} disabled />
      ) : model ? (
        <ModelPreview model={modelPicture(model)} />
      ) : (
        <ModelPreview model={problem.picture ?? { kind: 'equation', text: problem.prompt }} />
      )}
      {problem.task && !gated && <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Tap the parts to show the fraction in the question.</Text>}
      {gated && <Text style={{ color: answerReady ? colors.success : colors.mutedForeground, fontSize: 13, fontWeight: '600' }}>
        {answerReady ? 'Model ready — enter your answer.' : 'Finish building the model to unlock the answer box.'}
      </Text>}
    </View>
  );
}
