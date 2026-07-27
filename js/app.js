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

// ── Section 1: "The day" hero — giant 24 + one inline split bar ──
// Splits the day into Work (paid+unpaid) / Sleep & care / Other (leisure & rest).
const DAY_SEGS = [
    { label: 'Work',         color: 'var(--copper)',  codes: ['PAW', 'UPW'] },
    { label: 'Sleep & care', color: 'var(--care)',    codes: ['PCA'] },
    { label: 'Other',        color: 'var(--leisure)', codes: ['LEI', 'OTH'] },
];
function renderDayHero(container, country) {
    if (!container) return;
    const min = ADL.countries[country].minutes;
    const segs = DAY_SEGS.map(s => ({ ...s, pct: pctOf(min, s.codes) }));
    const [work, , other] = segs;
    container.innerHTML = `
        <div class="dh-big">24<small>hours, everywhere</small></div>
        <p class="dh-line">In <strong>${nice(country)}</strong>, <strong>${work.pct}%</strong>
            of the day goes to work and <strong>${other.pct}%</strong> to everything else.</p>
        <div class="dh-bar">
            ${segs.map(s => `<span style="width:${s.pct}%; background:${s.color}"></span>`).join('')}
        </div>
        <div class="dh-key">
            ${segs.map(s => `<span style="color:${s.color}">${s.label} · ${s.pct}%</span>`).join('')}
        </div>`;
}

// ── build a picker <select> ──
function buildPicker(sel, selected) {
    sel.innerHTML = COUNTRIES.map(c =>
        `<option value="${c}"${c === selected ? ' selected' : ''}>${nice(c)}</option>`).join('');
}

// ── adaptive comparison callout: find the biggest gap between L and R ──
function renderCompareCallout(el, left, right) {
    const L = ADL.countries[left], R = ADL.countries[right];
    const metrics = [
        { k: 'work',    label: 'time spent working', lv: pctOf(L.minutes, ['PAW','UPW']), rv: pctOf(R.minutes, ['PAW','UPW']), unit: '% of the day' },
        { k: 'leisure', label: 'leisure',            lv: pctOf(L.minutes, ['LEI']),        rv: pctOf(R.minutes, ['LEI']),       unit: '% of the day' },
        { k: 'life',    label: 'life expectancy',    lv: L.life,      rv: R.life,      unit: ' years' },
        { k: 'happy',   label: 'happiness',          lv: L.happiness, rv: R.happiness, unit: '/10' },
    ];
    // biggest relative gap wins the headline
    metrics.forEach(m => m.gap = Math.abs(m.lv - m.rv) / Math.max(m.lv, m.rv));
    const top = metrics.slice().sort((a, b) => b.gap - a.gap)[0];
    const more = top.lv >= top.rv ? left : right;
    const less = top.lv >= top.rv ? right : left;
    const hi = Math.max(top.lv, top.rv), lo = Math.min(top.lv, top.rv);

    el.innerHTML = `
        <p class="callout-head">The gap that stands out</p>
        <div class="callout-row">
            <span class="callout-ic">${ICONS.briefcase}</span>
            <p>On <strong>${top.label}</strong>, <strong>${nice(more)}</strong> reaches
               <strong>${hi}${top.unit}</strong> — against <strong>${lo}${top.unit}</strong>
               in <strong>${nice(less)}</strong>.</p>
        </div>
        <div class="callout-row">
            <span class="callout-ic">${ICONS.coffee}</span>
            <p>Two countries, two different days: ${nice(left)} and ${nice(right)}.</p>
        </div>`;
}

// ── Section 2: head-to-head "vs" spine — diverging bars from a centre axis ──
// `full` = the value that fills a bar 100%, so fills reflect the real number.
const VS_METRICS = [
    { label: 'Work',              get: c => pctOf(ADL.countries[c].minutes, ['PAW', 'UPW']), unit: '%',    full: 100 },
    { label: 'Leisure',           get: c => pctOf(ADL.countries[c].minutes, ['LEI']),        unit: '%',    full: 100 },
    { label: 'Sleep & self-care', get: c => pctOf(ADL.countries[c].minutes, ['PCA']),        unit: '%',    full: 100 },
    { label: 'Life expectancy',   get: c => ADL.countries[c].life,      unit: ' yrs', full: 90 },
    { label: 'Happiness',         get: c => ADL.countries[c].happiness, unit: '/10',  full: 10 },
];
function renderVsSpine(container, left, right) {
    if (!container) return;
    container.innerHTML = VS_METRICS.map(mt => {
        const lv = mt.get(left), rv = mt.get(right);
        const lw = Math.min(100, (lv / mt.full) * 100);
        const rw = Math.min(100, (rv / mt.full) * 100);
        const lWin = lv >= rv;
        return `<div class="vs-row">
            <div class="vs-side vs-left">
                <span class="vs-num ${lWin ? 'win' : ''}">${lv}${mt.unit}</span>
                <div class="vs-bar"><span style="width:${lw}%; background:var(--blue)"></span></div>
            </div>
            <span class="vs-metric">${mt.label}</span>
            <div class="vs-side vs-right">
                <div class="vs-bar"><span style="width:${rw}%; background:var(--leisure)"></span></div>
                <span class="vs-num ${!lWin ? 'win' : ''}">${rv}${mt.unit}</span>
            </div>
        </div>`;
    }).join('');
}

// ── Section 3: work ranking — all countries as paid+unpaid split bars ──
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

    // Section 1 — "The day" hero (giant 24 + inline split bar)
    const pickerA = document.querySelector('[data-picker="A"]');
    const dayHero = document.getElementById('day-hero');
    if (pickerA && dayHero) {
        buildPicker(pickerA, 'France');
        const drawA = () => renderDayHero(dayHero, pickerA.value);
        pickerA.addEventListener('change', drawA);
        drawA();
    }

    // Section 2 — head-to-head "vs" spine
    const pickerL = document.querySelector('[data-picker="L"]');
    const pickerR = document.querySelector('[data-picker="R"]');
    const vsRows = document.getElementById('vs-rows');
    const callout = document.querySelector('[data-callout="compare"]');
    if (pickerL && pickerR) {
        buildPicker(pickerL, 'Japan');
        buildPicker(pickerR, 'Italy');
        const drawCompare = () => {
            renderVsSpine(vsRows, pickerL.value, pickerR.value);
            renderCompareCallout(callout, pickerL.value, pickerR.value);
        };
        pickerL.addEventListener('change', drawCompare);
        pickerR.addEventListener('change', drawCompare);
        drawCompare();
    }

    // Section 3 — work ranking
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
