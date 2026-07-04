/* ============ Сцены (многослойные SVG, dark style) и портреты ============ */
(function () {
  'use strict';

  const NS = 'xmlns="http://www.w3.org/2000/svg"';

  /* Общие defs: размытия для свечений и тумана */
  const DEFS_FX = `
    <filter id="b2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="b6" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="b14" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="14"/></filter>`;

  /* Рваная линия крыш с антеннами и трубами */
  function skyline(y, h, color, seedArr, detail) {
    let d = `M0 540 L0 ${y}`;
    let x = 0, i = 0;
    let extras = '';
    while (x < 970) {
      const w = seedArr[i % seedArr.length];
      const hh = y - (seedArr[(i + 3) % seedArr.length] % h);
      d += ` L${x} ${hh} L${x + w} ${hh}`;
      if (detail) {
        const m = seedArr[(i + 5) % seedArr.length];
        if (m % 3 === 0) extras += `<rect x="${x + w * 0.2}" y="${hh - 16}" width="3" height="16" fill="${color}"/><rect x="${x + w * 0.2 - 4}" y="${hh - 16}" width="11" height="2" fill="${color}"/>`;
        if (m % 4 === 1) extras += `<rect x="${x + w * 0.6}" y="${hh - 10}" width="7" height="10" fill="${color}"/>`;
        if (m % 5 === 2) extras += `<path d="M${x + w * 0.4} ${hh} L${x + w * 0.4 + 14} ${hh - 22} L${x + w * 0.4 + 16} ${hh - 20} L${x + w * 0.4 + 4} ${hh}" fill="${color}"/>`;
      }
      x += w; i++;
    }
    d += ' L960 540 Z';
    return `<path d="${d}" fill="${color}"/>${extras}`;
  }

  /* Сетка мёртвых окон, редкие — с тусклым отблеском луны */
  function deadWindows(seedArr, yBase, count, dark, lit, ySpan) {
    let out = '';
    const span = ySpan || 180;
    for (let i = 0; i < count; i++) {
      const s = seedArr[i % seedArr.length] * (i + 3);
      const x = (s * 37) % 930 + 10;
      const y = yBase + ((s * 53) % span);
      const broken = s % 9 === 0;
      out += `<rect x="${x}" y="${y}" width="8" height="12" fill="${broken ? lit : dark}" opacity="0.${(s % 4) + (broken ? 4 : 3)}"/>`;
    }
    return out;
  }

  /* Сгорбленный силуэт мертвеца (origin — в ногах) */
  function walker(x, y, s, color, o, flip) {
    return `<g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})" fill="${color}" opacity="${o}">
      <circle cx="5" cy="-46" r="5.6"/>
      <path d="M-6 -41 Q0 -46 7 -41 L10 -20 L7 0 L3 0 L3 -15 L-1 -15 L-3 0 L-7 0 Q-10 -22 -6 -41 Z"/>
      <path d="M7 -37 Q16 -30 15 -17 L12 -17 Q11 -27 5 -33 Z"/>
      <path d="M-6 -37 Q-12 -27 -10 -15 L-7 -15 Q-8 -25 -3 -33 Z"/>
    </g>`;
  }

  /* Вороны на проводе / в небе */
  function crow(x, y, s, color) {
    return `<path d="M${x} ${y} q${3 * s} ${-4 * s} ${6 * s} 0 q${3 * s} ${-4 * s} ${6 * s} 0" stroke="${color}" stroke-width="${1.4 * s}" fill="none" stroke-linecap="round"/>`;
  }

  /* Мусор на земле: обломки, бумага, бутылки */
  function debris(seedArr, yMin, yMax, tone, paper) {
    let out = '';
    for (let i = 0; i < seedArr.length; i++) {
      const s = seedArr[i] * (i + 7);
      const x = (s * 41) % 940;
      const y = yMin + (s % (yMax - yMin));
      const t = s % 5;
      if (t === 0) out += `<rect x="${x}" y="${y}" width="${8 + s % 14}" height="3" fill="${tone}" transform="rotate(${s % 30 - 15} ${x} ${y})" opacity="0.8"/>`;
      else if (t === 1) out += `<path d="M${x} ${y} l7 -2 l3 4 l-8 2 Z" fill="${paper}" opacity="0.25"/>`;
      else if (t === 2) out += `<circle cx="${x}" cy="${y}" r="2" fill="${tone}" opacity="0.7"/>`;
      else if (t === 3) out += `<path d="M${x} ${y} q4 -5 9 -1" stroke="${tone}" stroke-width="1.4" fill="none" opacity="0.6"/>`;
    }
    return out;
  }

  /* Трещины на стенах/асфальте */
  function cracks(seedArr, color) {
    let out = '';
    for (let i = 0; i < seedArr.length; i += 2) {
      const x = (seedArr[i] * 91) % 900 + 20;
      const y = 400 + (seedArr[i] * 13) % 120;
      out += `<path d="M${x} ${y} l${8 + seedArr[i] % 20} ${3 - seedArr[i] % 6} l${6 + seedArr[i] % 9} ${4} l${12} ${-2}" stroke="${color}" stroke-width="1.2" fill="none" opacity="0.5"/>`;
    }
    return out;
  }

  const S1 = [60, 45, 80, 30, 55, 70, 40, 90, 35, 65];
  const S2 = [40, 75, 50, 95, 30, 60, 85, 45, 70, 55];
  const S3 = [17, 43, 29, 61, 37, 53, 23, 47, 31, 59];

  const BG = {};

  /* ================= КВАРТИРА: серый рассвет, заклеенное окно, чёрточки на обоях ================= */
  (function () {
    // группы чёрточек-дней на обоях (4 + косая)
    let tally = '';
    for (let g = 0; g < 46; g++) {
      const gx = 60 + (g % 12) * 21;
      const gy = 120 + Math.floor(g / 12) * 34;
      tally += `<g stroke="#3d3a33" stroke-width="1.6" opacity="0.8">`;
      for (let k = 0; k < 4; k++) tally += `<line x1="${gx + k * 4}" y1="${gy}" x2="${gx + k * 4}" y2="${gy + 12}"/>`;
      tally += `<line x1="${gx - 2}" y1="${gy + 10}" x2="${gx + 14}" y2="${gy + 2}"/></g>`;
    }
    BG.apartment = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="ap-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2e3a4a"/><stop offset="0.7" stop-color="#535a5c"/><stop offset="1" stop-color="#6e6a54"/>
      </linearGradient>
      <linearGradient id="ap-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b0c0f"/><stop offset="1" stop-color="#050608"/>
      </linearGradient>
      <linearGradient id="ap-beam" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6a6a58" stop-opacity="0.16"/><stop offset="1" stop-color="#6a6a58" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#ap-wall)"/>
    <!-- обои: выцветшие полосы и отклеившийся угол -->
    <g opacity="0.5">
      <rect x="0" y="0" width="960" height="540" fill="#0d0e11"/>
      <path d="M40 0 L40 540 M120 0 L120 540 M200 0 L200 540 M280 0 L280 540 M740 0 L740 540 M820 0 L820 540 M900 0 L900 540" stroke="#111318" stroke-width="26"/>
    </g>
    <path d="M700 0 Q735 60 705 130 L742 130 Q760 60 745 0 Z" fill="#08090b"/>
    <path d="M700 0 Q735 60 705 130 L716 128 Q740 62 712 0 Z" fill="#14151a"/>
    ${tally}
    <!-- окно с крестами скотча -->
    <g>
      <clipPath id="ap-clip"><rect x="336" y="72" width="292" height="272"/></clipPath>
      <rect x="336" y="72" width="292" height="272" fill="url(#ap-sky)"/>
      <g clip-path="url(#ap-clip)">
        ${skyline(268, 92, '#14171c', S1, true)}
        ${skyline(300, 60, '#0d0f13', S2)}
        ${deadWindows(S2, 250, 20, '#08090c', '#262c30', 80)}
        <rect x="336" y="72" width="292" height="272" fill="#20242b" opacity="0.25"/>
        <ellipse cx="480" cy="150" rx="180" ry="40" fill="#3d4145" opacity="0.35" filter="url(#b14)"/>
      </g>
      <path d="M345 82 L618 335 M618 82 L345 335 M345 208 L618 208" stroke="#37352c" stroke-width="5" opacity="0.55"/>
      <path d="M480 82 L480 335" stroke="#37352c" stroke-width="4" opacity="0.4"/>
      <rect x="330" y="66" width="304" height="284" fill="none" stroke="#131519" stroke-width="12"/>
      <rect x="470" y="72" width="12" height="272" fill="#131519"/>
      <rect x="336" y="200" width="292" height="11" fill="#131519"/>
      <rect x="322" y="344" width="320" height="14" fill="#191b20"/>
      <rect x="330" y="358" width="10" height="26" fill="#101216"/><rect x="624" y="358" width="10" height="26" fill="#101216"/>
    </g>
    <!-- луч утреннего света -->
    <path d="M336 90 L628 340 L628 480 L336 300 Z" fill="url(#ap-beam)"/>
    <!-- матрас, спальник, ящик-стол, свеча, банки, приёмник -->
    <g>
      <path d="M70 470 L330 462 L360 520 L60 532 Z" fill="#15161a"/>
      <path d="M85 474 L320 467 L338 500 L92 510 Z" fill="#1c1d22"/>
      <path d="M110 470 Q160 452 230 462 L300 466 Q250 480 150 478 Z" fill="#232128"/>
      <rect x="680" y="420" width="130" height="96" fill="#131418"/>
      <rect x="676" y="414" width="138" height="10" fill="#1b1d22"/>
      <rect x="700" y="380" width="52" height="34" rx="3" fill="#191b20"/>
      <rect x="706" y="386" width="24" height="14" fill="#0c0d10"/>
      <circle cx="742" cy="393" r="4" fill="#0c0d10"/>
      <path d="M752 380 L768 352" stroke="#2a2c31" stroke-width="2"/>
      <g>
        <rect x="830" y="446" width="8" height="22" fill="#8d8468"/>
        <ellipse cx="834" cy="444" rx="2.4" ry="4" fill="#e8b56a" filter="url(#b2)"/>
        <ellipse cx="834" cy="446" rx="10" ry="12" fill="#c98a3e" opacity="0.22" filter="url(#b6)"/>
        <rect x="822" y="468" width="26" height="4" fill="#15161a"/>
      </g>
      <g fill="#1e2025">
        <rect x="620" y="500" width="18" height="24" rx="2"/><rect x="644" y="504" width="18" height="20" rx="2"/>
        <rect x="600" y="508" width="18" height="16" rx="2" transform="rotate(-70 609 516)"/>
      </g>
    </g>
    <ellipse cx="480" cy="545" rx="520" ry="60" fill="#000" opacity="0.7"/>
    <rect width="960" height="540" fill="#0a0c12" opacity="0.1"/>
  </svg>`;
  })();

  /* ================= УЛИЦА: мёртвый проспект ================= */
  BG.street = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#16202e"/><stop offset="0.6" stop-color="#39454c"/><stop offset="1" stop-color="#5c5f50"/>
      </linearGradient>
      <linearGradient id="st-fog" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3d443f" stop-opacity="0"/><stop offset="1" stop-color="#3d443f" stop-opacity="0.5"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#st-sky)"/>
    <ellipse cx="700" cy="120" rx="120" ry="60" fill="#2c333a" opacity="0.5" filter="url(#b14)"/>
    ${skyline(290, 170, '#171b21', S1, true)}
    ${deadWindows(S1, 150, 70, '#0a0c0f', '#2e3436')}
    <rect y="240" width="960" height="120" fill="url(#st-fog)" filter="url(#b14)"/>
    ${skyline(350, 120, '#101317', S2, true)}
    ${deadWindows(S2, 250, 45, '#07080a', '#23282b')}
    <!-- рекламный щит ржавый -->
    <g>
      <rect x="60" y="180" width="150" height="74" fill="#14161a"/>
      <path d="M60 180 L210 254 M210 180 L60 254" stroke="#1c1f24" stroke-width="3"/>
      <path d="M64 184 h70 v30 h-70 Z" fill="#23262b" opacity="0.7"/>
      <rect x="120" y="254" width="8" height="110" fill="#101216"/><rect x="150" y="254" width="8" height="110" fill="#101216"/>
    </g>
    <!-- провода и вороны -->
    <path d="M0 210 Q240 260 480 232 T960 224" stroke="#0c0e11" stroke-width="1.6" fill="none"/>
    <path d="M0 190 Q300 240 620 214 T960 200" stroke="#0c0e11" stroke-width="1.2" fill="none" opacity="0.8"/>
    ${crow(300, 246, 1, '#0a0b0d')}${crow(520, 228, 0.8, '#0a0b0d')}${crow(840, 216, 1.1, '#0a0b0d')}
    ${crow(700, 90, 0.9, '#141920')}${crow(740, 78, 0.7, '#141920')}
    <!-- проезжая часть -->
    <rect y="386" width="960" height="154" fill="#131416"/>
    <path d="M0 386 L960 386" stroke="#212226" stroke-width="2"/>
    <path d="M60 462 L160 460 M300 492 L410 490 M580 470 L680 468 M800 502 L910 500" stroke="#55523f" stroke-width="5" stroke-dasharray="34 30" opacity="0.28"/>
    ${cracks(S3, '#090a0c')}
    <!-- перевёрнутый автобус вдали -->
    <g opacity="0.92">
      <path d="M560 348 L760 344 L764 386 L556 390 Z" fill="#181a1c"/>
      <rect x="572" y="352" width="30" height="18" fill="#0d0e10"/><rect x="610" y="351" width="30" height="18" fill="#0d0e10"/>
      <rect x="648" y="350" width="30" height="18" fill="#0d0e10"/><rect x="686" y="350" width="30" height="18" fill="#0d0e10"/>
      <circle cx="600" cy="342" r="13" fill="#0b0c0e"/><circle cx="720" cy="340" r="13" fill="#0b0c0e"/>
      <path d="M560 348 Q550 360 556 390" fill="none" stroke="#0d0e10" stroke-width="4"/>
    </g>
    <!-- машины -->
    <g>
      <path d="M120 402 L135 380 Q140 372 152 372 L215 370 Q228 370 234 380 L248 400 L250 424 Q250 430 242 430 L128 432 Q120 432 120 424 Z" fill="#16191d"/>
      <path d="M148 378 L210 376 L222 396 L140 398 Z" fill="#0b0d0f"/>
      <circle cx="150" cy="430" r="12" fill="#0a0b0d"/><circle cx="222" cy="428" r="12" fill="#0a0b0d"/>
      <circle cx="150" cy="430" r="5" fill="#131519"/><circle cx="222" cy="428" r="5" fill="#131519"/>
      <path d="M138 404 l16 3 M170 402 l30 2" stroke="#0c0e10" stroke-width="2"/>
      <path d="M234 386 l12 18" stroke="#2a2213" stroke-width="3" opacity="0.6"/>
    </g>
    <g transform="translate(1560,0) scale(-1,1)">
      <path d="M690 412 L702 392 Q707 384 718 384 L775 382 Q787 382 792 392 L804 410 L806 432 Q806 438 798 438 L698 440 Q690 440 690 432 Z" fill="#191713"/>
      <path d="M714 390 L770 388 L781 406 L706 408 Z" fill="#0c0b09"/>
      <circle cx="716" cy="438" r="11" fill="#0a0b0d"/><circle cx="782" cy="436" r="11" fill="#0a0b0d"/>
    </g>
    <!-- открытая дверь машины, вещи на дороге -->
    <path d="M250 402 L272 396 L274 420 L252 426 Z" fill="#14171b"/>
    ${debris(S1, 440, 530, '#1e2023', '#6a675a')}
    ${debris(S2, 400, 460, '#191b1e', '#55524a')}
    <!-- детская коляска у стены -->
    <g opacity="0.85">
      <path d="M876 396 q0 -18 20 -18 l16 0 l0 20 q-2 8 -12 8 Z" fill="#141519"/>
      <circle cx="884" cy="414" r="7" fill="#0b0c0e"/><circle cx="906" cy="412" r="7" fill="#0b0c0e"/>
      <path d="M912 380 l10 -12" stroke="#141519" stroke-width="3"/>
      <path d="M880 398 q8 14 26 8" stroke="#0e1012" stroke-width="2" fill="none"/>
    </g>
    <!-- светофор, знак -->
    <rect x="438" y="308" width="13" height="112" fill="#0e1013"/>
    <path d="M444 310 L444 282 L500 294" stroke="#0e1013" stroke-width="6" fill="none"/>
    <rect x="494" y="286" width="16" height="36" rx="4" fill="#131519"/>
    <circle cx="502" cy="295" r="4" fill="#1c1013"/><circle cx="502" cy="306" r="4" fill="#1a180e"/><circle cx="502" cy="316" r="4" fill="#101a12"/>
    <path d="M700 350 l0 -50 l-3 0 l0 50 Z" fill="#101216"/>
    <path d="M686 300 h28 v18 h-28 Z" fill="#181b20" transform="rotate(-8 700 309)"/>
    <!-- далёкие силуэты мертвецов в дымке -->
    ${walker(340, 372, 0.66, '#101216', 0.8)}
    ${walker(408, 376, 0.6, '#101216', 0.7, true)}
    ${walker(842, 370, 0.55, '#12141a', 0.6)}
    <rect y="300" width="960" height="140" fill="#3d443f" opacity="0.12" filter="url(#b14)"/>
    <ellipse cx="480" cy="548" rx="560" ry="66" fill="#000" opacity="0.6"/>
  </svg>`;

  /* ================= АПТЕКА: разграбленный зал, луч фонаря ================= */
  BG.pharmacy = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="ph-beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8d8a70" stop-opacity="0.15"/><stop offset="1" stop-color="#8d8a70" stop-opacity="0.02"/>
      </linearGradient>
      <radialGradient id="ph-cross" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#2c5c40" stop-opacity="0.5"/><stop offset="1" stop-color="#2c5c40" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="960" height="540" fill="#060809"/>
    <rect x="0" y="0" width="960" height="392" fill="#0a0d0e"/>
    <path d="M0 392 L960 392" stroke="#121517" stroke-width="3"/>
    <!-- плитка пола в перспективе -->
    <g stroke="#0c0f10" stroke-width="2" opacity="0.9">
      <path d="M0 430 L960 426 M0 470 L960 468 M0 512 L960 510"/>
      <path d="M120 392 L60 540 M280 392 L250 540 M480 392 L480 540 M680 392 L710 540 M840 392 L900 540"/>
    </g>
    <!-- зелёный крест с остаточным свечением -->
    <circle cx="480" cy="118" r="120" fill="url(#ph-cross)" filter="url(#b14)"/>
    <rect x="380" y="36" width="200" height="140" fill="#0b120e" opacity="0.9"/>
    <path d="M452 58 h56 v28 h28 v56 h-28 v28 h-56 v-28 h-28 v-56 h28 Z" fill="#152b1e"/>
    <path d="M452 58 h56 v28 h28 v56 h-28 v28 h-56 v-28 h-28 v-56 h28 Z" fill="none" stroke="#2c5c40" stroke-width="2" opacity="0.8"/>
    <path d="M452 58 h56 l-70 112 h-14 v-28 h28 Z" fill="#1e3b2a" opacity="0.35"/>
    <!-- стеллажи слева/справа: перекошенные полки, редкие коробки -->
    <g>
      <rect x="30" y="96" width="250" height="326" fill="#101416"/>
      <path d="M30 96 L280 96 L280 422 L30 422" fill="none" stroke="#181d20" stroke-width="4"/>
      <path d="M30 160 h250 M30 228 h250 M34 296 L280 302 M30 364 h250" stroke="#1b2124" stroke-width="7"/>
      <g fill="#242b2e" opacity="0.85">
        <rect x="52" y="136" width="30" height="24"/><rect x="126" y="140" width="24" height="20"/><rect x="206" y="132" width="34" height="28"/>
        <rect x="66" y="272" width="26" height="24" transform="rotate(-14 79 284)"/>
        <rect x="176" y="340" width="30" height="24"/>
      </g>
      <path d="M96 160 l10 -34 l6 2 l-8 32 Z" fill="#151a1c"/>
    </g>
    <g>
      <rect x="680" y="96" width="250" height="326" fill="#101416"/>
      <path d="M680 160 h250 M680 228 h250 M680 296 h250 M676 364 L930 358" stroke="#1b2124" stroke-width="7"/>
      <g fill="#242b2e" opacity="0.85">
        <rect x="700" y="202" width="28" height="24"/><rect x="790" y="206" width="22" height="20"/><rect x="862" y="198" width="30" height="28"/>
        <rect x="726" y="336" width="34" height="26" transform="rotate(9 743 349)"/>
      </g>
    </g>
    <!-- опрокинутый стеллаж по центру-лева -->
    <g>
      <path d="M300 420 L430 372 L444 388 L316 440 Z" fill="#12171a"/>
      <path d="M312 416 L426 376 M322 424 L436 382" stroke="#0c1012" stroke-width="3"/>
      <rect x="352" y="396" width="22" height="14" fill="#1d2427" transform="rotate(-18 363 403)"/>
    </g>
    <!-- прилавок и касса -->
    <rect x="470" y="300" width="310" height="122" fill="#0e1214"/>
    <rect x="464" y="290" width="322" height="14" fill="#161b1e"/>
    <rect x="700" y="258" width="44" height="32" fill="#12171a"/>
    <path d="M700 290 l44 0 l-6 -8 l-32 0 Z" fill="#0b0e10"/>
    <path d="M486 304 l60 0 l0 34 l-60 0 Z" fill="#0a0d0f"/>
    <!-- разбитое стекло витрины на полу -->
    <g fill="#3a4448" opacity="0.5">
      <path d="M420 470 l10 3 l-4 6 Z"/><path d="M460 500 l12 2 l-6 7 Z"/><path d="M520 462 l9 4 l-7 5 Z"/>
      <path d="M580 494 l11 2 l-5 6 Z"/><path d="M380 512 l10 3 l-6 5 Z"/>
    </g>
    ${debris(S3, 430, 525, '#181d20', '#4a4f45')}
    <!-- рассыпанные блистеры и коробки -->
    <g opacity="0.8">
      <rect x="620" y="452" width="26" height="10" rx="2" fill="#20282b" transform="rotate(-10 633 457)"/>
      <rect x="656" y="470" width="22" height="9" rx="2" fill="#1c2326" transform="rotate(14 667 474)"/>
      <rect x="250" y="486" width="28" height="11" rx="2" fill="#20282b" transform="rotate(-24 264 491)"/>
      <circle cx="700" cy="490" r="2.2" fill="#3d4448"/><circle cx="712" cy="496" r="2.2" fill="#3d4448"/><circle cx="694" cy="500" r="2.2" fill="#3d4448"/>
    </g>
    <!-- луч света из дверного проёма -->
    <path d="M480 0 L330 540 L650 540 Z" fill="url(#ph-beam)"/>
    <path d="M470 0 L400 540 L560 540 Z" fill="url(#ph-beam)"/>
    <ellipse cx="480" cy="546" rx="520" ry="66" fill="#000" opacity="0.65"/>
    <rect width="960" height="540" fill="#05070a" opacity="0.1"/>
  </svg>`;

  /* ================= ЗАГОРОДНАЯ ДОРОГА: сумерки, столбы, мёртвые деревья ================= */
  BG.road = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="rd-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#18202c"/><stop offset="0.55" stop-color="#414944"/><stop offset="0.85" stop-color="#6a6752"/><stop offset="1" stop-color="#7a7258"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#rd-sky)"/>
    <!-- тяжёлые облака -->
    <ellipse cx="240" cy="90" rx="260" ry="46" fill="#171c22" opacity="0.8" filter="url(#b14)"/>
    <ellipse cx="700" cy="60" rx="300" ry="52" fill="#141920" opacity="0.85" filter="url(#b14)"/>
    <ellipse cx="480" cy="160" rx="340" ry="30" fill="#1c2126" opacity="0.5" filter="url(#b14)"/>
    ${crow(180, 200, 0.9, '#101318')}${crow(215, 188, 0.7, '#101318')}${crow(250, 198, 0.6, '#101318')}
    <!-- дальний лес -->
    <path d="M0 330 Q120 318 240 326 T480 322 T720 328 T960 320 L960 348 L0 348 Z" fill="#14171a" opacity="0.9"/>
    <g fill="#101316">
      <path d="M40 330 L46 296 L52 330 Z"/><path d="M70 332 L78 288 L86 332 Z"/><path d="M108 330 L114 302 L120 330 Z"/>
      <path d="M840 328 L848 290 L856 328 Z"/><path d="M880 330 L886 300 L892 330 Z"/><path d="M912 328 L920 286 L928 328 Z"/>
    </g>
    <!-- поля -->
    <path d="M0 348 Q240 336 480 348 T960 344 L960 540 L0 540 Z" fill="#26271f"/>
    <path d="M0 390 Q300 372 960 386 L960 540 L0 540 Z" fill="#1b1c17"/>
    <g stroke="#15160f" stroke-width="2" opacity="0.7">
      <path d="M20 400 Q200 388 400 396 M560 392 Q760 384 940 392"/>
      <path d="M60 430 Q260 416 460 426 M600 420 Q800 412 920 420"/>
    </g>
    <!-- дорога в перспективе -->
    <path d="M400 540 L462 360 L492 360 L600 540 Z" fill="#141518"/>
    <path d="M470 380 L474 380 L482 540 L462 540 Z" fill="#4d4a38" opacity="0.35"/>
    <path d="M462 360 L492 360 L497 372 L459 372 Z" fill="#101114"/>
    ${cracks(S1, '#0c0d10')}
    <!-- машина в кювете -->
    <g transform="rotate(-9 220 470)">
      <path d="M170 452 L182 434 Q186 428 196 428 L246 426 Q256 426 260 434 L270 450 L272 468 Q272 474 264 474 L178 476 Q170 476 170 468 Z" fill="#121317"/>
      <path d="M192 432 L242 430 L252 446 L184 448 Z" fill="#090a0c"/>
      <circle cx="196" cy="474" r="10" fill="#0a0b0d"/>
      <path d="M258 440 l14 16" stroke="#221c10" stroke-width="3" opacity="0.7"/>
    </g>
    <path d="M160 480 Q220 470 290 478" stroke="#15160f" stroke-width="8" fill="none" opacity="0.6"/>
    <!-- мёртвые деревья -->
    <g stroke="#0e1013" fill="none" stroke-linecap="round">
      <path d="M80 380 L80 300 M80 322 L58 296 M80 338 L102 310 M80 310 L68 288" stroke-width="6"/>
      <path d="M58 296 L48 284 M102 310 L114 296" stroke-width="3"/>
      <path d="M860 372 L860 296 M860 318 L838 292 M860 334 L884 306 M860 306 L850 284" stroke-width="6"/>
      <path d="M838 292 L826 280 M884 306 L896 292" stroke-width="3"/>
    </g>
    <!-- столбы ЛЭП с провисшими проводами -->
    <g stroke="#111318" fill="none">
      <path d="M150 356 L150 250 M132 258 L168 258 M138 272 L162 272" stroke-width="5"/>
      <path d="M320 360 L320 268 M305 275 L335 275 M310 288 L330 288" stroke-width="4.4"/>
      <path d="M700 358 L700 272 M686 279 L714 279" stroke-width="4.2"/>
      <path d="M880 354 L880 276 M868 282 L892 282" stroke-width="4"/>
      <path d="M168 258 Q245 288 305 275 M335 275 Q520 310 686 279 M714 279 Q800 295 868 282" stroke-width="1.6" opacity="0.8"/>
      <path d="M162 272 Q245 298 310 288 M330 288 Q520 322 690 286" stroke-width="1.3" opacity="0.6"/>
    </g>
    ${crow(430, 302, 0.8, '#0c0e12')}
    <!-- дорожный знак, покосившийся -->
    <g transform="rotate(8 560 420)">
      <rect x="556" y="380" width="6" height="60" fill="#101216"/>
      <rect x="540" y="360" width="38" height="24" rx="2" fill="#15181d"/>
      <path d="M544 364 h30 v4 h-30 Z M544 372 h22 v3 h-22 Z" fill="#23262c"/>
    </g>
    <rect width="960" height="540" fill="#20241f" opacity="0.14" filter="url(#b14)"/>
    <ellipse cx="480" cy="548" rx="560" ry="66" fill="#000" opacity="0.55"/>
  </svg>`;

  /* ================= ЗАПРАВКА: вечер, ржавые колонки ================= */
  BG.gas = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="gs-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#141c28"/><stop offset="0.6" stop-color="#3a4442"/><stop offset="1" stop-color="#5c574a"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#gs-sky)"/>
    <ellipse cx="300" cy="100" rx="280" ry="42" fill="#141a21" opacity="0.85" filter="url(#b14)"/>
    <ellipse cx="760" cy="150" rx="240" ry="36" fill="#181e24" opacity="0.7" filter="url(#b14)"/>
    <!-- дальний лес -->
    <path d="M0 356 Q160 344 320 352 T640 348 T960 352 L960 380 L0 380 Z" fill="#131518"/>
    <g fill="#0f1114">
      <path d="M30 356 L38 316 L46 356 Z"/><path d="M64 358 L74 306 L84 358 Z"/><path d="M110 356 L118 322 L126 356 Z"/>
    </g>
    <path d="M0 370 L960 366 L960 540 L0 540 Z" fill="#1a1b17"/>
    <!-- навес с дырами -->
    <g>
      <rect x="120" y="140" width="580" height="30" fill="#15181d"/>
      <path d="M120 140 L700 140" stroke="#1e2228" stroke-width="3"/>
      <path d="M300 140 l40 0 l-8 14 l-36 0 Z M560 142 l52 0 l-14 22 l-40 -4 Z" fill="#0c0e12"/>
      <path d="M340 170 l24 26 l-5 3 l-24 -24 Z" fill="#111318"/>
      <rect x="172" y="170" width="18" height="206" fill="#111318"/>
      <rect x="172" y="170" width="5" height="206" fill="#1c2026"/>
      <rect x="620" y="170" width="18" height="206" fill="#111318"/>
      <rect x="620" y="170" width="5" height="206" fill="#1c2026"/>
      <path d="M180 220 l-16 20 M636 240 l14 18" stroke="#0d0f13" stroke-width="2"/>
    </g>
    <!-- колонки: ржавчина, разбитые табло, шланг на земле -->
    <g>
      <rect x="292" y="248" width="64" height="130" rx="6" fill="#2a201c"/>
      <rect x="292" y="248" width="64" height="130" rx="6" fill="none" stroke="#180f0c" stroke-width="2"/>
      <rect x="302" y="260" width="44" height="30" rx="3" fill="#0e0c0a"/>
      <path d="M304 262 l18 12 l-6 8 l14 6" stroke="#241d16" stroke-width="1.6" fill="none"/>
      <rect x="302" y="298" width="44" height="8" fill="#1c1512"/>
      <path d="M292 300 q-14 30 -6 76" stroke="#14100d" stroke-width="5" fill="none"/>
      <path d="M300 330 l-4 22 l10 3" stroke="#3a2a20" stroke-width="3" fill="none" opacity="0.7"/>
      <rect x="286" y="378" width="76" height="8" fill="#101114"/>
    </g>
    <g>
      <rect x="462" y="248" width="64" height="130" rx="6" fill="#241c19"/>
      <rect x="472" y="260" width="44" height="30" rx="3" fill="#0e0c0a"/>
      <rect x="472" y="298" width="44" height="8" fill="#1c1512"/>
      <path d="M526 300 q18 24 12 74" stroke="#14100d" stroke-width="5" fill="none"/>
      <path d="M470 290 l-10 60 l16 24" stroke="#0f0c0a" stroke-width="3" fill="none" opacity="0.8"/>
      <rect x="456" y="378" width="76" height="8" fill="#101114"/>
    </g>
    <!-- здание кассы: заколоченное окно, дверь, бочка -->
    <g>
      <rect x="700" y="222" width="236" height="156" fill="#191b1e"/>
      <rect x="700" y="216" width="236" height="10" fill="#22252a"/>
      <rect x="722" y="256" width="70" height="122" fill="#0d0e11"/>
      <rect x="726" y="260" width="62" height="114" fill="none" stroke="#16181c" stroke-width="3"/>
      <circle cx="782" cy="318" r="3" fill="#2a2d33"/>
      <rect x="812" y="252" width="96" height="64" fill="#22272e" opacity="0.85"/>
      <path d="M808 248 h104 v72 h-104 Z" fill="none" stroke="#101215" stroke-width="6"/>
      <path d="M812 258 l96 48 M908 258 l-96 48" stroke="#2e2a20" stroke-width="7" opacity="0.9"/>
      <path d="M812 282 h96" stroke="#2e2a20" stroke-width="7" opacity="0.9"/>
      <path d="M700 378 h236" stroke="#0d0e10" stroke-width="4"/>
      <g>
        <rect x="666" y="330" width="30" height="48" rx="3" fill="#141210"/>
        <path d="M666 342 h30 M666 362 h30" stroke="#0c0a08" stroke-width="2"/>
      </g>
    </g>
    <!-- знак АЗС: мигать нечему, буквы облезли -->
    <g>
      <rect x="112" y="52" width="34" height="324" fill="#111318"/>
      <rect x="112" y="52" width="8" height="324" fill="#1a1e24"/>
      <rect x="78" y="26" width="104" height="62" rx="6" fill="#161a20"/>
      <rect x="86" y="34" width="88" height="46" fill="#0a0c0f"/>
      <text x="130" y="67" text-anchor="middle" font-family="Arial" font-size="27" fill="#453f30" opacity="0.9">А3С</text>
      <path d="M88 36 L172 78" stroke="#0f1114" stroke-width="2"/>
      <path d="M78 88 L70 108 M182 88 L188 104" stroke="#111318" stroke-width="3"/>
    </g>
    <!-- следы машин, мусор, покрышка -->
    <path d="M40 460 Q300 440 620 452 T960 448" stroke="#131410" stroke-width="14" fill="none" opacity="0.5"/>
    <path d="M60 496 Q320 478 640 488 T960 484" stroke="#131410" stroke-width="12" fill="none" opacity="0.4"/>
    ${debris(S2, 400, 520, '#15161a', '#4a473a')}
    <g>
      <circle cx="212" cy="470" r="20" fill="#0e0f12"/><circle cx="212" cy="470" r="9" fill="#16171b"/>
    </g>
    <ellipse cx="480" cy="548" rx="560" ry="64" fill="#000" opacity="0.6"/>
    <rect width="960" height="540" fill="#0c0f14" opacity="0.15"/>
  </svg>`;

  /* ================= НОЧЬ, КОСТЁР ================= */
  (function () {
    let stars = '';
    for (let i = 0; i < 60; i++) {
      const x = (S1[i % 10] * (i + 3) * 7) % 950;
      const y = (S2[i % 10] * (i + 5) * 3) % 240;
      const r = 0.5 + (i % 3) * 0.4;
      stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#aab2b8" opacity="0.${3 + (i % 5)}"/>`;
    }
    BG.fire = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <radialGradient id="fr-glow" cx="0.5" cy="0.8" r="0.7">
        <stop offset="0" stop-color="#b85a20" stop-opacity="0.7"/>
        <stop offset="0.3" stop-color="#6e3312" stop-opacity="0.4"/>
        <stop offset="1" stop-color="#03040a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="fr-core" cx="0.5" cy="0.55" r="0.5">
        <stop offset="0" stop-color="#ffdca2"/><stop offset="0.45" stop-color="#e07f2e"/><stop offset="1" stop-color="#762c10" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="fr-moonhalo" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#8d97a3" stop-opacity="0.4"/><stop offset="1" stop-color="#8d97a3" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="960" height="540" fill="#030409"/>
    <rect width="960" height="540" fill="#0a0f1a" opacity="0.5"/>
    ${stars}
    <!-- луна с рваными облаками -->
    <circle cx="720" cy="86" r="70" fill="url(#fr-moonhalo)" filter="url(#b14)"/>
    <circle cx="720" cy="86" r="30" fill="#b8b4a4" opacity="0.9"/>
    <circle cx="712" cy="79" r="26" fill="#0a0d14" opacity="0.35"/>
    <circle cx="728" cy="94" r="4" fill="#9a9688" opacity="0.5"/><circle cx="714" cy="90" r="2.6" fill="#9a9688" opacity="0.4"/>
    <path d="M620 128 Q720 114 830 130 L830 140 Q720 128 620 138 Z" fill="#0a0e16" opacity="0.8" filter="url(#b6)"/>
    <path d="M640 40 Q730 30 806 42 L806 48 Q730 40 640 48 Z" fill="#0a0e16" opacity="0.6" filter="url(#b6)"/>
    <!-- гряда елей в несколько слоёв -->
    <path d="M0 392 Q200 376 400 388 T960 382 L960 540 L0 540 Z" fill="#07090d"/>
    <g fill="#05070b">
      <path d="M40 392 L58 260 L76 392 Z"/><path d="M92 394 L114 230 L134 394 Z"/><path d="M150 392 L166 292 L182 392 Z"/>
      <path d="M780 388 L802 244 L822 388 Z"/><path d="M842 390 L862 270 L880 390 Z"/><path d="M898 388 L920 300 L940 388 Z"/>
    </g>
    <g fill="#04060a">
      <path d="M10 400 L22 330 L34 400 Z"/><path d="M210 398 L226 320 L242 398 Z"/><path d="M746 396 L758 330 L770 396 Z"/>
    </g>
    <!-- земля -->
    <path d="M0 440 Q240 424 480 436 T960 430 L960 540 L0 540 Z" fill="#0a0b0e"/>
    <rect width="960" height="540" fill="url(#fr-glow)"/>
    <!-- рюкзаки и бревно у огня -->
    <g>
      <path d="M290 470 q-4 -30 22 -34 q26 -2 28 22 l2 16 q-26 8 -52 -4 Z" fill="#12100e"/>
      <path d="M300 442 q10 -10 26 -4" stroke="#1c1815" stroke-width="3" fill="none"/>
      <path d="M620 478 L740 470 Q752 470 752 480 L750 492 Q686 502 622 494 Q614 486 620 478 Z" fill="#140f0b"/>
      <path d="M626 480 L744 473 M630 488 L740 482" stroke="#0c0906" stroke-width="2"/>
      <ellipse cx="748" cy="481" rx="5" ry="7" fill="#1e1710"/>
    </g>
    <!-- котелок на треноге -->
    <g stroke="#131110" fill="none">
      <path d="M360 462 L392 402 L424 462 M392 402 L392 420" stroke-width="3.4"/>
      <path d="M378 428 q14 20 30 0 l-2 14 q-13 12 -26 0 Z" fill="#15120e" stroke="none"/>
      <ellipse cx="393" cy="428" rx="15" ry="4" fill="#0d0b09" stroke="none"/>
    </g>
    <!-- костёр -->
    <g transform="translate(480,452)">
      <ellipse cx="0" cy="24" rx="120" ry="18" fill="#1c0f06" opacity="0.6" filter="url(#b6)"/>
      <path d="M-62 20 L58 30 M-46 32 L52 14 M-58 26 L40 36" stroke="#1f1209" stroke-width="11" stroke-linecap="round"/>
      <path d="M-60 21 L-30 23 M20 28 L56 30" stroke="#33200f" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      <g fill="#2a160a"><circle cx="-70" cy="26" r="6"/><circle cx="66" cy="30" r="7"/><circle cx="-52" cy="36" r="5"/></g>
      <ellipse cx="0" cy="2" rx="60" ry="44" fill="url(#fr-core)" filter="url(#b2)"/>
      <path d="M0 -52 Q16 -26 8 -6 Q30 -22 24 6 Q40 -2 30 22 L-30 22 Q-42 -2 -26 -10 Q-34 -30 -14 -20 Q-18 -40 0 -52 Z" fill="#ef9c42"/>
      <path d="M-4 -30 Q10 -12 4 4 Q18 -6 14 12 L-16 12 Q-24 -4 -10 -10 Q-14 -22 -4 -30 Z" fill="#ffd9a2"/>
      <path d="M-2 -14 Q6 -4 2 6 L-8 6 Q-12 -4 -2 -14 Z" fill="#fff3d6"/>
      <ellipse cx="0" cy="20" rx="46" ry="8" fill="#ffca88" opacity="0.35" filter="url(#b6)"/>
    </g>
    <ellipse cx="480" cy="500" rx="340" ry="46" fill="#d06a24" opacity="0.1" filter="url(#b14)"/>
    <ellipse cx="480" cy="548" rx="560" ry="60" fill="#000" opacity="0.5"/>
  </svg>`;
  })();

  /* ================= БИБЛИОТЕКА: лунный столб света, пианино ================= */
  BG.library = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="lb-moon" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#5f6d7c" stop-opacity="0.34"/><stop offset="1" stop-color="#5f6d7c" stop-opacity="0.03"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="#07070a"/>
    <rect width="960" height="420" fill="#0c0b0d"/>
    <path d="M0 420 L960 420" stroke="#141216" stroke-width="3"/>
    <!-- потолок с лепниной и провисшей люстрой -->
    <path d="M0 0 h960 v34 h-960 Z" fill="#0a090b"/>
    <path d="M0 34 h960" stroke="#131114" stroke-width="4"/>
    <path d="M240 34 q6 30 -8 44 M243 36 l-4 44" stroke="#100e11" stroke-width="2" fill="none"/>
    <circle cx="237" cy="86" r="9" fill="#100e11"/>
    <!-- стеллажи: высокие, с завалами -->
    <g>
      <rect x="20" y="56" width="230" height="364" fill="#141017"/>
      <path d="M20 116 h230 M20 186 h230 M20 256 h230 M24 326 L250 334 M20 396 h230" stroke="#1e1820" stroke-width="6"/>
      <path d="M20 56 h230 M20 56 v364 M250 56 v364" stroke="#241c26" stroke-width="4"/>
      <g opacity="0.95">
        <rect x="38" y="80" width="13" height="36" fill="#3a2c22"/><rect x="55" y="84" width="11" height="32" fill="#26333a"/>
        <rect x="70" y="78" width="15" height="38" fill="#3d241f"/><rect x="90" y="86" width="10" height="30" fill="#33301f"/>
        <rect x="104" y="82" width="13" height="34" fill="#20302a"/><rect x="122" y="80" width="12" height="36" fill="#382a24"/>
        <rect x="138" y="85" width="14" height="31" fill="#2a2333"/><rect x="157" y="81" width="11" height="35" fill="#3a3322"/>
        <rect x="42" y="152" width="12" height="34" fill="#2e2620" transform="rotate(-12 48 169)"/>
        <rect x="60" y="156" width="12" height="30" fill="#232e33" transform="rotate(-24 66 171)"/>
        <rect x="80" y="150" width="60" height="10" fill="#31261e" transform="rotate(4 110 155)"/>
        <rect x="150" y="222" width="13" height="34" fill="#3a2c22"/><rect x="168" y="226" width="11" height="30" fill="#2c3a30"/>
        <rect x="38" y="292" width="14" height="34" fill="#33241d"/><rect x="58" y="296" width="12" height="30" fill="#242c38"/>
      </g>
    </g>
    <g>
      <rect x="710" y="56" width="230" height="364" fill="#141017"/>
      <path d="M710 116 h230 M710 186 h230 M706 256 L940 250 M710 326 h230 M710 396 h230" stroke="#1e1820" stroke-width="6"/>
      <g opacity="0.95">
        <rect x="726" y="150" width="13" height="36" fill="#31283d"/><rect x="744" y="154" width="11" height="32" fill="#3a3322"/>
        <rect x="760" y="148" width="14" height="38" fill="#26333a"/><rect x="780" y="156" width="10" height="30" fill="#3a241f"/>
        <rect x="796" y="152" width="13" height="34" fill="#2c2620"/>
        <rect x="726" y="292" width="60" height="10" fill="#2a2118" transform="rotate(-5 756 297)"/>
        <rect x="850" y="360" width="13" height="36" fill="#33241d"/><rect x="868" y="364" width="11" height="32" fill="#20302a"/>
      </g>
    </g>
    <!-- высокое окно и лунный столб -->
    <g>
      <rect x="474" y="96" width="176" height="288" fill="#0d1218"/>
      <rect x="468" y="88" width="188" height="10" fill="#1c1720"/>
      <path d="M474 96 v288 M562 96 v288 M650 96 v288 M474 192 h176 M474 288 h176" stroke="#161219" stroke-width="7"/>
      <rect x="474" y="96" width="176" height="288" fill="#3c4a58" opacity="0.14"/>
      <circle cx="588" cy="150" r="20" fill="#8d95a0" opacity="0.5" filter="url(#b6)"/>
      <path d="M480 100 l80 120 l-6 6 l-78 -114 Z" fill="#8d99a3" opacity="0.08"/>
      <path d="M563 194 l30 40 l16 -8 l-34 -44 Z" fill="#0a0e13"/>
    </g>
    <path d="M474 100 L360 540 L700 540 L650 100 Z" fill="url(#lb-moon)"/>
    <!-- пианино -->
    <g>
      <rect x="330" y="330 " width="0" height="0" fill="none"/>
      <rect x="288" y="322" width="188" height="96" fill="#0e0b10"/>
      <rect x="284" y="316" width="196" height="10" fill="#181218"/>
      <rect x="296" y="352" width="172" height="16" fill="#d8d2c2" opacity="0.55"/>
      <g fill="#0a080c">
        <rect x="306" y="352" width="7" height="10"/><rect x="322" y="352" width="7" height="10"/><rect x="346" y="352" width="7" height="10"/>
        <rect x="362" y="352" width="7" height="10"/><rect x="378" y="352" width="7" height="10"/><rect x="402" y="352" width="7" height="10"/>
        <rect x="418" y="352" width="7" height="10"/><rect x="442" y="352" width="7" height="10"/>
      </g>
      <rect x="292" y="418" width="12" height="46" fill="#0e0b10"/><rect x="460" y="418" width="12" height="46" fill="#0e0b10"/>
      <rect x="352" y="430" width="70" height="12" fill="#0c0a0e"/>
      <rect x="360" y="442" width="8" height="22" fill="#0c0a0e"/><rect x="406" y="442" width="8" height="22" fill="#0c0a0e"/>
      <path d="M296 352 l172 0" stroke="#2c2a26" stroke-width="1"/>
    </g>
    <!-- свеча на столике, стопки книг на полу -->
    <g>
      <rect x="150" y="452 " width="0" height="0" fill="none"/>
      <rect x="128" y="446" width="90" height="10" fill="#161216"/>
      <rect x="140" y="456" width="10" height="52" fill="#100d11"/><rect x="196" y="456" width="10" height="52" fill="#100d11"/>
      <rect x="158" y="424" width="7" height="22" fill="#8d8468"/>
      <ellipse cx="161.5" cy="421" rx="2.2" ry="4" fill="#e8b56a" filter="url(#b2)"/>
      <ellipse cx="161.5" cy="424" rx="12" ry="14" fill="#c98a3e" opacity="0.2" filter="url(#b6)"/>
      <rect x="174" y="434" width="26" height="6" fill="#2a2118"/><rect x="176" y="428" width="22" height="6" fill="#33241d"/>
    </g>
    <g opacity="0.9">
      <rect x="560" y="486" width="34" height="8" fill="#2a2118" transform="rotate(-4 577 490)"/>
      <rect x="564" y="478" width="30" height="8" fill="#1f2a26" transform="rotate(3 579 482)"/>
      <rect x="640" y="500" width="30" height="7" fill="#2c2030"/>
      <path d="M700 508 q10 -12 22 0 l0 4 l-22 0 Z" fill="#26333a" opacity="0.7"/>
    </g>
    ${debris(S3, 460, 528, '#191419', '#4a463a')}
    <ellipse cx="480" cy="546" rx="520" ry="60" fill="#000" opacity="0.68"/>
  </svg>`;

  /* ================= БОЛЬНИЦА СНАРУЖИ: ночь, дождь ================= */
  BG.hospital_out = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="ho-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#131a24"/><stop offset="1" stop-color="#39423a"/>
      </linearGradient>
      <radialGradient id="ho-em" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#2e4a38" stop-opacity="0.5"/><stop offset="1" stop-color="#2e4a38" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="960" height="540" fill="url(#ho-sky)"/>
    <ellipse cx="480" cy="70" rx="420" ry="50" fill="#0b0e13" opacity="0.9" filter="url(#b14)"/>
    <!-- корпус -->
    <rect x="190" y="96" width="580" height="348" fill="#101318"/>
    <rect x="150" y="76" width="94" height="368" fill="#0c0f13"/>
    <rect x="716" y="76" width="94" height="368" fill="#0c0f13"/>
    <path d="M150 76 h94 M716 76 h94 M190 96 h580" stroke="#181c22" stroke-width="3"/>
    <!-- окна: чёрные, пара с аварийным зелёным отсветом, простыни-верёвки -->
    <g fill="#07090c">
      <rect x="230" y="128" width="38" height="48"/><rect x="292" y="128" width="38" height="48"/><rect x="354" y="128" width="38" height="48"/>
      <rect x="416" y="128" width="38" height="48"/><rect x="506" y="128" width="38" height="48"/><rect x="568" y="128" width="38" height="48"/>
      <rect x="630" y="128" width="38" height="48"/><rect x="692" y="128" width="0" height="0"/>
      <rect x="230" y="212" width="38" height="48"/><rect x="292" y="212" width="38" height="48"/><rect x="416" y="212" width="38" height="48"/>
      <rect x="506" y="212" width="38" height="48"/><rect x="630" y="212" width="38" height="48"/>
      <rect x="230" y="296" width="38" height="48"/><rect x="354" y="296" width="38" height="48"/><rect x="568" y="296" width="38" height="48"/>
      <rect x="630" y="296" width="38" height="48"/><rect x="292" y="296" width="38" height="48"/>
      <rect x="168" y="120" width="28" height="40"/><rect x="168" y="200" width="28" height="40"/><rect x="168" y="280" width="28" height="40"/>
      <rect x="764" y="120" width="28" height="40"/><rect x="764" y="200" width="28" height="40"/><rect x="764" y="280" width="28" height="40"/>
    </g>
    <rect x="354" y="212" width="38" height="48" fill="#15251c"/>
    <circle cx="373" cy="236" r="30" fill="url(#ho-em)" filter="url(#b6)"/>
    <rect x="568" y="212" width="38" height="48" fill="#101b21"/>
    <!-- простыни из окна -->
    <path d="M436 176 q4 60 -2 96 q8 40 2 64" stroke="#3a3d3b" stroke-width="5" fill="none" opacity="0.7"/>
    <path d="M444 176 q-2 50 4 88" stroke="#33362f" stroke-width="4" fill="none" opacity="0.6"/>
    <!-- крест: полутёмный, одна перекладина темнее -->
    <g>
      <circle cx="452" cy="90" r="56" fill="#3d1d1a" opacity="0.25" filter="url(#b14)"/>
      <path d="M430 48 h44 v18 h18 v44 h-18 v18 h-44 v-18 h-18 v-44 h18 Z" fill="#2c1512"/>
      <path d="M430 48 h44 v18 h9 v44 h-9 v18 h-44 v-18 h-9 v-44 h9 Z" fill="#3d1d1a"/>
      <path d="M430 48 h20 v98 h-20 v-18 h-18 v-44 h18 Z" fill="#241210" opacity="0.8"/>
    </g>
    <!-- надпись над входом -->
    <g>
      <rect x="384" y="356 " width="0" height="0"/>
      <path d="M380 356 L580 356 L572 338 L388 338 Z" fill="#0d1014"/>
      <text x="480" y="352" text-anchor="middle" font-family="Arial" font-size="11" letter-spacing="2" fill="#4a3a34" opacity="0.9">НЕ ВХОДИТЬ</text>
    </g>
    <!-- вход: козырёк, темнота, баррикада из скорых -->
    <rect x="396" y="360" width="168" height="84" fill="#07080b"/>
    <path d="M384 360 L576 360 L566 342 L394 342 Z" fill="#0e1116"/>
    <rect y="444" width="960" height="96" fill="#101210"/>
    <path d="M0 444 L960 444" stroke="#1a1d1a" stroke-width="3"/>
    <!-- скорые -->
    <g>
      <rect x="300" y="404" width="120" height="46" rx="4" fill="#161a1d"/>
      <rect x="300" y="404" width="120" height="18" fill="#1c2124"/>
      <rect x="404" y="410" width="30" height="40" rx="4" fill="#121518"/>
      <path d="M330 414 h20 v6 h-20 Z" fill="#3d2320"/>
      <path d="M336 410 h8 v14 h-8 Z" fill="#3d2320"/>
      <circle cx="330" cy="452" r="11" fill="#0a0b0d"/><circle cx="400" cy="452" r="11" fill="#0a0b0d"/>
      <rect x="310" y="424" width="26" height="16" fill="#0c0e10"/>
    </g>
    <g transform="translate(1180,0) scale(-1,1)">
      <rect x="560" y="410" width="110" height="42" rx="4" fill="#14181b"/>
      <rect x="656" y="416" width="26" height="36" rx="4" fill="#101316"/>
      <circle cx="586" cy="454" r="10" fill="#0a0b0d"/><circle cx="648" cy="454" r="10" fill="#0a0b0d"/>
      <path d="M580 420 h18 v5 h-18 Z" fill="#38211e"/>
    </g>
    <!-- каталка под дождём, забор -->
    <g>
      <rect x="120" y="428" width="64" height="8" fill="#181b1f"/>
      <path d="M126 436 l4 26 M176 436 l-4 26 M130 452 h44" stroke="#121417" stroke-width="3"/>
      <circle cx="130" cy="464" r="4" fill="#0c0d0f"/><circle cx="172" cy="464" r="4" fill="#0c0d0f"/>
    </g>
    <g stroke="#0e1013" stroke-width="3">
      <path d="M40 420 v34 M70 418 v36 M100 418 v36 M20 430 h90"/>
    </g>
    ${walker(878, 452, 0.72, '#0b0d10', 0.85, true)}
    ${walker(60, 500, 0.8, '#0d0f12', 0.9)}
    <!-- лужи с отражением -->
    <g fill="#171d22" opacity="0.7">
      <ellipse cx="480" cy="492" rx="90" ry="9"/>
      <ellipse cx="700" cy="510" rx="60" ry="7"/>
      <ellipse cx="240" cy="506" rx="70" ry="8"/>
    </g>
    <path d="M446 484 l10 -34 l4 0 l-8 34 Z" fill="#1d2620" opacity="0.5"/>
    <rect width="960" height="540" fill="#10151a" opacity="0.25"/>
    <ellipse cx="480" cy="548" rx="560" ry="60" fill="#000" opacity="0.6"/>
  </svg>`;

  /* ================= БОЛЬНИЦА ВНУТРИ: коридор, фонарь ================= */
  BG.hospital_in = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <radialGradient id="hi-torch" cx="0.5" cy="0.42" r="0.6">
        <stop offset="0" stop-color="#8a8468" stop-opacity="0.5"/>
        <stop offset="0.5" stop-color="#57503f" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="960" height="540" fill="#050608"/>
    <!-- перспектива коридора -->
    <path d="M150 62 L810 62 L700 470 L250 470 Z" fill="#151922"/>
    <path d="M0 0 L150 62 L250 470 L0 540 Z" fill="#1a2028"/>
    <path d="M960 0 L810 62 L700 470 L960 540 Z" fill="#181e26"/>
    <path d="M150 62 L810 62 L960 0 L0 0 Z" fill="#0e1116"/>
    <path d="M250 470 L700 470 L960 540 L0 540 Z" fill="#0c0e12"/>
    <!-- дальний торец с дверью -->
    <path d="M420 168 L540 168 L532 372 L428 372 Z" fill="#050607"/>
    <path d="M470 168 L490 168 L487 372 L473 372 Z" fill="#233026" opacity="0.4"/>
    <path d="M470 168 L476 168 L474 372 L473 372 Z" fill="#2e4232" opacity="0.5"/>
    <path d="M420 62 L540 62 L536 108 L424 108 Z" fill="#0e1116"/>
    <!-- стены: панели, двери приоткрытые, потёки -->
    <g stroke="#131720" stroke-width="4" opacity="0.9">
      <path d="M0 96 L150 122 M0 260 L164 244 M0 430 L214 356"/>
      <path d="M960 96 L810 122 M960 260 L796 244 M960 430 L746 356"/>
    </g>
    <g fill="#10141a">
      <path d="M50 150 L140 165 L140 400 L50 434 Z"/>
      <path d="M910 150 L820 165 L820 400 L910 434 Z"/>
      <path d="M180 180 L235 188 L237 385 L186 402 Z"/>
      <path d="M780 180 L725 188 L723 385 L774 402 Z"/>
    </g>
    <!-- приоткрытая дверь слева, темнота за ней -->
    <path d="M60 158 L120 168 L120 420 L60 428 Z" fill="#060708"/>
    <path d="M120 168 L146 176 L146 408 L120 420 Z" fill="#151a21"/>
    <circle cx="132" cy="296" r="4" fill="#242b34"/>
    <path d="M186 190 L230 196 L230 380 L188 394 Z" fill="#0a0d11"/>
    <!-- потёки на стенах -->
    <g stroke="#0a0c10" stroke-width="4" opacity="0.8">
      <path d="M840 170 q4 60 -2 120 M866 180 q-4 80 2 160 M896 160 q6 100 -4 200"/>
      <path d="M250 80 q2 30 -2 60 M300 76 q4 40 -2 70"/>
    </g>
    <!-- потолочные светильники: перекошенные -->
    <g>
      <path d="M340 74 L440 74 L436 92 L346 92 Z" fill="#0d1013"/>
      <path d="M520 74 L620 74 L614 90 L526 90 Z" fill="#0d1013"/>
      <path d="M560 90 q4 26 -6 40" stroke="#0d1013" stroke-width="2" fill="none"/>
      <path d="M420 92 l-6 30 l10 8" stroke="#0d1013" stroke-width="3" fill="none"/>
      <path d="M300 70 q40 22 80 4" stroke="#0a0c0f" stroke-width="2" fill="none"/>
    </g>
    <!-- каталка, капельница, кресло-коляска, бумаги -->
    <g>
      <path d="M290 350 L400 342 L404 358 L294 366 Z" fill="#11151a"/>
      <path d="M300 366 l4 38 M390 358 l6 38 M296 384 l102 -6" stroke="#0d1015" stroke-width="4"/>
      <circle cx="306" cy="410" r="7" fill="#090b0d"/><circle cx="398" cy="402" r="7" fill="#090b0d"/>
      <path d="M310 344 q30 -12 60 -2" stroke="#171c22" stroke-width="5" fill="none"/>
    </g>
    <g stroke="#12161b" fill="none">
      <path d="M620 320 l0 84 M600 404 l40 0" stroke-width="4"/>
      <path d="M608 320 l24 0" stroke-width="3"/>
      <path d="M612 320 q-3 -18 8 -22 q10 2 6 22" stroke-width="2"/>
      <ellipse cx="620" cy="292" rx="7" ry="10" fill="#181f18" stroke="none"/>
    </g>
    <g>
      <path d="M680 380 q22 -4 34 8 l-4 22 q-16 6 -30 -2 Z" fill="#0f1318"/>
      <circle cx="684" cy="416" r="12" fill="#0b0d10"/><circle cx="684" cy="416" r="5" fill="#111419"/>
      <circle cx="712" cy="412" r="8" fill="#0b0d10"/>
      <path d="M686 378 l-4 -18 l20 -2" stroke="#0f1318" stroke-width="3" fill="none"/>
    </g>
    ${debris(S1, 430, 520, '#11141a', '#3d4038')}
    <g fill="#3d4038" opacity="0.22">
      <path d="M360 440 l16 -4 l4 8 l-17 4 Z"/><path d="M420 470 l14 -2 l2 6 l-14 3 Z"/><path d="M540 452 l15 -4 l4 7 l-16 4 Z"/>
    </g>
    <!-- тёмные разводы на полу (старые, бурые) -->
    <g fill="#170f0c" opacity="0.55">
      <ellipse cx="480" cy="430" rx="46" ry="8"/>
      <path d="M470 424 q20 -6 34 2 l10 10 q-24 8 -48 0 Z"/>
      <ellipse cx="250" cy="480" rx="30" ry="6"/>
    </g>
    <path d="M480 436 q40 8 60 26" stroke="#170f0c" stroke-width="5" fill="none" opacity="0.4"/>
    <!-- луч фонаря игрока -->
    <ellipse cx="480" cy="280" rx="420" ry="260" fill="url(#hi-torch)"/>
    <path d="M480 540 L330 120 L630 120 Z" fill="#8d8a70" opacity="0.05"/>
    <ellipse cx="480" cy="546" rx="480" ry="52" fill="#000" opacity="0.6"/>
  </svg>`;

  /* ================= МОСТ: туман над рекой ================= */
  BG.bridge = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="br-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1c2430"/><stop offset="0.65" stop-color="#565a50"/><stop offset="1" stop-color="#6e6b58"/>
      </linearGradient>
      <linearGradient id="br-fog" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a4f48" stop-opacity="0"/><stop offset="0.5" stop-color="#4a4f48" stop-opacity="0.4"/><stop offset="1" stop-color="#4a4f48" stop-opacity="0.1"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#br-sky)"/>
    <ellipse cx="300" cy="80" rx="300" ry="40" fill="#10141b" opacity="0.8" filter="url(#b14)"/>
    <ellipse cx="720" cy="130" rx="260" ry="34" fill="#151a20" opacity="0.7" filter="url(#b14)"/>
    ${crow(120, 150, 0.9, '#0e1116')}${crow(158, 140, 0.7, '#0e1116')}
    <!-- дальний берег в дымке -->
    <path d="M0 350 Q240 340 480 348 T960 344 L960 400 L0 400 Z" fill="#1c1f20" opacity="0.7" filter="url(#b6)"/>
    ${skyline(340, 60, '#181c1e', S2)}
    <!-- вода -->
    <path d="M0 400 L960 396 L960 540 L0 540 Z" fill="#0d1013"/>
    <g stroke="#161b1e" stroke-width="2" opacity="0.8">
      <path d="M40 430 h120 M300 444 h160 M600 426 h140 M760 452 h140 M140 470 h180 M480 480 h200"/>
    </g>
    <path d="M340 400 q6 30 -2 60 M348 400 q2 40 6 74" stroke="#101418" stroke-width="3" fill="none" opacity="0.7"/>
    <!-- полотно моста -->
    <path d="M0 388 Q480 360 960 384 L960 410 L0 414 Z" fill="#22262a"/>
    <path d="M0 388 Q480 360 960 384" stroke="#2e3338" stroke-width="3" fill="none"/>
    <path d="M0 414 L960 410" stroke="#14171a" stroke-width="6"/>
    <!-- пилоны и ванты -->
    <path d="M180 388 L172 130 L196 130 L192 388 Z" fill="#15181c"/>
    <path d="M760 386 L752 130 L776 130 L772 386 Z" fill="#15181c"/>
    <path d="M172 130 L196 130 L194 118 L174 118 Z" fill="#101318"/>
    <path d="M752 130 L776 130 L774 118 L754 118 Z" fill="#101318"/>
    <path d="M184 130 Q480 210 764 130" stroke="#171b1f" stroke-width="6" fill="none"/>
    <path d="M184 148 Q480 236 764 148" stroke="#14181c" stroke-width="4" fill="none"/>
    <g stroke="#181d21" stroke-width="2" opacity="0.9">
      <path d="M240 380 L232 175 M300 376 L296 196 M360 372 L358 212 M420 370 L420 222 M480 368 L480 228"/>
      <path d="M540 370 L542 222 M600 372 L604 212 M660 374 L666 196 M720 378 L714 175"/>
    </g>
    <path d="M300 240 l-8 60 l6 40" stroke="#101318" stroke-width="2" fill="none" opacity="0.7"/>
    <!-- перила с прорехами -->
    <g stroke="#191d21" stroke-width="3">
      <path d="M0 376 Q480 350 960 372"/>
      <path d="M30 388 v-14 M90 386 v-14 M150 384 v-14 M270 380 v-15 M330 378 v-15 M450 374 v-15 M510 374 v-15 M570 375 v-15 M690 378 v-15 M810 382 v-14 M870 384 v-14"/>
    </g>
    <path d="M380 362 l40 -3 l3 6 l-40 4 Z" fill="#101316" transform="rotate(24 400 366)"/>
    <!-- блокпост: мешки, будка, шлагбаум, бочка -->
    <g>
      <g fill="#20221e">
        <ellipse cx="420" cy="404" rx="26" ry="9"/><ellipse cx="446" cy="402" rx="26" ry="9"/>
        <ellipse cx="428" cy="394" rx="24" ry="8"/><ellipse cx="452" cy="393" rx="22" ry="8"/>
        <ellipse cx="438" cy="385" rx="22" ry="8"/>
      </g>
      <path d="M400 402 q40 6 76 0" stroke="#15170f" stroke-width="2" fill="none" opacity="0.6"/>
      <rect x="540" y="330" width="58" height="76" fill="#181b1e"/>
      <rect x="546" y="340" width="22" height="20" fill="#0b0d0f"/>
      <rect x="540" y="326" width="62" height="8" fill="#101215"/>
      <path d="M600 400 L648 366" stroke="#242822" stroke-width="5"/>
      <path d="M600 400 L648 366" stroke="#3d3a2a" stroke-width="5" stroke-dasharray="10 10"/>
      <rect x="596" y="396" width="10" height="14" fill="#101215"/>
      <g>
        <rect x="500" y="378" width="22" height="30" rx="2" fill="#141210"/>
        <path d="M500 386 h22 M500 396 h22" stroke="#0c0a08" stroke-width="2"/>
      </g>
    </g>
    <!-- брошенный грузовик -->
    <g opacity="0.95">
      <rect x="640" y="358" width="86" height="34" fill="#15181a"/>
      <rect x="722" y="366" width="30" height="26" rx="3" fill="#111417"/>
      <rect x="728" y="370" width="16" height="12" fill="#090b0d"/>
      <circle cx="660" cy="394" r="9" fill="#0a0b0d"/><circle cx="708" cy="393" r="9" fill="#0a0b0d"/><circle cx="740" cy="393" r="9" fill="#0a0b0d"/>
      <path d="M640 366 l-12 4 l0 16 l12 3 Z" fill="#111417"/>
    </g>
    ${debris(S2, 396, 410, '#16181c', '#45443a')}
    <!-- туман -->
    <rect y="300" width="960" height="180" fill="url(#br-fog)" filter="url(#b14)"/>
    <ellipse cx="200" cy="420" rx="240" ry="30" fill="#4a4f48" opacity="0.14" filter="url(#b14)"/>
    <ellipse cx="760" cy="440" rx="260" ry="34" fill="#4a4f48" opacity="0.12" filter="url(#b14)"/>
    <ellipse cx="480" cy="548" rx="560" ry="60" fill="#000" opacity="0.55"/>
    <rect width="960" height="540" fill="#0e1116" opacity="0.07"/>
  </svg>`;

  /* ================= РАССВЕТ НА СЕВЕРЕ ================= */
  BG.dawn = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="dw-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#131a28"/><stop offset="0.45" stop-color="#4a4348"/><stop offset="0.72" stop-color="#96683e"/><stop offset="0.88" stop-color="#c9924f"/><stop offset="1" stop-color="#e0b06a"/>
      </linearGradient>
      <radialGradient id="dw-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#ffe7b0"/><stop offset="0.5" stop-color="#f0b660" stop-opacity="0.6"/><stop offset="1" stop-color="#f0b660" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="960" height="540" fill="url(#dw-sky)"/>
    <!-- перистые тёмные облака -->
    <ellipse cx="260" cy="120" rx="300" ry="22" fill="#1c1e2a" opacity="0.6" filter="url(#b14)"/>
    <ellipse cx="640" cy="80" rx="340" ry="26" fill="#181a26" opacity="0.7" filter="url(#b14)"/>
    <ellipse cx="480" cy="210" rx="380" ry="18" fill="#33262a" opacity="0.5" filter="url(#b14)"/>
    <ellipse cx="480" cy="300" rx="420" ry="14" fill="#6e4a33" opacity="0.4" filter="url(#b14)"/>
    <!-- солнце в дымке -->
    <circle cx="480" cy="368" r="150" fill="url(#dw-sun)" filter="url(#b6)"/>
    <circle cx="480" cy="368" r="46" fill="#ffe3ae" opacity="0.95"/>
    <path d="M420 356 h120 M400 372 h160" stroke="#96683e" stroke-width="5" opacity="0.5"/>
    ${crow(360, 240, 0.8, '#1c1a20')}${crow(400, 226, 0.6, '#1c1a20')}${crow(430, 244, 0.5, '#1c1a20')}
    <!-- холмы -->
    <path d="M0 392 Q240 356 480 388 T960 378 L960 540 L0 540 Z" fill="#2a2824"/>
    <path d="M0 436 Q300 406 620 434 T960 428 L960 540 L0 540 Z" fill="#1a191c"/>
    <path d="M0 488 Q480 462 960 482 L960 540 L0 540 Z" fill="#101013"/>
    <!-- вышки и дымки лагеря в долине -->
    <g fill="#0e0e12">
      <path d="M700 434 L707 366 L712 434 Z M690 380 h32 M694 400 h26"/>
      <path d="M742 432 L750 356 L756 432 Z M732 372 h38 M737 394 h30"/>
      <path d="M800 430 L806 380 L811 430 Z"/>
    </g>
    <circle cx="707" cy="366" r="3.4" fill="#ffca7a"/>
    <circle cx="707" cy="366" r="9" fill="#ffca7a" opacity="0.3" filter="url(#b6)"/>
    <circle cx="750" cy="356" r="3" fill="#ffca7a"/>
    <circle cx="750" cy="356" r="8" fill="#ffca7a" opacity="0.3" filter="url(#b6)"/>
    <path d="M660 430 q4 -30 -6 -52 q14 18 14 52 Z" fill="#33302c" opacity="0.5" filter="url(#b2)"/>
    <path d="M780 428 q6 -24 -2 -44 q12 16 10 44 Z" fill="#33302c" opacity="0.45" filter="url(#b2)"/>
    <!-- дорога-змейка к лагерю -->
    <path d="M300 540 Q380 500 500 486 T730 440" stroke="#3a352c" stroke-width="14" fill="none" opacity="0.55"/>
    <path d="M310 540 Q390 502 505 489" stroke="#57503c" stroke-width="2" fill="none" opacity="0.4" stroke-dasharray="14 18"/>
    <!-- указатель со стрелкой мелом -->
    <g>
      <rect x="176" y="440" width="8" height="72" fill="#141317"/>
      <rect x="150" y="428" width="70" height="26" rx="2" fill="#1c1a1e" transform="rotate(-4 185 441)"/>
      <path d="M160 442 h36 M200 442 l10 0 l-5 -6 M210 442 l-5 6" stroke="#c9c4b2" stroke-width="3" fill="none" opacity="0.8" transform="rotate(-4 185 441)"/>
    </g>
    <path d="M0 392 Q240 356 480 388 T960 378" stroke="#e8bd7f" stroke-width="2" opacity="0.3" fill="none"/>
    <rect width="960" height="540" fill="#1c1420" opacity="0.12"/>
  </svg>`;

  /* ================= ШКОЛА: класс музыки / актовый зал, серый рассвет ================= */
  BG.school = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="sc-win" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4a5560"/><stop offset="1" stop-color="#6e6c5c"/>
      </linearGradient>
      <linearGradient id="sc-beam" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="#8d95a0" stop-opacity="0.14"/><stop offset="1" stop-color="#8d95a0" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="#0a0b0c"/>
    <rect width="960" height="430" fill="#12100e"/>
    <path d="M0 430 L960 430" stroke="#1c1815" stroke-width="3"/>
    <!-- паркет -->
    <g stroke="#0d0b09" stroke-width="2" opacity="0.9">
      <path d="M0 460 L960 456 M0 495 L960 492 M0 528 L960 526"/>
      <path d="M140 430 L100 540 M320 430 L300 540 M520 430 L520 540 M700 430 L730 540 M860 430 L910 540"/>
    </g>
    <!-- высокие окна, часть заколочена -->
    <g>
      <rect x="60" y="70" width="130" height="270" fill="url(#sc-win)"/>
      <rect x="54" y="62" width="142" height="10" fill="#1a1512"/>
      <path d="M60 70 v270 M125 70 v270 M190 70 v270 M60 160 h130 M60 250 h130" stroke="#151110" stroke-width="7"/>
      <path d="M56 100 l138 40 M56 150 l138 38" stroke="#241d15" stroke-width="13" opacity="0.95"/>
      <rect x="60" y="70" width="130" height="270" fill="#2a3138" opacity="0.2"/>
    </g>
    <g>
      <rect x="770" y="70" width="130" height="270" fill="url(#sc-win)"/>
      <rect x="764" y="62" width="142" height="10" fill="#1a1512"/>
      <path d="M770 70 v270 M835 70 v270 M900 70 v270 M770 160 h130 M770 250 h130" stroke="#151110" stroke-width="7"/>
      <path d="M766 210 l138 44" stroke="#241d15" stroke-width="13" opacity="0.95"/>
      <path d="M810 74 l46 60 l-10 8 l-44 -58 Z" fill="#0e1216"/>
      <rect x="770" y="70" width="130" height="270" fill="#2c333a" opacity="0.16"/>
    </g>
    <path d="M120 90 L340 540 L60 540 Z" fill="url(#sc-beam)"/>
    <path d="M840 90 L640 540 L920 540 Z" fill="url(#sc-beam)"/>
    <!-- доска с надписью мелом -->
    <g>
      <rect x="330" y="120" width="300" height="150" fill="#1a221c"/>
      <rect x="322" y="112" width="316" height="166" fill="none" stroke="#241d15" stroke-width="8"/>
      <g stroke="#c9c4b2" opacity="0.75" fill="none" stroke-width="2.4" stroke-linecap="round">
        <path d="M352 152 h50 M412 152 h38 M460 152 h60 M530 152 h44"/>
        <path d="M352 180 h70 M432 180 h52 M494 180 h80"/>
        <path d="M352 208 h44 M406 208 h66 M482 208 h38"/>
      </g>
      <path d="M368 238 q8 -8 16 0 q8 -8 16 0" stroke="#c9c4b2" stroke-width="2" fill="none" opacity="0.5"/>
      <rect x="330" y="274" width="300" height="8" fill="#241d15"/>
      <rect x="470" y="266" width="26" height="7" rx="2" fill="#d8d2c2" opacity="0.6"/>
    </g>
    <!-- детские рисунки на стене -->
    <g opacity="0.8">
      <rect x="238" y="140" width="56" height="42" fill="#1e1a16" transform="rotate(-4 266 161)"/>
      <path d="M250 172 l10 -14 l10 14 Z M270 158 a6 6 0 1 1 0.1 0" fill="#3a3126" transform="rotate(-4 266 161)"/>
      <rect x="238" y="200" width="56" height="42" fill="#1c1916"/>
      <circle cx="258" cy="216" r="8" fill="#3d2c26"/>
      <path d="M252 230 h30 M258 224 l-6 12 M272 224 l6 12" stroke="#3d2c26" stroke-width="2.4" fill="none"/>
      <rect x="666" y="150" width="56" height="42" fill="#1e1a16" transform="rotate(3 694 171)"/>
      <path d="M676 182 q18 -26 36 0 Z" fill="#2e3328" transform="rotate(3 694 171)"/>
      <circle cx="710" cy="162" r="7" fill="#3a3322" transform="rotate(3 694 171)"/>
    </g>
    <!-- пианино у окна -->
    <g>
      <rect x="196" y="300" width="150" height="118" fill="#100c10"/>
      <rect x="192" y="294" width="158" height="9" fill="#191218"/>
      <rect x="204" y="330" width="134" height="13" fill="#d8d2c2" opacity="0.5"/>
      <g fill="#0b080c">
        <rect x="212" y="330" width="6" height="8"/><rect x="226" y="330" width="6" height="8"/><rect x="246" y="330" width="6" height="8"/>
        <rect x="260" y="330" width="6" height="8"/><rect x="274" y="330" width="6" height="8"/><rect x="294" y="330" width="6" height="8"/>
        <rect x="308" y="330" width="6" height="8"/><rect x="322" y="330" width="6" height="8"/>
      </g>
      <rect x="200" y="418" width="10" height="38" fill="#100c10"/><rect x="332" y="418" width="10" height="38" fill="#100c10"/>
      <rect x="244" y="428" width="56" height="10" fill="#0d0a0d"/>
      <rect x="250" y="438" width="7" height="18" fill="#0d0a0d"/><rect x="286" y="438" width="7" height="18" fill="#0d0a0d"/>
    </g>
    <!-- детские стульчики: ряд ровный + пара опрокинутых -->
    <g fill="#1c1410">
      <path d="M420 384 h34 v8 h-34 Z M424 392 l-3 34 h6 l3 -34 Z M448 392 l3 34 h-6 l-3 -34 Z M448 356 h6 v36 h-6 Z"/>
      <path d="M494 382 h34 v8 h-34 Z M498 390 l-3 34 h6 l3 -34 Z M522 390 l3 34 h-6 l-3 -34 Z M522 354 h6 v36 h-6 Z"/>
      <path d="M568 384 h34 v8 h-34 Z M572 392 l-3 34 h6 l3 -34 Z M596 392 l3 34 h-6 l-3 -34 Z M596 356 h6 v36 h-6 Z"/>
      <g transform="rotate(78 700 420)">
        <path d="M676 404 h34 v8 h-34 Z M680 412 l-3 30 h6 l3 -30 Z M704 412 l3 30 h-6 l-3 -30 Z M704 378 h6 v34 h-6 Z"/>
      </g>
    </g>
    <!-- стенд «1 сентября», покосившийся -->
    <g transform="rotate(-6 130 380)">
      <rect x="86" y="352" width="90" height="60" fill="#1a1512"/>
      <path d="M94 364 h74 M94 378 h58 M94 392 h66" stroke="#2e2a20" stroke-width="4"/>
      <circle cx="160" cy="366" r="8" fill="#33281c"/>
    </g>
    ${debris(S3, 450, 528, '#171310', '#453f30')}
    <ellipse cx="480" cy="546" rx="520" ry="60" fill="#000" opacity="0.66"/>
  </svg>`;

  /* ================= ДВОР С КАЧЕЛЯМИ: семья ================= */
  BG.yard = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <defs>${DEFS_FX}
      <linearGradient id="yd-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a2028"/><stop offset="0.65" stop-color="#4a4a42"/><stop offset="1" stop-color="#5c5240"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#yd-sky)"/>
    <ellipse cx="300" cy="90" rx="300" ry="40" fill="#141a20" opacity="0.8" filter="url(#b14)"/>
    <ellipse cx="720" cy="140" rx="260" ry="32" fill="#181e24" opacity="0.7" filter="url(#b14)"/>
    ${crow(150, 130, 0.8, '#101318')}
    <!-- дальние деревья -->
    <path d="M0 340 Q160 326 320 336 T640 330 T960 334 L960 380 L0 380 Z" fill="#161a16"/>
    <g stroke="#101410" fill="none" stroke-linecap="round">
      <path d="M60 350 L60 300 M60 316 L44 298 M60 330 L76 306" stroke-width="5"/>
      <path d="M905 348 L905 292 M905 312 L888 294 M905 326 L922 302" stroke-width="5"/>
    </g>
    <path d="M0 360 L960 356 L960 540 L0 540 Z" fill="#242419"/>
    <path d="M0 420 Q480 404 960 416 L960 540 L0 540 Z" fill="#1a1a13"/>
    <!-- дом -->
    <g>
      <rect x="640" y="240" width="250" height="130" fill="#1a1712"/>
      <path d="M620 244 L765 168 L910 244 Z" fill="#12100c"/>
      <rect x="672" y="280" width="42" height="48" fill="#0b0a08"/>
      <rect x="790" y="280" width="42" height="48" fill="#0b0a08"/>
      <path d="M672 280 l42 48 M714 280 l-42 48" stroke="#241f16" stroke-width="2"/>
      <rect x="738" y="296" width="34" height="74" fill="#080706"/>
      <path d="M742 370 l-8 -6 l34 0 l-6 6 Z" fill="#0d0b08"/>
    </g>
    <!-- забор покосившийся -->
    <g fill="#1c1a12">
      <path d="M40 388 l12 -2 l2 44 l-12 2 Z"/><path d="M78 386 l12 -2 l2 44 l-12 2 Z" transform="rotate(6 86 406)"/>
      <path d="M118 386 l12 -2 l1 42 l-12 2 Z"/><path d="M158 384 l12 -2 l2 44 l-12 2 Z" transform="rotate(-8 166 404)"/>
      <path d="M200 384 l12 -2 l1 42 l-12 2 Z"/><path d="M244 382 l12 -2 l2 44 l-12 2 Z" transform="rotate(4 252 402)"/>
      <rect x="30" y="396" width="240" height="6"/>
    </g>
    <!-- стол во дворе и четыре фигуры вокруг -->
    <g>
      <rect x="420" y="368" width="120" height="8" fill="#171410"/>
      <path d="M430 376 l-4 40 M530 376 l4 40" stroke="#12100c" stroke-width="5"/>
      <g fill="#0e0d0b">
        <path d="M394 322 a8 8 0 1 1 0.1 0 M386 334 q8 -8 18 -2 l6 22 l-4 62 l-7 0 l-2 -48 l-4 0 l-3 48 l-7 0 Z"/>
        <path d="M568 318 a8 8 0 1 1 0.1 0 M560 330 q8 -8 18 -2 l6 24 l-5 64 l-7 0 l-1 -50 l-4 0 l-3 50 l-7 0 Z"/>
        <path d="M462 306 a7.4 7.4 0 1 1 0.1 0 M455 318 q7 -7 16 -2 l5 22 l-4 60 l-6 0 l-2 -46 l-3 0 l-3 46 l-6 0 Z"/>
        <path d="M506 348 a5.4 5.4 0 1 1 0.1 0 M501 357 q5 -5 12 -1 l4 16 l-3 44 l-5 0 l-1 -34 l-3 0 l-2 34 l-5 0 Z"/>
      </g>
    </g>
    <!-- качели -->
    <g>
      <path d="M150 430 L190 300 L230 430 M300 430 L262 300 L222 430" stroke="#15130e" stroke-width="7" fill="none"/>
      <path d="M190 300 L262 300" stroke="#15130e" stroke-width="7"/>
      <path d="M215 302 L212 388 M240 302 L243 388" stroke="#211c13" stroke-width="2.4"/>
      <rect x="206" y="386" width="44" height="7" fill="#1a160f" transform="rotate(7 228 389)"/>
      <path d="M222 372 a5 5 0 1 1 0.1 0" fill="#0e0d0b"/>
      <path d="M218 380 q6 -5 12 -1 l3 12 l-2 20 l-14 1 Z" fill="#0e0d0b" transform="rotate(7 226 392)"/>
      <path d="M262 320 q10 6 6 18 M190 320 q-10 6 -6 18" stroke="#4a4436" stroke-width="1.4" fill="none" opacity="0.45"/>
      <path d="M276 312 q14 8 9 24 M176 312 q-14 8 -9 24" stroke="#4a4436" stroke-width="1.2" fill="none" opacity="0.3"/>
    </g>
    <!-- бельевая верёвка с истлевшим бельём -->
    <path d="M310 330 Q400 342 470 332" stroke="#14120d" stroke-width="1.6" fill="none"/>
    <path d="M340 334 q2 16 -3 26 l10 0 q-4 -12 -2 -26 Z M420 336 q2 12 -2 22 l9 0 q-4 -10 -2 -22 Z" fill="#33302a" opacity="0.7"/>
    ${debris(S3, 430, 520, '#15150f', '#45443a')}
    <ellipse cx="480" cy="548" rx="560" ry="62" fill="#000" opacity="0.55"/>
    <rect width="960" height="540" fill="#12141a" opacity="0.12"/>
  </svg>`;

  /* ================= ТЕМНОТА ================= */
  BG.dark = `<svg ${NS} viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice">
    <rect width="960" height="540" fill="#030405"/>
    <rect width="960" height="540" fill="#080a10" opacity="0.5"/>
  </svg>`;

  /* ============ ПОРТРЕТЫ ============ */
  // Тёмные фигуры, контурный свет справа, лица — минимализм.

  function anyaBase(mouth, brows, extra) {
    return `<svg ${NS} viewBox="0 0 360 640" preserveAspectRatio="xMidYMax meet">
    <defs>
      <linearGradient id="an-rim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#b98a5e" stop-opacity="0"/>
        <stop offset="1" stop-color="#d9b184" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="an-coat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#23262c"/><stop offset="1" stop-color="#111318"/>
      </linearGradient>
      <linearGradient id="an-shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.5"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="M180 640 L96 640 Q88 430 108 330 Q120 268 158 250 L202 250 Q244 268 254 330 Q272 430 264 640 Z" fill="url(#an-coat)"/>
    <path d="M158 250 Q140 258 130 280 L120 640 L96 640 Q88 430 108 330 Q120 268 158 250 Z" fill="#0b0d11"/>
    <path d="M202 250 Q248 270 256 340 Q268 440 264 640 L250 640 Q254 430 246 340 Q240 278 202 250 Z" fill="url(#an-rim)" opacity="0.55"/>
    <path d="M148 330 l-6 120 M214 330 l6 120" stroke="#0d0f13" stroke-width="3" opacity="0.7"/>
    <path d="M150 262 q30 20 60 0 l-2 26 q-28 16 -56 0 Z" fill="#0f1115"/>
    <path d="M136 268 Q180 296 224 268 L224 306 Q180 330 136 306 Z" fill="#4a2e2a"/>
    <path d="M214 268 Q222 284 224 306 L224 268 Z" fill="#7a4a3d" opacity="0.8"/>
    <path d="M136 280 q44 24 88 0" stroke="#33201d" stroke-width="4" fill="none" opacity="0.7"/>
    <path d="M180 258 Q148 258 140 222 L140 170 Q140 122 180 120 Q220 122 220 170 L220 222 Q212 258 180 258 Z" fill="#c99e78"/>
    <path d="M220 170 L220 222 Q218 244 200 252 Q214 238 212 200 Q214 160 202 140 Q220 148 220 170 Z" fill="#e0bb90"/>
    <path d="M140 170 L140 222 Q142 246 160 254 Q146 238 148 200 Q146 162 156 140 Q140 150 140 170 Z" fill="url(#an-shade)"/>
    <path d="M180 112 Q132 112 130 176 Q128 240 118 268 Q104 300 124 306 Q118 250 138 216 L140 160 Q146 132 180 128 Q214 132 220 160 L222 216 Q242 250 236 306 Q256 300 242 268 Q232 240 230 176 Q228 112 180 112 Z" fill="#241a14"/>
    <path d="M138 216 Q130 280 112 296 Q100 310 126 312 Q140 300 142 260 Z" fill="#1a1610"/>
    <path d="M222 216 Q230 280 248 296 Q260 310 234 312 Q220 300 218 260 Z" fill="#1a1610"/>
    <path d="M230 176 Q234 130 208 118 Q228 134 226 176 L228 230 Q236 258 236 290 Q246 258 238 230 Z" fill="#4a3626" opacity="0.9"/>
    <path d="M146 128 q-8 40 -4 78" stroke="#141009" stroke-width="3" fill="none" opacity="0.6"/>
    <path d="M214 130 q8 42 4 80" stroke="#141009" stroke-width="3" fill="none" opacity="0.5"/>
    ${brows}
    <g fill="#1c1410">
      <path d="M150 186 q10 -6 22 0 q-10 8 -22 0 Z"/>
      <path d="M188 186 q10 -6 22 0 q-10 8 -22 0 Z"/>
    </g>
    <path d="M150 186 q10 -8 22 -1 M188 185 q10 -7 22 1" stroke="#0f0b08" stroke-width="2" fill="none" opacity="0.7"/>
    <path d="M176 196 Q172 210 170 214 Q174 219 182 217" stroke="#a37b5a" stroke-width="2.5" fill="none"/>
    <path d="M154 212 q6 4 13 2 M194 212 q6 4 13 2" stroke="#b08560" stroke-width="1.6" fill="none" opacity="0.5"/>
    ${mouth}
    ${extra || ''}
    <path d="M180 640 L96 640 Q88 430 108 330 Q118 275 148 254 Q120 300 116 400 Q112 520 118 640 Z" fill="#000" opacity="0.28"/>
  </svg>`;
  }

  const PORTRAITS = {
    anya: anyaBase(
      `<path d="M166 234 Q180 240 194 234" stroke="#7a4636" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      `<g stroke="#1f1610" stroke-width="4" fill="none" stroke-linecap="round">
        <path d="M148 172 q12 -7 26 -3"/><path d="M186 169 q14 -4 26 3"/>
      </g>`
    ),
    anya_sad: anyaBase(
      `<path d="M166 238 Q180 232 194 238" stroke="#7a4636" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      `<g stroke="#1f1610" stroke-width="4" fill="none" stroke-linecap="round">
        <path d="M150 168 q12 -2 24 4"/><path d="M186 172 q12 -6 24 -4"/>
      </g>`,
      `<path d="M158 200 q-2 8 -4 12 M204 200 q2 8 4 12" stroke="#8a6548" stroke-width="1.4" fill="none" opacity="0.5"/>`
    ),
    anya_smile: anyaBase(
      `<path d="M164 232 Q180 244 196 232" stroke="#7a4636" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      `<g stroke="#1f1610" stroke-width="4" fill="none" stroke-linecap="round">
        <path d="M148 170 q12 -6 26 -2"/><path d="M186 168 q14 -3 26 2"/>
      </g>`,
      `<circle cx="152" cy="222" r="7" fill="#b3402e" opacity="0.16"/><circle cx="208" cy="222" r="7" fill="#b3402e" opacity="0.16"/>`
    ),
    semyon: `<svg ${NS} viewBox="0 0 360 640" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="sm-coat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2e2a22"/><stop offset="1" stop-color="#16140f"/>
        </linearGradient>
        <linearGradient id="sm-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#d9b184" stop-opacity="0"/>
          <stop offset="1" stop-color="#d9b184" stop-opacity="0.75"/>
        </linearGradient>
      </defs>
      <path d="M290 640 L70 640 Q66 440 88 336 Q102 270 150 252 L216 252 Q262 270 276 336 Q296 440 290 640 Z" fill="url(#sm-coat)"/>
      <path d="M216 252 Q266 274 276 350 Q290 450 290 640 L272 640 Q276 440 264 350 Q254 282 216 252 Z" fill="url(#sm-rim)" opacity="0.5"/>
      <path d="M150 252 Q126 262 112 296 L98 640 L70 640 Q66 440 88 336 Q102 270 150 252 Z" fill="#100e0a"/>
      <path d="M120 300 L246 300 L240 340 L126 340 Z" fill="#221f19" opacity="0.9"/>
      <path d="M126 340 l114 0 M132 322 l104 0" stroke="#14120d" stroke-width="2" opacity="0.8"/>
      <path d="M100 380 q8 60 4 120 M262 380 q-6 70 -2 140" stroke="#0d0b08" stroke-width="3" fill="none" opacity="0.7"/>
      <path d="M183 266 Q152 266 148 226 L148 178 Q148 128 183 126 Q218 128 218 178 L218 226 Q214 266 183 266 Z" fill="#b98a62"/>
      <path d="M218 178 L218 226 Q216 250 200 262 Q214 246 212 204 Q214 164 204 144 Q218 152 218 178 Z" fill="#d1a374"/>
      <path d="M148 208 Q140 250 152 262 Q186 286 214 262 Q228 248 218 208 Q214 252 183 254 Q152 252 148 208 Z" fill="#7a7466"/>
      <path d="M150 236 Q183 262 216 236 L216 268 Q183 290 150 268 Z" fill="#8a8371"/>
      <path d="M150 244 q33 22 66 0" stroke="#5c574a" stroke-width="3" fill="none" opacity="0.8"/>
      <path d="M183 120 Q140 120 138 168 Q136 186 140 196 Q146 160 160 152 Q182 142 206 152 Q220 160 226 196 Q230 186 228 168 Q226 120 183 120 Z" fill="#5c564b"/>
      <path d="M138 168 Q120 172 122 190 Q124 204 142 202 Z" fill="#4a453c"/>
      <path d="M228 168 Q246 172 244 190 Q242 204 224 202 Z" fill="#4a453c"/>
      <path d="M144 132 q40 -18 80 0" stroke="#3d3830" stroke-width="3" fill="none" opacity="0.7"/>
      <g stroke="#433d32" stroke-width="5" fill="none" stroke-linecap="round">
        <path d="M150 178 q12 -6 26 -2"/><path d="M190 176 q14 -4 26 2"/>
      </g>
      <g fill="#1e1a12">
        <path d="M152 192 q11 -5 22 0 q-11 7 -22 0 Z"/><path d="M192 192 q11 -5 22 0 q-11 7 -22 0 Z"/>
      </g>
      <path d="M150 192 q11 -7 22 -1 M192 191 q11 -6 22 1" stroke="#120e08" stroke-width="2" fill="none" opacity="0.7"/>
      <path d="M179 200 Q175 216 172 220 Q177 226 186 223" stroke="#8a6a4a" stroke-width="3" fill="none"/>
      <path d="M160 236 Q183 232 206 236" stroke="#7a7466" stroke-width="4" fill="none"/>
      <path d="M144 214 Q140 224 146 228 M222 214 Q226 224 220 228" stroke="#8a6038" stroke-width="2" fill="none" opacity="0.6"/>
      <path d="M152 168 q-4 10 -2 18 M216 168 q4 10 2 18" stroke="#96703f" stroke-width="1.6" fill="none" opacity="0.5"/>
      <path d="M290 640 L272 640 Q276 460 268 380 Q282 460 284 560 Q286 600 290 640 Z" fill="#000" opacity="0.25"/>
    </svg>`
  };

  window.BG = BG;
  window.PORTRAITS = PORTRAITS;
})();
