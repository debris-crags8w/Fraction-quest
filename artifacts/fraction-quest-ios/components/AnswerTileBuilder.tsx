import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { answerShape, SLOT_DIGITS, SLOTS, slotAnswer, slotsFromAnswer } from '../../fraction-quest/src/answer-shape';
import type { WorksheetProblem } from '../../fraction-quest/src/learning-content';
import { useColors } from '@/hooks/useColors';

const SLOT_NAMES: Record<string, string> = {
  n: 'answer',
  num: 'numerator',
  den: 'denominator',
  whole: 'whole number',
  dec: 'decimal digits',
};

export function AnswerTileBuilder({
  problem,
  value,
  onChange,
  disabled = false,
}: {
  problem: WorksheetProblem;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const shape = useMemo(() => answerShape(problem), [problem.id, problem.prompt, problem.answer, problem.form, problem.rulerTask]);
  const slotNames = shape.kind === 'number' || shape.kind === 'fraction' || shape.kind === 'mixed' || shape.kind === 'decimal'
    ? SLOTS[shape.kind] : [];
  const [slots, setSlots] = useState<Record<string, string>>(() => slotsFromAnswer(shape, value));
  const [activeSlot, setActiveSlot] = useState(() => slotNames.find((name) => !slotsFromAnswer(shape, value)[name]) ?? slotNames[0] ?? '');
  const [choice, setChoice] = useState(value);
  const [order, setOrder] = useState<(number | null)[]>(() => {
    if (shape.kind !== 'ordered') return [];
    const saved = value.split(',').map((item) => item.trim()).filter(Boolean);
    const indexes = saved.map((item) => shape.items.indexOf(item));
    return indexes.length === shape.items.length && indexes.every((index) => index >= 0)
      ? indexes
      : shape.items.map(() => null);
  });

  const tileStyle = [styles.tile, { borderColor: colors.border, backgroundColor: colors.card }];
  const slotStyle = [styles.slot, { borderColor: colors.border, backgroundColor: colors.background }];
  const activeSlotStyle = { borderColor: colors.primary, backgroundColor: colors.coralSoft };
  const labelStyle = { color: colors.foreground };
  const hintStyle = { color: colors.mutedForeground };

  const changeSlots = (next: Record<string, string>) => {
    setSlots(next);
    onChange(slotAnswer(shape, next));
  };
  const addDigit = (digit: string) => {
    if (disabled || !activeSlot) return;
    const current = slots[activeSlot] ?? '';
    if (current.length >= SLOT_DIGITS) return;
    changeSlots({ ...slots, [activeSlot]: current === '0' && shape.kind !== 'decimal' ? digit : `${current}${digit}` });
  };
  const fractionSlot = (name: 'num' | 'den') => (
    <Pressable key={name} accessibilityRole="button"
      accessibilityLabel={`${SLOT_NAMES[name]}: ${slots[name] || 'empty'}${activeSlot === name ? ', selected' : ''}`}
      accessibilityState={{ selected: activeSlot === name }}
      disabled={disabled}
      onPress={() => setActiveSlot(name)}
      style={[...slotStyle, activeSlot === name && activeSlotStyle]}>
      <Text style={[styles.slotText, { color: name === 'num' ? colors.primary : colors.secondary }]}>{slots[name] || ''}</Text>
    </Pressable>
  );
  const normalSlot = (name: string) => (
    <Pressable key={name} accessibilityRole="button"
      accessibilityLabel={`${SLOT_NAMES[name] ?? name}: ${slots[name] || 'empty'}${activeSlot === name ? ', selected' : ''}`}
      accessibilityState={{ selected: activeSlot === name }}
      disabled={disabled}
      onPress={() => setActiveSlot(name)}
      style={[...slotStyle, activeSlot === name && activeSlotStyle]}>
      <Text style={[styles.slotText, labelStyle]}>{slots[name] || ''}</Text>
    </Pressable>
  );

  if (shape.kind === 'yesno') {
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel="Choose yes or no" style={styles.wrap}>
        {(['yes', 'no'] as const).map((answer) => {
          const selected = choice.toLowerCase() === answer;
          return (
            <Pressable key={answer} testID={`answer-tile-${answer}`} accessibilityRole="radio"
              accessibilityState={{ selected }} disabled={disabled}
              onPress={() => { setChoice(answer); onChange(answer); }}
              style={[...tileStyle, styles.choice, selected && { borderColor: colors.primary, backgroundColor: colors.coralSoft }]}>
              <Text style={[styles.choiceText, labelStyle]}>{answer === 'yes' ? 'Yes' : 'No'}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (shape.kind === 'pick' || shape.kind === 'symbol') {
    const options = shape.kind === 'pick' ? shape.options : ['<', '=', '>'];
    const clearChoice = () => {
      if (!disabled) {
        setChoice('');
        onChange('');
      }
    };
    return (
      <View style={styles.wrap}>
        <View accessibilityLabel="Your answer" style={styles.answerRow}>
          {shape.kind === 'symbol' && shape.left ? <Text style={[styles.sentence, labelStyle]}>{shape.left}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={choice ? `Your answer: ${choice}. Tap to clear.` : 'Your answer: empty'}
            onPress={clearChoice} disabled={disabled}
            style={[...slotStyle, styles.answerSlot, choice && { borderStyle: 'solid', borderColor: colors.primary }]}>
            <Text style={[styles.choiceText, labelStyle]}>{choice}</Text>
          </Pressable>
          {shape.kind === 'symbol' && shape.right ? <Text style={[styles.sentence, labelStyle]}>{shape.right}</Text> : null}
        </View>
        <View accessibilityLabel={shape.kind === 'symbol' ? 'Sign tiles' : 'Answer cards'} style={styles.tray}>
          {options.map((option, index) => (
            <Pressable key={option} testID={`answer-tile-option-${index}`} accessibilityRole="radio"
              accessibilityLabel={`Choose ${option}`} accessibilityState={{ selected: choice === option }}
              disabled={disabled} onPress={() => { setChoice(option); onChange(option); }}
              style={[...tileStyle, styles.choice, shape.kind === 'symbol' && styles.symbolTile,
                choice === option && { borderColor: colors.primary, backgroundColor: colors.coralSoft }]}>
              <Text style={[styles.choiceText, labelStyle]}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.help, hintStyle]}>Tap a tile to place your answer.</Text>
      </View>
    );
  }

  if (shape.kind === 'ordered') {
    const orderedItems = shape.items;
    const placeCard = (card: number, slot: number) => {
      if (disabled) return;
      const next = [...order];
      const priorSlot = next.indexOf(card);
      const occupant = next[slot];
      if (priorSlot >= 0) next[priorSlot] = occupant ?? null;
      next[slot] = card;
      setOrder(next);
      onChange(next.every((index) => index !== null) ? next.map((index) => orderedItems[index!]).join(', ') : '');
    };
    const tapCard = (card: number) => {
      const empty = order.indexOf(null);
      if (empty >= 0) placeCard(card, empty);
    };
    const endLabels = shape.first === 'smallest' ? ['Smallest', 'Biggest']
      : shape.first === 'biggest' ? ['Biggest', 'Smallest'] : ['First', 'Last'];
    return (
      <View style={styles.wrap}>
        <View style={styles.orderRow}>
          <Text style={[styles.orderLabel, hintStyle]}>{endLabels[0]}</Text>
          {order.map((card, slot) => (
            <Pressable key={slot} accessibilityRole="button"
              accessibilityLabel={`Place ${slot + 1}: ${card !== null ? orderedItems[card] : 'empty'}. Tap to clear.`}
              disabled={disabled} onPress={() => {
                if (card === null) return;
                const next = [...order]; next[slot] = null; setOrder(next);
                onChange(next.every((index) => index !== null) ? next.map((index) => orderedItems[index!]).join(', ') : '');
              }}
              style={[...slotStyle, styles.orderSlot, card !== null && { borderStyle: 'solid', borderColor: colors.primary }]}>
              <Text style={[styles.orderItem, labelStyle]}>{card !== null ? orderedItems[card] : slot + 1}</Text>
            </Pressable>
          ))}
          <Text style={[styles.orderLabel, hintStyle]}>{endLabels[1]}</Text>
        </View>
        <View style={styles.tray}>
          {orderedItems.map((item, card) => order.includes(card) ? null : (
            <Pressable key={`${item}-${card}`} accessibilityRole="button" accessibilityLabel={`Put ${item} in the next empty place`}
              disabled={disabled} onPress={() => tapCard(card)}
              style={[...tileStyle, styles.choice, styles.orderCard]}>
              <Text style={[styles.orderItem, labelStyle]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.help, hintStyle]}>Tap amounts in order, then tap a placed tile to move it.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View accessibilityLabel="Build your answer" style={styles.answerRow}>
        {shape.kind === 'number' && <>
          {normalSlot('n')}
          {!!shape.suffix && <Text style={[styles.fixed, labelStyle]}>{shape.suffix}</Text>}
        </>}
        {shape.kind === 'fraction' && <View style={styles.fraction}>
          {fractionSlot('num')}<View style={[styles.fractionLine, { backgroundColor: colors.foreground }]} />{fractionSlot('den')}
        </View>}
        {shape.kind === 'mixed' && <>
          {normalSlot('whole')}
          <View style={styles.fraction}>
            {fractionSlot('num')}<View style={[styles.fractionLine, { backgroundColor: colors.foreground }]} />{fractionSlot('den')}
          </View>
        </>}
        {shape.kind === 'decimal' && <>
          {normalSlot('whole')}<Text style={[styles.decimalPoint, labelStyle]}>.</Text>{normalSlot('dec')}
        </>}
        <Pressable accessibilityRole="button" accessibilityLabel="Take away the last number"
          disabled={disabled || !slots[activeSlot]} onPress={() => {
            const current = slots[activeSlot] ?? '';
            if (current) changeSlots({ ...slots, [activeSlot]: current.slice(0, -1) });
          }} style={[styles.erase, { borderColor: colors.border }]} >
          <Text style={[styles.eraseText, { color: colors.mutedForeground }]}>⌫</Text>
        </Pressable>
      </View>
      <View accessibilityLabel="Number tiles" style={styles.tray}>
        {Array.from({ length: 10 }, (_, digit) => String(digit)).map((digit) => (
          <Pressable key={digit} testID={`answer-tile-digit-${digit}`} accessibilityRole="button"
            accessibilityLabel={`Put ${digit} in the ${SLOT_NAMES[activeSlot] ?? 'answer'}`}
            accessibilityState={{ disabled }} disabled={disabled} onPress={() => addDigit(digit)}
            style={[...tileStyle, styles.digitTile]}>
            <Text style={[styles.digitText, labelStyle]}>{digit}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.help, hintStyle]}>
        Tap a box, then tap number tiles. {shape.kind === 'mixed' && shape.flexible ? 'Leave a box empty when you do not need it.' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, width: '100%' },
  answerRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  fraction: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  fractionLine: { height: 3, width: 48, borderRadius: 2 },
  slot: { minWidth: 53, height: 48, paddingHorizontal: 8, borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  slotText: { fontSize: 20, fontWeight: '800', minWidth: 26, textAlign: 'center' },
  fixed: { fontSize: 23, fontWeight: '800' },
  decimalPoint: { fontSize: 26, fontWeight: '800', marginHorizontal: -4, marginTop: 12 },
  erase: { width: 44, height: 44, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  eraseText: { fontSize: 26, fontWeight: '600', marginTop: -5 },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tile: { minWidth: 43, height: 46, paddingHorizontal: 9, borderWidth: 1.5, borderBottomWidth: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  digitTile: { minWidth: 42 },
  digitText: { fontSize: 20, fontWeight: '800' },
  choice: { minHeight: 52, flexGrow: 1, flexBasis: '30%' },
  choiceText: { fontSize: 16, lineHeight: 23, fontWeight: '700', textAlign: 'center' },
  symbolTile: { minWidth: 60 },
  answerSlot: { minWidth: 62, flexGrow: 0 },
  sentence: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  help: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  orderRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  orderLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  orderSlot: { minWidth: 54, flexGrow: 1, maxWidth: 130, height: 58 },
  orderCard: { minHeight: 58, flexGrow: 0, flexBasis: '45%' },
  orderItem: { fontSize: 14, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
});
