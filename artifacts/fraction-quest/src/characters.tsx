import { Hoot, Mascot } from './fun-ui';
import type { Speaker } from './story';

/** The story cast, drawn to match Numi and Hoot: round, friendly, thick outlines kept simple. */
export function StoryCharacter({ id, size = 64, happy = false }: { id: Speaker; size?: number; happy?: boolean }) {
  if (id === 'numi') return <Mascot mood={happy ? 'cheer' : 'happy'} size={size} />;
  if (id === 'hoot') return <Hoot size={size} />;
  const ink = '#2B2D42';
  return (
    <svg className={`fq-character fq-character-${id}`} width={size} height={size} viewBox="0 0 80 80" aria-hidden="true" data-character={id}>
      {id === 'chomp' && <>
        <ellipse cx="40" cy="58" rx="32" ry="17" fill="#4CAF50" />
        <circle cx="26" cy="30" r="11" fill="#4CAF50" /><circle cx="54" cy="30" r="11" fill="#4CAF50" />
        <circle cx="26" cy="29" r="6.5" fill="#fff" /><circle cx="54" cy="29" r="6.5" fill="#fff" />
        <circle cx="27" cy="29" r="3.5" fill={ink} /><circle cx="55" cy="29" r="3.5" fill={ink} />
        <path d={happy ? 'M18 56 q22 14 44 0' : 'M18 58 q22 8 44 0'} stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M23 59 l4 5 l4 -4 l4 5 l4 -5 l4 4 l4 -5 l4 4 l4 -4" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinejoin="round" />
        <circle cx="33" cy="47" r="1.6" fill="#2E7D32" /><circle cx="47" cy="47" r="1.6" fill="#2E7D32" />
      </>}
      {id === 'pip' && <>
        <ellipse cx="40" cy="54" rx="29" ry="19" fill="#3FAE2A" />
        <circle cx="26" cy="31" r="12" fill="#3FAE2A" /><circle cx="54" cy="31" r="12" fill="#3FAE2A" />
        <circle cx="26" cy="30" r="7.5" fill="#fff" /><circle cx="54" cy="30" r="7.5" fill="#fff" />
        <circle cx="27" cy="30" r="4" fill={ink} /><circle cx="55" cy="30" r="4" fill={ink} />
        <path d={happy ? 'M27 55 Q40 68 53 55' : 'M28 56 Q40 64 52 56'} stroke="#1E6B12" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="22" cy="52" r="3" fill="#FF8FA8" opacity=".6" /><circle cx="58" cy="52" r="3" fill="#FF8FA8" opacity=".6" />
        <ellipse cx="18" cy="72" rx="9" ry="4" fill="#2E8B1E" /><ellipse cx="62" cy="72" rx="9" ry="4" fill="#2E8B1E" />
      </>}
      {id === 'tilly' && <>
        <ellipse cx="44" cy="58" rx="30" ry="17" fill="#9C6B3C" />
        <path d="M24 56 L34 46 L48 46 L58 56 L48 66 L34 66 Z" fill="#B98552" stroke="#7A4F27" strokeWidth="2" />
        <path d="M14 58 h10 M58 58 h10 M41 41 v5 M41 66 v5" stroke="#7A4F27" strokeWidth="2" />
        <circle cx="16" cy="38" r="13" fill="#7CC36A" />
        <path d="M10 60 q-2 10 6 12 M68 64 q4 8 -2 10" stroke="#7CC36A" strokeWidth="7" fill="none" strokeLinecap="round" />
        <circle cx="12" cy="35" r="4.8" fill="#fff" /><circle cx="22" cy="35" r="4.8" fill="#fff" />
        <circle cx="12.6" cy="35" r="2.6" fill={ink} /><circle cx="22.6" cy="35" r="2.6" fill={ink} />
        <path d={happy ? 'M10 43 Q17 49 24 43' : 'M11 44 Q17 47 23 44'} stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>}
      {id === 'bolt' && <>
        <path d="M40 6 v8" stroke="#8D99AE" strokeWidth="3" /><circle cx="40" cy="6" r="4" fill="#FF6B6B" />
        <rect x="16" y="14" width="48" height="34" rx="10" fill="#A8B4C8" stroke="#6C7A91" strokeWidth="2.5" />
        <rect x="22" y="20" width="36" height="22" rx="6" fill="#203047" />
        {happy
          ? <><path d="M28 32 q4 -6 8 0 M44 32 q4 -6 8 0" stroke="#7CF3FF" strokeWidth="2.6" fill="none" strokeLinecap="round" /></>
          : <><circle cx="32" cy="30" r="3.6" fill="#7CF3FF" /><circle cx="48" cy="30" r="3.6" fill="#7CF3FF" /></>}
        <path d="M34 37 h12" stroke="#7CF3FF" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="22" y="50" width="36" height="22" rx="7" fill="#A8B4C8" stroke="#6C7A91" strokeWidth="2.5" />
        <circle cx="34" cy="61" r="3" fill="#FFC800" /><circle cx="46" cy="61" r="3" fill="#58CC02" />
        <path d="M22 56 h-8 M58 56 h8" stroke="#6C7A91" strokeWidth="4" strokeLinecap="round" />
      </>}
      {id === 'bea' && <>
        <ellipse cx="26" cy="22" rx="12" ry="9" fill="#DFF3FF" stroke="#9BC8E6" strokeWidth="2" transform="rotate(-20 26 22)" />
        <ellipse cx="54" cy="22" rx="12" ry="9" fill="#DFF3FF" stroke="#9BC8E6" strokeWidth="2" transform="rotate(20 54 22)" />
        <ellipse cx="40" cy="50" rx="26" ry="22" fill="#FFC800" />
        <path d="M22 40 h36 M17 52 h46 M21 64 h38" stroke={ink} strokeWidth="5" strokeLinecap="round" />
        <circle cx="40" cy="26" r="13" fill="#FFC800" />
        <path d="M34 15 q-4 -8 -9 -9 M46 15 q4 -8 9 -9" stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="35" cy="25" r="3.4" fill={ink} /><circle cx="45" cy="25" r="3.4" fill={ink} />
        <path d={happy ? 'M35 30 Q40 36 45 30' : 'M36 31 Q40 34 44 31'} stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </>}
    </svg>
  );
}
