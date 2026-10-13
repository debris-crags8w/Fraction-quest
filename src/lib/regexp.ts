/**
 * Collect global regex matches without String.prototype.matchAll, which is
 * missing in some older embedded mobile browsers.
 */
export function execAll(text: string, pattern: RegExp): RegExpExecArray[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text)) !== null) {
    matches.push(match);
    if (match[0].length === 0) matcher.lastIndex += 1;
  }

  return matches;
}
