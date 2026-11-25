# Mascot — the HelloWorld.ie bot, in motion

A small, dependency-light animation engine for the HelloWorld.ie bot. The
character (SVG head, eye layout, colours) is **data**; the engine, expressions
and "life" loops are **character-agnostic** — so you can drop in another head
and everything keeps working.

Built on [GSAP](https://gsap.com). That's the only runtime dependency.

> **Wiring this into a product (or an AI doing so)?** Read **`AGENTS.md`** — the
> full motion brief: when to use each performance, the motion philosophy, the
> blink model, and the rules for authoring new motions. **`manifest.json`** is the
> same catalogue, machine-readable.

```
mascot/
├── index.js                  barrel export
├── mascot.js                 core engine (DOM, layout, rest pose, type, driver)
├── expressions.js            all expressions/actions as GSAP timelines + AROUSE map
├── life.js                   resting moods (still/calm/float) + human blink scheduler
├── mascot.css                scoped styles (.mascot …) driven by CSS vars
├── characters/
│   └── helloworld.js         the HelloWorld.ie bot — SVG, geometry, colours
├── manifest.json             machine-readable catalogue (categories, semantics, params)
├── AGENTS.md                 AI integration & motion guide (the full brief)
└── demo.html                 the playground (buttons + sequence runner)
```

## Install / load

**ES modules (recommended).** Load GSAP first (global or your own bundle), then import:

```html
<link rel="stylesheet" href="mascot/mascot.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script type="module">
  import { Mascot, helloworld } from './mascot/index.js';
  const bot = new Mascot({ mount: '#bot', character: helloworld });
  window.bot = bot;
</script>

<div id="bot" style="width:320px"></div>   <!-- you size the mount; the bot fills it -->
```

In a bundler (Vite/webpack/Next) it's the same import; pass your own GSAP if you
don't expose it globally:

```js
import gsap from 'gsap';
import { Mascot, helloworld } from './mascot';
const bot = new Mascot({ mount: el, character: helloworld, gsap });
```

## Roam — drifting a larger canvas

By default the bot fills its mount and `float` drifts it *in place*. To let him
travel a bigger space (a hero, an empty state, a loading screen), give him a
**roam container** — he'll be whatever size his mount is, and the whole mascot
glides around the container with the same pulse-glide propulsion:

```js
const bot = new Mascot({
  mount: '#bot',                       // a small mount, e.g. 120px
  character: helloworld,
  mood: 'float',
  roam: { within: '#canvas', padding: 16 },   // travels this element, 16px inset
});
```

Switching to `calm`/`still` glides him gently back to centre; expressions still
fire mid-roam (he stops where he is, emotes, then resumes). See `scene.html` for
a live large-canvas example. Omit `roam` and `float` stays the in-place drift.

## API

```js
const bot = new Mascot({
  mount:     '#bot' | HTMLElement,   // required — the bot fills this element (it's square)
  character: helloworld,             // required — a character spec
  gsap:      window.gsap,            // optional — defaults to window.gsap
  mood:      'calm',                 // 'still' | 'calm' | 'float'   (default 'calm')
  autoblink: true,                   // scatter natural blinks through run() sequences
  typeSpeed: 82,                     // ms per character while typing
  roam:      { within:'#canvas', padding:16 },  // optional — float drifts a larger container
  onStatus:  (text) => {},           // optional — status string for your UI
});

await bot.play('happy');             // one expression
await bot.play('excited & "Found it!"');  // expression + typing, together
await bot.run('thinking, "Loading…", happy, wave & "Bye!"');  // a sequence
await bot.type('HelloWorld.ie');     // just type a string (cursor = the eye)
await bot.blink('double');           // 'light' | 'medium' | 'strong' | 'double' | n
bot.setMood('float');                // change resting behaviour
bot.expressions;                     // → ['happy','excited',…] available names
bot.destroy();                       // tear down + remove listeners
```

### Command grammar (used by `play` and `run`)

| Token | Does |
|---|---|
| `happy`, `excited`, … | play a named expression/action |
| `"Found it!"` | type that string (the eye flies in and becomes the cursor) |
| `text "Found it!"` | same; the `text ` prefix is optional |
| `blink` / `blink light` / `blink strong` / `blink double` / `blink x3` | graded blinks |
| `a & b` | run both **at once** — e.g. `celebrate & "Sounds great!"`. Neither is cut short; the shorter just waits. |

`run()` takes a comma- or newline-separated string (commas inside quotes are
safe) or an array of tokens.

## Expressions & actions

`happy` · `excited` · `celebrate` · `laugh` · `idea` · `thinking` · `curious` ·
`surprise` · `scan` · `look` · `wave` · `peek` · `spin` · `dizzy` · `shy` ·
`determined` · `sad` · `sleep` · `yes` · `no` · `blink`

Every motion drives three layers for life-like weight, not a rail-bound slide:

- **EYE** — the two eyes (look / squint / widen)
- **GRP** — the head group (primary motion)
- **BOT** — the whole icon (secondary follow-through + a slight tilt)

## Resting moods

| Mood | Behaviour |
|---|---|
| `still` | near-stationary; only the odd slow blink (~7 blinks/min) |
| `calm` | gentle breathing + occasional eye darts (default, ~10/min) |
| `float` | drifts around the scene; eyes + a faint tilt lean toward travel, scaled by speed; gets "bored" between moves |

**Blinking is modelled on humans:** irregular, clustered timing (drawn from an
exponential distribution) around a relaxed baseline, and an `arousal` value that
rises after energetic expressions or fast float-moves — briefly increasing the
blink rate — then decays back. Calming actions (sad, sleep) lower it.

Before any action, the bot **glides back to its rest pose** first, so a mid-float
position never throws the animation's timing or alignment off.

## Adding a new character

Copy `characters/helloworld.js` and change the data. Nothing else needs to know.

```js
export const myChar = {
  id: 'mychar',
  viewBox: '0 0 306 306',
  head: {
    transform: 'translate(0,0)',           // nudge art so eyes/screen line up
    paths: [ { fill:'head', d:'M…' } ],     // fill: 'head' | 'eye' | any CSS colour
  },
  colors: { head:'#262430', eye:'#6d44e0', type:'#6d44e0', accent:'#6d44e0' },
  geom: {
    transformOrigin: '50% 56%',             // pivot for whole-icon motion
    screen: { x:0.235, yCenter:0.505, w:0.53, h:0.235, fontScale:0.82 },  // typed-text area
    eye:    { w:0.072, h:0.19, yCenter:0.505, lx:0.382, rx:0.618 },        // eye size + anchors
    headWidth: 'min(88%,380px)',
  },
  brandSuffix: '.ie',                        // optional accent-coloured suffix while typing
  brandText:   'HelloWorld.ie',
};
```

All geometry is expressed as **ratios of the head's rendered box**, so it scales
to any mount size. The two numbers you'll tune most:

- `geom.eye.yCenter` / `screen.yCenter` — vertical placement (the "ear-line").
- `geom.eye.lx` / `eye.rx` — where the two eyes sit horizontally.

Then `new Mascot({ mount, character: myChar })` and you're done.

## Notes

- **Multiple instances** are fine — everything is scoped per-instance (element
  refs, not global selectors), so several bots can animate on one page.
- **Fonts** — the typed text inherits the host page's font. Load your brand font
  (HelloWorld.ie uses Plus Jakarta Sans) on the page.
- **Reduced motion** — if you want to honour `prefers-reduced-motion`, start in
  `still` and avoid auto-running sequences.
