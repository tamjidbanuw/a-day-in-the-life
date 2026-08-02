# A Day in the Life of the World — Blueprint

VizCon 2026 · Theme: *How the world lives, thrives, and connects.*
Web (HTML/CSS/JS), scrollytelling, ResMed visual language.

## The idea (locked)
Don't show statistics — show a life. The reader scrolls through **one 24-hour day**,
and the story lives in the **spread across every country that writes the day down**.
Each section ends on a "huh, I had no idea" beat.

> The original locked idea was a **side-by-side contrast between two countries**, and the
> page was built that way first: a picker for each of two countries, diverging bars, a
> closing that multiplied one day's gap over a lifetime. It went because two countries
> cannot show a distribution, and every finding worth printing here turned out to be a
> statement about the whole set — sleep barely moving while paid work moves 3.6× as much,
> four different countries coming first on four measures. One country at a time survives,
> in the day card.

## Palette (current — newsprint: grey does the work, one red has a job)

Chosen from the design lab alongside the margin-notes arrangement. Two tones and an
accent, and the accent marks only the series being argued about.

| Token | Hex | Meaning |
|-------|-----|---------|
| `--ink-deep` | `#1A1A1A` | dark panels: the rank chart, the callouts, the title bar |
| `--accent` | `#C0392B` | the signal red — paid work, and whatever is being argued about |
| `--accent-pale` | `#E8A79F` | unpaid work: same substance, drawn thinner |
| `--support` | `#55595E` | the grey carrying the second series — sleep and self-care |
| `--support-pale` | `#A8ADB3` | leisure |
| `--neutral` | `#C6C6C4` | leftovers only |
| `--paper` `--card` `--line` `--ink` `--ink-soft` `--ink-faint` | | the page itself |
| `--accent-deep` `--accent-wash` | | the one instruction pill |
| `--ink-deep-rgb` `--accent-rgb` `--white-rgb` `--shade-rgb` | | the same colours as triples, for `rgb(... / alpha)` |

**Warm blocks are what you owe, cool blocks are what is yours.** That rule holds on every
chart of a day.

Rules to keep:
- No hex outside the `:root` block. Every older name is an alias onto the above.
- A token holding `#1A1A1A` cannot be given an alpha, which is why the `*-rgb` triples
  exist. `rgba()` literals are how two earlier palettes survived a palette change
  unnoticed: they are invisible to a search for hexes.
- SVG and canvas presentation attributes reject `var()`, so anything drawn asks for the
  value through `token()` rather than keeping a copy. `initRightNow()` builds its `HEX`
  map that way, and `js/dotfield.js` reads `--accent` and `--neutral` the same way.
- Fig 4.2 gives each country a colour from a **grey → red ramp ordered by total work**,
  so colour means "how much of the day is spoken for". Never a rainbow. At 34 countries
  the ramp alone cannot separate the four highlighted lines, which is why each winner's
  name is printed at its own first-place dot.
- Font: IBM Plex Sans.

> Two earlier palettes are gone: a ResMed-derived blue/purple/indigo one, then a
> copper/slate "the day decides the colours" one. Both dropped.

## Section template (every content section follows this)
1. Eyebrow (`.sec-num`), then a finding-title (`.sec-title`) and a rule
2. Lead sentence (`.lead`) — ink, not accent: red marks the series being argued about,
   never a whole paragraph
3. Body paragraph (`.body`) with bold inline stats
4. The visual, in a `.day-card` or a bare stage
5. Caption (`.fig-cap`) — a bold name, then what the chart is and what it excludes
6. [optional] insight callout (`.callout`) on the dark panel — the "huh"
7. [optional] source note (`.source`) where the method needs more than a caption

## Structure as built (index.html, current)

Cover, opener, ten sections across four chapters, close. Reading order top to bottom.
**All 35 countries that keep a time diary**, not the twelve — see "The widening" below.

| # | Anchor | Eyebrow / Title | Visual | Fig |
|---|--------|-----------------|--------|-----|
| — | `.cover` | *A Day in the Life of the World* | 24-hour clock SVG, `--cover-h: 38vh`; scrolls away into the fixed `.title-bar` | — |
| — | `#sec-people` | Meet the World / **8 Billion People** | Dot field spelling WORLD, accent = the 35 countries at exactly 52.5% of dots | 1.1 |
| | | **CHAPTER ONE · Sleep Is the Only Constant** | | |
| 1 | `#sec-day` | Same clock / **[country] spends its day like this** | Day card: picker, 24h bar, every block with its minutes **and its rank of 35**; prose generated per country | 2.1 |
| 2 | `#sec-work` | The second shift / **Half your waking hours go to work** | Ranked bars, paid + unpaid, 35 countries; insight callout | 3.1 |
| 3 | `.band` | — | Full-bleed stat band: 10h05m · 2–4¼h · 2h31m | — |
| 4 | `#sec-rest` | Off the clock / **The other half of the day** | Ranked leisure bars, 35 countries | 3.2 |
| | | **CHAPTER TWO · The Only Number Here That Asks** | | |
| 5 | `#sec-happy` | The one that asks / **Happiness is a question, not a reading** | Wide strip: 34 marks on the 0–10 ladder, average called out, vertical leaders with tiered labels | 4.1 |
| 6 | `#sec-money` | What it tracks / **The softest number has a hard predictor** | Scatter, GDP per person (log) against the ladder, least-squares fit, r printed on the chart | 4.2 |
| 7 | `#sec-ranks` | Nobody leads / **No Country Wins Everything** | Rank slope chart, 34 countries × 4 measures; the four that come first are drawn, the other 30 ghosted until hovered | 4.3 |
| | | **CHAPTER THREE · One Country Writes Everything Down** | | |
| 8 | `#sec-leisure` | Every minute / **One country writes down all 1,440 minutes** | Three cards: the day as one stacked bar, 44 activities grouped under the five blocks, then four activities by age band; plus two callouts | 5.1 |
| | | **CHAPTER FOUR · Somebody Lives Like You** | | |
| 9 | `#sec-dna` | Find your match / **Somewhere out there, a country lives like you** | Four-question quiz → matched country, across all 35 | 6.1 |
| — | `#sec-now` | Right now / **While you read this** | Live coda: reader's clock, US activity share this hour, 24-hour ribbon with a marker at the current time | 7.1 |
| — | `#sec-close` | **Same hours. Different lives.** | Text payoff, then `.site-footer` sources | — |

### The widening (12 → 35, and life expectancy dropped)

One line in `js/app.js` used to keep only countries with life expectancy **and** happiness
**and** tourism, and that condition is what made this a story about twelve countries.
`data/life_expectancy.csv` holds 15 countries, three of which keep no time diary, so the
intersection was exactly 12. Asking for life expectancy threw away 23 countries whose days
were already in the file.

- **`COUNTRIES` now requires a day** — 35. `HAPPY_COUNTRIES` is the 34 with a ladder score;
  Luxembourg keeps a diary and has none. Charts that need happiness filter for themselves
  and say `n=34` in their own caption rather than making every other chart pay for it.
- **Life expectancy is gone as a measure.** `#sec-life` and its dot plot went with it, and
  the rank chart dropped from five measures to four.
- **Chapter Two changed question.** It used to hold two scores of a life, one counted and one
  asked, and note that they agreed. Now it follows the asked one with the hardest thing that
  predicts it: GDP per person, present for all 35 and never previously used, at r = +0.91.
- **The quiz was rebuilt.** Its axes were time, health, community and connectedness, scored
  in a `dna` object baked into `data/adl-data.js` for twelve countries only. Two of those axes
  could not be rebuilt for the other 23 — health *was* life expectancy, and community came
  from World Happiness Report sub-scores the file does not carry outside the twelve. The axes
  are now free time, rest, income and openness, and the scores are computed at load as
  percentiles across all 35. `dna` and `community_raw` are left in the data file, unused.
- **A badge was swapped, not lost.** *Amateur Actuary* (life expectancy) became *Off the Line*
  (the money-and-mood scatter). Still eight.
- **Population share moved 47.9% → 52.5%**, because the twelve already held China, India and
  the United States. `SHARE` in `js/dotfield.js` and the opener caption both follow it.

### Chapter Three: the one section that leaves the OECD file

Every other chart treats the day as five numbers, because the OECD file has five measures and
no more. ATUS publishes **431 activity codes**, so for exactly one of the 35 countries every
block can be taken apart, not just leisure.

`data/day-us.js` rolls all 431 codes up to the survey's **own second tier** of grouping — its
hierarchy, not one invented here — and files each group under the same five blocks the OECD
charts use, from 170,842 weighted respondent diaries, 2003–2015. Nothing is dropped: the 44
groups sum to 1,440 minutes, and that identity is the file's own check on itself.

Three editorial layers sit on top, all of them stated in the data file's header:
- religion, volunteering and phone calls are kept whole, because splitting them yields four
  groups of two minutes and serves nobody;
- the survey's group names are written for coders, so they are reworded;
- groups under two minutes a day are pooled into one "Everything else" row per block, with the
  count of what went in carried in `rest`.

The file also keeps a finer **leisure** split at six-digit level, because the television figure
needs codes the tier-2 spine does not reach.

**Do not read these totals against the OECD bars elsewhere on the page.** The two surveys draw
the boundaries differently and neither is wrong: ATUS counts travel as its own activity where
the OECD folds it into whatever the travel was for, which is why "travel and the rest" is 1h31
here against the OECD's 21 minutes for the United States. Both captions say so.

**Bars in the itemised panel are scaled within their block, not across the day.** Sleeping is
8h40 and commuting is 17 minutes; one shared scale draws thirty of the forty-four groups as a
hairline. The block totals in the panel above carry the cross-block comparison.

### Removed along the way
- **Head to head** (`#sec-compare`), two-country diverging bars.
- **The old "24" hero** in section 1 (`.day-hero`, `renderDayHero`, `DAY_SEGS`), replaced by the day card.
- **The two-measures dot plot** (`#sec-metrics`) and the **life-vs-happiness scatter** (`#sec-thrive`,
  `renderThrive`): the first duplicated what 4.1 and 4.2 then did one at a time, the second plotted the
  two outcomes against each other in a section that claimed to be about effort.
- **The gap test** (`#sec-gap`, `initGapTest`), **Inbound / tourism** (`#sec-connect`) and
  **Same Wallet** (`#sec-insight`, `renderInsight`), with all their CSS.
- **Life expectancy** (`#sec-life`, its strip config, the `Life exp.` rank column, the DNA `health`
  axis and the *Amateur Actuary* badge) — see "The widening" above.
- **Section 1's own two-column grid** (`.dc-grid`, `.dc-txt`, and the
  `.section.notes > .fig-cap { grid-column: 1 / -1 }` that went with it). The section brought its own
  grid and `.notes` flattened it with `display:contents` so its halves became the notes columns. That
  worked for the columns and broke the sticky note: with the `.dc-grid` box gone the sticky column's
  containing block was the whole section, which included the row holding the caption, so on scroll
  the note slid 142px past the card and parked the instruction pill on top of the caption. It now
  uses the same `.txt` and `.viz` children as every other `.notes` section, caption inside `.viz`.
  **This is worth remembering as a class of bug**: `display:contents` removes the box that
  `position:sticky` would have been constrained by, and the symptom only appears once the section is
  scrolled — measuring the page at scroll 0 finds nothing wrong.

### Scroll mechanics
- Cover is `--cover-h: 38vh`, so the opener is well up the screen on load. `min-height`, not
  `height`, so a short screen pushes the band taller instead of cutting the title off.
- `.title-bar` (fixed, 52px) slides in over the back half of the cover's exit, driven by
  `initCoverScroll()`, which measures the cover with `offsetHeight` and so rescales itself.
- The opener's contents sit in `.sec-exit` and shrink/fade on the way out, via `initSectionExit()`.
- Every section carries `.reveal` for scroll-in fade, via IntersectionObserver.

### Known structural problems
- **Chapter weight is still uneven**: One holds four units, Two three, Three one, Four one.
- **Figure numbers are not printed** — captions are name-only. The `Fig` column in the table above
  is a reference for this document, nothing the reader sees. The old numbering ran 1.1–6.1 in
  plain order, tracking neither chapter nor section, and was never cited in the prose.
- **`#sec-now` sits outside any chapter**, after Chapter Four's section. It reads as a coda but
  visually belongs to that chapter.
- **Section 1's heading changes with the country** ("Mexico spends its day like this"), so it does
  not state a finding the way the others do.
- **"8 Billion People" is the only title-cased heading**; the rest are sentence case.
- **Ties on the happiness strip**: three pairs now share a score — Australia/Austria at 7.16,
  Canada/Germany at 7.03, Croatia/Poland at 6.12 — so each pair renders as one mark with two
  labels stacked above it. Went from one tie to three when the sample widened.
- **The rank chart cannot be read at rest without help.** 34 lines at equal weight is a texture,
  not a chart. Handled by drawing only the four countries that come first and ghosting the other
  30, with each winner named at its own first-place dot; hovering or picking still isolates any
  of the 34. Worth revisiting if a better encoding turns up.

### Verified data notes (recomputed at 35 countries, not asserted)
- Sleep and self-care varies **4.7%** between countries; paid work **16.8%**, so paid work moves
  3.6× as much as the biggest block of the day. At twelve it was 5.4% against 22.3%, a ratio of 4.2.
- More of the day goes to unpaid work than paid in **4 of 35**: Australia, Italy, Poland, Spain.
  It was 3 of 12, so the finding got rarer, not commoner — 11% rather than 25%.
- Unpaid share of all work: Italy 55% → Japan 25%, and it correlates with GDP at **r = 0.05**
  across all 35. Wealth predicts nothing about it.
- Happiness vs **log** GDP: **r = +0.91**, n = 34 — the strongest relationship in the story, and
  stronger than the life-expectancy-vs-happiness r = 0.83 the old Chapter Two rested on at n = 12.
  Raw GDP gives 0.79; the log is not cosmetic.
- Happiness vs leisure **r = 0.48**; vs sleep and self-care **−0.41**. Money tracks happiness far
  better than free time does.
- Total work vs leisure: **r = −0.74**. Real, but with exceptions — Norway rests most while
  ranking 22nd of 35 on work.
- "Half your waking hours go to work" **understates it**: work is 54–73% of the day minus sleep
  and self-care, mean 61%.
- The four that come first on the four rank measures: **Mexico** work, **France** sleep,
  **Norway** leisure, **Finland** happiness. Nobody finishes first twice.
- Widest leisure gap is **2h31m**, Norway to Mexico. Unpaid work adds **2h05 to 4h16** a day.
- The 35 hold **52.5%** of world population; the twelve held 47.9%. Tripling the countries bought
  4.6 points, because the twelve already had China, India and the United States.
- ATUS hourly: unpaid work is **never** the top activity in any of the 24 hours. It peaks at
  22.2% at 17:00.
- ATUS whole day, all 431 codes → 44 groups → **1,440 minutes exactly**: sleep, meals and
  self-care **44.0%**, leisure **21.9%**, paid work and study **15.7%**, unpaid work **12.1%**,
  travel and the rest **6.3%**.
- The single biggest activity is **sleeping, 8h40**. Working is **3h16**, relaxing (television,
  reading, games) **3h50**, and commuting only **17 minutes**.
- ATUS leisure: television is **2h43**, or **54.6%** of all American leisure — more than the other
  eleven kinds put together. Reading takes 20m, sport 18m, going out 5m.
- Across age bands, working falls **4h23 → 15m** from the 45–54s to the over-75s, which hands back
  **4h08 a day**. Television takes **41%** of it, reading **19%**, sleep **20%**. Childcare is the
  one curve with a peak rather than a slope: **51m at 25–34**. Sleep barely moves at any age,
  8h19 to 9h18.
- ATUS by sex: men work **1h14** more a day; women do **1h08** more cleaning, laundry and cooking
  and **16m** more childcare; men take **34m** more relaxing and **11m** more sport. The OECD's
  35-country gender finding shows up inside one country's diaries.

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
- Day bars: OECD Time Use, `data/time_use_oecd.csv` → `data/adl-data.js` (35 countries;
  five measures, and a Sex column the page does not yet use).
- Happiness and income: `happiness/`, GDP per person, both in `data/adl-data.js` (34 for
  happiness — Luxembourg has none).
- Connect: `tourism_worldbank/`, `world_population.csv`.
- American detail: `data/time_use_atus/` → `data/atus-hours.js` (share of the population by
  clock hour) and `data/day-us.js` (the whole day itemised into 44 groups, plus a finer
  twelve-group leisure split).
- **Unused:** `data/life_expectancy.csv` (15 countries, dropped as a measure), and the
  `dna` / `community_raw` fields in `adl-data.js` (twelve countries only).

## Open decisions (decide when we reach them)
- Whether to refill `life_expectancy.csv` for all 35 from Our World in Data and bring the
  measure back. It was dropped because the file was short, not because the data does not exist.
- Whether the OECD Sex column becomes a chapter. Men have more leisure in **35 of 35**
  countries (+44 min average) and women do more unpaid work in **35 of 35** (+127 min), yet
  counting both kinds of work together women work more in **31 of 35**. Sampled in
  `gender-lab.html`.
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
