# A Day in the Life of the World

A scrollytelling data story about how 35 countries spend the same 1,440 minutes.
**VizCon 2026 entry.** Theme: *How the world lives, thrives, and connects.*

Open `index.html` in a browser. That is the whole build step — there isn't one.

---

## Running it

No dependencies, no bundler, no server. Static HTML, CSS and vanilla JS, and it runs
from `file://` on purpose: everything the page loads is baked into JS files rather than
fetched, because `fetch` is blocked on the `file://` protocol and a judge should be able
to double-click the file and have it work.

```text
index.html          the whole page, in reading order
css/style.css       one stylesheet
js/app.js           charts, the badge system, the drill-down, the live coda
js/glance.js        the Chapter One at-a-glance sheet
js/dotfield.js      the population dot field in the opener
data/*.js           the data, baked from the raw sources
```

## What's in it

Four chapters and a coda, each ending on a finding rather than a summary:

1. **Sleep Is the Only Constant** — 35 countries' days side by side. Paid work moves
   3.6× as much as sleep does.
2. **The Only Number That Asks** — the happiness ladder, the one measure that asks
   people instead of counting them. Then: no country finishes first on more than one of
   four measures.
3. **Inside an Ordinary Day** — the American day opened to the minute. Five blocks,
   fifty activities, every one splittable by age and sex, summing to exactly 1,440.
4. **Somebody Lives Like You** — four dials, and the country whose day is nearest yours.
5. **Right Now** — the only live thing on the page: what America is doing at your
   current local hour.

Six discoveries are hidden in the charts and awarded as badges, each carrying a figure
that appears nowhere else on the page.

## Data

See [`data/SOURCES.md`](data/SOURCES.md) for every dataset, its publisher, its URL, and
whether the story actually reads it. In short: OECD Time Use for the spine, the World
Happiness Report for the ladder, World Bank for GDP and arrivals, and American Time Use
Survey microdata (170,842 respondents, 2003–2015) for Chapter Three and the coda.

The copy deck lives in [`COPY.md`](COPY.md) — every string on the page, in reading
order, round-trippable back into the source. [`PLAN.md`](PLAN.md) is the blueprint,
including the ideas that were tried and cut.

---

## How GenAI was used

This project was built in close collaboration with **Claude** (Anthropic), used as a
working partner across the whole build rather than for one isolated task. Being specific
about that, since a vague "AI was used" tells a reader nothing:

**Code generation — the large majority of the code.** All five source files were written
primarily by Claude, iteratively, in conversation: the SVG chart rendering, the badge
system with its flight-and-reveal animation, the Chapter Three drill-down, the
scroll-driven cover, the quiz's nearest-neighbour matching, and the entire stylesheet.
The long explanatory comments throughout the source are part of that process — the
reasoning behind a decision was written down at the moment it was made, which is why the
files read the way they do.

**Data discovery and cleaning.** Rolling 431 ATUS activity codes up to the survey's own
second tier and getting 44 groups to sum to exactly 1,440 minutes; reconciling
country-name mismatches across five datasets with different conventions; deciding which
of the gathered files to drop once the story's shape settled. The build scripts were
throwaway and are not committed — the baked outputs are, with provenance headers.

**Narrative drafting and insight generation.** Claude proposed candidate findings from
the data, and the ones that survived are the ones that held up when checked. Several did
not: an income-and-mood argument was cut for overclaiming, and a two-country contrast —
the original locked concept — was cut because two countries cannot show a distribution.
`PLAN.md` records those reversals.

**Editing and verification.** Line-by-line copy editing, and adversarial checking of the
page against itself: figures in prose re-derived from the data files, contrast ratios
computed, the copy deck round-tripped against the rendered DOM, and behaviour probed in
headless Chrome. That last one caught real bugs, including a stray `*/` that had been
silently disabling a chart's entrance animation and an animation keyframe that made the
badge rail jump half its own height.

**What was not delegated.** Every figure that appears in the prose was verified against
the source data before it shipped, and where a claim could not be substantiated it was
cut rather than softened. The editorial judgment — what the story argues, what earns a
chapter, what gets deleted — was directed throughout, and AI-proposed findings were
rejected more often than they were kept. The commit history is the honest record of
that: every commit states what changed and why, including the reversals.

## Accessibility

Accessibility was treated as part of the visualization rather than a pass at the end,
along the lines of [Amy Cesal's five
suggestions](https://www.storytellingwithdata.com/blog/accessible-data-viz-is-better-data-viz):

- **Descriptive labels, not filenames.** Every chart is an `<svg role="img">` or a
  `<canvas role="img">` with an `aria-label` that states the chart type *and its point*,
  generated from the data so it cannot drift from what is drawn — e.g. the age split
  announces its own range, "from 9h18 at 15–24 to 8h19 at 45–54".
- **Takeaway titles.** Chapter names and section titles carry the finding, not the
  subject: "No Country Wins Everything", "Sleep Is the Only Constant".
- **Direct labelling over legends.** Country names sit on their marks with vertical
  leaders rather than in a colour key, so nothing has to be matched back and forth. The
  charts that do need a key place it adjacent to the marks it explains.
- **Contrast, measured.** The palette is checked against WCAG AA: `--ink-faint` was
  darkened from `#83868A` (3.56:1 — failing) to `#6B6E72` (4.99:1 on paper, 4.57:1 on
  the card tone), since that token carries small type like captions and axis ticks.
- **White space as a separator.** Blocks in the day bar and the drill-down are divided
  by gaps, not by colour alone, so the sections stay distinguishable without relying on
  hue discrimination.

Also: colour is never the only channel (position, direct labels and text carry the same
information), the whole page is keyboard-navigable, and `prefers-reduced-motion` drops
the sequenced entrances, the scroll-driven cover and the dot field's drift.

Focus rings were checked by measurement rather than by eye: all 84 focusable controls
were focused in turn in headless Chrome and their ring contrasted against the surface it
is actually painted on — which, with a positive `outline-offset`, is the *parent's*
background, not the control's. That caught the quiz's primary button, where a
`currentColor` ring came out white-on-paper at 1.03:1, i.e. invisible; it now sets its
own colour.

**Known limitation.** Every chart is drawn by JavaScript into an empty container, so with
JS disabled the prose and headings all read but twenty chart areas are blank. A
`<noscript>` note at the top of the page says so, rather than leaving the gaps
unexplained. Making the charts server-renderable would mean a build step, which is the
tradeoff that keeps this a double-click-to-open file.
