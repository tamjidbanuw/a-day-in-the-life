/**
 * A Day in the Life of the World — app engine.
 * Renders the reusable "day bars" (Sleep / Work / Leisure) into any container,
 * drives the single-country and side-by-side comparison sections, and builds
 * the adaptive insight callout. Data: window.ADL (data/adl-data.js).
 */

// ── Lucide icons (MIT) inlined so it works offline from file:// ──
const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
    bed:       svg('<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>'),
    briefcase: svg('<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
    coffee:    svg('<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>'),
};

const ADL = window.ADL;
/**
 * Every country that keeps a time diary: all 35 in the file.
 *
 * This list used to demand life expectancy, happiness and tourism all at once,
 * and that single condition is what made the story a story about twelve
 * countries. Life expectancy was the binding constraint — its CSV only ever held
 * 15 countries, three of which keep no time diary — so asking for it threw away
 * 23 countries whose days were sitting right there in the file. That file is gone
 * now; see data/SOURCES.md if the measure is ever wanted back.
 *
 * Now the requirement is a day, because a day is what the story is about. The one
 * measure that is still incomplete is happiness, missing for Luxembourg, so the
 * charts that need it filter for themselves and say n=34 in their own caption
 * rather than making every other chart pay for it.
 */
const COUNTRIES = Object.keys(ADL.countries)
    .filter(c => ADL.countries[c].minutes)
    .sort();
// the subset with a happiness score: everyone except Luxembourg
const HAPPY_COUNTRIES = COUNTRIES.filter(c => ADL.countries[c].happiness != null);

const pctOf = (min, codes) => Math.round((codes.reduce((s, c) => s + (min[c] || 0), 0) / 1440) * 100);
const fmtH  = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return m ? `${h}h ${m}m` : `${h}h`; };
const workMin = (min) => (min.PAW || 0) + (min.UPW || 0);
const nice = (c) => c.replace(' (People’s Republic of)', '');


/**
 * The badge that #sec-day used to carry.
 *
 * That section is gone — #sec-glance makes the same point, and its day card is the
 * same component — but `day` was earned only by changing the country in its picker.
 * Left alone that would have stranded a badge, making the collection impossible to
 * finish. It moved to the glance sheet's picker, the only country picker left on the
 * page, so the hint still reads true: it is the first chart.
 *
 * The picker alone was too narrow a door. Chapter One's sheet offers three ways to
 * change the country — the braid's columns, the ranking's rows and the picker — and
 * the two obvious ones awarded nothing, so a reader who explored the chapter properly
 * by clicking the chart could finish it having earned nothing while a reader who used
 * the dropdown was rewarded. Any click on any of the sheet's visuals earns it now.
 *
 * Delegated from the section rather than bound per element, because glance.js builds
 * every one of those visuals after this runs and rebuilds the ranking's rows on each
 * sort. A live listener on the section cannot go stale; thirty-five per-row bindings
 * would. Nothing in glance.js calls stopPropagation, so the clicks all arrive.
 *
 * Scoped to VISUALS, not the whole section: the caveat callout and the "Choose a
 * country" pill are prose, and a badge for reading them says nothing about having
 * explored anything. Badges.earn() is idempotent, so the extra paths cost nothing
 * after the first.
 *
 * A second badge, `day5`, used to live here too — earned for visiting five distinct
 * countries, which is why this function once kept a Set of the values it had seen.
 * That badge is gone, and the bookkeeping went with it.
 *
 * Wired here rather than in js/glance.js because Badges is defined in this file and
 * glance.js is deliberately self-contained.
 */
function initCountryBadges() {
    const sheet = document.getElementById('sec-glance');
    if (!sheet) return;
    /* The braid, the day card and the ranking panel — the three things a reader
       would call a chart. .dc-card and .day-card are the panels, so their scales,
       legends and figures count as part of the visual they belong to. */
    const VISUALS = '#gl-braid, .dc-card, .day-card';
    const hit = e => { if (e.target.closest(VISUALS)) Badges.earn('day'); };
    sheet.addEventListener('click', hit);
    /* The ranking's rows are operated with Enter and Space as well as the pointer
       (glance.js gives them tabIndex and its own keydown), and neither key fires a
       click on a plain div. Without this the keyboard route to the chart is the one
       route that earns nothing. */
    sheet.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') hit(e);
    });
    /* Still watched directly: a <select> changed by keyboard alone never produces a
       click inside .dc-card. */
    const pick = document.getElementById('gl-dc-pick');
    if (pick) pick.addEventListener('change', () => Badges.earn('day'));
}

/* ── Lifestyle DNA: quiz → fingerprint → nearest-country twin ──
 *
 * The four axes used to be time, health, community and connectedness, and the
 * scores were baked into data/adl-data.js as a `dna` object. That object only
 * ever existed for twelve countries, and two of its axes could not be rebuilt for
 * the other 23: health was life expectancy, which is gone, and community came
 * from World Happiness Report sub-scores the file does not carry outside those
 * twelve. Widening the story would have left this quiz matching you against a
 * quarter of the sample without saying so.
 *
 * So the axes are now four things every one of the 35 countries reports, and the
 * scores are computed at load instead of stored. Each is a percentile within the
 * sample, which is what makes a straight-line distance meaningful: the axes are
 * minutes, dollars and arrivals, and nothing sensible comes of measuring a
 * distance across raw units like that.
 */
const DNA_AXES = [
    { key: 'time',    label: 'Free time', color: 'var(--leisure)' },
    { key: 'rest',    label: 'Rest',      color: 'var(--care)' },
    { key: 'money',   label: 'Income',    color: 'var(--accent)' },
    { key: 'connect', label: 'Openness',  color: 'var(--support)' },
];
// One question per axis. A slider from 0–100 sets the target on that axis;
// the two ends anchor what low vs high means.
const DNA_QUESTIONS = [
    { key: 'time',    q: 'How do you weigh work against free time?',
      lo: 'Work-driven',  hi: 'Free-time first' },
    { key: 'rest',    q: 'How much of your day belongs to sleeping and eating?',
      lo: 'As little as I can get away with', hi: 'I protect it' },
    { key: 'money',   q: 'How important is income in the life you want?',
      lo: 'Barely',       hi: 'It decides most things' },
    /* "How outward-looking and travel-hungry are you?" asked two things at once and
       neither in plain words. The axis is arrivals, so the question a reader can
       actually answer is the simple one, and the two ends carry the meaning. */
    { key: 'connect', q: 'How curious are you about the world?',
      lo: 'Homebody',     hi: 'World explorer' },
];

/* ── the result card ──
   Two of these read the reader's own answers rather than the data, which is the point:
   the card is about them, and the page claims nothing about them it was not told. */

/* Each axis, as a thing a person values, at both ends of its slider. Kept to two or
   three words each: they are set as a list, and a list of clauses is a paragraph
   wearing bullets. */
const DNA_VALUES = {
    time:    { hi: 'free time',       lo: 'getting things done' },
    rest:    { hi: 'rest',            lo: 'early starts' },
    money:   { hi: 'earning power',   lo: 'time over money' },
    connect: { hi: 'the wider world', lo: 'home' },
};
function dnaValues(answers) {
    /* Only the sliders actually pushed away from the middle. One left at 50 said
       nothing, and printing "you value rest" for it would be the card inventing an
       opinion the reader never gave it. Strongest feeling first. */
    const picks = DNA_AXES
        .map(ax => ({ k: ax.key, v: answers[ax.key] ?? 50 }))
        .filter(p => p.v >= 60 || p.v <= 40)
        .sort((a, b) => Math.abs(b.v - 50) - Math.abs(a.v - 50))
        .map(p => DNA_VALUES[p.k][p.v >= 60 ? 'hi' : 'lo']);
    /* Every dial left in the middle. Rare, but reachable in two clicks — and "you
       value nothing in particular" is not a result, so the balance is the finding. */
    return picks.length ? picks : ['balance over any one thing'];
}

/* The same four axes as plain nouns, for the one sentence about the country. */
const DNA_TRADE = {
    time: 'free time', rest: 'rest', money: 'earning power', connect: 'openness to the world',
};
function dnaTrade(country, answers) {
    const s = DNA_SCORES[country];
    const order = DNA_AXES.map(ax => ax.key).sort((a, b) => s[b] - s[a]);
    const hi = order[0], lo = order[3];
    /* A trade needs something given up. Latvia's four axes span 18 to 32 out of 100
       and Lithuania's 15 to 35: "you trade rest for earning power" over fourteen
       points is the card inventing a personality for a country that does not have
       one. Three of the thirty-five take this branch. */
    if (s[hi] - s[lo] < 30) {
        return `Like ${nice(country)}, you spread the day evenly &mdash; no one part of
            it takes over.`;
    }
    /* "Like Japan, you trade rest for openness" is a sentence about the reader, so it
       has to be one the reader would recognise. The match is over four axes at once and
       the nearest country can lead on an axis they pushed the other way: in 3% of answer
       combinations the sentence would have told someone who set curiosity to zero that
       they value the wider world. Where they contradict it, the sentence stays true by
       being about the country instead — same finding, no words put in their mouth. */
    const what = `${DNA_TRADE[lo]} for ${DNA_TRADE[hi]}`;
    return (answers[hi] ?? 50) <= 40 || (answers[lo] ?? 50) >= 60
        ? `${nice(country)} trades ${what} &mdash; the closest fit to the balance you chose.`
        : `Like ${nice(country)}, you trade ${what}.`;
}

/**
 * Percentile scores per country on the four axes, built once at load.
 *
 * Percentile rather than a min-max stretch because three of these four measures
 * have one country a very long way from the pack — India on income, France on
 * arrivals — and under min-max that single country flattens all 34 others into
 * the bottom of the axis. Ranking spaces them evenly, which is the honest thing
 * to do when what the quiz needs is "more than most" rather than "how much".
 */
const DNA_SCORES = (function () {
    const raw = COUNTRIES.map(c => {
        const d = ADL.countries[c];
        return {
            c,
            time: d.minutes.LEI / 1440,      // share of the day that is free
            rest: d.minutes.PCA,             // sleep, eating, washing
            money: d.gdp,
            connect: d.tourism               // international arrivals, millions
        };
    });
    const out = {};
    raw.forEach(r => { out[r.c] = {}; });
    DNA_AXES.forEach(ax => {
        const order = [...raw].sort((a, b) => a[ax.key] - b[ax.key]);
        order.forEach((r, i) => {
            out[r.c][ax.key] = Math.round((i / (order.length - 1)) * 100);
        });
    });
    return out;
})();

function dnaDist(a, b) {
    return Math.sqrt(DNA_AXES.reduce((s, ax) => s + Math.pow(a[ax.key] - b[ax.key], 2), 0));
}

// small bar strip showing a DNA fingerprint
function dnaStrip(scores) {
    return `<div class="dna-strip">` + DNA_AXES.map(ax =>
        `<div class="dna-ax">
            <span class="dna-ax-label">${ax.label}</span>
            <div class="dna-ax-track"><span style="width:${scores[ax.key]}%; background:${ax.color}"></span></div>
        </div>`).join('') + `</div>`;
}

// Stepped wizard: intro → one question at a time → result → retake.
function renderDna(root) {
    if (!root) return;
    const answers = {};                       // key -> 0..100 (defaults to 50 if skipped)
    const N = DNA_QUESTIONS.length;

    // paint a slider's filled portion
    const paint = (el) => el.style.setProperty('--fill', el.value + '%');

    // swap the stage content with a small fade-in
    function show(html) {
        root.innerHTML = `<div class="dna-stage">${html}</div>`;
        return root.firstElementChild;
    }

    function intro() {
        show(`
            <div class="dna-intro">
                <button class="dna-go dna-start">Take the quiz</button>
            </div>`);
        root.querySelector('.dna-start').addEventListener('click', () => question(0));
    }

    function question(i) {
        const qq = DNA_QUESTIONS[i];
        const prev = answers[qq.key] ?? 50;
        const stage = show(`
            <div class="dna-q">
                <p class="dna-step">Question ${i + 1} of ${N}</p>
                <div class="dna-progress"><span style="width:${((i) / N) * 100}%"></span></div>
                <p class="dna-q-text">${qq.q}</p>
                <div class="dna-slider">
                    <input type="range" min="0" max="100" value="${prev}" step="1"
                           data-key="${qq.key}" aria-label="${qq.q}">
                    <div class="dna-ends"><span>${qq.lo}</span><span>${qq.hi}</span></div>
                </div>
                <div class="dna-nav">
                    ${i > 0 ? `<button class="dna-back">← Back</button>` : `<span></span>`}
                    <button class="dna-go dna-next">${i === N - 1 ? 'See my twin' : 'Next →'}</button>
                </div>
            </div>`);
        const slider = stage.querySelector('input[type="range"]');
        paint(slider);
        slider.addEventListener('input', () => paint(slider));
        stage.querySelector('.dna-next').addEventListener('click', () => {
            answers[qq.key] = +slider.value;
            i === N - 1 ? reveal() : question(i + 1);
        });
        const back = stage.querySelector('.dna-back');
        if (back) back.addEventListener('click', () => {
            answers[qq.key] = +slider.value;
            question(i - 1);
        });
    }

    function reveal() {
        Badges.earn('quiz');
        const you = {};
        DNA_AXES.forEach(ax => you[ax.key] = answers[ax.key] ?? 50);
        const best = COUNTRIES
            .map(c => ({ c, d: dnaDist(you, DNA_SCORES[c]) }))
            .sort((a, b) => a.d - b.d)[0];
        const twin = best.c;
        /* Distance in a 0–100 space on four axes, so the farthest two corners are
           200 apart; halving it turns the distance into a percentage. Across a grid
           of reader answers this lands between 59% and 97%, which is the range a
           match figure has to sit in to be worth printing — never a suspicious 100,
           never a disheartening 12. */
        const pct = Math.round(100 - best.d / 2);
        const vals = dnaValues(answers);
        const stage = show(`
            <div class="dna-result">
                <p class="dna-result-kicker">Your closest match</p>
                <p class="dna-result-name">${nice(twin)}</p>
                <p class="dna-result-pct"><b>${pct}%</b> match</p>
                <p class="dna-result-vals">You value</p>
                <ul class="dna-vals">${vals.map(v => `<li>${v}</li>`).join('')}</ul>
                ${dnaStrip(DNA_SCORES[twin])}
                <p class="dna-result-note">${dnaTrade(twin, answers)}</p>
                <button class="dna-go dna-retake">Retake the quiz</button>
            </div>`);
        stage.querySelector('.dna-retake').addEventListener('click', intro);
        root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    intro();
}

// ── Cover on scroll: the cover recedes, a title bar takes its place ──
// The cover is left to scroll away normally and the bar is a separate fixed
// element. Animating the cover's own height instead would change the page's
// scroll length, which feeds back into the progress reading and oscillates.
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 2);

function initCoverScroll() {
    const bar = document.querySelector('.title-bar');
    const cover = document.querySelector('.cover');
    if (!bar || !cover) return;

    const center = cover.querySelector('.cover-center');
    const clock  = cover.querySelector('.cover-clock');
    const kicker = cover.querySelector('.cover-kicker');

    const reduced = window.matchMedia &&
        matchMedia('(prefers-reduced-motion: reduce)').matches;

    let queued = false;
    function paint() {
        queued = false;
        const h = cover.offsetHeight || window.innerHeight;
        const p = clamp01(window.scrollY / h);

        // the bar arrives over the back half of the cover's exit
        const b = easeOut(clamp01((p - 0.35) / 0.4));
        bar.classList.toggle('in', b > 0.02);

        if (reduced) {
            // no slide, no scaling — just show or hide
            bar.style.transform = p > 0.5 ? 'translateY(0)' : 'translateY(-100%)';
            return;
        }
        bar.style.transform = `translateY(${lerp(-100, 0, b)}%)`;

        const t = easeOut(p);
        // .cover-clock is centred by a translate in CSS, so repeat it here
        clock.style.transform = `translate(-50%, -50%) scale(${lerp(1, 0.8, t)})`;
        clock.style.opacity = String(lerp(1, 0, clamp01(p / 0.65)));
        center.style.transform = `scale(${lerp(1, 0.86, t)})`;
        center.style.opacity = String(lerp(1, 0, clamp01(p / 0.75)));
        if (kicker) kicker.style.opacity = String(lerp(1, 0, clamp01(p / 0.3)));

    }

    addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(paint);
    }, { passive: true });
    addEventListener('resize', paint);
    paint();
}

/**
 * Where the badge rail sits, top edge only.
 *
 * The rail is a paper-coloured card in a fixed gutter, and the cover it opens over is
 * a full-bleed dark band. Centred on the viewport it began the page crossing that
 * band: at 1400x813 the panel ran 73→740 while the cover ended at 331, so two thirds
 * of a light card sat on top of the dark opener — the one place on the page where the
 * reader is meant to be looking at nothing else.
 *
 * So the top follows the cover down. While any of the cover is on screen the rail sits
 * just below its bottom edge; once the cover has gone the rail settles at REST and
 * stops moving, which is the sticky half of it. Nothing here animates — the panel is
 * pinned to a number that happens to change while the cover is leaving, and it tracks
 * the scroll exactly rather than easing behind it, because a card that lags reads as
 * sliding around on its own.
 *
 * Written to a custom property rather than to `top` directly: the panel's max-height
 * and the tray's are both derived from it in the stylesheet, so one number moves the
 * position and both height budgets together, and the rail can never end up taller
 * than the space left below it.
 *
 * The rail rules live behind min-width: 1100px. Below that the panel is in the flow at
 * the foot of the opener and the property is unused, so it is removed rather than left
 * behind at a stale value.
 */
function initRailPin() {
    const rail = document.getElementById('badges');
    const cover = document.querySelector('.cover');
    if (!rail || !cover) return;

    /* Read from a media query matching the CSS rather than testing innerWidth, so the
       breakpoint cannot drift away from the one the stylesheet uses. */
    const wide = matchMedia('(min-width: 1100px)');
    const REST = 4.6 * 16;                  // --rail-rest, in px
    const GAP = 16;                         // clear of the cover's edge, not touching it

    let queued = false;
    let last = null;

    function paint() {
        queued = false;
        if (!wide.matches) {
            if (last !== null) {
                document.documentElement.style.removeProperty('--rail-top');
                last = null;
            }
            return;
        }
        const bottom = cover.getBoundingClientRect().bottom;
        const top = Math.round(Math.max(REST, bottom + GAP));
        if (top === last) return;           // most scroll events move it nowhere
        last = top;
        document.documentElement.style.setProperty('--rail-top', top + 'px');
    }

    addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(paint);
    }, { passive: true });
    addEventListener('resize', paint);
    /* Also on the query itself: crossing the breakpoint is what decides whether the
       property should exist at all, and a zoom change can cross it without a resize. */
    wide.addEventListener('change', paint);
    paint();
}

/**
 * Section exit — the same handoff the cover makes, reused for any section
 * wrapping its contents in .sec-exit. As the section scrolls up and out, the
 * group shrinks and fades, so the chapter mark underneath arrives on a clear
 * screen rather than colliding with the section it replaces.
 *
 * Progress is measured against the section's own height, not the viewport, so
 * a tall section fades over a longer scroll and the pacing feels the same on
 * any screen: 0 when the section's top reaches the top of the viewport, 1 once
 * it has travelled its full height past it.
 */
function initSectionExit() {
    const groups = Array.from(document.querySelectorAll('.sec-exit'));
    if (!groups.length) return;

    // CSS already pins these flat under reduced motion; skip the work entirely.
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let queued = false;
    function paint() {
        queued = false;
        groups.forEach(group => {
            const host = group.parentElement;
            const r = host.getBoundingClientRect();
            const p = clamp01(-r.top / Math.max(1, r.height));
            const t = easeOut(p);
            group.style.transform = `scale(${lerp(1, 0.92, t)})`;
            // clears a touch sooner than the scale, so the fade leads the shrink
            group.style.opacity = String(lerp(1, 0, clamp01(p / 0.85)));
        });
    }

    addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(paint);
    }, { passive: true });
    addEventListener('resize', paint);
    paint();
}

/**
 * Right now — reads the reader's own clock and reports what the American
 * population is doing at that hour, from data/atus-hours.js.
 *
 * The point of the panel is the present tense, so it re-reads the clock rather
 * than rendering once: on a minute boundary the time changes, and on an hour
 * boundary the whole distribution does. It ticks every 20 seconds, which is
 * cheap and keeps the displayed minute honest without a per-second timer.
 *
 * The ribbon underneath is also scrubbable. The panel states one hour, and the
 * obvious next question is what the other twenty-three look like — the ribbon
 * already draws them, so hovering it reads any hour out in the same words the
 * live state uses. See the scrub block below for what stays honest while it does.
 */
function initRightNow() {
    const host = document.getElementById('rn');
    if (!host || !window.ATUS_HOURS) return;

    const CATS = [
        { key: 'PCA', label: 'Sleep & self-care', color: 'var(--care)',    say: 'asleep, washing or eating' },
        { key: 'PAW', label: 'Paid work',         color: 'var(--paid)',    say: 'working or studying' },
        { key: 'UPW', label: 'Unpaid work',       color: 'var(--unpaid)',  say: 'cooking, cleaning, shopping or caring' },
        { key: 'LEI', label: 'Leisure',           color: 'var(--leisure)', say: 'at leisure' },
        { key: 'OTH', label: 'Other',             color: 'var(--other)',   say: 'travelling, or somewhere unaccounted for' }
    ];

    const time = document.getElementById('rn-time');
    const say  = document.getElementById('rn-say');
    const bar  = document.getElementById('rn-bar');
    const key  = document.getElementById('rn-key');

    key.innerHTML = CATS.map(c =>
        `<span><i style="background:${c.color}"></i>${c.label}</span>`).join('');

    // ── the whole day behind the current hour ──
    /* SVG presentation attributes do not accept var(), so the bands need real
       colours — but read from the tokens rather than restated here. Written out
       by hand, these five were still the old palette long after the stylesheet
       had moved on, because nothing links a copy to its original. */
    const HEX = {
        PCA: token('--care'), PAW: token('--paid'), UPW: token('--unpaid'),
        LEI: token('--leisure'), OTH: token('--other')
    };
    const rib = document.getElementById('rn-rib');
    let hand = null, handCap = null;

    function buildRibbon() {
        if (!rib) return;
        const W = 900, H = 190, L = 30, R = 10, T = 12, B = 24;
        const X = h => L + (h / 24) * (W - L - R);
        const Y = p => T + (1 - p / 100) * (H - T - B);
        // repeat hour 0 at position 24 so the band closes on midnight
        const rows = ATUS_HOURS.map((r, i) => ({ ...r, h: i })).concat([{ ...ATUS_HOURS[0], h: 24 }]);

        let bands = '', base = rows.map(() => 0);
        [...CATS].reverse().forEach(cat => {
            const top = rows.map((r, i) => base[i] + r[cat.key]);
            const up = rows.map((r, i) => `${X(r.h)},${Y(top[i])}`).join(' ');
            const down = rows.map((r, i) => `${X(r.h)},${Y(base[i])}`).reverse().join(' ');
            bands += `<polygon points="${up} ${down}" fill="${HEX[cat.key]}"/>`;
            base = top;
        });

        let axis = '';
        for (let h = 0; h <= 24; h += 3) {
            axis += `<line class="rib-grid" x1="${X(h)}" y1="${T}" x2="${X(h)}" y2="${H - B}"/>`;
            axis += `<text class="rib-ax" x="${X(h)}" y="${H - B + 15}" text-anchor="middle">${h === 24 ? '24' : h}h</text>`;
        }
        [0, 50, 100].forEach(p => {
            axis += `<text class="rib-ax" x="${L - 5}" y="${Y(p) + 3}" text-anchor="end">${p}</text>`;
        });

        rib.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
            aria-label="Share of the American population in each activity across the 24 hours of the day">
            <defs><clipPath id="rnRibClip">
                <rect class="rib-clip-rect" x="${L}" y="0" width="0" height="${H}"/>
            </clipPath></defs>
            ${axis}
            <g clip-path="url(#rnRibClip)">${bands}</g>
            <line class="rib-hand" x1="${L}" y1="${T - 4}" x2="${L}" y2="${H - B + 4}"/>
            <polygon class="rib-hand-cap" points="${L - 4},${T - 8} ${L + 4},${T - 8} ${L},${T - 2}"/>
        </svg>`;

        hand = rib.querySelector('.rib-hand');
        handCap = rib.querySelector('.rib-hand-cap');

        // fill the day in once the panel is on screen, then leave it
        const reveal = () => {
            const r = rib.querySelector('.rib-clip-rect');
            if (r) r.setAttribute('width', String(W - L - R));
        };
        if ('IntersectionObserver' in window) {
            const obs = new IntersectionObserver(es => es.forEach(e => {
                if (e.isIntersecting) { reveal(); obs.disconnect(); }
            }), { threshold: 0.25 });
            obs.observe(rib);
        } else {
            reveal();
        }
    }

    // the marker tracks the real time of day, minutes included
    function moveHand(h, m) {
        if (!hand) return;
        const W = 900, L = 30, R = 10, T = 12;
        const x = L + ((h + m / 60) / 24) * (W - L - R);
        hand.setAttribute('x1', x); hand.setAttribute('x2', x);
        handCap.setAttribute('points', `${x - 4},${T - 8} ${x + 4},${T - 8} ${x},${T - 2}`);
    }

    buildRibbon();

    /* Painting an hour is separate from reading the clock, because the same
       distribution is now drawn for two reasons: the hour it actually is, and an
       hour the reader is pointing at. `live` decides the wording — "At this hour"
       is a claim about the present and must not be said about 4am while it is
       lunchtime. */
    let painted = null, paintedLive = null;
    function paintHour(h, live) {
        // hourly data, so a re-paint of the same hour in the same tense is a no-op
        if (h === painted && live === paintedLive) return;
        painted = h; paintedLive = live;
        const row = ATUS_HOURS[h];
        const top = CATS.slice().sort((a, b) => row[b.key] - row[a.key])[0];
        const when = live ? 'At this hour' : `At ${clockLabel(h)}`;
        say.innerHTML = `${when}, <b>${Math.round(row[top.key])}%</b> of America is ${top.say}.`;
        bar.innerHTML = CATS.map(c =>
            `<span style="width:${row[c.key]}%;background:${c.color}"></span>`).join('');
        /* The bar is a role="img" and its label said "at this hour" no matter which
           hour was drawn, so a reader who scrubbed to 4am was told they were looking
           at the present. It names the hour it is actually showing now. */
        bar.setAttribute('aria-label', 'Share of the American population in each activity ' +
            (live ? 'at this hour' : 'at ' + clockLabel(h)));
    }

    /* "At 3am" reads better than "At 03:00" in a sentence, and this is a sentence.
       Noon and midnight are named rather than numbered for the same reason: "at
       12pm" makes a reader stop and work out which twelve it is. */
    function clockLabel(h) {
        if (h === 0) return 'midnight';
        if (h === 12) return 'noon';
        return (h % 12) + (h < 12 ? 'am' : 'pm');
    }

    let liveHour = -1, liveTime = '';
    function tick() {
        const now = new Date();
        const h = now.getHours();
        liveHour = h;
        liveTime = String(h).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0');
        /* Only while nothing is being scrubbed. A tick landing mid-hover would
           otherwise yank the readout back to the present under the reader's
           pointer — and worse, the big time would contradict the sentence. */
        if (scrubbing === null) {
            time.textContent = liveTime;
            moveHand(h, now.getMinutes());
            paintHour(h, true);
        }
    }

    /* ── scrubbing the ribbon ──
       Hovering the day reads out the hour under the pointer. Three things keep it
       from lying: the panel says "At 4am" rather than "At this hour", the big clock
       shows the hour being pointed at rather than the real time, and .rn.scrubbing
       marks the whole panel so the CSS can say it is no longer live. Leaving puts
       every one of them back.

       Bound to the .rn-rib wrapper rather than the svg's bands: the bands are
       stacked polygons with gaps between them at the extremes, and the axis area
       below them is part of the chart to a reader. mousemove on the wrapper reads a
       continuous x, so there is no dead ground. */
    let scrubbing = null;

    function hourAt(clientX) {
        if (!rib) return null;
        const r = rib.getBoundingClientRect();
        if (!r.width) return null;
        /* The svg's own plot area is inset by L and R in viewBox units, and the
           element scales to the container — so map through the same fractions the
           drawing used rather than the element's full width, or the pointer and the
           band under it disagree by most of an hour at the edges. */
        const W = 900, L = 30, R = 10;
        const x0 = r.left + (L / W) * r.width;
        const plot = ((W - L - R) / W) * r.width;
        const f = (clientX - x0) / plot;
        return Math.max(0, Math.min(23, Math.floor(f * 24)));
    }

    function scrub(h) {
        if (h === null || h === scrubbing) return;
        scrubbing = h;
        host.classList.add('scrubbing');
        time.textContent = String(h).padStart(2, '0') + ':00';
        moveHand(h, 0);
        paintHour(h, false);
        /* The badge is for looking at the other hours, so it is earned here rather
           than on arrival at the panel. Idempotent, so every subsequent hour is
           free. */
        Badges.earn('now');
    }

    function unscrub() {
        if (scrubbing === null) return;
        scrubbing = null;
        host.classList.remove('scrubbing');
        time.textContent = liveTime;
        const now = new Date();
        moveHand(now.getHours(), now.getMinutes());
        paintHour(liveHour, true);
    }

    if (rib) {
        rib.addEventListener('mousemove', e => scrub(hourAt(e.clientX)));
        rib.addEventListener('mouseleave', unscrub);
        /* Touch has no hover, and a tap that scrolls the page should not also
           scrub. touchmove is the honest equivalent: a finger dragged across the
           ribbon reads the hours under it. Not passive, because a horizontal drag
           on the ribbon is scrubbing, not scrolling. */
        rib.addEventListener('touchmove', e => {
            const t = e.touches[0];
            if (!t) return;
            const h = hourAt(t.clientX);
            if (h === null) return;
            e.preventDefault();
            scrub(h);
        });
        rib.addEventListener('touchend', unscrub);
        rib.addEventListener('touchcancel', unscrub);
        /* Keyboard: the ribbon is a real stop in the tab order, and the arrow keys
           walk the day. Without this the only route to the other twenty-three hours
           — and to the badge behind them — is a pointer. */
        rib.tabIndex = 0;
        rib.setAttribute('role', 'group');
        rib.setAttribute('aria-label',
            'The whole day. Use the left and right arrow keys to read any hour.');
        rib.addEventListener('keydown', e => {
            const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const from = scrubbing === null ? liveHour : scrubbing;
            scrub((from + step + 24) % 24);
        });
        // tabbing away is leaving, the same as the pointer going
        rib.addEventListener('blur', unscrub);
    }

    tick();
    setInterval(tick, 20000);
}

/* ═══════════════════════════════════════════════════════════
   BADGES — one per interactive, earned by using it

   The point is to get a reader to actually touch the charts rather than scroll
   past them, so every badge is tied to a real interaction and none can be
   earned by scrolling alone. There are no exceptions left. There used to be two:
   the clock badge was awarded for merely reaching the live panel, and it now asks
   the reader to scrub the day ribbon; and a "five countries" badge asked for
   repetition rather than a single click, which went with the badge itself.

   Kept in memory only. Nothing is written to storage: the piece is read once,
   and a returning reader starting fresh is better than explaining persistence.
   ═══════════════════════════════════════════════════════════ */
/* Eight hand-drawn medallions, 40x40 each.
   Every badge mixes three or four palette hues rather than being tinted one
   colour, so the tray is genuinely multi-coloured while still using nothing
   outside night / slate / slate-pale / copper / copper-pale. Class names are
   short on purpose: -s slate, -sp slate pale, -c copper, -cp copper pale,
   -n night; a trailing f means filled rather than stroked. */
const BADGE_ART = {
    globe: `<circle cx="20" cy="20" r="14" class="b-spf o-25"/>
        <circle cx="20" cy="20" r="14" class="b-ln b-s"/>
        <path class="b-ln b-s" d="M6 20h28"/>
        <path class="b-ln b-sp" d="M20 6a19 19 0 0 1 0 28a19 19 0 0 1 0-28"/>
        <circle cx="26" cy="14" r="3.4" class="b-cf"/>
        <circle cx="26" cy="14" r="3.4" class="b-ln b-n o-40"/>`,
    /* The `plane` glyph stood here, a paper dart on a dashed trail, for the
       five-countries badge. It went with that badge. */
    ladder: `<circle cx="20" cy="20" r="14" class="b-spf o-25"/>
        <path class="b-ln b-s" d="M13 5v30M27 5v30"/>
        <path class="b-ln b-c" d="M13 11h14M13 18h14M13 25h14M13 32h14"/>
        <circle cx="20" cy="14.5" r="3.6" class="b-cpf"/>
        <circle cx="20" cy="14.5" r="3.6" class="b-ln b-n o-35"/>`,
    /* The `scatter` glyph stood here, an axis and a rising cloud with one mark off the
       trend, for the money-and-mood badge. Both went with the GDP section. */
    trail: `<circle cx="20" cy="20" r="14" class="b-spf o-22"/>
        <path class="b-ln b-n" d="M6 28c4 0 5-6 9-6s5-8 9-8 4 3 8 3"/>
        <circle cx="6" cy="28" r="2.4" class="b-sf"/>
        <circle cx="15" cy="22" r="2.4" class="b-sf"/>
        <circle cx="24" cy="14" r="2.4" class="b-cpf"/>
        <circle cx="32" cy="17" r="3.4" class="b-cf"/>`,
    twin: `<circle cx="20" cy="20" r="14" class="b-cpf o-22"/>
        <circle cx="15.5" cy="16" r="7" class="b-cf o-70"/>
        <circle cx="24.5" cy="24" r="7" class="b-sf o-70"/>
        <circle cx="15.5" cy="16" r="7" class="b-ln b-c"/>
        <circle cx="24.5" cy="24" r="7" class="b-ln b-s"/>`,
    owl: `<circle cx="20" cy="20" r="14" class="b-spf o-30"/>
        <circle cx="20" cy="20" r="11" class="b-ln b-n"/>
        <path class="b-ln b-c" d="M20 12v8l6 3.6"/>
        <circle cx="20" cy="20" r="2" class="b-cf"/>
        <path class="b-ln b-sp" d="M20 6.5v2M33.5 20h-2M20 33.5v-2M6.5 20h2"/>`,
    /* The `ripple` glyph stood here, concentric wavefronts, for the secret badge. It
       went with that badge.

       `core` is four nested rings with a dot at the middle and a line down through
       them, because the badge is for going four levels down: the day, a block, an
       activity, then the split. The rings pale as they go out and the centre is the
       only filled thing, so the eye lands where the reader ended up. */
    core: `<circle cx="20" cy="20" r="14" class="b-spf o-22"/>
        <circle cx="20" cy="20" r="14" class="b-ln b-sp"/>
        <circle cx="20" cy="20" r="10" class="b-ln b-s"/>
        <circle cx="20" cy="20" r="6" class="b-ln b-c"/>
        <circle cx="20" cy="20" r="2.6" class="b-cf"/>
        <path class="b-ln b-n o-40" d="M20 3v6" stroke-dasharray="2.5 2.5"/>`
};

/* Each badge is a collectible: a kicker, a name, the figure it stands for, and
   a fact from the data that is deliberately not printed anywhere else on the
   page. Finding one is worth something to read, which is the only honest reason
   to make a data story collectible at all. */
const BADGES = [
    { id: 'day', art: 'globe', ring: 'support',
      kicker: 'Time use', label: 'Day Tripper', stat: '10h05 vs 10h06',
      /* Not "swap the country in the picker" any more: the badge answers a click on
         any of Chapter One's charts, and a hint that names only the dropdown sends
         the reader to the one route they were least likely to take. */
      hint: 'Click any chart in Chapter One',
      fact: 'Mexico spends almost exactly as much time working as sleeping, washing and eating — 10h05m versus 10h06m.' },
    { id: 'ladder', art: 'ladder', ring: 'accent',
      kicker: 'Happiness', label: 'Ladder Climber', stat: '4.04 apart',
      hint: 'Poke a country on the happiness scale',
      /* The two scores are on the stat line above this and printed again in the
         strip's own readout, so the fact does the arithmetic instead of repeating
         them: 7.82 against 3.78 is 2.07×, which "almost twice as high" covers. */
      fact: 'The happiest country scores almost twice as high as the least happy one.' },
    /* "Off the Line" stood here — Türkiye and Mexico earning within $456 of each other
       on the money-and-mood scatter. The chart is gone, so the badge went rather than
       sit in the tray unearnable. "Jet Lagged" has since gone too, by request. Six
       now, and every count on the page reads BADGES.length rather than a literal. */
    { id: 'ranks', art: 'trail', ring: 'ink',
      kicker: 'Rankings', label: 'Pattern Finder', stat: 'Four winners',
      hint: 'Follow one country through all four measures',
      fact: 'No country wins twice. Mexico works most. France sleeps most. Norway has the most leisure. Finland is happiest.' },
    { id: 'quiz', art: 'twin', ring: 'accent',
      kicker: 'The average', label: 'Long-Lost Twin', stat: '34× the pay',
      hint: 'Answer four questions, meet your country',
      fact: 'An American earns 34x more than an Indian — and still spends 17 fewer minutes a day working.' },
    { id: 'now', art: 'owl', ring: 'support',
      kicker: 'Hour by hour', label: 'Clock Watcher', stat: '56% at 8pm',
      /* Was "Find out what the world is doing this minute", which described arriving
         at the panel — and arriving is no longer what earns it. The badge is for the
         other twenty-three hours, so the hint asks for them. */
      hint: 'Hover across the whole day, hour by hour',
      fact: 'At 8pm, most Americans are finally off the clock. It’s the only waking hour when a majority are doing the same thing: relaxing.' },
    /* "Made Waves" stood here — the secret badge, earned by four ripples in the cover
       dot field. Removed by request, and the ripples stay: they are the reason the
       opener feels alive, they just no longer award anything.

       Its replacement is the first badge tied to going DEEP rather than to touching a
       chart once. Chapter Three is four levels down — day, block, activity, then the
       age or sex split — and a reader who reaches the bottom of it has done more work
       than any other interaction on the page asks for. Nothing was watching for that.
       Not secret: the whole problem in this chapter was readers not knowing there was
       anything to open, so a badge that admits what it wants is worth more than one
       that hides. */
    { id: 'drill', art: 'core', ring: 'support-pale',
      kicker: 'Chapter Three', label: 'Drill Master', stat: '9h18 to 8h19',
      hint: 'Open a block, then an activity, then split it by age or sex',
      fact: 'Sleep is the flattest thing in the American day: 9h18 at 15–24, 8h19 at 45–54, and never more than an hour apart at any age.' }
];

/* The clock badge renames itself depending on when you get there, because the
   one thing this page knows about the reader is the time on their own clock. */
function badgeClockName() {
    const h = new Date().getHours();
    if (h >= 23 || h < 5) return 'Night Owl';
    if (h < 8) return 'Early Bird';
    if (h >= 20) return 'Off the Clock';
    return 'Clock Watcher';
}

const Badges = (function () {
    /* Kept in sessionStorage, so a reload keeps the collection but closing the
       tab starts it over.

       Worth being straight about the limit: a hard refresh does not clear
       sessionStorage either, because the browser gives a page no way to tell a
       hard reload from a normal one. Closing the tab is what clears it. There was
       a "Start over" button in the tray as well; it is gone, and api.reset()
       stays because everything in here that can be interrupted — pending timers,
       card lags, a badge mid-flight — is written to survive being emptied, and
       that is worth keeping reachable rather than deleting the guards with it. */
    const STORE = 'adl-collection-v1';
    /* Badges are awarded on a delay. Interrupting somebody the instant they
       touch a chart is the fastest way to stop them touching charts: the card
       lands on top of the thing they were mid-way through reading. So the
       trigger only starts a timer, and the badge arrives once they have had a
       moment with the visual. Five seconds is long enough not to snatch the
       chart away mid-thought, short enough that the reward still feels caused
       by what they just did. */
    const REVEAL_DELAY = 3000;
    /* A beat after the badge touches down, so the landing is watched rather than
       covered. The flight already gave the reveal its moment at centre screen. */
    const CARD_LAG = 420;
    const earned = new Set(load());
    const pending = new Map();                 // id -> timer, so nothing double-fires
    const lags = new Set();                    // card timers, cancellable by reset
    const flights = new Set();                 // flight timers, likewise
    const queue = [];
    let tray = null, count = null, card = null, showing = false;
    let rail = null;

    function load() {
        try {
            const raw = sessionStorage.getItem(STORE);
            if (!raw) return [];
            // keep only ids that still exist, so an edit to BADGES cannot break it
            return JSON.parse(raw).filter(id => BADGES.some(b => b.id === id));
        } catch (e) {
            return [];                       // private mode, or storage disabled
        }
    }
    function save() {
        try {
            sessionStorage.setItem(STORE, JSON.stringify([...earned]));
        } catch (e) {
            /* nothing to do: the collection simply will not survive a reload */
        }
    }

    const nameOf = b => (b.id === 'now' ? badgeClockName() : b.label);

    /* The card's closing line reads "That is all six", in words, because the panel
       is prose and prose spells small numbers. It used to say "eight" as a literal
       and went stale twice — once when the scatter badge was cut and once when Jet
       Lagged was — each time telling a reader who had found everything that they
       had not. Derived from BADGES.length now, like every other count on the page.
       The fallback digit is unreachable at any plausible size and exists only so
       that adding badges cannot produce "That is all undefined". */
    const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
                   'eight', 'nine', 'ten', 'eleven', 'twelve'];
    const spell = n => WORDS[n] || String(n);

    /* Locked slots stay anonymous: a ghosted medal and nothing else, so the tray
       shows how much is left without spoiling what any of it is. The hint lives
       in the title attribute for anyone who hovers, and on the card once found. */
    /* The stars that cross a badge as it is found. Two groups doing different
       jobs: a ring that sweeps around the rim, and a burst that flies outward.
       Written once into every slot and left inert — the CSS only runs them while
       the slot carries .pop — so nothing has to be created mid-animation.
         --a  the angle it sits at, and travels along
         --m  a multiplier on how far it goes, so the burst is not a neat circle
         --sz its size
         --i  its place in the queue, which staggers the start */
    const STAR_RING = 6;
    const STAR_BURST = 14;

    function starLayer() {
        const ring = Array.from({ length: STAR_RING }, (_, i) => {
            const a = (360 / STAR_RING) * i;
            return `<i class="bdg-star r" style="--a:${a}deg;--sz:${i % 2 ? 8 : 11}px;--i:${i}"></i>`;
        }).join('');
        const burst = Array.from({ length: STAR_BURST }, (_, i) => {
            // an uneven spread reads as a scatter rather than a fan
            const a = (360 / STAR_BURST) * i + (i % 3) * 7;
            const m = [1, 0.72, 1.18, 0.88][i % 4];
            const sz = [7, 10, 5, 8][i % 4];
            return `<i class="bdg-star b" style="--a:${a}deg;--m:${m};--sz:${sz}px;--i:${i}"></i>`;
        }).join('');
        return `<span class="bdg-stars" aria-hidden="true">
                    <span class="bdg-ring">${ring}</span>${burst}
                </span>`;
    }

    /* Built once. Rebuilding the tray on every change would restart the DOM under
       any slot still mid-disclosure, so updates are made in place instead: two
       badges landing seconds apart each get to finish their own animation. */
    function buildTray() {
        tray.innerHTML = BADGES.map(b => `
            <li class="bdg ring-${b.ring}" data-id="${b.id}">
                <span class="bdg-meta">
                    <span class="bdg-kicker"></span>
                    <span class="bdg-name"></span>
                    <span class="bdg-stat"></span>
                </span>
                <span class="bdg-orb">
                    <span class="bdg-medal">
                        <svg viewBox="0 0 40 40" aria-hidden="true">${BADGE_ART[b.art]}</svg>
                    </span>
                    ${starLayer()}
                </span>
            </li>`).join('');
    }

    /* The disclosure runs a little under a second across three layers. Each slot
       clears its own class on its own timer, so a badge landing while another is
       still resolving cannot cut the first one short. */
    const POP_MS = 1500;
    const pops = new Map();                    // id -> timer

    /* anim is 'land' when the badge flew in and only has to touch down, 'pop' when
       it never left the tray and has to do the whole flourish in place. */
    function paintSlot(b, anim) {
        const li = tray.querySelector(`[data-id="${b.id}"]`);
        if (!li) return;
        const got = earned.has(b.id);
        li.classList.toggle('got', got);
        /* Found: the figure, which is the reward and the one thing not already on
           screen — the name sits on its own line in the slot, so a tooltip
           repeating it would say nothing. Locked: the hint.

           There was a `b.secret ? 'Hidden' : b.hint` branch here for the one badge
           that would not say what it wanted. That badge is gone and no other is
           secret, so every locked slot now names its own route. */
        li.title = got ? b.stat + ' · ' + b.fact : b.hint;
        li.querySelector('.bdg-meta').setAttribute('aria-hidden', got ? 'false' : 'true');
        li.querySelector('.bdg-kicker').textContent = got ? b.kicker : '';
        li.querySelector('.bdg-name').textContent = got ? nameOf(b) : '';
        li.querySelector('.bdg-stat').textContent = got ? b.stat : '';
        if (!anim) return;
        clearTimeout(pops.get(b.id));
        li.classList.remove('pop', 'land');
        void li.offsetWidth;                     // restart the animation cleanly
        li.classList.add(anim);
        pops.set(b.id, setTimeout(() => {
            li.classList.remove('pop', 'land');
            pops.delete(b.id);
        }, POP_MS));
    }

    function clearPops() {
        pops.forEach(t => clearTimeout(t));
        pops.clear();
        tray.querySelectorAll('.bdg.pop, .bdg.land')
            .forEach(li => li.classList.remove('pop', 'land'));
    }

    function render(justEarned, anim) {
        if (!tray) return;
        if (!tray.children.length) buildTray();
        if (!justEarned) clearPops();            // mount and reset start clean
        BADGES.forEach(b => paintSlot(b, b.id === justEarned ? (anim || 'pop') : null));
        if (count) {
            count.textContent = earned.size === BADGES.length
                ? `All ${BADGES.length} found`
                : `${earned.size} of ${BADGES.length} discovered`;
            if (justEarned) {
                count.classList.remove('bump');
                void count.offsetWidth;              // restart the animation
                count.classList.add('bump');
            }
        }
        if (justEarned && rail) {
            rail.classList.remove('flash');
            void rail.offsetWidth;
            rail.classList.add('flash');
            setTimeout(() => rail.classList.remove('flash'), 800);
        }
    }

    /* A tucked-away rail has no slot to aim at: parked off the right edge of the
       screen, the slot measures somewhere past innerWidth. So it opens before the
       badge sets off, not when it arrives.

       Returns how long to wait for it. Removing the class starts a 420ms slide, and
       deliver() reads the slot's position the moment it is called — so a badge sent
       off immediately would measure a panel still out in the margin, decide it was
       off screen, and skip the flight it was owed. The caller waits this out. Zero
       when the rail was already open, or when motion is off and there is no slide. */
    const RAIL_SLIDE = 460;                    // the CSS transition, plus a frame
    function openRail() {
        if (!rail || !rail.classList.contains('shut')) return 0;
        rail.classList.remove('shut');
        const t = document.getElementById('badges-toggle');
        if (t) {
            t.setAttribute('aria-expanded', 'true');
            t.setAttribute('aria-label', 'Hide the collection');
        }
        return still.matches ? 0 : RAIL_SLIDE;
    }

    /* ── the flight ──
       Reveal big at the centre of the viewport, then arc into the slot leaving a
       trail. Calls back with 'land' if it flew and 'pop' if it could not, so the
       slot knows whether to touch down or do the whole flourish in place. */
    const FLY_HOLD = 1300;                     // long enough for the starfall to finish
    const FLY_TRIP = 950;
    const still = matchMedia('(prefers-reduced-motion: reduce)');
    let flyer = null;

    function dropFlyer() {
        if (flyer) { flyer.remove(); flyer = null; }
        document.querySelectorAll('.bdg-trail').forEach(d => d.remove());
    }

    function deliver(b, done) {
        const li = tray && tray.querySelector(`[data-id="${b.id}"]`);
        const med = li && li.querySelector('.bdg-medal');
        const target = med && med.getBoundingClientRect();
        /* Three reasons to skip the trip and just light up the slot: motion is
           unwelcome, the rail is off screen so the badge would fly out of sight,
           or there is nothing to measure. Any of them and the badge still arrives. */
        const offscreen = !target || target.width < 4 ||
            target.bottom < 0 || target.top > innerHeight ||
            target.right < 0 || target.left > innerWidth;
        if (still.matches || offscreen) { done('pop'); return; }

        /* Held for the whole flight, not just the card. Besides putting the story
           behind the badge, it keeps the page still: --dx/--dy are measured at
           takeoff, and on a narrow screen the rail scrolls with the page, so a
           scroll mid-flight would land the badge where the slot used to be. */
        lockPage(true);
        showVeil(true);
        dropFlyer();
        const cx = innerWidth / 2, cy = innerHeight / 2;
        const dx = (target.left + target.width / 2) - cx;
        const dy = (target.top + target.height / 2) - cy;

        flyer = document.createElement('div');
        flyer.className = 'bdg-fly';
        flyer.setAttribute('aria-hidden', 'true');
        flyer.style.setProperty('--dx', dx.toFixed(1) + 'px');
        flyer.style.setProperty('--dy', dy.toFixed(1) + 'px');
        flyer.style.setProperty('--s', (target.width / 180).toFixed(3));
        flyer.style.setProperty('--t', FLY_TRIP + 'ms');
        flyer.innerHTML = `
            <div class="bdg-fly-y"><div class="bdg-fly-scale">
                <span class="bdg ring-${b.ring} got pop">
                    <span class="bdg-orb">
                        <span class="bdg-medal">
                            <svg viewBox="0 0 40 40" aria-hidden="true">${BADGE_ART[b.art]}</svg>
                        </span>
                        ${starLayer()}
                    </span>
                </span>
            </div></div>`;
        document.body.appendChild(flyer);

        const el = flyer;
        const go = setTimeout(() => {
            el.classList.add('go');
            const m = el.querySelector('.bdg-medal');
            const trail = setInterval(() => {
                const r = m.getBoundingClientRect();
                const d = document.createElement('div');
                d.className = 'bdg-trail';
                d.style.left = (r.left + r.width / 2) + 'px';
                d.style.top = (r.top + r.height / 2) + 'px';
                d.style.width = d.style.height = Math.max(5, r.width * 0.09) + 'px';
                document.body.appendChild(d);
                setTimeout(() => d.remove(), 750);
            }, 45);
            flights.add(trail);
            const arrive = setTimeout(() => {
                clearInterval(trail);
                if (flyer === el) { el.remove(); flyer = null; }
                done('land');
            }, FLY_TRIP);
            flights.add(arrive);
        }, FLY_HOLD);
        flights.add(go);
    }

    /* The reward for exploring is something to read: each card carries a figure
       from the data that appears nowhere else on the page. Cards queue, so two
       badges landing together do not fight over the screen. */
    function buildCard() {
        card = document.createElement('div');
        card.className = 'bdg-card-wrap';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'false');   // flipped to true while it is up
        card.setAttribute('aria-label', 'A badge was added to your collection');
        card.hidden = true;
        card.innerHTML = `
            <div class="bdg-card">
                <button class="bdg-close" type="button" aria-label="Close">&times;</button>
                <p class="bdg-card-head">Added to your collection</p>
                <div class="bdg-card-id">
                    <span class="bdg-medal" data-medal></span>
                    <span>
                        <span class="bdg-kicker" data-kicker></span>
                        <span class="bdg-name" data-name></span>
                        <span class="bdg-stat" data-stat></span>
                    </span>
                </div>
                <p class="bdg-card-fact" data-fact></p>
                <p class="bdg-card-foot" data-foot></p>
            </div>`;
        document.body.appendChild(card);
        const close = () => hide();
        card.querySelector('.bdg-close').addEventListener('click', close);
        card.addEventListener('click', e => { if (e.target === card) close(); });
        addEventListener('keydown', e => { if (e.key === 'Escape' && showing) close(); });
    }

    /* While a card is up the page underneath is blurred and pinned. The lock is
       held across a queue rather than released between cards, so two badges
       landing together do not let the page jump about in the gap. */
    let lastFocus = null;
    let veil = null;

    function lockPage(on) {
        document.documentElement.classList.toggle('bdg-locked', on);
    }

    /* The blur behind the flight. The card brings its own backdrop, so this one
       stands down when the card arrives rather than stacking a second blur on
       top of the first; both are opacity transitions, so they cross-fade. */
    function showVeil(on) {
        if (!veil) {
            if (!on) return;
            veil = document.createElement('div');
            veil.className = 'bdg-veil';
            veil.setAttribute('aria-hidden', 'true');
            document.body.appendChild(veil);
            void veil.offsetWidth;               // so the first fade has a start state
        }
        veil.classList.toggle('in', on);
    }

    function hide() {
        if (!card) return;
        card.classList.remove('in');
        card.setAttribute('aria-modal', 'false');
        showing = false;
        setTimeout(() => {
            card.hidden = true;
            if (queue.length) { show(queue.shift()); return; }
            lockPage(false);
            showVeil(false);
            /* Put the reader back where they were reading — the keyboard caret,
               not the viewport. preventScroll matters more here than anywhere
               else on the page: lastFocus is whatever the reader last touched,
               which for a badge earned in Chapter Three may well be the country
               picker back in Chapter One, and a bare focus() scrolls that
               element into view. The reader closed a card and got yanked two
               chapters up. */
            if (lastFocus && document.contains(lastFocus)) {
                lastFocus.focus({ preventScroll: true });
            }
            lastFocus = null;
        }, 320);
    }

    function show(b) {
        if (!card) buildCard();
        const medal = card.querySelector('[data-medal]');
        medal.className = 'bdg-medal got ring-' + b.ring;
        medal.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">${BADGE_ART[b.art]}</svg>`;
        card.querySelector('[data-kicker]').textContent = b.kicker;
        card.querySelector('[data-name]').textContent = nameOf(b);
        card.querySelector('[data-stat]').textContent = b.stat;
        card.querySelector('[data-fact]').textContent = b.fact;
        card.querySelector('[data-foot]').textContent = earned.size === BADGES.length
            ? `That is all ${spell(BADGES.length)}. Nothing left hidden.`
            : `${earned.size} of ${BADGES.length} discovered · ${BADGES.length - earned.size} still out there`;
        /* Remember where the reader was, but never remember the card's own close
           button: showing is already false when a queued card takes over, so
           without the containment check the second card would overwrite the
           real answer with the first card's furniture. */
        if (!showing && !card.contains(document.activeElement)) {
            lastFocus = document.activeElement;
        }
        lockPage(true);
        showVeil(false);                 // the card's own backdrop takes over here
        card.hidden = false;
        card.setAttribute('aria-modal', 'true');
        showing = true;
        /* Deliberately not requestAnimationFrame. The page is locked by the line
           above, so if the frame never came the reader would be left unable to
           scroll with no card to explain why — and frames do stop coming, in a
           background tab. Forcing the reflow here commits the shown-but-clear
           state synchronously, which is all the transition needs to have
           something to move from. */
        void card.offsetWidth;
        card.classList.add('in');
        // the close button is the only thing to do here, so start on it
        const btn = card.querySelector('.bdg-close');
        if (btn) btn.focus({ preventScroll: true });
    }

    const api = {
        mount(trayEl, countEl, railEl) {
            tray = trayEl; count = countEl; rail = railEl || null;
            // a found badge can be opened again: the figure is the point of it
            tray.addEventListener('click', e => {
                const li = e.target.closest('.bdg.got');
                if (!li || showing) return;
                const b = BADGES.find(x => x.id === li.dataset.id);
                if (b) show(b);
            });
            render();
        },
        // starts the clock; the badge itself lands REVEAL_DELAY later
        earn(id) {
            if (earned.has(id) || pending.has(id) || !BADGES.some(b => b.id === id)) return;
            pending.set(id, setTimeout(() => {
                pending.delete(id);
                if (earned.has(id)) return;              // reset while it was in flight
                earned.add(id);
                save();
                const b = BADGES.find(x => x.id === id);
                // give the badge somewhere to land, and let it slide back in first
                const wait = openRail();
                const fly = () => deliver(b, anim => {
                    render(id, anim);             // the slot fills as it arrives
                    const lag = setTimeout(() => {
                        lags.delete(lag);
                        if (!earned.has(id)) return;   // reset while the card was queued
                        if (showing) queue.push(b); else show(b);
                    }, CARD_LAG);
                    lags.add(lag);
                });
                /* Tracked in `flights` like every other timer here, so a reset while
                   the rail is still sliding cancels the trip instead of launching a
                   badge into a collection that has just been emptied. */
                if (!wait) { fly(); return; }
                const open = setTimeout(() => { flights.delete(open); fly(); }, wait);
                flights.add(open);
            }, REVEAL_DELAY));
        },
        has: id => earned.has(id),
        count: () => earned.size,
        // restoring on reload must not replay the cards, so nothing pops here
        reset() {
            pending.forEach(t => clearTimeout(t));
            pending.clear();
            lags.forEach(t => clearTimeout(t));
            lags.clear();
            // a badge in mid-air belongs to a collection that no longer exists
            flights.forEach(t => { clearTimeout(t); clearInterval(t); });
            flights.clear();
            dropFlyer();
            showVeil(false);
            // a flight with no card behind it still left the page pinned
            if (!showing) lockPage(false);
            queue.length = 0;
            earned.clear();
            save();
            render();
            // a card left open would be showing off a badge no longer in the tray
            if (showing) hide();
        }
    };
    return api;
})();

function initBadges() {
    const tray = document.getElementById('badge-tray');
    if (!tray) return;
    const rail = document.getElementById('badges');
    Badges.mount(tray, document.getElementById('badge-count'), rail);

    /* How the badges work is worth reading once and then never again, so it hides
       behind an i. It reads on hover and on keyboard focus — pure CSS, no handler
       here: the note is a role="tooltip" shown by :hover / :focus-visible on the i,
       so there is no open/closed state for script to track. */

    /* The rail can be tucked away, because a panel pinned to the edge of a long
       read should be dismissible. It slides off the right edge of the screen and
       leaves its tab behind — see `.badges.shut` in the stylesheet — so the only
       state script owns is the class and the button's two labels. Only offered where
       it actually is a rail: at narrow widths the collection sits in the flow, with
       nothing to the side of it to slide into.
       The state rides along in sessionStorage with the collection itself. */
    const toggle = document.getElementById('badges-toggle');
    if (toggle && rail) {
        const SHUT = 'adl-collection-shut';
        const set = (isShut, remember) => {
            rail.classList.toggle('shut', isShut);
            toggle.setAttribute('aria-expanded', String(!isShut));
            toggle.setAttribute('aria-label', isShut ? 'Show the collection' : 'Hide the collection');
            if (remember) { try { sessionStorage.setItem(SHUT, isShut ? '1' : '0'); } catch (e) {} }
        };
        let shut = false;
        try { shut = sessionStorage.getItem(SHUT) === '1'; } catch (e) {}
        set(shut, false);
        toggle.addEventListener('click', () => set(!rail.classList.contains('shut'), true));
    }

    /* `now` used to be earned by an IntersectionObserver on #sec-now — the one badge
       that needed no input, awarded for scrolling far enough. It is earned by
       scrubbing the day ribbon now (see initRightNow), which makes every badge in
       the collection answer a real interaction and removes the exception this file
       used to have to explain. Nothing replaces the observer here. */
}

/**
 * Read a palette token. Canvas and SVG presentation attributes cannot resolve
 * var(), so anything drawn rather than styled has to ask for the value — and ask
 * rather than keep its own copy, or it quietly falls a palette behind.
 */
function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** '#1A2B3C' or 'rgb(1, 2, 3)' -> [r, g, b], for interpolating between tokens. */
function toRgb(c) {
    c = c.trim();
    if (c[0] === '#') {
        let h = c.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const m = c.match(/-?[\d.]+/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2]];
}

/**
 * One row per country, shared by the metric strip, the money-and-mood scatter
 * and the rank chart so they cannot disagree about who is in the sample.
 *
 * Takes the list to use, because the sample is no longer the same for every
 * chart: the ones that need a happiness score get HAPPY_COUNTRIES and the rest
 * get all 35.
 */
function countryRows(list) {
    return (list || COUNTRIES).map(name => {
        const d = ADL.countries[name];
        return {
            name: nice(name),
            work: d.minutes.PAW + d.minutes.UPW,
            paid: d.minutes.PAW,
            unpaid: d.minutes.UPW,
            sleep: d.minutes.PCA,
            leisure: d.minutes.LEI,
            happy: d.happiness,
            /* No gdp here any more: the money-and-mood scatter was its only reader.
               DNA_SCORES still takes d.gdp straight from the data for the quiz's
               Income axis, so the field itself is very much alive. */
            tourism: d.tourism
        };
    });
}

/**
 * Metric strip — one measure, every country with a score, on a single line.
 *
 * There were two of these, happiness and life expectancy, drawn by the same code
 * so a reader learned the form once and read it twice. Life expectancy went first,
 * replaced by a GDP scatter; that scatter has now gone too. This strip is what is
 * left of the chapter's opening measure, and it hands straight to the rankings.
 *
 * Labels are pushed apart along the axis with a leader back to the true mark, so
 * crowding never costs accuracy. At 34 marks instead of 12 the crowding is the
 * normal case rather than the exception, which is what the tiering is for.
 */
function initMetricStrips() {
    if (!window.ADL) return;
    const rows = countryRows(HAPPY_COUNTRIES);
    if (rows.length < 2) return;

    const STRIPS = [
        {
            host: 'mt-happy', read: 'mt-happy-read', cap: 'mt-happy-cap', badge: 'ladder',
            get: c => c.happy, fmt: v => v.toFixed(2), unit: '',
            ticks: [4, 5, 6, 7, 8], tickFmt: v => String(v),
            /* What a mark is, then which way is up. The Cantril definition, the n=34 caveat
               and the citation used to be appended here; they are now a .source note under
               the figure in index.html, so this caption answers "what am I looking at" and
               nothing else. capTitle sets as its own line: .fig-cap b is display:block. */
            capTitle: 'Every dot is one country.',
            capBody: 'The farther right, the happier people rate their own lives.'
        }
    ];

    STRIPS.forEach(cfg => {
        const host = document.getElementById(cfg.host);
        const read = document.getElementById(cfg.read);
        const cap = document.getElementById(cfg.cap);
        if (!host) return;

        const vals = rows.map(cfg.get);
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        /* The dots were using 84.5% of the viewBox and the differences between countries
           were the whole point of the chart, so the plot was widened to take nearly all of
           it: side margins 28 → 12, and the breathing room beyond the extremes from 6% of
           the range to 1%. India now sits at x≈22 and Finland at x≈1018, a span of 996
           units against 879 before — 13% more room, and with the card's own padding pulled
           in a little it comes to about 16% on screen.
           H went 168 → 178 because the average label sits at AXIS+34 = 162 and had six
           units of air under it. */
        const pad = (hi - lo) * 0.01 || 1;
        const W = 1040, L = 12, R = 12;
        const X = v => L + ((v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (W - L - R);

        const ranked = [...rows].sort((a, b) => cfg.get(b) - cfg.get(a));
        const top = ranked[0], bottom = ranked[ranked.length - 1];

        /* Labels sit directly above their own mark and the leader drops straight
           down, so nothing leans. Since a vertical leader cannot move sideways to
           make room, crowding is solved in the other axis instead: each label
           takes the lowest tier where its text box clears the last label already
           on that tier. Near the ends the text anchor flips rather than the
           label shifting, which keeps the leader vertical there too. */
        const TIER = 16, PADX = 9;
        const width = n => n.length * 6.2 + PADX * 2;
        const tiers = [];                              // rightmost edge used per tier
        const placed = rows.map(c => ({ name: c.name, x: X(cfg.get(c)) }))
            .sort((a, b) => a.x - b.x)
            .map(o => {
                const w = width(o.name);
                // anchor flips at the edges so the box stays inside the stage
                const anchor = o.x - w / 2 < L ? 'start' : o.x + w / 2 > W - R ? 'end' : 'middle';
                const left = anchor === 'start' ? o.x : anchor === 'end' ? o.x - w : o.x - w / 2;
                let tier = 0;
                while (tiers[tier] !== undefined && left < tiers[tier]) tier++;
                tiers[tier] = left + w;
                return { ...o, anchor, tier };
            });
        const maxTier = Math.max(...placed.map(o => o.tier));

        /* AXIS is derived from the label stack, not fixed. It was a hard-coded 128, and at
           34 countries the names need eight tiers: the topmost baseline landed at
           128 − 30 − 7×16 = −14, so the top row painted 18px ABOVE the svg and straight
           over the ladder label sitting outside it. (The svg is overflow:visible, which is
           why it escaped rather than being clipped.)
           Topmost baseline is AXIS − 30 − maxTier×TIER, and it needs about 14 units to keep
           its ascenders inside, hence 44. Below the axis the ticks reach AXIS+22 and the
           average label AXIS+34, so H leaves 44. With eight tiers that gives AXIS 156,
           H 200; a shorter stack now yields a shorter chart instead of dead space. */
        const AXIS = 44 + maxTier * TIER;
        const H = AXIS + 44;

        let s = '';
        cfg.ticks.forEach(t => {
            if (t < lo - pad || t > hi + pad) return;
            s += `<line class="mt-tick" x1="${X(t)}" y1="${AXIS - 30}" x2="${X(t)}" y2="${AXIS + 8}"/>`;
            s += `<text class="mt-tickl" x="${X(t)}" y="${AXIS + 22}" text-anchor="middle">${cfg.tickFmt(t)}</text>`;
        });
        // the average, so a reader can see who is above and below it
        s += `<line class="mt-mean" x1="${X(mean)}" y1="${AXIS - 34}" x2="${X(mean)}" y2="${AXIS + 8}"/>`;
        s += `<text class="mt-meanl" x="${X(mean)}" y="${AXIS + 34}" text-anchor="middle">average ${cfg.fmt(mean)}</text>`;
        s += `<line class="mt-axis" x1="${L}" y1="${AXIS}" x2="${W - R}" y2="${AXIS}"/>`;

        placed.forEach(o => {
            const ly = AXIS - 30 - (maxTier - o.tier) * TIER;
            s += `<line class="mt-lead" data-name="${o.name}" x1="${o.x}" y1="${AXIS - 11}"
                  x2="${o.x}" y2="${ly + 4}"/>`;
            s += `<text class="mt-name" data-name="${o.name}" x="${o.x}" y="${ly}"
                  text-anchor="${o.anchor}">${o.name}</text>`;
        });
        /* No hi/lo class at render time. The two extremes are marked after the strip has
           faded in, so the reader watches Finland and then India separate themselves from a
           field that starts out uniform. Doing it with a CSS animation on `fill` instead
           would have been simpler and wrong: an animation with fill-mode holds its end value
           at a higher priority than any normal declaration, so `.mt-dot.on` would stop
           working and the chart would never highlight on hover again. */
        rows.forEach(c => {
            s += `<circle class="mt-dot" data-name="${c.name}" cx="${X(cfg.get(c))}" cy="${AXIS}" r="7"/>`;
        });

        host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
            aria-label="${rows.length} countries on one scale">${s}</svg>`;
        const el = host.querySelector('svg');

        /* Three labelled lines rather than one sentence. As prose — "Finland leads at 7.82,
           Bulgaria trails at 5.37. All 34 average 6.45." — the three numbers had to be dug
           out of the grammar; stacked and labelled, the top, the bottom and the middle of the
           scale read at a glance. .mt-read carries a min-height sized to hold all three, so
           swapping to the one-line hover state does not move the caption underneath. */
        const idle = () => {
            read.innerHTML =
                `<b>${top.name}</b> <em>${cfg.fmt(cfg.get(top))}${cfg.unit}</em><br>` +
                `<b>${bottom.name}</b> <em>${cfg.fmt(cfg.get(bottom))}${cfg.unit}</em><br>` +
                `Average across all ${rows.length} <em>${cfg.fmt(mean)}${cfg.unit}</em>`;
        };
        function show(name) {
            const c = rows.find(x => x.name === name);
            if (!c) return;
            const rank = ranked.findIndex(x => x.name === name) + 1;
            const diff = cfg.get(c) - mean;
            read.innerHTML = `<b>${c.name}</b>: <em>${cfg.fmt(cfg.get(c))}${cfg.unit}</em>,
                ${rank} of ${rows.length}, ${Math.abs(diff) < 0.05 ? 'level with' :
                    (diff > 0 ? cfg.fmt(diff) + ' above' : cfg.fmt(-diff) + ' below')} the average.`;
            el.querySelectorAll('[data-name]').forEach(n =>
                n.classList.toggle('on', n.dataset.name === name));
        }
        const inspect = e => {
            const t = e.target.closest('[data-name]');
            if (!t) return;
            show(t.dataset.name);
            Badges.earn(cfg.badge);
        };
        el.addEventListener('mouseover', inspect);
        el.addEventListener('click', inspect);          // touch, and keyboard-ish taps
        el.addEventListener('mouseleave', () => {
            el.querySelectorAll('[data-name]').forEach(n => n.classList.remove('on'));
            idle();
        });
        idle();
        if (cap) cap.innerHTML = `<b>${cfg.capTitle}</b> ${cfg.capBody}`;

        /* ── the reveal ────────────────────────────────────────────────────────
           Four beats once the strip is on screen: the dots fade in as one
           undifferentiated field, then the highest separates itself, then the
           lowest, then the names. A reader who arrives at a finished chart has to
           be told where to look; a reader who watches it assemble has already
           looked. The fade and the name timings are CSS, keyed off .in — only the
           two emphasis classes are set here, because they have to stay ordinary
           class changes for hover to keep overriding them.

           Reduced motion is honoured by doing all of it at once: the stylesheet
           already zeroes the animations, so the classes go on immediately rather
           than arriving in a sequence nobody asked to watch. */
        const calm = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const mark = () => {
            const hit = n => el.querySelector(`.mt-dot[data-name="${n}"]`);
            const a = hit(top.name), b = hit(bottom.name);
            if (calm) { if (a) a.classList.add('hi'); if (b) b.classList.add('lo'); return; }
            setTimeout(() => { if (a) a.classList.add('hi'); }, 620);
            setTimeout(() => { if (b) b.classList.add('lo'); }, 900);
        };
        let started = false;
        /* Two ways in, and they are not the same thing. `start` plays the sequence and
           belongs to the reader arriving; `bail` just makes the chart visible. The old
           code used one for both, so the safety timer PLAYED the entrance — 34 dots
           cascading four screens below the fold while the reader was still on the
           cover, and a finished chart by the time they got there. */
        const reveal = () => { started = true; host.classList.add('in'); };
        const start = () => { if (!started) { reveal(); mark(); } };
        const bail = () => {
            if (started) return;
            started = true;
            /* Dropping .staged un-hides without animating: the hidden state hangs off
               that class, so removing it leaves the dots at their natural opacity and
               no keyframe ever runs. .in is not added, so nothing is staged to fade. */
            host.classList.remove('staged');
            mark();
        };
        if (calm || !('IntersectionObserver' in window)) {
            start();
        } else {
            /* .staged is what hides the dots, so it goes on only now — with the observer
               armed and a fallback behind it. If the observer never fired the chart
               would sit empty, so the fallback is a floor rather than a nicety. It is
               generous now (12s) and no longer animates, because its only job is to
               guarantee the chart is never blank; the entrance itself waits for the
               reader however long that takes. */
            host.classList.add('staged');
            const obs = new IntersectionObserver(es => es.forEach(e => {
                if (e.isIntersecting) { start(); obs.disconnect(); }
            }), { threshold: 0.25 });
            obs.observe(host);
            setTimeout(bail, 12000);
        }
    });
}

/**
 * Rank slope chart — 34 countries, four measures, plotted by rank.
 *
 * Rank rather than value on purpose. With value scales, every axis has its own
 * range, so a line's height on one axis means nothing on the next and following
 * a line invites a false reading. Evenly spaced rank slots give all four axes one
 * shared scale, which is what makes the crossings legible: a crossing is two
 * countries swapping order, nothing else.
 *
 * Ranks are by size, not merit. Only one of the four measures has an obvious good
 * direction, so the axes read "most" to "least" and the caption says so.
 *
 * The hard part at 34 lines. Twelve lines could all be drawn at full strength and
 * still be followed; 34 cannot, and drawing them that way produces a texture that
 * hides the one thing the section exists to say. So the default state names the
 * argument instead of burying it: the four countries that come first on the four
 * measures are drawn, everyone else is context. Hovering or picking still isolates
 * any of the 34, so nothing is hidden — it is only quiet until asked for.
 */
function initRankParallel() {
    const host = document.getElementById('pc-chart');
    if (!host || !window.ADL) return;

    const shortName = n => n.startsWith('China') ? 'China'
        : n === 'United Kingdom' ? 'UK' : n === 'United States' ? 'US' : n;
    const hhmm = m => Math.floor(m / 60) + 'h' + String(Math.round(m % 60)).padStart(2, '0');

    /* Happiness is one of the four columns, so this chart needs a ladder score and
       runs on the 34 rather than all 35. Luxembourg is the one country in the file
       that keeps a diary without one. */
    const rows = HAPPY_COUNTRIES.map(name => {
        const d = ADL.countries[name];
        return {
            name: shortName(name),
            work: d.minutes.PAW + d.minutes.UPW,
            sleep: d.minutes.PCA,
            leisure: d.minutes.LEI,
            happy: d.happiness
        };
    });
    if (rows.length < 2) return;

    const AX = [
        { label: 'Work',      get: c => c.work,    fmt: hhmm },
        { label: 'Sleep',     get: c => c.sleep,   fmt: hhmm },
        { label: 'Leisure',   get: c => c.leisure, fmt: hhmm },
        { label: 'Happiness', get: c => c.happy,   fmt: v => v.toFixed(2) }
    ];
    // rank 1 = most of that measure
    const RANK = AX.map(a => {
        const order = [...rows].sort((x, y) => a.get(y) - a.get(x));
        const map = new Map();
        order.forEach((c, i) => map.set(c.name, i + 1));
        return map;
    });
    /* Who comes first on each measure, and the set of them. Counted, never typed:
       the section's whole claim is that this set has more than one member, and if
       the data ever changed so that one country swept the board, the chart and the
       sentence under it would both say so instead of the sentence lying. */
    const firstOn = i => rows.find(c => RANK[i].get(c.name) === 1).name;
    const WINNERS = new Set(AX.map((a, i) => firstOn(i)));

    /**
     * A colour per country, taken from the page palette rather than invented.
     *
     * The ramp runs slate -> slate pale -> copper pale -> copper, which is the
     * same warm/cool logic the day charts use, so the colour is not decoration:
     * position on the ramp is the country's rank for total work. Cool lines are
     * the countries that work least, warm ones the countries that work most.
     * Rainbow hues said nothing; steps along this ramp say
     * "how much of your day is spoken for".
     */
    const RAMP = [token('--support'), token('--support-pale'),
                  token('--accent-pale'), token('--accent')].map(toRgb);
    function ramp(t) {
        const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1);
        const i = Math.min(RAMP.length - 2, Math.floor(x));
        const f = x - i;
        const c = RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * f));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
    // least work at the cool end, most work at the warm end
    const workOrder = [...rows].sort((a, b) => a.work - b.work).map(c => c.name);
    const tone = new Map(rows.map(c => [c.name,
        ramp(workOrder.indexOf(c.name) / Math.max(1, rows.length - 1))]));
    const colour = i => tone.get(rows[i].name);
    const colourOf = name => tone.get(name) || tone.get(rows[0].name);

    /* Height follows the country count rather than being fixed at the 420 that
       suited twelve. Below about 15px a rank slot, the left-hand labels have to be
       pushed so far to clear each other that the leader lines stop pointing at
       anything believable. */
    const GAP = 15;
    const W = 940, L = 118, R = 74, T = 58, B = 40,
          H = T + (rows.length - 1) * GAP + B;
    const X = i => L + (i / (AX.length - 1)) * (W - L - R);
    const Y = r => T + ((r - 1) / (rows.length - 1)) * (H - T - B);

    /**
     * Catmull-Rom to cubic bezier with both control points clamped in y to the
     * span of the segment's endpoints. Unclamped, a line running 1st, 3rd, 1st
     * bulges past its own highest point, and at 1st place there is no headroom
     * left so the curve escapes the plot. A bezier is bounded by its control
     * polygon, so clamping the controls bounds the curve.
     */
    function spline(pts) {
        if (pts.length < 3) return 'M' + pts.map(p => p.join(',')).join(' L');
        let d = `M${pts[0][0]},${pts[0][1]}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i], p1 = pts[i];
            const p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.26;
            const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);
            const cl = y => Math.max(lo, Math.min(hi, y));
            d += ` C${p1[0] + (p2[0] - p0[0]) * t},${cl(p1[1] + (p2[1] - p0[1]) * t)}`
               + ` ${p2[0] - (p3[0] - p1[0]) * t},${cl(p2[1] - (p3[1] - p1[1]) * t)}`
               + ` ${p2[0]},${p2[1]}`;
        }
        return d;
    }

    /**
     * Labels on one axis always collide somewhere, and at 34 they collide
     * everywhere. Push them apart until each has room, then draw a leader back to
     * the true point, so moving a label costs no accuracy.
     */
    function declash(items, gap, lo, hi) {
        const out = items.map(o => ({ ...o, ly: o.y })).sort((a, b) => a.ly - b.ly);
        for (let pass = 0; pass < 60; pass++) {
            let moved = false;
            for (let i = 1; i < out.length; i++) {
                const d = out[i].ly - out[i - 1].ly;
                if (d < gap) {
                    const push = (gap - d) / 2;
                    out[i - 1].ly -= push; out[i].ly += push; moved = true;
                }
            }
            if (out[0].ly < lo) { const s = lo - out[0].ly; out.forEach(o => { o.ly += s; }); }
            const last = out[out.length - 1];
            if (last.ly > hi) { const s = last.ly - hi; out.forEach(o => { o.ly -= s; }); }
            if (!moved) break;
        }
        return out;
    }

    let s = '';
    AX.forEach((a, i) => {
        s += `<line class="pc-web" x1="${X(i)}" y1="${T - 12}" x2="${X(i)}" y2="${H - B + 8}"/>`;
        s += `<text class="pc-axl" x="${X(i)}" y="${T - 30}" text-anchor="middle">${a.label}</text>`;
        s += `<text class="pc-axs" x="${X(i)}" y="${T - 17}" text-anchor="middle">most</text>`;
        s += `<text class="pc-axs" x="${X(i)}" y="${H - B + 22}" text-anchor="middle">least</text>`;
    });

    const laid = rows.map((c, ci) => ({
        c, ci, pts: AX.map((a, i) => [X(i), Y(RANK[i].get(c.name))])
    }));
    laid.forEach(r => {
        const d = spline(r.pts);
        s += `<path class="pc-hit" data-name="${r.c.name}" d="${d}"/>`;
        s += `<path class="pc-line" data-name="${r.c.name}" d="${d}" stroke="${colour(r.ci)}"/>`;
        r.pts.forEach(p => {
            s += `<circle class="pc-dot" data-name="${r.c.name}" cx="${p[0]}" cy="${p[1]}"
                  r="4" fill="${colour(r.ci)}"/>`;
        });
    });
    /* The winner's name printed at its own first-place dot, on every axis.
       Without this the resting state is unreadable: the line colour is the ramp
       position for total work, which was meaningful when all twelve were drawn but
       leaves three of the four winners in the cool half and indistinguishable from
       each other. The sentence above the chart names them, and this is what ties
       each name to its line. */
    AX.forEach((a, i) => {
        const name = firstOn(i);
        const last = i === AX.length - 1;
        s += `<text class="pc-win" data-name="${name}" x="${X(i) + (last ? -9 : 9)}" y="${Y(1) + 4}"
              text-anchor="${last ? 'end' : 'start'}">${name}</text>`;
    });

    // names on the left, against the first axis, as in the sample
    declash(laid.map(r => ({ name: r.c.name, ci: r.ci, y: r.pts[0][1] })),
            13, T - 4, H - B + 4)
        .forEach(o => {
            s += `<line class="pc-lead" data-name="${o.name}" x1="${L - 8}" y1="${o.y}"
                  x2="${L - 30}" y2="${o.ly}"/>`;
            s += `<text class="pc-nml" data-name="${o.name}" x="${L - 34}" y="${o.ly + 3.5}"
                  text-anchor="end" fill="${colour(o.ci)}">${o.name}</text>`;
        });

    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
        aria-label="Rank position of ${rows.length} countries across ${AX.length} measures">${s}</svg>`;

    const el = host.querySelector('svg');
    const read = document.getElementById('pc-read');
    const pick = document.getElementById('pc-pick');
    if (pick) {
        pick.innerHTML = rows.map((c, i) =>
            `<button type="button" data-n="${c.name}"><span style="color:${colour(i)}">\u25CF</span> ${c.name}</button>`).join('');
    }

    function highlight(name) {
        if (name) Badges.earn('ranks');
        el.querySelectorAll('.pc-line').forEach(l => {
            const win = WINNERS.has(l.dataset.name);
            const me = l.dataset.name === name;
            l.classList.toggle('on', name ? me : win);
            l.classList.toggle('off', !!name && !me);
            // the resting state: everyone who is not a winner is faint context
            l.classList.toggle('ghost', !name && !win);
        });
        // dots appear for the picked country, or for the winners when nothing is picked
        el.querySelectorAll('.pc-dot').forEach(d =>
            d.classList.toggle('on', name ? d.dataset.name === name : WINNERS.has(d.dataset.name)));
        el.querySelectorAll('.pc-nml, .pc-lead').forEach(n => {
            n.style.opacity = name
                ? (n.dataset.name === name ? '1' : '0.15')
                : (WINNERS.has(n.dataset.name) ? '1' : '0.4');
        });
        if (pick) {
            pick.querySelectorAll('button').forEach(b => {
                const on = b.dataset.n === name;
                b.style.background = on ? colourOf(b.dataset.n) : 'transparent';
                b.style.color = on ? 'var(--ink-deep)' : '';
                b.style.borderColor = on ? colourOf(b.dataset.n) : '';
                b.classList.toggle('on', on);
            });
        }
        if (!read) return;
        if (!name) {
            /* Written from the ranks rather than typed, so it cannot drift from the
               chart: whoever comes first is named here because they came first. */
            read.innerHTML = '<span>' + rows.length + ' countries, ' + AX.length +
                ' measures. <b>Four different countries come first, and not one of them ' +
                'stays there.</b></span>' + AX.map((a, i) =>
                `<span>${a.label} <em>${firstOn(i)}</em></span>`).join('');
            return;
        }
        const c = rows.find(x => x.name === name);
        read.innerHTML = `<b>${c.name}</b>` + AX.map((a, i) =>
            `<span>${a.label} <em>${a.fmt(a.get(c))}</em> <em>#${RANK[i].get(name)}</em></span>`).join('');
    }

    el.addEventListener('mouseover', e => {
        const t = e.target.closest('[data-name]');
        if (t) highlight(t.dataset.name);
    });
    el.addEventListener('mouseleave', () => highlight(null));
    if (pick) {
        pick.addEventListener('click', e => {
            const b = e.target.closest('button[data-n]');
            if (b) highlight(b.classList.contains('on') ? null : b.dataset.n);
        });
    }
    highlight(null);
}

// ── Cover: build the 24-hour clock arc SVG ──
function buildCoverClock(svg) {
    const cx = 150, cy = 150, r = 120;
    const circ = 2 * Math.PI * r;
    svg.innerHTML = `
        <circle class="cc-track" cx="${cx}" cy="${cy}" r="${r}" stroke-width="3"/>
        <circle class="cc-arc" cx="${cx}" cy="${cy}" r="${r}" stroke-width="4"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
            transform="rotate(-90 ${cx} ${cy})"/>
        <line class="cc-hand" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r + 14}"/>
        <circle class="cc-hub" cx="${cx}" cy="${cy}" r="4"/>`;
}

/* initMoneyMood() stood here: GDP per capita on a log axis against the happiness
   ladder, a least-squares fit and Pearson r over the 34 countries with a score.
   Removed with the income argument in Chapter Two. Its readout and caption were
   generated in here, which is why COPY.md Part 2 lost two blocks. */

/**
 * The whole American day, opened — the one place this story can take a bar apart.
 *
 * Every other chart here treats the day as five numbers, because the OECD file has
 * five measures and no more. The American Time Use Survey publishes 431 activity
 * codes, so for exactly one of the 35 countries every block can be taken apart, not
 * just leisure. That is the section's reason to exist and also its limitation, which
 * the captions say plainly.
 *
 * One visualisation, three levels deep, in the order the questions arrive:
 *
 *   level 1  the day as five blocks — the only thing drawn on arrival
 *   level 2  the chosen block as its activities
 *   level 3  the chosen activity as Overview | By age | By sex
 *
 * Three separate charts stood here before: the stacked day, all forty-four activities
 * at once, and four hand-picked lines by age band. The middle one was the problem —
 * forty-four rows at equal visual weight is a list, not a chart, and nothing told the
 * reader which of them to care about. Now the detail is built only when it is asked
 * for, and the age and sex numbers hang off whatever the reader chose rather than
 * sitting further down the page as unrelated visuals. Same data, drawn on demand.
 *
 * The prose around it went the same way. This function used to write two paragraphs
 * and three callout rows of fixed findings into the page on load — the split of the
 * day, television's share, where the retirement hours go, the sex gap. All of it was
 * true and all of it pre-empted the interaction: the reader was told the answer, then
 * offered a control for checking it. What is left is one callout, rewritten by
 * paintWow() from the state, so the surprise belongs to whatever the reader opened
 * and to the tab they are reading it on.
 */
function initDayUS() {
    const host = document.getElementById('du-bar');
    if (!host || !window.DAY_US) return;
    const D = window.DAY_US, M = window.DAY_US_META;

    const hm = v => {
        const h = Math.floor(v / 60), m = Math.round(v % 60);
        return h ? h + 'h' + String(m).padStart(2, '0') : m + 'm';
    };
    const pct = v => (v / M.grand * 100).toFixed(1) + '%';
    /* Counts inside a sentence read as words, not digits. Its own copy rather than
       the one in the Badges module, which is closed over there and counts to twelve;
       this one has to reach the fourteen rows of the open leisure block. Above that
       range a digit is fine — "the 23 smallest activities" is a number, not a count
       a reader holds in their head. */
    const COUNT = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
                   'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen'];
    const spell = n => COUNT[n] || String(n);
    /* One colour per block, from the same five the day card uses, so a reader who
       has already met the stacked bar upstairs does not have to learn it twice. */
    const TONE = {
        PCA: 'var(--care)', PAW: 'var(--paid)', UPW: 'var(--unpaid)',
        LEI: 'var(--leisure)', OTH: 'var(--other)'
    };

    const crumb = document.getElementById('du-crumb');
    const open  = document.getElementById('du-open');
    const ask   = document.getElementById('du-ask');
    const wow   = document.getElementById('du-wow');

    /* Where the reader is: which block is open, which activity inside it, and which
       of the three tabs. All three null is level one, and every render reads from
       here rather than from the DOM, so there is one description of the state. */
    let atBlock = null, atAct = null, atTab = 'overview';

    /* ── leisure opens finer than the rest ──
       The tier-2 spine files most of leisure under one group, "Relaxing: TV, reading,
       games", holding 3h50 — and the whole point of this section is that television
       is most of that. Seeing it needs the six-digit codes the spine does not reach,
       which is what D.leisure holds, with the same age and sex profiles as everything
       else.

       Note what D.leisure is and is not: it is a finer partition of the WHOLE leisure
       block, not a sub-split of that one group — its twelve items sum to 298.3
       minutes against the group's 229.8. What it leaves out is volunteering and
       religion, so those two come back from the spine and the fourteen rows sum to
       the block total. Opening leisure therefore skips the umbrella group entirely
       and hands the reader Television at 2h43 as the top row, which is the finding
       the section is here to make. No other block has a finer split to give. */
    const LEI_ROWS = D.leisure.labels.map(l => ({
        key: 'fin-' + l.key,
        label: l.label,
        min: D.leisure.overall[l.key],
        sex: [D.leisure.bySex.men[l.key], D.leisure.bySex.women[l.key]],
        age: D.leisure.byAge.map(b => b.items[l.key]),
        block: 'LEI'
    })).concat(D.groups.filter(g => g.key === '15xx' || g.key === '14xx'))
       .sort((a, b) => b.min - a.min);

    const actsIn = key => (key === 'LEI'
        ? LEI_ROWS
        : D.groups.filter(g => g.block === key).slice().sort((a, b) => b.min - a.min));

    const blockOf = key => D.blocks.find(b => b.key === key);
    const actOf = key => {
        if (!key) return null;
        return LEI_ROWS.find(r => r.key === key) ||
               D.groups.find(g => g.key === key) || null;
    };

    // ── level 1 · the day as one bar, every block a button ───
    /* Real buttons rather than styled spans: they are the primary control of the
       section, so they belong in the tab order and must answer to Enter and Space
       without any key handling written here. */
    function paintDay() {
        host.innerHTML = D.blocks.map(b =>
            `<button type="button" data-block="${b.key}"
                     class="lu-seg${atBlock === b.key ? ' on' : ''}"
                     style="width:${b.min / M.grand * 100}%;background:${TONE[b.key]}"
                     aria-pressed="${atBlock === b.key}"
                     title="${b.label}: ${hm(b.min)} — open it"><span class="vh">Open
                     ${b.label}, ${hm(b.min)}</span></button>`).join('');
        const key = document.getElementById('du-key');
        if (key) {
            key.innerHTML = D.blocks.map(b =>
                `<span${atBlock === b.key ? ' class="on"' : ''}><i
                  style="background:${TONE[b.key]}"></i>${b.label}
                 <b>${hm(b.min)}</b></span>`).join('');
        }
        /* The instruction is only true while nothing is open, and a line that keeps
           telling a reader to do what they have already done reads as a bug. So it
           swaps: an invitation at rest, a next step once a block is open.

           What is behind the bar — five blocks, fifty activities, each splitting by
           age and by sex — is promised in the sidebar and again in the held space
           below, so this line does not repeat it. It says the one thing that has to
           be read in the half-second before the reader scrolls on. */
        if (ask) {
            ask.textContent = atBlock
                ? 'Now choose an activity, or go back to the whole day.'
                : 'Open any block to explore it.';
        }
    }

    // ── the trail back up ────────────────────────────────────
    function paintCrumb() {
        if (!crumb) return;
        if (!atBlock) { crumb.innerHTML = ''; return; }
        const b = blockOf(atBlock), a = actOf(atAct);
        const hop = (label, to) =>
            `<button type="button" class="lu-hop" data-up="${to}">${label}</button>`;
        let s = hop('Whole day', 'day') + '<span class="lu-arrow">→</span>';
        s += a ? hop(b.label, 'block') + '<span class="lu-arrow">→</span>' +
                 `<span class="lu-here">${a.label}</span>`
               : `<span class="lu-here">${b.label}</span>`;
        crumb.innerHTML = s;
    }

    // ── level 2 · the block as its activities ────────────────
    /* Scaled inside the block, not against the day: sleeping is 520 minutes and
       commuting is 17, so one shared scale would draw most rows as a hairline. The
       stacked bar above carries the cross-block comparison, these rows carry the
       within-block one, and every row prints its minutes so the precision is never
       only in the length. */
    function acts(b) {
        const rows = actsIn(b.key);
        const max = Math.max(...rows.map(r => r.min));
        return `<div class="lu-block">
            <div class="lu-bhead">
                <span><i style="background:${TONE[b.key]}"></i>${b.label}</span>
                <span class="lu-btot">${hm(b.min)}</span>
                <span class="lu-bpct">${pct(b.min)}</span>
            </div>
            ${rows.map(r => `<button type="button" class="lu-row${
                    r.key === atAct ? ' on' : ''}" data-act="${r.key}"
                    aria-pressed="${r.key === atAct}">
                <span class="lu-name">${r.label}${r.rest
                    ? ` <em>(${r.rest} smaller kinds)</em>` : ''}</span>
                <span class="lu-track">
                    <span class="lu-fill" style="width:${r.min / max * 100}%;
                        background:${TONE[b.key]}"></span>
                </span>
                <span class="lu-val">${hm(r.min)}</span>
            </button>`).join('')}
        </div>`;
    }

    // ── level 3 · one activity, three ways ───────────────────
    function tabs() {
        const T = [['overview', 'Overview'], ['age', 'By age'], ['sex', 'By sex']];
        return `<div class="lu-tabs" role="tablist">${T.map(([k, l]) =>
            `<button type="button" role="tab" class="lu-tab${atTab === k ? ' on' : ''}"
                     data-tab="${k}" aria-selected="${atTab === k}">${l}</button>`
        ).join('')}</div>`;
    }

    /* Overview says what the activity is as a share of two things a reader can hold
       at once: its own block, and the whole day. Neither alone is enough — 2h43 is
       both "more than half of American leisure" and "11% of the day". */
    function overview(a, b) {
        const inBlock = Math.round(a.min / b.min * 100);
        return `<p class="lu-say"><b>${hm(a.min)}</b> a day
            &mdash; <b>${inBlock}%</b> of ${b.label.toLowerCase()},
            and <b>${pct(a.min)}</b> of the whole day.</p>`;
    }

    /* One line, seven bands. A single series rather than the four hand-picked ones
       the deleted chart drew, because the reader has already chosen what they want
       to see and drawing three more would answer a question nobody asked. Scaled
       from zero: these are minutes of a day, and a truncated axis would invent a
       cliff out of an hour's drift. */
    function byAge(a) {
        const W = 860, H = 250, PL = 46, PR = 18, PT = 18, PB = 38;
        const vals = a.age;
        const hi = Math.max(...vals);
        const step = hi > 240 ? 120 : hi > 90 ? 60 : hi > 30 ? 20 : 10;
        const top = Math.max(step, Math.ceil(hi / step) * step);
        const X = i => PL + i / (M.bands.length - 1) * (W - PL - PR);
        const Y = v => PT + (H - PT - PB) - v / top * (H - PT - PB);
        let s = '';
        for (let v = 0; v <= top; v += step) {
            s += `<line class="sc-web" x1="${PL}" y1="${Y(v)}" x2="${W - PR}" y2="${Y(v)}"/>`;
            s += `<text class="sc-tick" x="${PL - 9}" y="${Y(v) + 4}"
                   text-anchor="end">${v >= 60 ? v / 60 + 'h' : v + 'm'}</text>`;
        }
        M.bands.forEach((b, i) => {
            s += `<text class="sc-tick" x="${X(i)}" y="${H - PB + 20}"
                   text-anchor="middle">${b}</text>`;
        });
        const pts = vals.map((v, i) => [X(i), Y(v)]);
        s += `<polyline class="lu-line" points="${pts.map(p => p.join(',')).join(' ')}"
               stroke="var(--accent)"/>`;
        pts.forEach((p, i) => {
            s += `<circle class="lu-pt" cx="${p[0]}" cy="${p[1]}" r="3.6"
                   fill="var(--accent)"/>`;
            s += `<text class="lu-vlab" x="${p[0]}" y="${p[1] - 11}"
                   text-anchor="middle">${hm(vals[i])}</text>`;
        });
        const lo = vals.indexOf(Math.min(...vals)), up = vals.indexOf(hi);
        return `<div class="lu-stage"><svg viewBox="0 0 ${W} ${H}" role="img"
            aria-label="${a.label}, minutes per day across seven age bands, from
            ${hm(vals[0])} at ${M.bands[0]} to ${hm(vals[6])} at ${M.bands[6]}">${s}</svg></div>
            <p class="lu-say">Highest at <b>${M.bands[up]}</b> with
            <b>${hm(hi)}</b> a day, lowest at <b>${M.bands[lo]}</b> with
            <b>${hm(vals[lo])}</b>.</p>`;
    }

    /* Two bars from a shared centre line rather than two lengths side by side: the
       question is the size of the gap, and a common baseline is the only way to read
       a gap without measuring. */
    function bySex(a) {
        const men = a.sex[0], women = a.sex[1];
        const hi = Math.max(men, women) || 1;
        const gap = Math.abs(men - women);
        const more = men > women ? 'Men' : 'Women';
        const row = (label, v) => `<div class="lu-srow">
            <span class="lu-sname">${label}</span>
            <span class="lu-track"><span class="lu-fill"
                  style="width:${v / hi * 100}%;background:${
                      label === 'Men' ? 'var(--accent)' : 'var(--support)'}"></span></span>
            <span class="lu-val">${hm(v)}</span>
        </div>`;
        return `<div class="lu-sex" role="img" aria-label="${a.label}, ${hm(men)} a day
            for men against ${hm(women)} for women">
            ${row('Men', men)}${row('Women', women)}</div>
            <p class="lu-say">${gap < 1
                ? 'Men and women spend the same time on this, within a minute a day.'
                : `<b>${more}</b> spend <b>${hm(gap)}</b> more a day on this.`}</p>`;
    }

    /* ── the biggest surprise, rewritten for whatever is open ──
       This was a fixed paragraph about television, printed whether or not the reader
       ever opened leisure. It now answers to the state: nothing while the day is
       whole, the block's own shape once a block is open, and once an activity is
       chosen, the surprise belonging to the tab being read — so the sentence under
       the age line is about age and the one under the sex bars is about sex.

       Every branch is computed, and every branch has to be true of all fifty-eight
       rows, not just the interesting ones. Hence the shape tests below rather than a
       lookup table of hand-written findings: a table would be prettier for TV and
       childcare and would lie about "Travelling to appointments". */
    function paintWow() {
        if (!wow) return;
        if (!atBlock) { wow.innerHTML = ''; return; }
        const b = blockOf(atBlock), a = actOf(atAct);
        const head = '<p class="callout-head">The biggest surprise</p>';
        const row = html => `<div class="callout-row"><span class="callout-ic">&#10022;</span>
            <p>${html}</p></div>`;
        wow.innerHTML = head + row(a ? wowAct(a, b) : wowBlock(b));
    }

    /* A block on its own: how lopsided it is. The top row against everything under
       it is the fact that survives at every level of this section — leisure is
       television, unpaid work is cleaning and cooking — and it is the reason the
       reader should keep clicking. */
    function wowBlock(b) {
        const rows = actsIn(b.key);
        const top = rows[0], rest = rows.slice(1).reduce((s, r) => s + r.min, 0);
        const beats = top.min > rest;
        return `${b.label} is <b>${hm(b.min)}</b> of the day, and
            <b>${top.label.toLowerCase()}</b> takes <b>${hm(top.min)}</b> of it &mdash;
            ${beats
                ? `more than the other ${spell(rows.length - 1)} put together`
                : `<b>${Math.round(top.min / b.min * 100)}%</b> of the block, ahead of
                   ${rows[1].label.toLowerCase()} at <b>${hm(rows[1].min)}</b>`}.`;
    }

    /* One activity, and which surprise depends on which tab is open. */
    function wowAct(a, b) {
        if (atTab === 'age') return wowAge(a);
        if (atTab === 'sex') return wowSex(a);
        const rows = actsIn(b.key);
        const i = rows.findIndex(r => r.key === a.key);
        /* How many of the smaller activities below it this one outweighs on its own.
           Always computable, always true, and it says something a percentage does
           not: it puts the number next to things the reader has just been reading. */
        let n = 0, run = 0;
        for (let j = i + 1; j < rows.length; j++) {
            run += rows[j].min;
            if (run > a.min) break;
            n = j - i;
        }
        if (n >= 2) {
            return `<b>${hm(a.min)}</b> a day &mdash; on its own, more than the
                ${spell(n)} smallest activities in ${b.label.toLowerCase()} put together.`;
        }
        /* Only claim a runaway lead when there is one. Cleaning tops unpaid work at 36m
           with cooking right behind at 33m, and "nothing else comes close" over a
           three-minute margin is the page overselling its own chart. */
        if (i === 0 && a.min >= rows[1].min * 1.4) {
            return `Nothing else in ${b.label.toLowerCase()} comes close:
                <b>${hm(a.min)}</b> against <b>${hm(rows[1].min)}</b> for
                ${rows[1].label.toLowerCase()}, the next largest.`;
        }
        if (i === 0) {
            return `It leads ${b.label.toLowerCase()}, but only just:
                <b>${hm(a.min)}</b> against <b>${hm(rows[1].min)}</b> for
                ${rows[1].label.toLowerCase()} behind it.`;
        }
        /* A week is the frame that makes a small daily number legible — three minutes a
           day is nothing, twenty-one minutes a week is something you can picture doing.
           The share of the day comes along only while it still says something: below
           about seven minutes it rounds to 0.0% and reads as a bug rather than a fact. */
        const week = a.min * 7;
        const asWeek = week >= 90 ? hm(Math.round(week)) : Math.round(week) + ' minutes';
        return a.min >= 7.2
            ? `<b>${hm(a.min)}</b> a day is <b>${pct(a.min)}</b> of the whole day &mdash;
               about <b>${asWeek}</b> of every week.`
            : `<b>${hm(a.min)}</b> a day is easy to miss in a chart of the whole day
               &mdash; it is <b>${asWeek}</b> of every week.`;
    }

    /* The shape of the age curve, in words, tested rather than assumed. An interior
       peak is the interesting case and the one the section wants a reader to find —
       childcare at 25–34, working at 35–44 — but most activities only slope, and a
       few barely move at all. */
    function wowAge(a) {
        const v = a.age, hi = Math.max(...v), lo = Math.min(...v);
        const up = v.indexOf(hi);
        const spread = hi / Math.max(lo, 0.05);
        if (spread < 1.3) {
            return `Age changes this hardly at all: <b>${hm(lo)}</b> to <b>${hm(hi)}</b>
                across every band from ${M.bands[0]} to ${M.bands[6]}. Most of the day
                does not hold still like this.`;
        }
        /* An interior peak is only worth calling one if the middle stands clear of BOTH
           ends. Cleaning peaks at 65–74 with 46m and still reads 45m after 75, and
           vehicle upkeep's 3m "peak" at 35–44 is 3m at 15–24 too — writing "falling
           away on both sides" over a one-minute rounding difference would be the page
           inventing a shape the line does not have. The margin is a ratio rather than
           a fixed number of minutes because these rows run from 2 to 520 minutes. */
        const ends = Math.max(v[0], v[6]);
        if (up > 0 && up < 6 && hi >= ends * 1.4) {
            /* Own children's schooling peaks at 6m and both ends round to 0m, so the
               general form would set "falling away on both sides to 0m and 0m" — true,
               and it reads as missing data. When both ends vanish at this precision,
               say that instead of printing the zeros twice. */
            return hm(v[0]) === hm(v[6])
                ? `It belongs to one stretch of life and almost no other:
                   <b>${hm(hi)}</b> a day at <b>${M.bands[up]}</b>, against
                   <b>${hm(v[0])}</b> at both ends of the range.`
                : `This is one of the few activities that peaks in the middle of life
                   rather than at one end: <b>${hm(hi)}</b> at <b>${M.bands[up]}</b>,
                   falling away on both sides to <b>${hm(v[0])}</b> at ${M.bands[0]} and
                   <b>${hm(v[6])}</b> after 75.`;
        }
        /* Everything else is read across the two ends of life. But the ends are what
           gets PRINTED, and hm() rounds to the minute: "Other leisure" runs 1.4 to 0.8
           and would set as "1m a day at 15–24 against 1m after 75" under a sentence
           claiming it belongs to the young. If the two ends render identically, the
           only honest reading is that the ends agree, whatever the interior does. */
        const lo0 = hm(v[0]), lo6 = hm(v[6]);
        if (lo0 === lo6) {
            return `It begins and ends life at the same place, <b>${lo0}</b> a day, and the
                movement is all in between: <b>${hm(hi)}</b> at ${M.bands[up]} against
                <b>${hm(lo)}</b> at ${M.bands[v.indexOf(lo)]}.`;
        }
        const rising = v[6] > v[0];
        const ratio = Math.max(v[0], v[6]) / Math.max(Math.min(v[0], v[6]), 0.05);
        /* A shallow slope where the real extreme sits somewhere in the middle. Naming
           the end again as the "high point" would repeat the figure just printed, so
           this only fires when the extreme is genuinely interior AND far enough from
           the ends to be worth a clause: "dipping to 3m" under "3m a day" is noise. */
        const swing = rising ? v.indexOf(lo) : up;
        const swingV = rising ? lo : hi;
        if (ratio < 1.7 && swing > 0 && swing < 6 && hm(swingV) !== lo0 && hm(swingV) !== lo6) {
            return `It drifts rather than turns: <b>${lo0}</b> a day at ${M.bands[0]}
                against <b>${lo6}</b> after 75, ${rising ? 'dipping' : 'rising'} to
                <b>${hm(swingV)}</b> at ${M.bands[swing]} on the way.`;
        }
        /* Left with a slope between the two ends. How strong a claim to make about it
           is the ratio's business, not the direction's: "never comes back" is right for
           homework at 35m against 0m and absurd for phone calls at 10m against 9m, and
           the two would otherwise take the same branch. Below 1.4× the ends barely
           differ, so the sentence just reports them. */
        if (ratio < 1.4) {
            return `The two ends of life are closer than you would expect here:
                <b>${lo0}</b> a day at ${M.bands[0]} against <b>${lo6}</b> after 75.`;
        }
        return rising
            ? `It keeps growing to the end of life: <b>${lo0}</b> a day at ${M.bands[0]}
               against <b>${lo6}</b> after 75, ${times(ratio)} as much.`
            : `It thins out with age: <b>${lo0}</b> a day at ${M.bands[0]} against
               <b>${lo6}</b> after 75${ratio >= 4
                   ? ', and it never comes back' : ''}.`;
    }

    /* Words rather than a bare multiple, because these ratios run from 1.2 to 176 and
       "176× as much" reads as a data error even when it is right. The 1.8 floor is set
       by television: 2h17 to 4h17 is 1.88×, and "half again as much" undersells a
       two-hour difference, which is the headline figure of the whole section. */
    function times(r) {
        return r >= 9 ? 'many times' : r >= 1.8 ? `${r.toFixed(1)}&times;` : 'half again';
    }

    /* The gap, and the ratio behind it. The ratio is what makes the small numbers
       land: four minutes against one is a rounding error in a day and a fourfold
       difference in a life. */
    function wowSex(a) {
        const men = a.sex[0], women = a.sex[1];
        const gap = Math.abs(men - women);
        const more = men > women ? 'Men' : 'Women';
        const less = men > women ? 'women' : 'men';
        /* Rendered equality, not arithmetic equality. 7.6 against 7.4 is a gap under a
           minute and sets as "8m for men, 7m for women" — a sentence claiming they are
           the same, printing two different numbers to prove it. Both tests have to
           agree before the claim is made. */
        if (gap < 1 && hm(men) === hm(women)) {
            return `This is one of the few things the two sexes do in equal measure:
                <b>${hm(men)}</b> a day each.`;
        }
        if (gap < 1) {
            return `The difference here is under a minute a day &mdash; <b>${hm(men)}</b>
                for men against <b>${hm(women)}</b> for women, which is as close to equal
                as this survey can measure.`;
        }
        const r = Math.max(men, women) / Math.max(Math.min(men, women), 0.05);
        /* The ratio only rides along when it is large enough to mean something and
           small enough to be readable. Both bounds matter: 1.1× is noise, and vehicle
           upkeep's 5m against 1m is a tenfold difference that reads as an error printed
           as a multiple, so it gets words instead. */
        const scale = r >= 9 ? ', many times as much'
                    : r >= 1.5 ? `, ${r.toFixed(1)}&times; as much` : '';
        return `<b>${more}</b> spend <b>${hm(gap)}</b> more a day on this than ${less} do
            &mdash; <b>${hm(Math.max(men, women))}</b> against
            <b>${hm(Math.min(men, women))}</b>${scale}.`;
    }

    // ── draw whatever the state says ─────────────────────────
    function paint() {
        paintDay();
        paintCrumb();
        paintWow();
        if (!open) return;
        if (!atBlock) { open.innerHTML = ''; return; }
        const b = blockOf(atBlock), a = actOf(atAct);
        let s = acts(b);
        if (a) {
            s += `<div class="lu-detail"><p class="lu-dhead">${a.label}</p>${tabs()}
                  <div class="lu-pane">${
                      atTab === 'age' ? byAge(a)
                    : atTab === 'sex' ? bySex(a)
                    : overview(a, b)}</div></div>`;
        }
        open.innerHTML = s;
    }

    /* One listener on the card for the whole drill-down. Delegation rather than
       rebinding, because every level is replaced on each paint and listeners
       attached to the rows would be thrown away with them. */
    const drill = document.getElementById('du-drill');
    if (drill) {
        drill.addEventListener('click', e => {
            const seg = e.target.closest('[data-block]');
            if (seg) {
                // clicking the open block again closes it: the bar is a toggle
                const k = seg.dataset.block;
                atBlock = atBlock === k ? null : k;
                atAct = null; atTab = 'overview';
                paint();
                return;
            }
            const row = e.target.closest('[data-act]');
            if (row) {
                const k = row.dataset.act;
                atAct = atAct === k ? null : k;
                atTab = 'overview';
                paint();
                return;
            }
            const tab = e.target.closest('[data-tab]');
            if (tab) {
                atTab = tab.dataset.tab;
                /* Drill Master. The tabs only exist once a block AND an activity are
                   open, so reaching either split means all four levels have been
                   opened — no need to track the path, the state proves it. Overview
                   does not count: it is where an activity lands by default, so
                   awarding it would pay for the click that got here rather than for
                   going further. Badges.earn is idempotent. */
                if (atTab === 'age' || atTab === 'sex') Badges.earn('drill');
                paint();
                return;
            }
            const up = e.target.closest('[data-up]');
            if (up) {
                if (up.dataset.up === 'day') { atBlock = null; atAct = null; }
                else atAct = null;
                atTab = 'overview';
                paint();
            }
        });
    }

    paint();

    /* Nothing is written into the surrounding prose any more. Five setters stood here
       — the lead, the body, and three fixed callout rows on television, retirement and
       the sex gap — each printing a figure from this file into a paragraph the reader
       met before touching anything. Every one of those numbers is now somewhere in the
       drill-down, reached by opening the block it belongs to, and the callout above is
       rewritten by paintWow() for whatever the reader actually chose. The figures did
       not go; the page stopped announcing them in advance. */
}

// ── wire everything up ──
(function init() {
    if (!ADL) return;

    // Cover clock
    const coverClock = document.getElementById('cover-clock');
    if (coverClock) buildCoverClock(coverClock);
    initBadges();
    initCoverScroll();
    initRailPin();
    initSectionExit();
    initRightNow();
    initMetricStrips();
    initDayUS();
    initRankParallel();

    // the two badges the deleted day-card section used to carry
    initCountryBadges();




    // Lifestyle DNA — quiz → twin
    renderDna(document.getElementById('dna'));

    // scroll reveal
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();
