/* ============ Движок визуальной новеллы ============ */
(function () {
  'use strict';

  const STORY = {};
  [].concat(window.STORY_PART1, window.STORY_PART2).forEach(n => { STORY[n.id] = n; });

  const ENDINGS = [
    { id: 'dawn', title: 'РАССВЕТ', hint: 'дойти до конца вдвоём' },
    { id: 'ember', title: 'ОГОНЁК', hint: 'выбрать синицу в руках' },
    { id: 'price', title: 'ЦЕНА', hint: 'некоторые тайны стоят дорого' },
    { id: 'empty', title: 'ПУСТОТА', hint: 'стены бывают слишком толстыми' },
  ];

  const SAVE_KEY = 'zw_save_v1';
  const END_KEY = 'zw_endings_v1';
  const FAST = /[?&]fast=1/.test(location.search);

  const $ = id => document.getElementById(id);
  const el = {
    menu: $('menu'), game: $('game'), endingsScr: $('endings-screen'),
    menuBg: $('menu-bg'), scene: $('scene'), sprite: $('sprite'),
    dialogue: $('dialogue'), speaker: $('speaker'), text: $('text'),
    choices: $('choices'), titleCard: $('title-card'),
    tcChapter: $('tc-chapter'), tcName: $('tc-name'),
    endingScr: $('ending-screen'), endingTitle: $('ending-title'), endingText: $('ending-text'),
    endingsList: $('endings-list'), fx: $('fx'),
  };

  /* ---------- Состояние ---------- */
  let state = null;
  let nodeId = null;
  let typing = null;       // interval
  let typeDone = false;
  let fullText = '';
  let currentBg = null;
  let currentMusic = null;

  function freshState() {
    return { love: 0, trust: 0 };
  }

  /* ---------- Частицы ---------- */
  const fxCanvas = el.fx;
  const fxCtx = fxCanvas.getContext('2d');
  let particles = [];
  let fxMode = null;

  function resizeFx() {
    // размер по игровому кадру (#stage), а не по окну: на широких экранах кадр уже
    fxCanvas.width = fxCanvas.clientWidth || innerWidth;
    fxCanvas.height = fxCanvas.clientHeight || innerHeight;
  }
  addEventListener('resize', resizeFx);
  resizeFx();

  function setFx(mode) {
    if (mode === fxMode) return;
    fxMode = mode;
    particles = [];
    if (!mode) return;
    const base = { rain: 140, ash: 45, dust: 30, embers: 40, snow: 80 }[mode] || 0;
    // плотность выровнена под 1920×1080: на большом кадре частиц больше
    const k = Math.min(2.5, Math.max(1, (fxCanvas.width * fxCanvas.height) / (1920 * 1080)));
    const count = Math.round(base * k);
    for (let i = 0; i < count; i++) particles.push(spawn(mode, true));
  }

  function spawn(mode, anywhere) {
    const w = fxCanvas.width, h = fxCanvas.height;
    const y = anywhere ? Math.random() * h : (mode === 'embers' ? h - 60 - Math.random() * 120 : -10);
    switch (mode) {
      case 'rain': return { x: Math.random() * w, y, vx: -2.2, vy: 16 + Math.random() * 8, l: 14 + Math.random() * 10, a: 0.25 + Math.random() * 0.25 };
      case 'ash': return { x: Math.random() * w, y, vx: (Math.random() - 0.5) * 0.6, vy: 0.4 + Math.random() * 0.7, r: 1 + Math.random() * 2, a: 0.15 + Math.random() * 0.3, ph: Math.random() * 6.28 };
      case 'dust': return { x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: -0.1 - Math.random() * 0.2, r: 0.8 + Math.random() * 1.6, a: 0.08 + Math.random() * 0.18, ph: Math.random() * 6.28 };
      case 'embers': return { x: w * 0.5 + (Math.random() - 0.5) * w * 0.4, y, vx: (Math.random() - 0.5) * 0.9, vy: -1 - Math.random() * 1.8, r: 1 + Math.random() * 2, a: 0.4 + Math.random() * 0.5, life: 1 };
      case 'snow': return { x: Math.random() * w, y, vx: (Math.random() - 0.5) * 0.8, vy: 0.7 + Math.random() * 1.2, r: 1.2 + Math.random() * 2.2, a: 0.3 + Math.random() * 0.4, ph: Math.random() * 6.28 };
    }
  }

  function tickFx() {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    if (fxMode) {
      const h = fxCanvas.height, w = fxCanvas.width;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.ph !== undefined) { p.ph += 0.02; p.x += Math.sin(p.ph) * 0.4; }
        if (fxMode === 'embers') { p.life -= 0.008; p.a = Math.max(0, p.life * 0.8); }
        const off = p.y > h + 20 || p.y < -30 || p.x < -30 || p.x > w + 30 || (p.life !== undefined && p.life <= 0);
        if (off) { particles[i] = spawn(fxMode, false); continue; }
        if (fxMode === 'rain') {
          fxCtx.strokeStyle = `rgba(180,190,200,${p.a})`;
          fxCtx.lineWidth = 1;
          fxCtx.beginPath(); fxCtx.moveTo(p.x, p.y); fxCtx.lineTo(p.x + p.vx, p.y + p.l); fxCtx.stroke();
        } else {
          const colors = { ash: '160,155,140', dust: '200,195,170', embers: '255,160,70', snow: '230,232,238' };
          fxCtx.fillStyle = `rgba(${colors[fxMode]},${p.a})`;
          fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r, 0, 6.28); fxCtx.fill();
        }
      }
    }
    requestAnimationFrame(tickFx);
  }
  requestAnimationFrame(tickFx);

  /* ---------- Ассеты: PNG из assets/ с откатом на SVG ---------- */
  const probeCache = {};
  function probeAsset(url) {
    if (!(url in probeCache)) {
      probeCache[url] = new Promise(res => {
        const im = new Image();
        im.onload = () => res(true);
        im.onerror = () => res(false);
        im.src = url;
      });
    }
    return probeCache[url];
  }

  /* ---------- Рендер ---------- */
  function setBg(name) {
    if (name === currentBg) return;
    currentBg = name;
    el.scene.classList.add('fading');
    const url = 'assets/bg/' + name + '.png';
    const delay = new Promise(res => setTimeout(res, FAST ? 0 : 450));
    Promise.all([probeAsset(url), delay]).then(([hasPng]) => {
      if (currentBg !== name) return;
      el.scene.innerHTML = hasPng
        ? `<img class="bg-img" src="${url}" alt="">`
        : (window.BG[name] || window.BG.dark);
      el.scene.classList.remove('fading');
    });
  }

  function setSprite(name) {
    if (!name) { el.sprite.classList.remove('visible'); return; }
    const url = 'assets/portraits/' + name + '.png';
    probeAsset(url).then(hasPng => {
      el.sprite.innerHTML = hasPng
        ? `<img class="sprite-img" src="${url}" alt="">`
        : (window.PORTRAITS[name] || '');
      el.sprite.classList.add('visible');
    });
  }

  function setMusic(name) {
    if (!name || name === currentMusic) return;
    currentMusic = name;
    window.music.play(name);
  }

  function nodeText(n) {
    return typeof n.text === 'function' ? n.text(state) : n.text;
  }

  function resolveNext(next) {
    return typeof next === 'function' ? next(state) : next;
  }

  function applyFx(fx) {
    if (!fx) return;
    if (fx.love) state.love = (state.love || 0) + fx.love;
    if (fx.trust) state.trust = (state.trust || 0) + fx.trust;
    if (fx.flags) fx.flags.forEach(f => { state[f] = true; });
    if (fx.unset) fx.unset.forEach(f => { delete state[f]; });
  }

  function show(id) {
    const n = STORY[id];
    if (!n) { console.error('Нет узла:', id); return; }
    nodeId = id;
    save();

    el.choices.classList.remove('visible');
    el.choices.innerHTML = '';
    el.titleCard.classList.remove('visible');
    el.titleCard.onclick = null;

    if (n.type === 'title') {
      el.dialogue.classList.remove('visible');
      el.sprite.classList.remove('visible');
      el.tcChapter.textContent = n.chapter;
      el.tcName.textContent = n.name;
      requestAnimationFrame(() => { if (nodeId === id) el.titleCard.classList.add('visible'); });
      setMusic(n.music || currentMusic || 'ambient');
      const go = () => {
        if (nodeId !== id) return; // сюжет уже ушёл с этого узла
        el.titleCard.classList.remove('visible');
        el.titleCard.onclick = null;
        setTimeout(() => { if (nodeId === id) show(resolveNext(n.next)); }, FAST ? 0 : 600);
      };
      el.titleCard.onclick = go;
      if (!FAST) setTimeout(() => { if (nodeId === id && el.titleCard.classList.contains('visible')) go(); }, 3400);
      else setTimeout(go, 30);
      return;
    }

    if (n.type === 'ending') {
      unlockEnding(n.ending);
      clearSave();
      el.dialogue.classList.remove('visible');
      el.sprite.classList.remove('visible');
      setMusic(n.ending === 'dawn' || n.ending === 'ember' ? 'dawn' : 'sad');
      el.endingTitle.textContent = n.title;
      el.endingText.textContent = typeof n.endText === 'function' ? n.endText(state) : n.endText;
      el.endingScr.classList.add('visible');
      return;
    }

    if (n.bg) setBg(n.bg);
    if (n.fx !== undefined) setFx(n.fx);
    if (n.music) setMusic(n.music);
    setSprite(n.sprite);

    el.dialogue.classList.add('visible');
    el.speaker.textContent = n.speaker || '';
    startTyping(nodeText(n));
  }

  /* Переносы реплик: новая строка перед «—», если это начало новой реплики
     (после конца предложения и с заглавной буквы). Ремарки остаются в строке. */
  function formatDialogue(text) {
    return text.replace(/([.!?…»)]) — (?=[А-ЯЁA-Z«])/g, '$1\n— ');
  }

  function startTyping(text) {
    clearInterval(typing);
    fullText = formatDialogue(text);
    typeDone = false;
    el.dialogue.classList.remove('done');
    if (FAST) { el.text.textContent = text; finishTyping(); return; }
    el.text.textContent = '';
    let i = 0;
    typing = setInterval(() => {
      i += 1;
      el.text.textContent = fullText.slice(0, i);
      if (i >= fullText.length) finishTyping();
    }, 26);
  }

  function finishTyping() {
    clearInterval(typing);
    el.text.textContent = fullText;
    typeDone = true;
    const n = STORY[nodeId];
    if (n.choices) showChoices(n);
    else el.dialogue.classList.add('done');
  }

  function showChoices(n) {
    el.choices.innerHTML = '';
    n.choices.forEach((c, idx) => {
      if (c.if && !c.if(state)) return;
      const b = document.createElement('button');
      b.textContent = c.text;
      b.dataset.testid = 'choice-' + idx;
      b.onclick = (e) => {
        e.stopPropagation();
        applyFx(c.fx);
        el.choices.classList.remove('visible');
        el.choices.innerHTML = '';
        show(resolveNext(c.next));
      };
      el.choices.appendChild(b);
    });
    el.choices.classList.add('visible');
  }

  function advance() {
    const n = STORY[nodeId];
    if (!n || n.type) return;
    if (!typeDone) { finishTyping(); return; }
    if (n.choices) return; // ждём выбора
    applyFx(n.fx);
    show(resolveNext(n.next));
  }

  /* ---------- Сохранения ---------- */
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ nodeId, state, music: currentMusic })); } catch (e) {}
  }
  function loadSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }
  function unlockEnding(id) {
    try {
      const arr = JSON.parse(localStorage.getItem(END_KEY) || '[]');
      if (!arr.includes(id)) { arr.push(id); localStorage.setItem(END_KEY, JSON.stringify(arr)); }
    } catch (e) {}
  }
  function unlockedEndings() {
    try { return JSON.parse(localStorage.getItem(END_KEY) || '[]'); } catch (e) { return []; }
  }

  /* ---------- Экраны ---------- */
  function toScreen(name) {
    [el.menu, el.game, el.endingsScr].forEach(s => s.classList.remove('visible'));
    ({ menu: el.menu, game: el.game, endings: el.endingsScr })[name].classList.add('visible');
  }

  function openMenu() {
    el.endingScr.classList.remove('visible');
    $('btn-continue').disabled = !loadSave();
    setFx(null);
    window.music.play('ambient');
    currentMusic = 'ambient';
    toScreen('menu');
  }

  function newGame() {
    state = freshState();
    currentBg = null;
    el.endingScr.classList.remove('visible');
    toScreen('game');
    show('start');
  }

  function continueGame() {
    const s = loadSave();
    if (!s) return;
    state = s.state || freshState();
    currentBg = null;
    currentMusic = null;
    el.endingScr.classList.remove('visible');
    toScreen('game');
    if (s.music) setMusic(s.music);
    show(s.nodeId);
  }

  function showEndings() {
    const unlocked = unlockedEndings();
    el.endingsList.innerHTML = '';
    ENDINGS.forEach(e2 => {
      const li = document.createElement('li');
      if (unlocked.includes(e2.id)) {
        li.className = 'unlocked';
        li.textContent = e2.title;
      } else {
        li.textContent = '??? — ' + e2.hint;
      }
      el.endingsList.appendChild(li);
    });
    toScreen('endings');
  }

  /* ---------- События ---------- */
  document.addEventListener('pointerdown', () => window.music.unlock(), { once: true });
  document.addEventListener('keydown', () => window.music.unlock(), { once: true });

  $('btn-new').onclick = () => { window.music.unlock(); newGame(); };
  $('btn-continue').onclick = () => { window.music.unlock(); continueGame(); };
  $('btn-endings').onclick = showEndings;
  $('btn-endings-back').onclick = openMenu;
  $('btn-menu').onclick = openMenu;
  $('btn-ending-menu').onclick = openMenu;
  $('btn-mute').onclick = function () {
    const m = window.music.toggleMute();
    this.classList.toggle('off', m);
  };

  el.dialogue.addEventListener('click', advance);
  document.addEventListener('keydown', (e) => {
    if (!el.game.classList.contains('visible')) return;
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advance(); }
  });

  /* ---------- Инициализация ---------- */
  el.menuBg.innerHTML = window.BG.street;
  probeAsset('assets/bg/menu.png').then(ok => {
    if (ok) el.menuBg.innerHTML = '<img class="bg-img" src="assets/bg/menu.png" alt="">';
  });
  $('btn-continue').disabled = !loadSave();

  /* ---------- API для тестов ---------- */
  window.game = {
    version: 1,
    story: STORY,
    getState: () => ({ nodeId, ...state ? { love: state.love, trust: state.trust } : {}, state: state ? { ...state } : null }),
    nodeId: () => nodeId,
    jump: (id, st) => {
      if (!STORY[id]) throw new Error('нет узла ' + id);
      if (!state) { state = freshState(); toScreen('game'); }
      if (st) Object.assign(state, st);
      show(id);
    },
    newGame, continueGame, openMenu,
    finishTyping: () => finishTyping(),
    advance: () => advance(),
    isFast: FAST,
  };
})();
