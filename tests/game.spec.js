// e2e-тесты визуальной новеллы «241-й день»
const { test, expect } = require('@playwright/test');

const FAST = '/?fast=1';

/** Прокликивает игру до концовки. choose(page) -> индекс выбора. */
async function autoPlay(page, { choose = async () => 0, maxSteps = 500 } = {}) {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.locator('#ending-screen.visible').count()) return;
    if (await page.locator('#title-card.visible').count()) {
      await page.locator('#title-card').click({ force: true }).catch(() => {});
      await page.waitForTimeout(30);
      continue;
    }
    const choices = page.locator('#choices.visible button');
    const n = await choices.count();
    if (n > 0) {
      const idx = Math.min(await choose(page), n - 1);
      await choices.nth(idx).click();
      continue;
    }
    if (await page.locator('#dialogue.visible').count()) {
      await page.locator('#dialogue').click({ force: true }).catch(() => {});
      await page.waitForTimeout(15);
      continue;
    }
    await page.waitForTimeout(40);
  }
  throw new Error('Не добрались до концовки за ' + maxSteps + ' шагов');
}

test.describe('Главное меню', () => {
  test('меню загружается, «Продолжить» недоступно без сохранения', async ({ page }) => {
    await page.goto(FAST);
    await expect(page.locator('.menu-title h1')).toHaveText('241-й ДЕНЬ');
    await expect(page.getByTestId('btn-new')).toBeEnabled();
    await expect(page.getByTestId('btn-continue')).toBeDisabled();
  });

  test('галерея концовок: всё скрыто в начале', async ({ page }) => {
    await page.goto(FAST);
    await page.getByTestId('btn-endings').click();
    await expect(page.locator('#endings-list li')).toHaveCount(4);
    for (const li of await page.locator('#endings-list li').all()) {
      await expect(li).toContainText('???');
    }
  });
});

test.describe('Целостность сюжета', () => {
  test('все переходы и выборы ведут на существующие узлы', async ({ page }) => {
    await page.goto(FAST);
    const broken = await page.evaluate(() => {
      const S = window.game.story;
      const bad = [];
      // разные комбинации состояния для функций-переходов
      const samples = [];
      for (const love of [0, 3, 5, 8, 12])
        for (const extra of [{}, { bitten: true }, { bitten: true, told_bite: true }, { bitten: true, hid_bite: true },
          { helped_semyon: true, went_night: true, route_er: true, kissed: true },
          { told_past: true, route_er: true, lost_supplies: true, promised: true, let_play: true, careful: true },
          { school_went: true, stranger_note: true }, { school_alone: true, bitten: true },
          { dog: true, stranger_note: true, swing_stopped: true, yard_supplies: true },
          { dog: true, dog_dead: true, bitten: true, told_bite: true },
          { bitten: true, told_bite: true, self_treated: true }, { bitten: true, hid_bite: true, self_treated: true },
          { dog: true, warm_smoke: true, kissed: true }, { winter_cough: true, lost_gear: true, yard_supplies: true },
          { flare_shot: true, sem_saved: true, dog: true }, { sem_dead_fast: true, horde_ahead: true },
          { lost_gear: true, horde_ahead: true, swing_left: true, said_notyet: true }])
          samples.push(Object.assign({ love, trust: love }, extra));
      const check = (from, next) => {
        if (typeof next === 'string') {
          if (!S[next]) bad.push(from + ' -> ' + next);
        } else if (typeof next === 'function') {
          for (const s of samples) {
            const r = next(s);
            if (!S[r]) bad.push(from + ' -> fn -> ' + r);
          }
        }
      };
      for (const id in S) {
        const n = S[id];
        if (n.next) check(id, n.next);
        if (n.choices) n.choices.forEach((c, i) => check(id + '[выбор ' + i + ']', c.next));
        if (!n.next && !n.choices && n.type !== 'ending') bad.push(id + ': тупик без next/choices');
      }
      return bad;
    });
    expect(broken).toEqual([]);
  });

  test('частицы соответствуют сцене: дождь и искры не идут в помещении', async ({ page }) => {
    await page.goto(FAST);
    const bad = await page.evaluate(() => {
      const S = window.game.story;
      const samples = [];
      for (const love of [0, 3, 5, 8, 12])
        for (const extra of [{}, { bitten: true }, { bitten: true, told_bite: true }, { bitten: true, hid_bite: true },
          { helped_semyon: true, went_night: true, route_er: true, kissed: true },
          { told_past: true, route_er: true, lost_supplies: true, promised: true, let_play: true, careful: true },
          { school_went: true, stranger_note: true }, { school_alone: true, bitten: true },
          { dog: true, stranger_note: true, swing_stopped: true, yard_supplies: true },
          { dog: true, dog_dead: true, bitten: true, told_bite: true },
          { bitten: true, told_bite: true, self_treated: true }, { bitten: true, hid_bite: true, self_treated: true },
          { dog: true, warm_smoke: true, kissed: true }, { winter_cough: true, lost_gear: true, yard_supplies: true },
          { flare_shot: true, sem_saved: true, dog: true }, { sem_dead_fast: true, horde_ahead: true },
          { lost_gear: true, horde_ahead: true, swing_left: true, said_notyet: true }])
          samples.push(Object.assign({ love, trust: love }, extra));
      const targetsOf = (n) => {
        const out = [];
        const push = (nx) => {
          if (typeof nx === 'string') out.push(nx);
          else if (typeof nx === 'function') samples.forEach(s => out.push(nx(s)));
        };
        if (n.next) push(n.next);
        if (n.choices) n.choices.forEach(c => push(c.next));
        return [...new Set(out)];
      };
      const INTERIOR = new Set(['apartment', 'pharmacy', 'library', 'hospital_in', 'school']);
      const OUTDOOR = new Set(['street', 'road', 'gas', 'bridge', 'hospital_out', 'dawn', 'yard']);
      const bad = [];
      const seen = new Set();
      const queue = [['start', null]];
      while (queue.length) {
        const [id, fxIn] = queue.pop();
        const n = S[id];
        if (!n) continue;
        const fx = n.fx !== undefined ? n.fx : fxIn;
        const key = id + '|' + fx;
        if (seen.has(key)) continue;
        seen.add(key);
        if (n.bg) {
          if (INTERIOR.has(n.bg) && ['rain', 'snow', 'ash', 'embers'].includes(fx))
            bad.push(`${id}: «${fx}» внутри (${n.bg})`);
          const emberOk = n.bg === 'gas' && fx === 'embers'; // пожар на заправке — легитимен
          if (OUTDOOR.has(n.bg) && ['embers', 'dust'].includes(fx) && !emberOk)
            bad.push(`${id}: «${fx}» на улице (${n.bg})`);
        }
        if (n.type !== 'ending') targetsOf(n).forEach(t => queue.push([t, fx]));
      }
      return [...new Set(bad)];
    });
    expect(bad).toEqual([]);
  });

  test('в сюжете нет заглушек и достаточно контента', async ({ page }) => {
    await page.goto(FAST);
    const stats = await page.evaluate(() => {
      const S = window.game.story;
      const ids = Object.keys(S);
      let choiceNodes = 0, endings = 0, chars = 0;
      const probe = { love: 5, trust: 3 };
      for (const id of ids) {
        const n = S[id];
        if (n.choices) choiceNodes++;
        if (n.type === 'ending') endings++;
        const t = typeof n.text === 'function' ? n.text(probe) : n.text;
        if (t) chars += t.length;
        if (n.endText) chars += n.endText.length;
      }
      return { nodes: ids.length, choiceNodes, endings, chars };
    });
    expect(stats.nodes).toBeGreaterThan(90);
    expect(stats.choiceNodes).toBeGreaterThanOrEqual(15);
    expect(stats.endings).toBe(4);
    expect(stats.chars).toBeGreaterThan(30000); // объёмный сюжет
  });
});

test.describe('Игровой процесс', () => {
  test('новая игра: титул пролога, затем текст рассказчика', async ({ page }) => {
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await expect(page.getByTestId('game')).toHaveClass(/visible/);
    await expect(page.getByTestId('text')).toContainText('День двести сорок первый', { timeout: 15000 });
  });

  test('клик по диалогу продвигает сюжет до первого выбора', async ({ page }) => {
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await expect(page.getByTestId('text')).toContainText('двести сорок первый', { timeout: 15000 });
    for (let i = 0; i < 30; i++) {
      if (await page.locator('#choices.visible button').count()) break;
      await page.locator('#dialogue').click();
      await page.waitForTimeout(30);
    }
    const btns = page.locator('#choices.visible button');
    await expect(btns.first()).toBeVisible();
    expect(await btns.count()).toBe(2);
    await expect(btns.first()).toContainText('Идти сегодня');
  });

  test('выборы меняют характеристики (доверие Ани)', async ({ page }) => {
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c1_5'));
    const before = await page.evaluate(() => window.game.getState().state.trust);
    await page.locator('#choices.visible button').first().click(); // «поднять руки» +2 доверия
    const after = await page.evaluate(() => window.game.getState().state.trust);
    expect(after - before).toBe(2);
  });

  test('условная развилка: при высоком доверии Аня сама зовёт с собой', async ({ page }) => {
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c1_split', { trust: 3 }));
    await page.locator('#dialogue').click();
    await expect.poll(() => page.evaluate(() => window.game.nodeId())).toBe('c1_ask_hi');

    await page.evaluate(() => window.game.jump('c1_split', { trust: -2 }));
    await page.locator('#dialogue').click();
    await expect.poll(() => page.evaluate(() => window.game.nodeId())).toBe('c1_ask_lo');
  });

  test('сохранение и «Продолжить» восстанавливают позицию', async ({ page }) => {
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c2_fire2', { love: 3, trust: 2 }));
    await page.reload();
    await expect(page.getByTestId('btn-continue')).toBeEnabled();
    await page.getByTestId('btn-continue').click();
    await expect.poll(() => page.evaluate(() => window.game.nodeId())).toBe('c2_fire2');
    const st = await page.evaluate(() => window.game.getState().state);
    expect(st.love).toBe(3);
  });
});

test.describe('Концовки', () => {
  test('полное прохождение (первые варианты) приводит к «РАССВЕТ»', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await autoPlay(page);
    await expect(page.getByTestId('ending-title')).toHaveText('РАССВЕТ');
    // концовка открылась в галерее
    await page.getByTestId('btn-ending-menu').click();
    await page.getByTestId('btn-endings').click();
    await expect(page.locator('#endings-list li.unlocked')).toHaveCount(1);
    await expect(page.locator('#endings-list li.unlocked')).toHaveText('РАССВЕТ');
  });

  test('скрытый укус при холодных отношениях ведёт к «ЦЕНА»', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c5_4', { bitten: true, hid_bite: true, love: 0, trust: 0 }));
    await autoPlay(page);
    await expect(page.getByTestId('ending-title')).toHaveText('ЦЕНА');
  });

  test('скрытый укус даже после прощения ведёт к «ЦЕНА»', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c5_4', { bitten: true, hid_bite: true, love: 9, trust: 9 }));
    await autoPlay(page);
    await expect(page.getByTestId('ending-title')).toHaveText('ЦЕНА');
  });

  test('честность без антисептика не спасает: «ЦЕНА»', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c5_4', { bitten: true, told_bite: true, love: 8, trust: 5 }));
    await autoPlay(page);
    await expect(page.getByTestId('ending-title')).toHaveText('ЦЕНА');
  });

  test('обработанный укус + скрытность при холоде ведут к «ПУСТОТА», а не к смерти', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c5_4', { bitten: true, hid_bite: true, self_treated: true, love: 0, trust: 0 }));
    await autoPlay(page, { choose: async () => 1 });
    await expect(page.getByTestId('ending-title')).toHaveText('ПУСТОТА');
  });

  test('низкая близость и отказ бороться ведут к «ПУСТОТА»', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c5_4', { love: 0, trust: 0 }));
    await autoPlay(page, { choose: async () => 1 }); // «Кивнуть. Каждый выживает, как умеет.»
    await expect(page.getByTestId('ending-title')).toHaveText('ПУСТОТА');
  });

  test('выбор заправки ведёт к «ОГОНЁК»', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(FAST);
    await page.getByTestId('btn-new').click();
    await page.evaluate(() => window.game.jump('c5_choice', { love: 6, trust: 3 }));
    await autoPlay(page, { choose: async () => 1 }); // «К Семёнычу»
    await expect(page.getByTestId('ending-title')).toHaveText('ОГОНЁК');
  });
});
