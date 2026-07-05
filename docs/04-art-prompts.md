# Промпты для генерации арта

Игра автоматически подхватывает PNG из `assets/` (см. `assets/README.md`);
если файла нет — используется встроенный SVG. Имена файлов — строго как указано.

**Технические требования:**
- Фоны: PNG **1920×1080** (16:9), без людей в кадре, без текста/вотермарок.
- Персонажи: PNG **с прозрачным фоном**, вертикальные ~900×1600, в полный рост.
  Если генератор не умеет прозрачность — ровный тёмно-серый фон + remove.bg.
- Эмоции одного персонажа генерируй одной серией (same seed / character reference).

**Якорь стиля** — добавляй к каждому промпту:

> — dark moody digital painting, muted desaturated palette, cinematic volumetric lighting, post-apocalyptic Eastern European atmosphere, melancholic, detailed, no text, no watermark

---

## Персонажи (assets/portraits/)

### `anya.png` — Аня, нейтрально-настороженная
> Full body visual novel character sprite, standing, slight 3/4 view, young Slavic woman age 27, former music teacher turned survivor, long dark chestnut hair slightly messy, tired wary hazel eyes, pale face, dark grey wool coat over layered clothes, burgundy knitted scarf, worn black boots, fingerless gloves, guarded neutral expression with tightly pressed lips, soft warm rim light from the right, isolated on transparent background, PNG

### `anya_sad.png` — та же, грусть
> Same character, same outfit and pose — expression changed to quiet grief: eyes glistening with held-back tears, brows drawn together, looking slightly down, isolated on transparent background, PNG

### `anya_smile.png` — та же, мягкая улыбка
> Same character, same outfit and pose — expression changed to a small tender reluctant smile, warmth in the eyes, like smiling for the first time in months, isolated on transparent background, PNG

### `semyon.png` — Семёныч
> Full body visual novel character sprite, standing, slight 3/4 view, weathered Russian man in his mid 60s, gas station keeper, grey stubble beard, deep wrinkles, kind but stern squinting eyes, old olive-brown padded work jacket (vatnik), dark knitted hat, heavy boots, rough working hands, faint amused half-smile, double-barreled shotgun slung on shoulder, soft warm rim light from the right, isolated on transparent background, PNG

### `dym.png` — пёс Дым *(опционально: спрайт пока не подключён — скажи, подключу)*
> Character sprite of a lean reddish-brown mongrel dog, medium size, ribs slightly visible, torn canvas leash stub on collar with small brass tag, standing alert with ears up, intelligent watchful eyes, scruffy fur, slight rim light, isolated on transparent background, PNG

---

## Фоны (assets/bg/), все 16:9, без людей

### `apartment.png` — квартира Марка
> Interior of an abandoned soviet-era apartment at grey dawn, window taped with X-shaped duct tape crosses overlooking a dead city skyline, hundreds of small pencil tally marks scratched on faded wallpaper counting days, mattress with sleeping bag on the floor, old radio with antenna on a cabinet, single burning candle, dust motes in a weak beam of morning light

### `street.png` — мёртвый проспект
> Dead empty city avenue eight months after evacuation, abandoned rusty cars with open doors, overturned bus in the distance, grass growing through cracked asphalt, sagging power lines with crows, faded billboard, grey ash drifting in the air, thick fog between dark buildings with broken windows, oppressive silence

### `pharmacy.png` — аптека
> Interior of a looted pharmacy at night, dim green cross sign still faintly glowing, ransacked shelves with scattered pill blisters and boxes, overturned metal shelf, broken glass on tiled floor, single flashlight beam cutting through darkness and dust from a doorway

### `road.png` — загородная дорога
> Empty rural highway at gloomy dusk, cracked asphalt receding into fog, dead leafless trees, crashed car in a ditch, endless fields under heavy low clouds, tilted power line poles with sagging wires, flock of crows in the dark sky

### `gas.png` — заправка Семёныча
> Small abandoned soviet gas station at dusk, rusty fuel pumps under a holed canopy, boarded-up cashier window, old АЗС-style sign pole with broken letters, oil drum, spare tire on the ground, dark forest line on the horizon, moody overcast evening light

### `fire.png` — костёр ночью
> Campfire burning in a metal barrel at night behind a gas station, warm orange glow against cold darkness, sparks rising, log bench and two backpacks near the fire, cooking pot on a tripod, silhouettes of pine trees, starry sky with a pale moon behind torn clouds

### `library.png` — библиотека
> Interior of an old stalinist-era library at night, tall arched window with a column of moonlight, endless dark bookshelves with a few colorful book spines, books scattered on the floor, an upright piano uncovered in the corner, burning candle on a desk, dust floating in the moonbeam

### `school.png` — школа №42, класс музыки / актовый зал
> Interior of an abandoned soviet school music classroom at dawn, dim grey light through tall dusty windows, small chairs arranged in rows for children, an old chalkboard with faded children's chalk writing, music stands fallen over, a portrait frame askew on the wall, dust and silence, heartbreaking emptiness

### `yard.png` — двор с качелями (семья)
> Overgrown private house yard at grey dusk, old rusty swing set in the foreground, a long-abandoned dinner table under the open sky with oilcloth grown into the tabletop, tilted wooden fence, clothesline with weathered rags, dark house with blue window frames in the background, cold wind mood, dread and stillness, no people visible

### `hospital_out.png` — больница снаружи
> Nine-story abandoned soviet hospital at night in heavy rain, dark broken windows with two faintly glowing green emergency lights, bedsheet ropes hanging from a third floor window, half-destroyed red cross sign, barricade of ambulances at the entrance, lonely gurney in a puddle, ominous atmosphere

### `hospital_in.png` — коридор больницы
> Dark abandoned hospital corridor in flashlight beam perspective, doors ajar into blackness, tilted ceiling lamps hanging on wires, overturned wheelchair and IV stand, scattered medical papers, old dark stains on linoleum floor, peeling walls, claustrophobic dread

### `bridge.png` — мост
> Large abandoned cable-stayed bridge over a grey river in thick fog, rusty pylons and cables, abandoned military checkpoint in the middle with sandbags and a raised barrier, stalled truck, dark city skyline dissolving in mist on the far bank, cold wind mood

### `dawn.png` — рассвет на севере (финал)
> First warm sunrise over northern hills after a long journey, golden sun rising through haze, winding road leading down into a valley with distant watchtowers, thin smoke from chimneys and two tiny warm lights of a survivor camp, first snow on the hills, hopeful yet melancholic

### `menu.png` — главное меню *(опционально)*
> Lone dark silhouette of a city skyline under an enormous grey sky, single ray of light breaking through heavy clouds, ash falling like snow, vast emptiness, space for a game title in the upper third of the frame

---

После генерации: файлы в `assets/portraits/` и `assets/bg/`, `git add`, commit, push —
GitHub Pages подхватит. Если какой-то арт выбивается по яркости/стилю — можно
подогнать CSS-фильтром, не перегенеривая.
