# A Day in the Life of the World — Blueprint

VizCon 2026 · Theme: *How the world lives, thrives, and connects.*
Web (HTML/CSS/JS), scrollytelling, ResMed visual language.

## The idea (locked)
Don't show statistics — show a life. The reader scrolls through **one 24-hour day**,
and the story lives in the **contrast between two countries** shown side by side.
Each section ends on a "huh, I had no idea" beat. Closing multiplies the day's
gap over a lifetime.

## Palette (current — three hues, one tint each)

The day decides the colours; nothing else gets one.

| Token | Hex | Meaning |
|-------|-----|---------|
| `--night` | `#0E1230` | the sky the day starts and ends in: cover, title bar, dark panels |
| `--copper` | `#B87333` | obligation — paid work |
| `--copper-pale` | `#DFB48B` | unpaid work: same substance, drawn thinner |
| `--slate` | `#3D5C80` | rest — sleep and self-care |
| `--slate-pale` | `#8FB0D1` | leisure |
| `--neutral` | `#CEC4B6` | leftovers only |
| `--paper` `--card` `--line` `--ink` `--ink-soft` `--ink-faint` | | the page itself |
| `--copper-deep` `--copper-wash` | | the one instruction pill |

**Warm blocks are what you owe, cool blocks are what is yours.** That rule holds on every
chart of a day.

Rules to keep:
- Every older token (`--blue`, `--purple`, `--indigo`, `--magenta`, `--pink`, `--gold`,
  `--lav-card`) is an alias onto the above. No rule carries its own hex.
- SVG presentation attributes reject `var()`, so `initRightNow()` holds one literal map
  (`HEX`) that mirrors the tokens. If a token changes, change that map too.
- Fig 4.3 gives each country a colour from a **slate → copper ramp ordered by total work**,
  so colour means "how much of the day is spoken for". Never a rainbow. Closest pair is
  India/Japan at a weighted distance of 40, which is the tightest the ramp should get.
- Font: Poppins. Five-stripe top banner survives, now running night → day.

> Original plan was a ResMed-derived blue/purple/indigo palette. Dropped.
- **Font:** Poppins (bold headings, regular body).
- **Palette:** blue `#1e6ef0`, purple `#7b3fe4`, indigo `#3a16a6`, magenta `#c42b8e`, pink `#e51a5e`; lavender card `#ede7fa`; white bg.
- **Signature elements:** 5-color top banner · cover with curved blue panel · lavender data cards with indigo header bar · icon-bar rows (Lucide icons, % above bar, label below) · deep-indigo insight callouts · full-bleed photo "breather" between sections · footnoted sources.
- **Voice:** calm, declarative, present tense. Title = a finding, not a question. Bold inline stats.
- **Motion:** scroll-reveal per section; bars animate width on change.
- **No:** emojis, gradient text, AI-slop clichés.

## Section template (every content section follows this)
1. Finding-title (blue) + rule
2. Lead sentence (purple)
3. Body paragraph with bold inline stats
4. Data card (the visual)
5. Insight callout (the "huh")
6. [optional] photo breather after
7. Source footnote

## Structure as built (index.html, current)

Cover, opener, eleven sections across five chapters, close. Reading order top to bottom.

| # | Anchor | Eyebrow / Title | Visual | Fig |
|---|--------|-----------------|--------|-----|
| — | `.cover` | *A Day in the Life of the World* | 24-hour clock SVG, navy, `76vh`; scrolls away into the fixed `.title-bar` | — |
| — | `#sec-people` | Meet the data / **8 Billion People** | Dot field spelling WORLD, copper = the 12 countries at exactly 48% of dots | 1.1 |
| | | **CHAPTER ONE · How We Live** | | |
| 1 | `#sec-day` | Same clock / **[country] spends its day like this** | Day card: picker, 24h bar, every block with its minutes **and its rank of 12**; prose generated per country | 2.1 |
| 2 | `#sec-work` | The second shift / **Half your waking hours go to work** | Ranked bars, paid + unpaid, 12 countries; insight callout | 3.1 |
| 3 | `.band` | — | Full-bleed stat band: 10h05m · 2–4h · 2h18m | — |
| 4 | `#sec-rest` | Off the clock / **The other half of the day** | Ranked leisure bars | 3.2 |
| | | **CHAPTER TWO · How We Thrive** | | |
| 5 | `#sec-happy` | First measure / **Happiness is a question, not a reading** | Wide strip on the opener's centred layout: 12 marks on the 0–10 ladder, average called out, vertical leaders with tiered labels | 4.1 |
| 6 | `#sec-life` | Second measure / **Life expectancy is the opposite kind of number** | Same strip, second measure | 4.2 |
| 7 | `#sec-ranks` | Nobody leads / **Five measures, five different winners** | Rank slope chart, 12 countries × 5 measures, rank 1–12, colour ramped by total work | 4.3 |
| | | **CHAPTER THREE · Your Closest Match** | | |
| 8 | `#sec-dna` | Find your match / **Somewhere out there, a country lives like you** | Four-question quiz → matched country | 5.1 |
| — | `#sec-now` | Right now / **While you read this** | Live coda: reader's clock, US activity share this hour, 24-hour ribbon with a marker at the current time | 6.1 |
| — | `#sec-close` | **Same hours. Different lives.** | Text payoff, then `.site-footer` sources | — |

### Removed along the way
- **Head to head** (`#sec-compare`), two-country diverging bars.
- **The old "24" hero** in section 1 (`.day-hero`, `renderDayHero`, `DAY_SEGS`), replaced by the day card.
- **The two-measures dot plot** (`#sec-metrics`) and the **life-vs-happiness scatter** (`#sec-thrive`,
  `renderThrive`): the first duplicated what 4.1 and 4.2 now do one at a time, the second plotted the
  two outcomes against each other in a section that claimed to be about effort.
- **The gap test** (`#sec-gap`, `initGapTest`), **Inbound / tourism** (`#sec-connect`) and
  **Same Wallet** (`#sec-insight`, `renderInsight`), with all their CSS.

### Scroll mechanics
- Cover is `--cover-h: 76vh`, so the opener is partly visible on load.
- `.title-bar` (fixed, navy, 52px) slides in over the back half of the cover's exit, driven by `initCoverScroll()`.
- The opener's contents sit in `.sec-exit` and shrink/fade on the way out, driven by `initSectionExit()`.
- Every section carries `.reveal` for scroll-in fade, via IntersectionObserver.

### Known structural problems
- **Chapter Two's blurb no longer matches it.** "Effort is supposed to pay off. The numbers are less
  obedient than that" promised the effort-versus-outcome section that has since been removed. Reword,
  or the chapter opens on a claim it never tests.
- **Chapter weight**: One and Two hold three or four units each; Three holds one.
- **Figure numbers run in sequence** (1.1, 2.1, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 6.1) but the leading digit
  tracks neither chapter nor section — it is just order.
- **`#sec-now` sits outside any chapter**, after Chapter Three's section. It reads as a coda but
  visually belongs to that chapter.
- **Section 1's heading changes with the country** ("Mexico spends its day like this"), so it no longer
  states a finding the way the others do.
- **"8 Billion People" is the only title-cased heading**; the rest are sentence case.
- **Ties in the strips**: Canada and Germany both score 7.03 happiness, China and Mexico both 76.4
  years, so those pairs render as one mark with two labels stacked above it.

### Verified data notes (recomputed, not asserted)
- Sleep and self-care varies **4.7%** between countries; paid work **16.8%**. The biggest block of the day is the one that moves least.
- Unpaid share of all work: Italy 55% → Japan 25%, and it correlates with GDP at **r = 0.05**. Wealth predicts nothing about it.
- Happiness vs GDP **r = 0.79**; vs leisure **0.47**; vs sleep and self-care **−0.41**. Money tracks happiness better than free time does.
- Life expectancy vs happiness across the 12: **r = 0.83**. Japan is the outlier, 1st on one and 10th on the other.
- Total work vs leisure: **r = −0.75**. Real, but with exceptions — Germany rests most while ranking 9th of 12 on work.
- "Half your waking hours go to work" **understates it**: work is 54–73% of the day minus sleep and self-care, mean 61%, across all 35 countries.
- ATUS hourly: unpaid work is **never** the top activity in any of the 24 hours. It peaks at 22.2% at 17:00.

## The scroll (SUPERSEDED — see "Structure as built" above)
- [x] **Dot-field opener** — dense animated field of dots spelling "PEOPLE"; fly-in,
      perpetual drift, hover-bulge, feathered edges, bold blue word. Built in `dotfield.html`
      as a standalone prototype — NOT yet wired into index.html cover.
- [x] **0. Cover** — curved blue panel, "A Day in the Life of the World." (placeholder gradient; dot-field will likely replace/precede it)
- [~] **1. The Day** — 3 bars (Sleep / Work / Leisure) for one country + picker. (done, single-country)
- [x] **2. Two lives, side by side** — two countries' day bars + adaptive callout. ✓
- [x] **3. Work** — ranking of all 12 countries, paid vs unpaid split bars. ✓
- [x] **4. Rest & leisure** — leisure ranking (Italy highlighted). ✓
- [x] **5. Thrive** — life expectancy vs happiness scatter. ✓
- [x] **6. Connect** — tourism arrivals ranking (France highlighted). ✓
- [x] **7. Closing** — "same 24 hours, a different life" text payoff. ✓
      (Note: closing is text-only for now; could add the lifetime dot-field later.)

## Data (have it, cited in SOURCES.md)
- Day bars: OECD Time Use (35 countries; Sleep / Work / Leisure).
- Thrive: life_expectancy.csv, happiness/.
- Connect: tourism_worldbank/, world_population.csv.

## Open decisions (decide when we reach them)
- Which is the opening comparison pair (Japan vs Italy? Mexico vs France?).
- Curated pairs vs. free pick-any-two.
- Cover photo source.
- Accessibility pass (alt text, contrast) before submission — worth 15%.

## Reference: LEGO "Brick by Brick" viz (LEGO.svg) — ideas to borrow

A Tableau-built vertical scrolly. Techniques worth stealing (adapted to our palette/theme):

**Structure**
- One long vertical scroll broken into clear acts (intro → stats → head-to-head → verdict).
- **Head-to-head "vs" spine**: two subjects share a central value axis, each side its own
  colour, narrative columns down the middle. (Great fit for our two-country comparison.)
- Decorative side borders framing the whole page (we'd keep ours subtle/on-brand).

**Chart types seen**
- Winding-"road" timeline with milestone markers (playful history device).
- Speech-bubble callouts for big single numbers (255 colours, 398 themes).
- Donut-ring stat tiles in a grid (colour breakdown).
- Bar-chart RACE (animated, play button) — themes over decades.
- Packed-circle / bubble chart for category sizes.
- Dual-axis vertical comparison with product photos as data points.
- Box-plots for distributions.
- **Radial / spiral bar charts** (concentric arcs) — distinctive alt to flat bars.
- Treemap for part-category composition.

**Tone / UI**
- Hand-drawn arrows & circles as annotations; trophy/emoji-style accents; mascots.
- Big playful display headline; colour-highlighted keywords in body text.
- Verdict/"final" closing card with a warm sign-off.

NOTE: it's maximalist/playful (LEGO brand). Ours is editorial/ResMed — borrow the
STRUCTURE and CHART VARIETY, not the clip-art density.
