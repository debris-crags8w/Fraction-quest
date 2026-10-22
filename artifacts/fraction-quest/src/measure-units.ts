/* Measurement answers keep their unit ("15 minutes", "5/8 inch"), as the lessons teach: "Keep the measurement unit
   in your answer." A question that asks for an amount of something measured gets the unit on every bare-number choice. */

const UNITS = ['minute', 'hour', 'day', 'cent', 'gram', 'kilogram', 'milliliter', 'liter', 'inch', 'foot', 'yard',
  'ounce', 'pound', 'centimeter', 'meter', 'kilometer', 'mile', 'cup'] as const;
const PLURAL: Record<string, string> = { inch: 'inches', foot: 'feet' };
const plural = (unit: string) => PLURAL[unit] ?? `${unit}s`;
const SINGULAR = new Map<string, string>(UNITS.flatMap((unit) => [[unit, unit], [plural(unit), unit]] as [string, string][]));
const BARE_AMOUNT = /^(\d+)(?: (\d+))?(?:\/(\d+))?$/;

function amount(text: string): number | null {
  const match = BARE_AMOUNT.exec(text.trim());
  if (!match) return null;
  const [, a, b, c] = match;
  if (b !== undefined && c !== undefined) return Number(a) + Number(b) / Number(c);
  if (b !== undefined) return null;
  return c !== undefined ? Number(a) / Number(c) : Number(a);
}

/** The unit an answer is measured in, or null when the question asks for a count or a plain number. */
export function answerUnit(prompt: string): string | null {
  // "How long is it in inches?": the question already names the unit, and the ruler shows it.
  if (/\bin [a-z]+\?\s*$/i.test(prompt) && SINGULAR.has(/\bin ([a-z]+)\?\s*$/i.exec(prompt)![1].toLowerCase())) return null;
  const asked = /\bhow many ([a-z]+)\b/i.exec(prompt)?.[1]?.toLowerCase();
  if (asked) return SINGULAR.get(asked) ?? null;
  // "How much water in all?", "How long are the two shortest together?", "What is the difference…?": the unit the
  // story measured in, the last one it named.
  if (!/\bhow (much|long|far|heavy)\b|\bdifference\b/i.test(prompt)) return null;
  const named = [...prompt.matchAll(/\b([a-z]+)\b/gi)].map((match) => SINGULAR.get(match[1].toLowerCase())).filter(Boolean);
  return named.length ? named[named.length - 1]! : null;
}

/** Adds the unit to every choice when all of them are bare amounts: 1 or less reads singular ("3/4 meter"). */
export function withUnits(prompt: string, choices: string[]): string[] {
  const unit = answerUnit(prompt);
  if (!unit) return choices;
  const values = choices.map(amount);
  if (values.some((value) => value === null)) return choices;
  return choices.map((choice, index) => `${choice.trim()} ${values[index]! > 0 && values[index]! <= 1 ? unit : plural(unit)}`);
}

/** "5/8 inch" → "5/8": the bare amount, for checking an answer against a key written without its unit. */
export function withoutUnit(text: string): string {
  const match = /^(.+?) ([a-z]+)$/i.exec(text.trim());
  return match && SINGULAR.has(match[2].toLowerCase()) && amount(match[1]) !== null ? match[1] : text;
}
