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
| 1 | `#sec-glance` | *(no eyebrow or title — the chapter mark above is the heading)* | One sheet, and now the whole chapter: an instruction pill, the live readout, then a ribbon braid of all 35 days on the dark panel with the same-clock card and the caveats beside a ranking sortable on five measures. One selection drives all three | 2.1 |
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
`data/life_expectancy.csv` held 15 countries, three of which keep no time diary, so the
intersection was exactly 12. Asking for life expectancy threw away 23 countries whose days
were already in the file. That CSV has since been deleted as unused — Our World in Data
publishes all 35 if the measure is ever wanted back.

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

### `#sec-glance`: the chapter stated before it is argued

Chapter One's three sections build to a finding across roughly five screens. This sheet
puts the finding first, in one screen, and lets the reader interrogate it: a braid of all
35 days, the day card, and a ranking sortable on five measures, with hover previewing,
click pinning, and the picker as a third way in. Built by `js/glance.js`, its own IIFE.

**Every id in it is `gl-` prefixed.** That was load-bearing while `#sec-day` existed:
that section owned `dc-bar`, `dc-rows`, `dc-foot` and `dc-who`, `initDayCard()` resolved
them with an unscoped `document.getElementById`, and this section sits *earlier* in the
document — so sharing the ids would have handed `app.js` the glance card's elements and
left `#sec-day` rendering nothing, with no console error and no clue but an empty card
far down the page. `#sec-day` has since been cut, so nothing collides today, but the
prefix stays: it is what makes the section safe to move, and every lookup in `glance.js`
goes through a helper scoped to the section rather than the document, so a future id
clash elsewhere still cannot reach in.

**The readout carries one computed fact per country.** `#gl-who` is three lines: flag and
name, then the country's one distinguishing fact, then its hours. The middle line used to
be the share of the day already committed (`81% already spoken for`) — the same sentence
for all 35 with only the number changing. It is now whichever measure the country sits
closest to an end of, out of all work, leisure, unpaid, paid, and sleep and self-care,
read through the same accessors the ranking panel sorts on so the sentence cannot
contradict the chart beneath it.

**A country that leads a measure gets an identity, not a rank.** `Works longer than
anyone else`, `Sleeps more than any other country here`, `Has the most leisure time` —
verb-led, with the country as the implied subject. Only near-misses stay in the ranking
register (`Among the longest working days`), which is the honest way to say near the end
of the list but not at it. Five countries hold a first place on this data and so carry an
identity: Mexico, France, Norway, Japan and Italy.

Two knobs, both in `glance.js`:

- **Ties go to the TOP end, then to `FACT_BY` order.** This is load-bearing rather than
  cosmetic. Mexico holds four first places at once — 1st for all work, 1st for unpaid,
  last for leisure, last for sleep — and France holds two, 1st for sleep and last for all
  work. Ranking by nearest-to-an-end alone left France described by what it does least.
  Preferring the top end gives Mexico `Works longer than anyone else` and France
  `Sleeps more than any other country here`, which is what the copy asks for.
- **`RANK_LIMIT = 7`** is where "Among the longest" stops being true. Six countries sit in
  the dead middle on all five measures — the United States is 15th, 22nd, 15th, 15th and
  18th of 35 — and they fall through to the unpaid share of their own working day
  (`Gives 41% of its working day to unpaid work`), which needs no rank and is always
  specific.

Ordinals were tried first and dropped: `5th longest working day` is a table cell, not a
sentence, and `14th least leisure` is worse than saying nothing. The four sentences per
measure are written out rather than assembled, because English will not pluralise them
uniformly — `working day` takes an s, unpaid work wants `workload`, leisure wants `hours`.

**Six of the ten superlatives are unreachable on this data**, because the countries that
hold those extremes win a different measure first: nothing currently prints `Works the
shortest day of all`, `Has the least leisure time of all`, `Carries the heaviest/lightest
unpaid workload` or either `Sleeps less` line. They are kept because the country set has
already been rewritten once in this project's life. Editing one of those strings will look
like it does nothing — that is why.

`Sleeps` is shorthand: the measure is sleep **and self-care**, which carries eating and
washing. The legend under the braid names it in full, and the near-miss line says it
outright.

**The ranking is `.gl-row`, not `.rank-row`, for the same reason in CSS.** `.rank-row` was
the static three-column grid `#work-rank` and `#rest-rank` used, and these rows are
absolutely positioned so they can animate between sort orders — same idea, incompatible
mechanics. Those two charts are gone and `.rank-*` went with them, so the name is free
again; `.gl-row` stays because renaming a working component buys nothing.

**The braid carries a second colour ramp** because it is the one chart on `#1A1A1A`,
where the palette greys collapse into the background and sleep — the largest block of the
day — becomes the hardest to see. `RIB` in `glance.js` is the five hues stepped lighter,
used nowhere else. Text on the bands picks white or black by computed WCAG luminance, and
the band *names* take one neutral rather than their own category colours, which measure
4.42:1 and 3.2:1 there — both under the 4.5 bar for small bold text.

**One number per band, always attributed.** The band widths are the pooled share of all 35
days and cannot follow the selection, because every ribbon's top edge is anchored inside
them. An unattributed percentage there is read as belonging to whatever is pinned: with
Japan selected the pooled 19% over paid work is Japan's 26%. So the label reads
`all 35 · 19%` by default and `Japan 26%` when pinned.

Two smaller things worth not rediscovering:
- The flag row sits *below* the axis, so the hit area and the highlight both extend past
  it; and the flags and rotated names are `pointer-events: none`, because they are painted
  after the hit rect and SVG text takes the pointer over its own glyphs. Without both,
  pointing straight at a flag does nothing.
- Under `rotate(-90)` the local x-axis maps to global −y, so `text-anchor: end` throws
  rotated labels *downward*. The country names run upward into the plot with `start`.

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
- **`#sec-glance`'s standfirst** — its eyebrow, title, rule, lead and body. The chapter mark
  directly above already names the chapter and states its finding, so a second heading and two
  more paragraphs restated it. The instruction pill stays: nothing else tells a reader that the
  panels answer a pointer. The computed 46% / 22% / 70% went with the body, so **the chapter now
  argues qualitatively** — the braid's band figures and the day card carry the numbers, and no
  sentence on the page states a spread. `glance.js` writes every figure slot through a helper
  that skips absent elements, so restoring the copy is enough to bring them back.
- **Chapter One's other four blocks** — `#sec-day`, `#sec-work`, the full-bleed stat band and
  `#sec-rest` — cut as redundant once `#sec-glance` existed: the glance sheet's day card *is*
  `#sec-day`, and its sortable ranking covers what the two rank charts did on fixed measures.
  With them went `initDayCard()`, `renderWorkRank()`, `renderRank()`, `DC_CATS` and the
  `possessive()` helper from `js/app.js`, the `.band` / `.stat` / `.rank` families from
  `css/style.css`, and the four Part 2 entries in `COPY.md` for the prose `initDayCard()` used
  to generate.
  **The one thing that did not survive on its own: the `day` and `day5` badges.** Both were
  earned only by changing the country in `#sec-day`'s picker, so deleting it would have left
  two of the eight unreachable and the collection impossible to finish — with nothing on
  screen to say so. They are wired to the glance sheet's picker now, in `initCountryBadges()`,
  and both hints still read true: it is the first chart on the page, and five countries is
  still five distinct values.
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
- **Chapter One names no source.** Nothing inside `#sec-glance` says where its numbers come
  from. The line that carried it — "OECD Time Use Database, both sexes, average minutes per
  day" — sat in `#sec-day`'s day card caption and went when that section was cut; the braid's
  own caption went later, and it never held a source anyway. The whole chapter is one OECD
  extract and is now cited only in the footer's `Sources` line. The page is not uncited, but
  the chapter is, and cited sources are 15% of the VizCon score. Cheapest fix: a source line
  under the day card, where the three caveats already sit.
- **Unpaid work can no longer be compared by eye.** This is the one real cost of cutting
  `#sec-work`, and it is worth knowing rather than rediscovering. That chart stacked two
  segments from a common left edge, so the unpaid band could be read across all 35 countries
  at a glance. The surviving ranking stacks five, so unpaid is the third segment and its left
  edge sits somewhere different in every row: sorting by Unpaid still orders them correctly
  and prints each value, but the lengths are not visually comparable. If one chart were to
  come back, that is the argument for it.
- **Chapter One is now a single unit.** The chapter is the glance sheet and nothing else. It
  is dense and interactive, but the 195 words of sticky-column argument that `#sec-work` and
  `#sec-rest` carried are gone, and the sheet's own prose is mostly instruction. If the
  chapter reads thin, the fix is prose in the sheet rather than the sections back.
- **The braid is a texture until touched.** At rest 175 ribbons say "35 countries, five
  demands" and little more, and on a page people scroll many readers will never hover. It
  is now the first chart in the chapter, so this matters more than it did. The note under
  it used to concede the point in those words; it now invites the hover instead ("no two
  countries divide their time the same way"), which is better copy but does not change the
  underlying problem.
- **Chapter weight is still uneven**: One holds one unit, Two three, Three one, Four one.
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

### Two dispersion measures — pick one before quoting either

**Not a live problem any more: the page states neither figure.** The Chapter One blurb was
rewritten to "one part of every day changes surprisingly little", and the glance standfirst
that carried 22% and 70% has been cut. This stays because the moment any copy quotes a
spread again, it is the trap.

| Measure | Sleep | Paid work | Ratio |
|---|---|---|---|
| Coefficient of variation, sd/mean | **4.7%** | **16.8%** | **3.57×** |
| Range over mean, (max−min)/mean | **21.9%** | **70.3%** | **3.21×** |

Both come off the same 35 numbers: sleep runs 606–752 minutes on a mean of 665, paid work
177–368 on a mean of 272. CV asks how far the typical country sits from the average; range
over mean asks how far the two extremes sit apart. "Nearly four times as much" is right on
CV and wrong on range; "22% against 70%" is the reverse. Both cannot be quoted in the same
breath, and reconciling them by arithmetic will make one of them wrong.

`spread()` in `glance.js` computes range over mean, because the sentence it used to feed said
"from the shortest country to the longest" and that is the quantity that phrase names. It is
still called, for the braid and the ranking, so those figures are one line of copy away.

### Verified data notes (recomputed at 35 countries, not asserted)
- Sleep and self-care has a **coefficient of variation of 4.7%** between countries; paid work
  **16.8%**, so paid work moves 3.6× as much as the biggest block of the day. At twelve it was
  5.4% against 22.3%, a ratio of 4.2. See the table above before comparing this with the 22%
  and 70% the glance sheet prints — they are a different measure, not a contradiction.
- End to end: sleep **606–752** minutes (range 21.9% of its own mean), paid work **177–368**
  (70.3%), unpaid work **125–256** (66%), leisure **203–354** (52%).
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

## Layouts tried for `#sec-glance`, and why they lost

Nine prototype sheets explored "what does Chapter One look like at a glance" before the
shipped one. **The files are deleted** — the repo carries only shipped work — but the
findings are worth not rediscovering. In git history if ever needed.

- **A tile grid map** of the 35, one cell per country. Dropped as a format, but the reason
  is a standing constraint: there is no geojson, topojson or lat-lon anywhere in this repo,
  only ISO3 codes in `world_population.csv`, and pulling a projection from a CDN breaks the
  rule that every dataset is baked and the page runs offline. Any future map here is a
  hand-placed grid, not a projection.
- **A fan**, angle = share of the day and radius = spread. It broke on `Other`: at 215% of
  its own mean it dwarfed every real category, and neither fix was honest — capping it
  misleads, excluding it stops the pie totalling 100%. Drawn dashed and off-scale in the
  end, which is a workaround, not a design.
- **A screen-time report** and a **counted-cell grid**, both readable and both saying less
  per pixel than the braid.
- **The dark poster** that `#sec-glance` grew from, then **the same poster on the story's own
  palette** with the day card folded in — the one actually ported in.
- Earlier: palette and arrangement trials, a first 35-country pass, and a sheet on the OECD
  Sex column (see Open decisions).

The one general lesson: **a choropleth or a single-measure encoding beats dimming a stacked
bar.** A band worth 13% of the day is about 6px in a 46px tile and starts at a different
offset in every tile, so the eye cannot compare them. That is also why the shipped ranking
cannot be read down a single category — see Known structural problems.

## Data (have it, cited in SOURCES.md)
- Day bars: OECD Time Use, `data/time_use_oecd.csv` → `data/adl-data.js` (35 countries;
  five measures, and a Sex column the page does not yet use).
- Happiness and income: `happiness/`, GDP per person, both in `data/adl-data.js` (34 for
  happiness — Luxembourg has none).
- Connect: `tourism_worldbank/`, `world_population.csv`.
- American detail: `data/time_use_atus/` → `data/atus-hours.js` (share of the population by
  clock hour) and `data/day-us.js` (the whole day itemised into 44 groups, plus a finer
  twelve-group leisure split).
- **Still in the file but unused:** the `dna` / `community_raw` fields in `adl-data.js`,
  which only ever covered twelve countries.
- **Deleted as unused:** `life_expectancy.csv`, `food_meat.csv`, `languages.csv` and
  `gender-split.js`. The raw sources they came from are still cited in SOURCES.md with live
  URLs, so any of them is one download away.

## Open decisions (decide when we reach them)
- Whether to bring life expectancy back as a measure. It was dropped because the file held
  15 countries, not because the data is unavailable — Our World in Data publishes all 35, and
  the URL is in SOURCES.md. Refilling it would restore the fifth rank column and the DNA
  health axis.
- Whether the OECD Sex column becomes a chapter. Men have more leisure in **35 of 35**
  countries (+44 min average) and women do more unpaid work in **35 of 35** (+127 min), yet
  counting both kinds of work together women work more in **31 of 35**. Those figures came
  out of a prototype built on a `gender-split.js` derived from the Sex column of
  `time_use_oecd.csv`, which is still in the repo; both the prototype and the derived file
  are deleted, so this would start from the CSV again.
- Cover photo source.
- Accessibility pass (alt text, contrast) before submission — worth 15%.

## Reference: LEGO "Brick by Brick" viz — ideas to borrow

A Tableau-built vertical scrolly, looked at early for structure. The `LEGO.svg` capture that
these notes were taken from is deleted; the notes are the part that mattered.

Techniques worth stealing (adapted to our palette/theme):

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
