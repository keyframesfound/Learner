/* Ported from design/demo2.html — the raid sprites, unchanged. */

const S0 = 'stroke="#111" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const SKIN = '#f3d2b3';
const legs = `<rect x="20" y="72" width="9" height="16" rx="3" fill="#111"/><rect x="35" y="72" width="9" height="16" rx="3" fill="#111"/>`;
const eyes = (y: number) => `<circle cx="27" cy="${y}" r="2.6" fill="#111"/><circle cx="38" cy="${y}" r="2.6" fill="#111"/>`;

export const HEROES = [
    { name: 'Knight', move: 'Shield Bash', svg: `<svg viewBox="0 -6 72 100"><g ${S0}>${legs}
        <rect x="12" y="42" width="40" height="34" rx="10" fill="#D4FF3F"/>
        <path d="M4 48h18v12c0 8-9 13-9 13s-9-5-9-13z" fill="#fff"/><path d="M13 52v14"/>
        <circle cx="32" cy="26" r="17" fill="#fff"/><rect x="19" y="22" width="26" height="8" rx="3" fill="#111"/>
        <path d="M32 9c4-8 12-9 16-6-5 1-8 4-9 9" fill="#FF4D1C"/>
        <rect x="56" y="8" width="7" height="46" rx="2" fill="#fff"/><rect x="50" y="52" width="19" height="6" rx="2" fill="#111"/><rect x="57" y="58" width="5" height="12" rx="2" fill="#111"/>
      </g></svg>` },
    { name: 'Mage', move: 'Arcane Bolt', svg: `<svg viewBox="0 -14 72 108"><g ${S0}>${legs}
        <path d="M10 76l6-34h32l6 34z" fill="#2D5BFF"/>
        <circle cx="32" cy="30" r="15" fill="#fff"/>${eyes(31)}
        <path d="M10 20h44L36 -10z" fill="#2D5BFF"/><path d="M8 20h48"/>
        <path d="M60 4v84"/><circle cx="60" cy="0" r="7" fill="#D4FF3F"/>
      </g></svg>` },
    { name: 'Archer', move: 'Piercing Shot', svg: `<svg viewBox="0 -6 72 100"><g ${S0}>${legs}
        <rect x="12" y="42" width="40" height="34" rx="10" fill="#FF4D1C"/><path d="M12 46L32 66 52 46" fill="none"/>
        <path d="M14 30c0-14 8-22 18-22s18 8 18 22v8H14z" fill="#0F7A35"/>
        <circle cx="32" cy="30" r="12" fill="#fff"/>${eyes(31)}
        <path d="M58 14q16 32 0 64" fill="none"/><path d="M58 14v64" stroke-width="1.5"/>
      </g></svg>` },
    { name: 'Rogue', move: 'Twin Fangs', svg: `<svg viewBox="0 -10 72 104"><g ${S0}>${legs}
        <path d="M10 78l5-34h34l5 34z" fill="#7C4DFF"/>
        <path d="M12 32c0-17 9-28 20-28s20 11 20 28v7H12z" fill="#7C4DFF"/>
        <circle cx="32" cy="31" r="12" fill="#fff"/>${eyes(32)}
        <path d="M22 15l10-14 10 14" fill="#7C4DFF"/>
        <path d="M60 40v24" stroke-width="6" stroke="#E8E6DC"/><rect x="52" y="62" width="16" height="5" rx="2" fill="#111"/>
        <path d="M12 40v24" stroke-width="6" stroke="#E8E6DC"/><rect x="4" y="62" width="16" height="5" rx="2" fill="#111"/>
      </g></svg>` },
    { name: 'Cleric', move: 'Mend', svg: `<svg viewBox="0 -14 72 110"><g ${S0}>${legs}
        <path d="M12 78l6-34h28l6 34z" fill="#FFC94A"/>
        <path d="M32 44v34" stroke-width="2.5"/>
        <circle cx="32" cy="28" r="14" fill="#fff"/>
        <path d="M18 20h28" stroke-width="4"/>
        ${eyes(30)}
        <path d="M60 6v76"/><circle cx="60" cy="2" r="7" fill="#D4FF3F"/>
      </g></svg>` },
  ];
  // The boss: big drawn caricature — full black mushroom hair with a heavy fringe and stray tufts,
  // thin gold octagonal glasses, wide round face and open grin, white shirt, slim charcoal tie, empty hands.

export const BOSS_SVG = `<svg viewBox="0 0 180 176"><g ${S0}>
      <rect x="12" y="120" width="26" height="50" rx="13" fill="#fff"/><rect x="142" y="120" width="26" height="50" rx="13" fill="#fff"/>
      <rect x="78" y="98" width="24" height="20" fill="${SKIN}"/>
      <rect x="30" y="112" width="120" height="64" rx="26" fill="#fff"/>
      <path d="M90 132v44" stroke-width="2"/><circle cx="96" cy="148" r="1.6" fill="#111" stroke="none"/><circle cx="96" cy="164" r="1.6" fill="#111" stroke="none"/>
      <path d="M66 112l24 20-11-26z" fill="#fff"/><path d="M114 112l-24 20 11-26z" fill="#fff"/>
      <path d="M85 122h10l-2 8h-6z" fill="#3d3d3d"/><path d="M86 130h8l3 44h-14z" fill="#3d3d3d"/>
      <rect x="106" y="140" width="32" height="14" rx="2" fill="#D4FF3F" stroke-width="2.5"/>
      <text x="122" y="150.5" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="8.5" fill="#111" stroke="none">BOSS</text>
      <path d="M28 80C16 28 50 6 90 6s74 22 62 74l-10 2V60H38v22z" fill="#111"/>
      <circle cx="37" cy="80" r="8" fill="${SKIN}"/><circle cx="143" cy="80" r="8" fill="${SKIN}"/>
      <path d="M40 58c0-24 100-24 100 0v22c0 24-24 36-50 36S40 104 40 80z" fill="${SKIN}"/>
      <circle cx="54" cy="92" r="7" fill="#FF4D1C" opacity=".22" stroke="none"/><circle cx="126" cy="92" r="7" fill="#FF4D1C" opacity=".22" stroke="none"/>
      <path d="M37 68C32 30 58 12 90 12s58 18 53 56l-7-9-5 5-6-8-6 6-7-8-6 6-7-7-6 6-6-7-7 7-6-6-6 8-6-6-5 6z" fill="#111"/>
      <path d="M60 24q8 12 4 26M80 18q6 14 2 30M102 19q-2 14 0 28M122 26q-6 12-2 24" stroke="#3a3a3a" stroke-width="2" fill="none"/>
      <path d="M87 13c-4-14 4-20 10-18M95 13c4-10 12-10 15-6" fill="none" stroke-width="2.5"/>
      <ellipse cx="70" cy="75" rx="4.2" ry="3" fill="#111" stroke="none"/><ellipse cx="110" cy="75" rx="4.2" ry="3" fill="#111" stroke="none"/>
      <path d="M63 71q7-4.5 14 0M103 71q7-4.5 14 0" fill="none" stroke-width="2"/>
      <g stroke="#8a7240" stroke-width="2.5" fill="#fff" fill-opacity=".2">
        <path d="M61 62h18l6 6v12l-6 6H61l-6-6V68z"/><path d="M101 62h18l6 6v12l-6 6h-18l-6-6V68z"/>
        <path d="M85 70q5-4 10 0M55 68l-15-2M125 68l15-2" fill="none"/></g>
      <path d="M90 82q-4 8 2 10" fill="none" stroke-width="2.5"/>
      <path d="M71 98q19 17 38 0q-19 3-38 0z" fill="#8a3b36"/>
      <path d="M74 99.2q16 3 32 0l-2 4.5q-14 3-28 0z" fill="#fff" stroke="none"/>
      <circle cx="25" cy="170" r="9" fill="${SKIN}"/><circle cx="155" cy="170" r="9" fill="${SKIN}"/>
    </g></svg>`;

export const ROBOT_SVG = `<svg viewBox="0 0 100 100" fill="none">
  <path d="M18 34h64v46a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8z" fill="#111"/>
  <path d="M28 34V22m44 12V22" stroke="#111" stroke-width="5" stroke-linecap="round"/>
  <circle cx="28" cy="18" r="6" fill="#111"/>
  <circle cx="72" cy="18" r="6" fill="#111"/>
  <rect x="8" y="48" width="9" height="20" rx="4" fill="#111"/>
  <rect x="83" y="48" width="9" height="20" rx="4" fill="#111"/>
  <rect x="33" y="46" width="13" height="15" rx="2" fill="#D4FF3F"/>
  <rect x="54" y="46" width="13" height="15" rx="2" fill="#D4FF3F"/>
  <path d="M34 72h32" stroke="#D4FF3F" stroke-width="7" stroke-linecap="square"/>
</svg>`;
