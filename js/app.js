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
// Only countries with complete data across every metric feature in the story.
const COUNTRIES = Object.keys(ADL.countries)
    .filter(c => { const v = ADL.countries[c]; return v.life && v.happiness && v.tourism; })
    .sort();

const pctOf = (min, codes) => Math.round((codes.reduce((s, c) => s + (min[c] || 0), 0) / 1440) * 100);
const fmtH  = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return m ? `${h}h ${m}m` : `${h}h`; };
const workMin = (min) => (min.PAW || 0) + (min.UPW || 0);
const nice = (c) => c.replace(' (People’s Republic of)', '');

/**
 * Section 1 — one country's day, in five blocks, with the rank of each block
 * inside the twelve.
 *
 * Every sentence on the left and every figure in the card is generated from the
 * selected country, so the prose cannot fall out of step with the chart the way
 * hand-written copy does. Ranks are by size, not merit: more sleep is not
 * better than less, so the caption says so rather than implying a league table.
 */
const DC_CATS = [
    { key: 'PCA', label: 'Sleep & self-care', color: 'var(--care)' },
    { key: 'PAW', label: 'Paid work',         color: 'var(--paid)' },
    { key: 'UPW', label: 'Unpaid work',       color: 'var(--unpaid)' },
    { key: 'LEI', label: 'Leisure',           color: 'var(--leisure)' },
    { key: 'OTH', label: 'Other',             color: '#cec4b6' }
];

function initDayCard() {
    const bar = document.getElementById('dc-bar');
    const pick = document.querySelector('#sec-day [data-picker="A"]');
    if (!bar || !pick || !window.ADL) return;

    const hhmm = m => Math.floor(m / 60) + 'h' + String(Math.round(m % 60)).padStart(2, '0');
    const hm = m => {
        const h = Math.floor(m / 60), r = Math.round(m % 60);
        return h ? `${h}h ${String(r).padStart(2, '0')}m` : `${r}m`;
    };
    const ord = n => n + (['th', 'st', 'nd', 'rd'][n % 10 > 3 || (n > 10 && n < 14) ? 0 : n % 10] || 'th');

    // the twelve with complete records: the set the rest of the story follows
    const twelve = Object.entries(ADL.countries)
        .filter(([, d]) => d.life != null && d.happiness != null && d.tourism != null)
        .map(([name, d]) => ({
            key: name, name: nice(name), m: d.minutes,
            work: d.minutes.PAW + d.minutes.UPW,
            upwShare: d.minutes.UPW / (d.minutes.PAW + d.minutes.UPW)
        }));
    if (!twelve.length) return;

    const rank = (c, get) => [...twelve].sort((a, b) => get(b) - get(a))
        .findIndex(x => x.key === c.key) + 1;
    const top = get => [...twelve].sort((a, b) => get(b) - get(a))[0];
    const bottom = get => [...twelve].sort((a, b) => get(a) - get(b))[0];

    pick.innerHTML = [...twelve].sort((a, b) => a.name.localeCompare(b.name))
        .map(c => `<option value="${c.key}"${c.key === 'Mexico' ? ' selected' : ''}>${c.name}</option>`).join('');

    bar.innerHTML = DC_CATS.map(c =>
        `<span data-cat="${c.key}" style="background:${c.color};width:0"></span>`).join('');
    const spans = new Map(Array.from(bar.children).map(s => [s.dataset.cat, s]));

    const el = id => document.getElementById(id);

    function draw(key) {
        const c = twelve.find(x => x.key === key) || twelve[0];
        el('dc-who').textContent = c.name;

        DC_CATS.forEach(cat =>
            spans.get(cat.key).style.width = (((c.m[cat.key] || 0) / 1440) * 100) + '%');

        el('dc-rows').innerHTML = DC_CATS.map(cat => `
            <div class="dc-row"><i style="background:${cat.color}"></i>
                <span>${cat.label}</span>
                <span class="v">${hhmm(c.m[cat.key] || 0)}</span>
                <span class="r">${ord(rank(c, x => x.m[cat.key] || 0))} of 12</span>
            </div>`).join('');

        const workRank = rank(c, x => x.work), leiRank = rank(c, x => x.m.LEI);
        el('dc-title').textContent = `${c.name} spends its day like this`;
        el('dc-lead').innerHTML =
            `Of 1,440 minutes, ${c.name} gives <strong>${hm(c.work)}</strong> to work, paid and unpaid
             together. That is <strong>${ord(workRank)} of twelve</strong>.`;
        el('dc-body').innerHTML =
            `<strong>${hm(c.m.PCA)}</strong> goes to sleep and self-care, and
             <strong>${hm(c.m.LEI)}</strong> is what remains for leisure,
             <strong>${ord(leiRank)} of twelve</strong>.
             <strong>${(100 * c.upwShare).toFixed(0)}%</strong> of the work is unpaid: cooking, cleaning,
             shopping, care. No payslip records any of it.`;

        const mw = top(x => x.work), lw = bottom(x => x.work);
        el('dc-foot').innerHTML = c.key === mw.key
            ? `<b>The longest working day of the twelve.</b> ${lw.name} works ${hm(mw.work - lw.work)} less.`
            : c.key === lw.key
            ? `<b>The shortest working day of the twelve.</b> ${mw.name} works ${hm(mw.work - lw.work)} more.`
            : `<b>${mw.name}</b> works most here at ${hm(mw.work)}, <b>${lw.name}</b> least at
               ${hm(lw.work)}. ${c.name} sits ${hm(Math.abs(c.work - mw.work))} off the top.`;

        el('dc-cap').innerHTML =
            `<b>Fig 2.1 — ${c.name}'s Day</b>
             Stacked bar to 24 hours. Ranks are within the 12 countries with complete records, and are by
             size rather than merit: more sleep is not better than less. Sleep and self-care includes
             eating and washing; unpaid work covers cooking, cleaning, shopping and care. Blocks sit in a
             fixed order, not a timeline: this is how much, not when. OECD Time Use Database, both sexes,
             average minutes per day.`;
    }

    pick.addEventListener('change', () => draw(pick.value));
    draw(pick.value);
}

// ── Section 2: work ranking — all countries as paid+unpaid split bars ──
function renderWorkRank(container) {
    const rows = COUNTRIES.map(c => {
        const m = ADL.countries[c].minutes;
        return { c, paid: m.PAW || 0, unpaid: m.UPW || 0, total: (m.PAW || 0) + (m.UPW || 0) };
    }).sort((a, b) => b.total - a.total);
    const max = rows[0].total;

    container.innerHTML = rows.map(r => `<div class="rank-row">
        <span class="rank-name">${nice(r.c)}</span>
        <div class="rank-track">
            <span class="rank-fill" style="width:${(r.paid / max) * 100}%; background:var(--magenta)" title="Paid: ${fmtH(r.paid)}"></span>
            <span class="rank-fill" style="width:${(r.unpaid / max) * 100}%; background:var(--unpaid)" title="Unpaid: ${fmtH(r.unpaid)}"></span>
        </div>
        <span class="rank-val">${fmtH(r.total)}</span>
    </div>`).join('');
}

// ── Generic single-metric ranking (Rest, Connect) ──
// valueFn(country)->number; fmt(n)->label; color; highlight = country to accent
function renderRank(container, valueFn, fmt, color, highlight) {
    const rows = COUNTRIES.map(c => ({ c, v: valueFn(c) })).sort((a, b) => b.v - a.v);
    const max = rows[0].v;
    container.innerHTML = rows.map(r => {
        const on = r.c === highlight;
        return `<div class="rank-row">
            <span class="rank-name">${nice(r.c)}</span>
            <div class="rank-track">
                <span class="rank-fill" style="width:${(r.v / max) * 100}%; background:${on ? 'var(--pink)' : color}"></span>
            </div>
            <span class="rank-val">${fmt(r.v)}</span>
        </div>`;
    }).join('');
}

// ── Section 5: Thrive — scatter of life expectancy (x) vs happiness (y) ──
function renderThrive(container) {
    const W = 100, H = 100, pad = 8;               // viewBox units (%)
    const pts = COUNTRIES.map(c => ({ c, x: ADL.countries[c].life, y: ADL.countries[c].happiness }));
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1;
    const y0 = Math.min(...ys) - 0.3, y1 = Math.max(...ys) + 0.3;
    const sx = v => pad + ((v - x0) / (x1 - x0)) * (W - pad * 2);
    const sy = v => (H - pad) - ((v - y0) / (y1 - y0)) * (H - pad * 2);

    const dots = pts.map(p => {
        const big = ['Japan', 'India', 'Mexico', 'Australia'].includes(p.c);
        return `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="${big ? 1.8 : 1.4}"
            fill="${big ? 'var(--gold)' : 'var(--blue)'}"><title>${nice(p.c)}: ${p.x} yrs, ${p.y}/10 happy</title></circle>
            ${big ? `<text x="${sx(p.x).toFixed(1)}" y="${(sy(p.y) - 3).toFixed(1)}" class="sc-label" text-anchor="middle">${nice(p.c)}</text>` : ''}`;
    }).join('');

    container.innerHTML = `<svg viewBox="0 0 100 100" class="scatter" preserveAspectRatio="none" aria-label="Life expectancy versus happiness by country">
        <text x="${W / 2}" y="99" class="sc-axis" text-anchor="middle">Life expectancy →</text>
        <text x="1.5" y="${H / 2}" class="sc-axis" text-anchor="middle" transform="rotate(-90 1.5 ${H / 2})">Happiness →</text>
        ${dots}
    </svg>`;
}

// ── The Insight: "same wealth, different day" ──────────────
// Given two countries, render matched GDP (they're near-identical) and then
// the diverging work / leisure split that wealth utterly fails to predict.
function renderInsight(container, left, right) {
    if (!container) return;
    const L = ADL.countries[left], R = ADL.countries[right];
    const gL = L.gdp, gR = R.gdp;
    const gMax = Math.max(gL, gR);
    const workL = workMin(L.minutes), workR = workMin(R.minutes);
    const leiL = L.minutes.LEI, leiR = R.minutes.LEI;
    const dMax = Math.max(workL, workR, leiL, leiR);
    const bar = (val, max, color) =>
        `<div class="ins-bar"><span style="width:${(val / max) * 100}%; background:${color}"></span></div>`;

    container.innerHTML = `
      <div class="ins-grid">
        <div class="ins-names">
            <span class="ins-name" style="color:var(--copper)">${nice(left)}</span>
            <span class="ins-vs">vs</span>
            <span class="ins-name" style="color:var(--blue)">${nice(right)}</span>
        </div>

        <p class="ins-metric-label">Wealth per person <em>(GDP per capita, 2023)</em></p>
        <div class="ins-two">
            <div class="ins-cell"><span class="ins-fig">$${gL.toLocaleString()}</span>${bar(gL, gMax, 'var(--copper)')}</div>
            <div class="ins-cell"><span class="ins-fig">$${gR.toLocaleString()}</span>${bar(gR, gMax, 'var(--blue)')}</div>
        </div>
        <p class="ins-eq">Practically the same &mdash; a
            <strong>${Math.round(Math.abs(gL - gR) / gMax * 100)}%</strong> difference.</p>

        <p class="ins-metric-label">Hours of work per day</p>
        <div class="ins-two">
            <div class="ins-cell"><span class="ins-fig">${fmtH(workL)}</span>${bar(workL, dMax, 'var(--copper)')}</div>
            <div class="ins-cell"><span class="ins-fig">${fmtH(workR)}</span>${bar(workR, dMax, 'var(--blue)')}</div>
        </div>

        <p class="ins-metric-label">Hours of leisure per day</p>
        <div class="ins-two">
            <div class="ins-cell"><span class="ins-fig">${fmtH(leiL)}</span>${bar(leiL, dMax, 'var(--copper)')}</div>
            <div class="ins-cell"><span class="ins-fig">${fmtH(leiR)}</span>${bar(leiR, dMax, 'var(--blue)')}</div>
        </div>
      </div>`;
    return { workL, workR, leiL, leiR };
}

// ── Lifestyle DNA: quiz → fingerprint → nearest-country twin ──
const DNA_AXES = [
    { key: 'time',      label: 'Time',          color: 'var(--leisure)' },
    { key: 'health',    label: 'Health',        color: 'var(--care)' },
    { key: 'community', label: 'Community',      color: 'var(--copper)' },
    { key: 'connect',   label: 'Connectedness', color: 'var(--blue)' },
];
// One question per axis. A slider from 0–100 sets the target on that axis;
// the two ends anchor what low vs high means.
const DNA_QUESTIONS = [
    { key: 'time',      q: 'How do you weigh work against free time?',
      lo: 'Work-driven',   hi: 'Free-time first' },
    { key: 'health',    q: 'How much does long-term health shape your days?',
      lo: 'Not a focus',   hi: 'It guides everything' },
    { key: 'community',  q: 'How central are family and community to your life?',
      lo: 'Independent',   hi: 'The heart of it all' },
    { key: 'connect',   q: 'How outward-looking and travel-hungry are you?',
      lo: 'Homebody',      hi: 'Endlessly curious' },
];

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
        const you = {};
        DNA_AXES.forEach(ax => you[ax.key] = answers[ax.key] ?? 50);
        const twin = COUNTRIES
            .map(c => ({ c, d: dnaDist(you, ADL.countries[c].dna) }))
            .sort((a, b) => a.d - b.d)[0].c;
        const t = ADL.countries[twin];
        const stage = show(`
            <div class="dna-result">
                <p class="dna-result-kicker">Your closest match is</p>
                <p class="dna-result-name">${nice(twin)}</p>
                ${dnaStrip(t.dna)}
                <p class="dna-result-note">Matched on how you balance <strong>time, health,
                    community and connection</strong> — the four measures behind the score.</p>
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
    const hint   = cover.querySelector('.cover-scroll');
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
        if (hint) hint.style.opacity = String(lerp(1, 0, clamp01(p / 0.2)));
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
        { key: 'OTH', label: 'Other',             color: '#cec4b6',        say: 'travelling, or somewhere unaccounted for' }
    ];

    const time = document.getElementById('rn-time');
    const say  = document.getElementById('rn-say');
    const bar  = document.getElementById('rn-bar');
    const key  = document.getElementById('rn-key');

    key.innerHTML = CATS.map(c =>
        `<span><i style="background:${c.color}"></i>${c.label}</span>`).join('');

    // ── the whole day behind the current hour ──
    // Presentation attributes in SVG do not accept var(), so the bands carry
    // literal hex matching the palette variables used above.
    const HEX = { PCA: '#3B82F6', PAW: '#B87333', UPW: '#5b8def', LEI: '#F97316', OTH: '#cec4b6' };
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

/**
 * The two measures — life expectancy and happiness, introduced on their own
 * before the story claims anything about them.
 *
 * Two horizontal scales with a line joining each country's two positions. A
 * near-flat line means the two measures agree about that country; a steep line
 * crossing others is a country that does well on one and badly on the other.
 * That is the whole point of the figure, and it is why this is a connected dot
 * plot rather than two separate rankings: the disagreement has to be visible in
 * one glance.
 *
 * Each scale is stretched to the range of these twelve, so a position is
 * relative to this group and not to the world. The caption says so.
 */
function initMetricScales() {
    const host = document.getElementById('ms-chart');
    const read = document.getElementById('ms-read');
    if (!host || !window.ADL) return;

    const rows = Object.entries(ADL.countries)
        .filter(([, d]) => d.life != null && d.happiness != null && d.tourism != null)
        .map(([name, d]) => ({ key: name, name: nice(name), life: d.life, happy: d.happiness }));
    if (rows.length < 2) return;

    const AX = [
        { label: 'Life expectancy', get: c => c.life,  fmt: v => v.toFixed(1) + ' years', y: 0 },
        { label: 'Happiness',       get: c => c.happy, fmt: v => v.toFixed(2) + ' of 10', y: 1 }
    ];
    const scale = AX.map(a => {
        const v = rows.map(a.get);
        return { lo: Math.min(...v), hi: Math.max(...v) };
    });
    const rankOf = (c, get) => [...rows].sort((a, b) => get(b) - get(a))
        .findIndex(x => x.key === c.key) + 1;
    const ord = n => n + (['th', 'st', 'nd', 'rd'][n % 10 > 3 || (n > 10 && n < 14) ? 0 : n % 10] || 'th');

    const W = 760, H = 250, L = 54, R = 54, TOP = 58, BOT = 178;
    const X = (i, v) => {
        const s = scale[i], span = (s.hi - s.lo) || 1;
        return L + ((v - s.lo) / span) * (W - L - R);
    };
    const yOf = i => (i === 0 ? TOP : BOT);

    /* Twelve labels on one horizontal axis collide, so nudge them apart along x
       and let the connecting line show which dot each belongs to. */
    function declashX(items, gap, lo, hi) {
        const out = items.map(o => ({ ...o, lx: o.x })).sort((a, b) => a.lx - b.lx);
        for (let pass = 0; pass < 80; pass++) {
            let moved = false;
            for (let i = 1; i < out.length; i++) {
                const d = out[i].lx - out[i - 1].lx;
                if (d < gap) {
                    const push = (gap - d) / 2;
                    out[i - 1].lx -= push; out[i].lx += push; moved = true;
                }
            }
            if (out[0].lx < lo) { const s = lo - out[0].lx; out.forEach(o => { o.lx += s; }); }
            const last = out[out.length - 1];
            if (last.lx > hi) { const s = last.lx - hi; out.forEach(o => { o.lx -= s; }); }
            if (!moved) break;
        }
        return out;
    }

    let s = '';
    AX.forEach((a, i) => {
        const y = yOf(i);
        s += `<line class="ms-axis" x1="${L}" y1="${y}" x2="${W - R}" y2="${y}"/>`;
        s += `<text class="ms-title" x="${L}" y="${y + (i ? 30 : -30)}">${a.label}</text>`;
        s += `<text class="ms-end" x="${L}" y="${y + (i ? 44 : -17)}">${a.fmt(scale[i].lo)}</text>`;
        s += `<text class="ms-end" x="${W - R}" y="${y + (i ? 44 : -17)}" text-anchor="end">${a.fmt(scale[i].hi)}</text>`;
    });

    // one line per country, joining its position on each scale
    rows.forEach(c => {
        const x0 = X(0, c.life), x1 = X(1, c.happy);
        s += `<path class="ms-hit" data-name="${c.name}" d="M${x0},${TOP} L${x1},${BOT}"/>`;
        s += `<path class="ms-link" data-name="${c.name}" d="M${x0},${TOP} L${x1},${BOT}"/>`;
        s += `<circle class="ms-dot" data-name="${c.name}" cx="${x0}" cy="${TOP}" r="4.5"/>`;
        s += `<circle class="ms-dot" data-name="${c.name}" cx="${x1}" cy="${BOT}" r="4.5"/>`;
    });
    // names above the top scale only, so the lower half stays clean
    declashX(rows.map(c => ({ name: c.name, x: X(0, c.life) })), 44, L - 10, W - R + 10)
        .forEach(o => {
            s += `<text class="ms-name" data-name="${o.name}" x="${o.lx}" y="${TOP - 8}"
                  text-anchor="middle">${o.name}</text>`;
        });

    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"
        aria-label="Life expectancy and happiness for twelve countries, each country's two positions joined by a line">${s}</svg>`;

    const el = host.querySelector('svg');

    // the standing message: they agree, with one loud exception
    function corr(a, b) {
        const n = rows.length;
        const xs = rows.map(a), ys = rows.map(b);
        const mx = xs.reduce((t, x) => t + x, 0) / n, my = ys.reduce((t, y) => t + y, 0) / n;
        const sxy = xs.reduce((t, x, i) => t + (x - mx) * (ys[i] - my), 0);
        const sxx = xs.reduce((t, x) => t + (x - mx) ** 2, 0);
        const syy = ys.reduce((t, y) => t + (y - my) ** 2, 0);
        return sxy / Math.sqrt(sxx * syy);
    }
    const R_ALL = corr(c => c.life, c => c.happy);
    // biggest disagreement, measured in rank places
    const oddest = rows.map(c => ({
        c, shift: rankOf(c, x => x.happy) - rankOf(c, x => x.life)
    })).sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift))[0];

    function idle() {
        read.innerHTML =
            `The two scales mostly line up: <em>r = ${R_ALL.toFixed(2)}</em> across the twelve.
             The exception is <b>${oddest.c.name}</b>, which moves
             <em>${Math.abs(oddest.shift)} places</em> between them.`;
    }
    function show(name) {
        const c = rows.find(x => x.name === name);
        if (!c) return;
        const lr = rankOf(c, x => x.life), hr = rankOf(c, x => x.happy);
        read.innerHTML =
            `<b>${c.name}</b> lives to <em>${c.life.toFixed(1)}</em> years, <b>${ord(lr)} of twelve</b>,
             and rates its own life <em>${c.happy.toFixed(2)}</em> out of ten, <b>${ord(hr)}</b>.` +
            (Math.abs(hr - lr) >= 4 ? ' The two measures disagree sharply here.' : '');
        el.querySelectorAll('.ms-link').forEach(p => {
            p.classList.toggle('on', p.dataset.name === name);
            p.classList.toggle('off', p.dataset.name !== name);
        });
        el.querySelectorAll('.ms-dot').forEach(d =>
            d.classList.toggle('on', d.dataset.name === name));
        el.querySelectorAll('.ms-name').forEach(t => {
            t.classList.toggle('on', t.dataset.name === name);
            t.classList.toggle('off', t.dataset.name !== name);
        });
    }
    function clear() {
        el.querySelectorAll('.ms-link, .ms-dot, .ms-name').forEach(n =>
            n.classList.remove('on', 'off'));
        idle();
    }
    el.addEventListener('mouseover', e => {
        const t = e.target.closest('[data-name]');
        if (t) show(t.dataset.name);
    });
    el.addEventListener('mouseleave', clear);
    el.addEventListener('click', e => {
        const t = e.target.closest('[data-name]');
        if (t) show(t.dataset.name);
    });
    idle();
}

/**
 * Rank slope chart — twelve countries, five measures, plotted by rank.
 *
 * Rank rather than value on purpose. With value scales, every axis has its own
 * range, so a line's height on one axis means nothing on the next and following
 * a line invites a false reading. Twelve evenly spaced rank slots give all five
 * axes one shared scale, which is what makes the crossings legible: a crossing
 * is two countries swapping order, nothing else.
 *
 * Ranks are by size, not merit. Only two of the five measures have an obvious
 * good direction, so the axes read "most" to "least" and the caption says so.
 */
function initRankParallel() {
    const host = document.getElementById('pc-chart');
    if (!host || !window.ADL) return;

    const shortName = n => n.startsWith('China') ? 'China'
        : n === 'United Kingdom' ? 'UK' : n === 'United States' ? 'US' : n;
    const hhmm = m => Math.floor(m / 60) + 'h' + String(Math.round(m % 60)).padStart(2, '0');

    const rows = Object.entries(ADL.countries)
        .filter(([, d]) => d.life != null && d.happiness != null && d.tourism != null)
        .map(([name, d]) => ({
            name: shortName(name),
            work: d.minutes.PAW + d.minutes.UPW,
            sleep: d.minutes.PCA,
            leisure: d.minutes.LEI,
            life: d.life,
            happy: d.happiness
        }));
    if (rows.length < 2) return;

    const AX = [
        { label: 'Work',      get: c => c.work,    fmt: hhmm },
        { label: 'Sleep',     get: c => c.sleep,   fmt: hhmm },
        { label: 'Leisure',   get: c => c.leisure, fmt: hhmm },
        { label: 'Life exp.', get: c => c.life,    fmt: v => v.toFixed(1) + 'y' },
        { label: 'Happiness', get: c => c.happy,   fmt: v => v.toFixed(2) }
    ];
    // rank 1 = most of that measure
    const RANK = AX.map(a => {
        const order = [...rows].sort((x, y) => a.get(y) - a.get(x));
        const map = new Map();
        order.forEach((c, i) => map.set(c.name, i + 1));
        return map;
    });

    const hue = i => (i * 360 / rows.length + 18) % 360;
    const colour = i => `hsl(${hue(i)} 72% 62%)`;
    const colourOf = name => colour(rows.findIndex(c => c.name === name));

    // geometry matches the sample exactly
    const W = 940, H = 420, L = 118, R = 74, T = 58, B = 40;
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
     * Twelve labels on one axis always collide somewhere. Push them apart until
     * each has room, then draw a leader back to the true point, so moving a
     * label costs no accuracy.
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
        aria-label="Rank position of twelve countries across five measures">${s}</svg>`;

    const el = host.querySelector('svg');
    const read = document.getElementById('pc-read');
    const pick = document.getElementById('pc-pick');
    if (pick) {
        pick.innerHTML = rows.map((c, i) =>
            `<button type="button" data-n="${c.name}"><span style="color:${colour(i)}">\u25CF</span> ${c.name}</button>`).join('');
    }

    function highlight(name) {
        el.querySelectorAll('.pc-line').forEach(l => {
            l.classList.toggle('on', !!name && l.dataset.name === name);
            l.classList.toggle('off', !!name && l.dataset.name !== name);
        });
        // dots only appear for the highlighted country, as in the sample
        el.querySelectorAll('.pc-dot').forEach(d =>
            d.classList.toggle('on', !!name && d.dataset.name === name));
        el.querySelectorAll('.pc-nml, .pc-lead').forEach(n => {
            n.style.opacity = !name || n.dataset.name === name ? '1' : '0.15';
        });
        if (pick) {
            pick.querySelectorAll('button').forEach(b => {
                const on = b.dataset.n === name;
                b.style.background = on ? colourOf(b.dataset.n) : 'transparent';
                b.style.color = on ? '#131735' : '';
                b.style.borderColor = on ? colourOf(b.dataset.n) : '';
                b.classList.toggle('on', on);
            });
        }
        if (!read) return;
        if (!name) {
            read.innerHTML = '<span>Twelve countries, five measures. ' +
                '<b>No country leads on all five.</b> Hover a line or pick a country.</span>';
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

// ── wire everything up ──
(function init() {
    if (!ADL) return;

    // Cover clock
    const coverClock = document.getElementById('cover-clock');
    if (coverClock) buildCoverClock(coverClock);
    initCoverScroll();
    initSectionExit();
    initRightNow();
    initMetricScales();
    initRankParallel();

    // Section 1 — one country's day, five blocks, each with its rank
    initDayCard();

    // Section 2 — work ranking
    const workRank = document.getElementById('work-rank');
    if (workRank) renderWorkRank(workRank);

    // Section 4 — rest (leisure ranking)
    const restRank = document.getElementById('rest-rank');
    if (restRank) renderRank(restRank,
        c => ADL.countries[c].minutes.LEI,
        m => fmtH(m), 'var(--blue)', 'Italy');

    // Section 5 — thrive (life vs happiness scatter)
    const thrive = document.getElementById('thrive-scatter');
    if (thrive) renderThrive(thrive);

    // Section 6 — connect (tourism ranking)
    const connRank = document.getElementById('connect-rank');
    if (connRank) renderRank(connRank,
        c => ADL.countries[c].tourism,
        v => v + 'M', 'var(--purple)', 'France');

    // The Insight — same wealth, different day (default Canada vs Germany)
    const insight = document.getElementById('insight');
    if (insight) renderInsight(insight, 'Canada', 'Germany');

    // Lifestyle DNA — quiz → twin
    renderDna(document.getElementById('dna'));

    // scroll reveal
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();
