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
 * The two badges that #sec-day used to carry.
 *
 * That section is gone — #sec-glance makes the same point, and its day card is the
 * same component — but `day` and `day5` were earned only by changing the country in
 * its picker. Left alone that would have stranded two of the eight badges, making the
 * collection impossible to finish. They move to the glance sheet's picker, the only
 * country picker left on the page, so both hints still read true: it is the first
 * chart, and visiting five countries still means five distinct values.
 *
 * Wired here rather than in js/glance.js because Badges is defined in this file and
 * glance.js is deliberately self-contained.
 */
function initCountryBadges() {
    const pick = document.getElementById('gl-dc-pick');
    if (!pick) return;
    const seen = new Set([pick.value]);
    pick.addEventListener('change', () => {
        Badges.earn('day');
        seen.add(pick.value);
        if (seen.size >= 5) Badges.earn('day5');
    });
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
    { key: 'money',   q: 'How much does earning shape the life you want?',
      lo: 'Barely',       hi: 'It decides most things' },
    { key: 'connect', q: 'How outward-looking and travel-hungry are you?',
      lo: 'Homebody',     hi: 'Endlessly curious' },
];

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
        const twin = COUNTRIES
            .map(c => ({ c, d: dnaDist(you, DNA_SCORES[c]) }))
            .sort((a, b) => a.d - b.d)[0].c;
        const stage = show(`
            <div class="dna-result">
                <p class="dna-result-kicker">Your closest match is</p>
                <p class="dna-result-name">${nice(twin)}</p>
                ${dnaStrip(DNA_SCORES[twin])}
                <p class="dna-result-note">Matched on how you balance <strong>free time, rest,
                    income and openness</strong> — the four measures behind the score, across all
                    ${COUNTRIES.length} countries.</p>
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

    let lastHour = -1;
    function tick() {
        const now = new Date();
        const h = now.getHours();
        time.textContent = String(h).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0');
        moveHand(h, now.getMinutes());

        if (h === lastHour) return;                  // distribution only changes hourly
        lastHour = h;
        const row = ATUS_HOURS[h];
        const top = CATS.slice().sort((a, b) => row[b.key] - row[a.key])[0];
        say.innerHTML = `At this hour, <b>${Math.round(row[top.key])}%</b> of America is ${top.say}.`;
        bar.innerHTML = CATS.map(c =>
            `<span style="width:${row[c.key]}%;background:${c.color}"></span>`).join('');
    }

    tick();
    setInterval(tick, 20000);
}

/* ═══════════════════════════════════════════════════════════
   BADGES — one per interactive, earned by using it

   The point is to get a reader to actually touch the charts rather than scroll
   past them, so every badge is tied to a real interaction and none can be
   earned by scrolling alone. Two exceptions, both deliberate: the last badge is
   for reaching the live clock, which is the one thing on the page that needs no
   input, and the "five countries" badge asks for repetition rather than a
   single click, so there is something left to chase.

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
    plane: `<circle cx="20" cy="20" r="14" class="b-cpf o-30"/>
        <path class="b-ln b-sp" d="M6 30c6 0 10-2 14-6" stroke-dasharray="3 3"/>
        <path class="b-cf" d="M8 24 32 9l-4.6 10 1.7 8.4-3.9-5-7.6 3.8 1.1-5.7z"/>
        <path class="b-ln b-n o-40" d="M8 24 32 9l-4.6 10 1.7 8.4-3.9-5-7.6 3.8 1.1-5.7z"/>
        <circle cx="32" cy="9" r="2.6" class="b-sf"/>`,
    ladder: `<circle cx="20" cy="20" r="14" class="b-spf o-25"/>
        <path class="b-ln b-s" d="M13 5v30M27 5v30"/>
        <path class="b-ln b-c" d="M13 11h14M13 18h14M13 25h14M13 32h14"/>
        <circle cx="20" cy="14.5" r="3.6" class="b-cpf"/>
        <circle cx="20" cy="14.5" r="3.6" class="b-ln b-n o-35"/>`,
    /* Was an hourglass, for the life-expectancy badge. That badge is gone with the
       measure, and this is the scatter that took its place in Chapter Two: an axis
       and a rising cloud, one mark sitting off the trend. */
    scatter: `<circle cx="20" cy="20" r="14" class="b-cpf o-25"/>
        <path class="b-ln b-n" d="M11 10v20h19"/>
        <circle cx="16" cy="26" r="2.1" class="b-sf"/>
        <circle cx="21" cy="22" r="2.1" class="b-sf"/>
        <circle cx="26" cy="18" r="2.1" class="b-cpf"/>
        <circle cx="30" cy="14" r="2.6" class="b-cf"/>
        <circle cx="17" cy="15" r="2.6" class="b-cf"/>`,
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
    ripple: `<circle cx="20" cy="20" r="14" class="b-spf o-22"/>
        <circle cx="20" cy="20" r="3" class="b-cf"/>
        <path class="b-ln b-c" d="M13 20a7 7 0 0 1 14 0"/>
        <path class="b-ln b-s" d="M8 20a12 12 0 0 1 24 0"/>
        <path class="b-ln b-sp" d="M3.5 21a16.5 16.5 0 0 1 33 0" stroke-dasharray="3 3"/>`
};

/* Each badge is a collectible: a kicker, a name, the figure it stands for, and
   a fact from the data that is deliberately not printed anywhere else on the
   page. Finding one is worth something to read, which is the only honest reason
   to make a data story collectible at all. */
const BADGES = [
    { id: 'day', art: 'globe', ring: 'support',
      kicker: 'Time use', label: 'Day Tripper', stat: '10h05 vs 10h06',
      hint: 'Swap the country in the first chart',
      fact: 'Mexico spends as much of the day working as it does sleeping, washing and eating: 10h05m against 10h06m.' },
    { id: 'day5', art: 'plane', ring: 'accent',
      kicker: 'Unpaid labour', label: 'Jet Lagged', stat: '4 of 35',
      hint: 'Visit five countries without leaving your chair',
      fact: 'In Australia, Italy, Poland and Spain, more of the day goes to work nobody pays for than to work somebody does.' },
    { id: 'ladder', art: 'ladder', ring: 'accent',
      kicker: 'Happiness', label: 'Ladder Climber', stat: '4.04 apart',
      hint: 'Poke a country on the happiness scale',
      fact: 'Finland rates its own life 7.82 out of 10 and India rates its own 3.78. Same ten-point scale, four points apart.' },
    { id: 'money', art: 'scatter', ring: 'ink',
      kicker: 'Money and mood', label: 'Off the Line', stat: '$456 apart',
      hint: 'Poke a country on the money and mood chart',
      fact: 'Türkiye and Mexico earn within $456 a year of each other. Mexico rates its life 1.39 points higher.' },
    { id: 'ranks', art: 'trail', ring: 'ink',
      kicker: 'Rankings', label: 'Line Stalker', stat: 'Four winners',
      hint: 'Follow one country through all four measures',
      fact: 'Mexico works most, France sleeps most, Norway rests most, Finland is happiest. Nobody finishes first twice.' },
    { id: 'quiz', art: 'twin', ring: 'accent',
      kicker: 'The average', label: 'Long-Lost Twin', stat: '34× the pay',
      hint: 'Answer four questions, meet your country',
      fact: 'An American earns 34 times what an Indian does, and still spends 17 fewer minutes a day at the job.' },
    { id: 'now', art: 'owl', ring: 'support',
      kicker: 'Hour by hour', label: 'Clock Watcher', stat: '56% at 8pm',
      hint: 'Find out what the world is doing this minute',
      fact: 'At 8pm more than half of America is at leisure — the most it ever agrees on anything while awake.' },
    { id: 'waves', art: 'ripple', ring: 'support-pale', secret: true,
      kicker: 'Hidden', label: 'Made Waves', stat: '96% asleep',
      hint: 'Something in the opener reacts to you',
      fact: 'At 3am, 96% of America is asleep. At noon, no single activity holds even 30% of them.' }
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
       hard reload from a normal one. What does clear it is closing the tab, or
       the reset control in the tray. */
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
    let rail = null, resetSlot = null;

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
        li.title = got ? nameOf(b) + ' — open again'
                       : b.secret ? 'Hidden' : b.hint;
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
        // the reset only appears once there is something to reset
        if (resetSlot) {
            resetSlot.innerHTML = earned.size
                ? '<button type="button" class="bdg-reset">Start over</button>'
                : '';
            const btn = resetSlot.querySelector('.bdg-reset');
            if (btn) btn.addEventListener('click', () => api.reset());
        }
        if (justEarned && rail) {
            rail.classList.remove('flash');
            void rail.offsetWidth;
            rail.classList.add('flash');
            setTimeout(() => rail.classList.remove('flash'), 800);
        }
    }

    /* A tucked-away rail has no slot to aim at: collapsed, the tray is clipped to
       nothing and measures nothing. So it opens before the badge sets off, not
       when it arrives. */
    function openRail() {
        if (!rail) return;
        rail.classList.remove('shut');
        const t = document.getElementById('badges-toggle');
        if (t) t.setAttribute('aria-expanded', 'true');
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
            // put the reader back where they were reading
            if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
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
            ? 'That is all eight. Nothing left hidden.'
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
        mount(trayEl, countEl, railEl, resetEl) {
            tray = trayEl; count = countEl; rail = railEl || null; resetSlot = resetEl || null;
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
                openRail();                      // give the badge somewhere to land
                deliver(b, anim => {
                    render(id, anim);             // the slot fills as it arrives
                    const lag = setTimeout(() => {
                        lags.delete(lag);
                        if (!earned.has(id)) return;   // reset while the card was queued
                        if (showing) queue.push(b); else show(b);
                    }, CARD_LAG);
                    lags.add(lag);
                });
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
    Badges.mount(tray, document.getElementById('badge-count'), rail,
                 document.getElementById('badge-reset'));

    /* How the badges work is worth reading once and then never again, so it hides
       behind an i rather than standing in the panel taking up room. */
    const info = document.getElementById('badges-info');
    const note = document.getElementById('badges-note');
    if (info && note) {
        info.addEventListener('click', () => {
            const open = note.hidden;
            note.hidden = !open;
            info.setAttribute('aria-expanded', String(open));
        });
    }

    /* The rail can be tucked away, because a panel pinned to the edge of a long
       read should be dismissible. Only offered where it actually is a rail: at
       narrow widths the collection sits in the flow and there is nothing to fold.
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

    // the one badge with no input: arriving at the live panel
    const now = document.getElementById('sec-now');
    if (now && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver(es => es.forEach(e => {
            if (e.isIntersecting) { Badges.earn('now'); obs.disconnect(); }
        }), { threshold: 0.35 });
        obs.observe(now);
    }
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
            gdp: d.gdp,
            tourism: d.tourism
        };
    });
}

/**
 * Metric strip — one measure, every country with a score, on a single line.
 *
 * There were two of these, happiness and life expectancy, drawn by the same code
 * so a reader learned the form once and read it twice. Life expectancy is gone,
 * and rather than replace it with a second strip the chapter now follows the one
 * strip with a scatter, because the question changed: it is no longer "how do two
 * scores of a life compare" but "what does a country's happiness track".
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
            capTitle: 'Happiness',
            capBody: 'Dot plot, one mark per country, on the 0–10 Cantril ladder: respondents place ' +
                'their own life between the worst possible (0) and the best possible (10), and the ' +
                'score is the national average. World Happiness Report. 34 countries: Luxembourg ' +
                'keeps a time diary but has no ladder score. The scale spans only the range of these ' +
                'countries, not the full 0–10.'
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
        const pad = (hi - lo) * 0.06 || 1;
        const W = 1040, H = 168, L = 28, R = 28, AXIS = 128;
        const X = v => L + ((v - (lo - pad)) / ((hi + pad) - (lo - pad))) * (W - L - R);

        const ranked = [...rows].sort((a, b) => cfg.get(b) - cfg.get(a));
        const top = ranked[0], bottom = ranked[ranked.length - 1];

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
        placed.forEach(o => {
            const ly = AXIS - 30 - (maxTier - o.tier) * TIER;
            s += `<line class="mt-lead" data-name="${o.name}" x1="${o.x}" y1="${AXIS - 11}"
                  x2="${o.x}" y2="${ly + 4}"/>`;
            s += `<text class="mt-name" data-name="${o.name}" x="${o.x}" y="${ly}"
                  text-anchor="${o.anchor}">${o.name}</text>`;
        });
        rows.forEach(c => {
            const v = cfg.get(c);
            const cls = c.name === top.name ? ' hi' : c.name === bottom.name ? ' lo' : '';
            s += `<circle class="mt-dot${cls}" data-name="${c.name}" cx="${X(v)}" cy="${AXIS}" r="7"/>`;
        });

        host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
            aria-label="${rows.length} countries on one scale">${s}</svg>`;
        const el = host.querySelector('svg');

        const idle = () => {
            read.innerHTML = `<b>${top.name}</b> leads at <em>${cfg.fmt(cfg.get(top))}${cfg.unit}</em>,
                <b>${bottom.name}</b> trails at <em>${cfg.fmt(cfg.get(bottom))}${cfg.unit}</em>.
                All ${rows.length} average <em>${cfg.fmt(mean)}${cfg.unit}</em>.`;
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

/**
 * Money and mood — GDP per capita against the happiness ladder, 34 countries.
 *
 * This is the chart that replaces life expectancy in Chapter Two. The chapter used
 * to hold two scores of a life side by side, one counted and one asked, and note
 * that they mostly agreed. With the counted one gone the question had to change,
 * and the file already carried the answer: GDP per capita, present for all 35
 * countries and never once used.
 *
 * Log scale on money, and that is not a cosmetic choice. A dollar does less the
 * more of them you have, so on a linear axis the relationship bends and reads as
 * weaker than it is. Straightened out, the correlation is stronger than the one
 * the chapter used to be built on — which is the honest finding, and also the
 * uncomfortable one, so the copy says both.
 */
function initMoneyMood() {
    const host = document.getElementById('mm-chart');
    if (!host || !window.ADL) return;
    const read = document.getElementById('mm-read');
    const cap = document.getElementById('mm-cap');

    const rows = countryRows(HAPPY_COUNTRIES).filter(c => c.gdp);
    if (rows.length < 3) return;

    const lg = Math.log10;
    const W = 940, H = 520, L = 62, R = 26, T = 26, B = 58;
    const xs = rows.map(c => lg(c.gdp)), ys = rows.map(c => c.happy);
    const x0 = Math.min(...xs) - 0.06, x1 = Math.max(...xs) + 0.06;
    const y0 = Math.floor(Math.min(...ys)) - 0.4, y1 = Math.ceil(Math.max(...ys)) + 0.2;
    const X = v => L + (lg(v) - x0) / (x1 - x0) * (W - L - R);
    const Y = v => T + (H - T - B) - (v - y0) / (y1 - y0) * (H - T - B);

    /* Least squares on log money, plus Pearson r, both computed here so the
       number in the prose is the number on the chart. */
    const n = rows.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
        sxy += (xs[i] - mx) * (ys[i] - my);
        sxx += (xs[i] - mx) * (xs[i] - mx);
        syy += (ys[i] - my) * (ys[i] - my);
    }
    const slope = sxy / sxx, r = sxy / Math.sqrt(sxx * syy);
    const fit = lx => my + slope * (lx - mx);

    let s = '';
    [1000, 2000, 5000, 10000, 20000, 50000, 100000].forEach(v => {
        if (lg(v) < x0 || lg(v) > x1) return;
        s += `<line class="sc-web" x1="${X(v)}" y1="${T}" x2="${X(v)}" y2="${H - B}"/>`;
        s += `<text class="sc-tick" x="${X(v)}" y="${H - B + 18}" text-anchor="middle">$${v >= 1000 ? (v / 1000) + 'k' : v}</text>`;
    });
    for (let v = Math.ceil(y0); v <= y1; v++) {
        s += `<line class="sc-web" x1="${L}" y1="${Y(v)}" x2="${W - R}" y2="${Y(v)}"/>`;
        s += `<text class="sc-tick" x="${L - 10}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    s += `<line class="sc-fit" x1="${L}" y1="${Y(fit(x0))}" x2="${W - R}" y2="${Y(fit(x1))}"/>`;
    s += `<text class="sc-r" x="${W - R}" y="${Y(fit(x1)) - 12}" text-anchor="end">r = +${r.toFixed(2)} · ${n} countries</text>`;
    s += `<text class="sc-axl" x="${L + (W - L - R) / 2}" y="${H - 10}" text-anchor="middle">GDP per person, log scale</text>`;
    s += `<text class="sc-axl" x="16" y="${T + (H - T - B) / 2}" text-anchor="middle"
           transform="rotate(-90 16 ${T + (H - T - B) / 2})">Happiness, 0 to 10</text>`;
    rows.forEach(c => {
        s += `<circle class="sc-dot" data-name="${c.name}" cx="${X(c.gdp)}" cy="${Y(c.happy)}" r="6"/>`;
    });
    /* Four names printed rather than left to hover: the two ends of the money axis
       and the two countries that sit furthest off the line, because those four are
       the whole argument and a reader should not have to go looking for them. */
    const resid = rows.map(c => ({ c, e: c.happy - fit(lg(c.gdp)) }))
        .sort((a, b) => a.e - b.e);
    const named = new Set([
        rows.reduce((a, b) => (b.gdp < a.gdp ? b : a)).name,
        rows.reduce((a, b) => (b.gdp > a.gdp ? b : a)).name,
        resid[0].c.name, resid[resid.length - 1].c.name
    ]);
    rows.filter(c => named.has(c.name)).forEach(c => {
        s += `<text class="sc-name" data-name="${c.name}" x="${X(c.gdp)}" y="${Y(c.happy) - 13}"
               text-anchor="middle">${c.name}</text>`;
    });

    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
        aria-label="GDP per person against happiness score for ${n} countries">${s}</svg>`;
    const el = host.querySelector('svg');

    const money = v => v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + v;
    const idle = () => {
        const above = resid[resid.length - 1].c, below = resid[0].c;
        read.innerHTML = `Money explains <b>${Math.round(r * r * 100)}%</b> of the spread in
            happiness across these ${n} countries.
            <b>${above.name}</b> is the happiest for what it earns,
            <b>${below.name}</b> the least. Touch a country.`;
    };
    function show(name) {
        const c = rows.find(x => x.name === name);
        if (!c) return;
        const e = c.happy - fit(lg(c.gdp));
        read.innerHTML = `<b>${c.name}</b>: ${money(c.gdp)} a person, happiness
            <em>${c.happy.toFixed(2)}</em> —
            ${Math.abs(e) < 0.05 ? 'exactly where its income predicts' :
              e > 0 ? `<em>${e.toFixed(2)}</em> happier than its income predicts` :
                      `<em>${(-e).toFixed(2)}</em> less happy than its income predicts`}.`;
        el.querySelectorAll('[data-name]').forEach(nd =>
            nd.classList.toggle('on', nd.dataset.name === name));
    }
    const inspect = e => {
        const t = e.target.closest('[data-name]');
        if (!t) return;
        show(t.dataset.name);
        Badges.earn('money');
    };
    el.addEventListener('mouseover', inspect);
    el.addEventListener('click', inspect);
    el.addEventListener('mouseleave', () => {
        el.querySelectorAll('[data-name]').forEach(nd => nd.classList.remove('on'));
        idle();
    });
    idle();
    if (cap) cap.innerHTML = `<b>Money and Mood</b>
        Scatter, one mark per country, GDP per person on a log scale against the 0–10 happiness
        ladder. The dashed line is the least-squares fit; r is Pearson's correlation on the logged
        income. ${n} countries: Luxembourg keeps a time diary but has no ladder score. Log scale
        because a dollar buys less happiness the more of them you already have — on a linear axis
        the same relationship bends and looks weaker than it is. Correlation is not cause, in either
        direction. GDP per capita and World Happiness Report ladder score.`;
}

/**
 * The whole American day, itemised — the one place this story can open every bar.
 *
 * Every other chart here treats the day as five numbers, because the OECD file has
 * five measures and no more. The American Time Use Survey publishes 431 activity
 * codes, so for exactly one of the 35 countries every block can be taken apart, not
 * just leisure. That is the section's reason to exist and also its limitation, which
 * the captions say plainly.
 *
 * Three panels, in the order the questions arrive: how the day splits, what is inside
 * each block, and how the shape changes with age.
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
    /* One colour per block, from the same five the day card uses, so a reader who
       has already met the stacked bar upstairs does not have to learn it twice. */
    const TONE = {
        PCA: 'var(--care)', PAW: 'var(--paid)', UPW: 'var(--unpaid)',
        LEI: 'var(--leisure)', OTH: 'var(--other)'
    };

    // ── 1 · the day as one bar ───────────────────────────────
    host.innerHTML = D.blocks.map(b =>
        `<span style="width:${b.min / M.grand * 100}%;background:${TONE[b.key]}"
               title="${b.label}: ${hm(b.min)}"></span>`).join('');
    const key = document.getElementById('du-key');
    if (key) {
        key.innerHTML = D.blocks.map(b =>
            `<span><i style="background:${TONE[b.key]}"></i>${b.label}
             <b>${hm(b.min)}</b></span>`).join('');
    }

    // ── 2 · what is inside each block ────────────────────────
    /* Bars are scaled inside their own block, not against the whole day. Sleeping is
       520 minutes and commuting is 17, so one shared scale would draw thirty of the
       forty-four groups as a line one pixel wide. The block totals above carry the
       cross-block comparison; these bars carry the within-block one, and every row
       prints its minutes so the precision is never only in the length. */
    const list = document.getElementById('du-list');
    if (list) {
        list.innerHTML = D.blocks.map(b => {
            const gs = D.groups.filter(g => g.block === b.key);
            const max = Math.max(...gs.map(g => g.min));
            return `<div class="lu-block">
                <div class="lu-bhead">
                    <span><i style="background:${TONE[b.key]}"></i>${b.label}</span>
                    <span class="lu-btot">${hm(b.min)}</span>
                    <span class="lu-bpct">${pct(b.min)}</span>
                </div>
                ${gs.map(g => `<div class="lu-row${g.min === max ? ' lead' : ''}">
                    <span class="lu-name">${g.label}${g.rest
                        ? ` <em>(${g.rest} smaller kinds)</em>` : ''}</span>
                    <div class="lu-track">
                        <span class="lu-fill" style="width:${g.min / max * 100}%;
                            background:${TONE[b.key]}"></span>
                    </div>
                    <span class="lu-val">${hm(g.min)}</span>
                </div>`).join('')}
            </div>`;
        }).join('');
    }

    // ── 3 · four activities across seven age bands ───────────
    /* Sleeping is deliberately not on this chart. It runs 8h19 to 9h18 across every
       band, so it would sit as a flat rule at the top and squash the four lines that
       actually move into the bottom fifth of the plot. The copy states its shape
       instead. */
    const age = document.getElementById('du-age');
    if (age) {
        const pick = k => D.groups.find(g => g.key === k);
        const LINES = [
            { label: 'Working', vals: pick('0501').age, color: 'var(--paid)' },
            { label: 'Television', vals: D.leisure.byAge.map(b => b.items.tv), color: 'var(--accent-pale)' },
            { label: 'Housework', vals: pick('0201').age, color: 'var(--support)' },
            { label: 'Caring for own children', vals: pick('0301').age, color: 'var(--support-pale)' }
        ];
        const W = 860, H = 320, PL = 46, PR = 152, PT = 20, PB = 40;
        const hi = Math.max(...LINES.flatMap(l => l.vals));
        const X = i => PL + i / (M.bands.length - 1) * (W - PL - PR);
        const Y = v => PT + (H - PT - PB) - v / hi * (H - PT - PB);
        let s = '';
        for (let v = 0; v <= hi; v += 60) {
            s += `<line class="sc-web" x1="${PL}" y1="${Y(v)}" x2="${W - PR}" y2="${Y(v)}"/>`;
            s += `<text class="sc-tick" x="${PL - 9}" y="${Y(v) + 4}" text-anchor="end">${v / 60}h</text>`;
        }
        M.bands.forEach((b, i) => {
            s += `<text class="sc-tick" x="${X(i)}" y="${H - PB + 20}" text-anchor="middle">${b}</text>`;
        });
        LINES.forEach(l => {
            const pts = l.vals.map((v, i) => [X(i), Y(v)]);
            s += `<polyline class="lu-line" points="${pts.map(p => p.join(',')).join(' ')}"
                   stroke="${l.color}"/>`;
            pts.forEach(p => {
                s += `<circle class="lu-pt" cx="${p[0]}" cy="${p[1]}" r="3.4" fill="${l.color}"/>`;
            });
            const last = pts[pts.length - 1];
            s += `<text class="lu-lab" x="${last[0] + 10}" y="${last[1] + 4}"
                   fill="${l.color}">${l.label}</text>`;
        });
        age.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
            aria-label="Minutes per day of working, television, housework and childcare by age band">${s}</svg>`;
    }

    /* Every figure in the section's own copy, written from the data file so the prose
       cannot drift from the bars beside it. */
    const set = (id, html) => {
        const nd = document.getElementById(id);
        if (nd) nd.innerHTML = html;
    };
    const g = k => D.groups.find(x => x.key === k);
    const blk = k => D.blocks.find(x => x.key === k);
    const sleep = g('0101'), work = g('0501'), house = g('0201'), cook = g('0202'),
          kids = g('0301'), relax = g('1203');

    set('du-lead', `Split every minute of it and the American day is
        <strong>${hm(sleep.min)}</strong> asleep, <strong>${hm(work.min)}</strong> at work and
        <strong>${hm(relax.min)}</strong> relaxing — and only
        <strong>${hm(g('1805').min)}</strong> commuting.`);
    set('du-body', `The five blocks the rest of this page reports as single numbers open into
        <strong>${M.groups} activities</strong>, rolled up from the survey&rsquo;s
        <strong>${M.codes}</strong> codes. Nothing is left over: they sum to
        ${M.grand.toLocaleString()} minutes. Sleep, meals and washing take
        <strong>${pct(blk('PCA').min)}</strong> of the day, leisure
        <strong>${pct(blk('LEI').min)}</strong>, paid work and study
        <strong>${pct(blk('PAW').min)}</strong>, and the unpaid work the second-shift chapter
        argues about <strong>${pct(blk('UPW').min)}</strong>.`);
    set('du-tv-read', `Inside that relaxing block, television alone is
        <strong>${hm(D.leisure.overall.tv)}</strong> — <strong>${M.tvShare}%</strong> of all
        American leisure, more than the other eleven ways of spending it put together. Reading
        takes <strong>${hm(D.leisure.overall.reading)}</strong>, sport
        <strong>${hm(D.leisure.overall.sport)}</strong>, and going out to anything at all
        <strong>${hm(D.leisure.overall.goingout)}</strong>.`);
    /* Where the retirement hours go. Worth counting rather than gesturing at: the
       obvious sentence is that television absorbs the time work gives back, and it
       does not — it takes about two of those four hours, with reading and sleep
       between them taking most of the rest. */
    const freed = work.age[3] - work.age[6];
    const tvAge = D.leisure.byAge.map(b => b.items.tv);
    const readAge = D.leisure.byAge.map(b => b.items.reading);
    const share = v => Math.round(v / freed * 100) + '%';
    set('du-age-read', `Working falls off a cliff at retirement, from
        <strong>${hm(work.age[3])}</strong> a day in the 45&ndash;54s to
        <strong>${hm(work.age[6])}</strong> after 75 &mdash; <strong>${hm(freed)}</strong> handed
        back. Television takes <strong>${share(tvAge[6] - tvAge[3])}</strong> of it, reading
        <strong>${share(readAge[6] - readAge[3])}</strong> and sleep
        <strong>${share(sleep.age[6] - sleep.age[3])}</strong>. Childcare is the one curve with a
        peak rather than a slope, <strong>${hm(kids.age[1])}</strong> at 25&ndash;34. Sleep is not
        drawn here because it barely moves: <strong>${hm(Math.min(...sleep.age))}</strong> to
        <strong>${hm(Math.max(...sleep.age))}</strong> across every band.`);
    set('du-sex-read', `Men spend <strong>${hm(work.sex[0] - work.sex[1])}</strong> more a day at
        work than women. Women spend <strong>${hm((house.sex[1] - house.sex[0]) +
        (cook.sex[1] - cook.sex[0]))}</strong> more on cleaning, laundry and cooking, and
        <strong>${hm(kids.sex[1] - kids.sex[0])}</strong> more caring for their children.`);
    set('du-relax-read', `The leftover goes where you would guess. Men take
        <strong>${hm(relax.sex[0] - relax.sex[1])}</strong> more relaxing a day than women —
        television, reading and games — and <strong>${hm(g('1301').sex[0] - g('1301').sex[1])}</strong>
        more sport.`);
}

// ── wire everything up ──
(function init() {
    if (!ADL) return;

    // Cover clock
    const coverClock = document.getElementById('cover-clock');
    if (coverClock) buildCoverClock(coverClock);
    initBadges();
    initCoverScroll();
    initSectionExit();
    initRightNow();
    initMetricStrips();
    initMoneyMood();
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
