# A Day in the Life of the World — Blueprint

VizCon 2026 · Theme: *How the world lives, thrives, and connects.*
Web (HTML/CSS/JS), scrollytelling, ResMed visual language.

## The idea (locked)
Don't show statistics — show a life. The reader scrolls through **one 24-hour day**,
and the story lives in the **contrast between two countries** shown side by side.
Each section ends on a "huh, I had no idea" beat. Closing multiplies the day's
gap over a lifetime.

## Visual system (locked — matches ResMed report)
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

## The scroll (sections — build one at a time)
- [x] **Dot-field opener** — dense animated field of dots spelling "PEOPLE"; fly-in,
      perpetual drift, hover-bulge, feathered edges, bold blue word. Built in `dotfield.html`
      as a standalone prototype — NOT yet wired into index.html cover.
- [x] **0. Cover** — curved blue panel, "A Day in the Life of the World." (placeholder gradient; dot-field will likely replace/precede it)
- [~] **1. The Day** — 3 bars (Sleep / Work / Leisure) for one country + picker. (done, single-country)
- [ ] **2. Two lives, side by side** — THE core: two countries' day bars in parallel. ← the "wow"
- [ ] **3. Work** — who works most; paid vs hidden/unpaid labor.
- [ ] **4. Rest & leisure** — who protects rest; sleep & downtime.
- [ ] **5. Thrive** — life expectancy + happiness (payoff layer).
- [ ] **6. Connect** — tourism / migration (theme's "connects").
- [ ] **7. Closing** — the day's gap multiplied over a lifetime (adaptive punchline).

## Data (have it, cited in SOURCES.md)
- Day bars: OECD Time Use (35 countries; Sleep / Work / Leisure).
- Thrive: life_expectancy.csv, happiness/.
- Connect: tourism_worldbank/, world_population.csv.

## Open decisions (decide when we reach them)
- Which is the opening comparison pair (Japan vs Italy? Mexico vs France?).
- Curated pairs vs. free pick-any-two.
- Cover photo source.
- Accessibility pass (alt text, contrast) before submission — worth 15%.
