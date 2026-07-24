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

// The three story rows. "Work" = paid + unpaid combined.
const ROWS = [
    { label: 'Sleep & self-care', icon: ICONS.bed,       color: 'var(--indigo)',  codes: ['PCA'] },
    { label: 'Work',              icon: ICONS.briefcase, color: 'var(--magenta)', codes: ['PAW', 'UPW'] },
    { label: 'Leisure',           icon: ICONS.coffee,    color: 'var(--blue)',    codes: ['LEI'] },
];

const ADL = window.ADL;
// Only countries with complete data across every metric feature in the story.
const COUNTRIES = Object.keys(ADL.countries)
    .filter(c => { const v = ADL.countries[c]; return v.life && v.happiness && v.tourism; })
    .sort();

const pctOf = (min, codes) => Math.round((codes.reduce((s, c) => s + (min[c] || 0), 0) / 1440) * 100);
const fmtH  = (min) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return m ? `${h}h ${m}m` : `${h}h`; };
const workMin = (min) => (min.PAW || 0) + (min.UPW || 0);
const nice = (c) => c.replace(' (People’s Republic of)', '');

// ── render the bar rows for one country into a container ──
function renderBars(container, country) {
    if (!container) return;   // container may be absent (e.g. experiment layout)
    const min = ADL.countries[country].minutes;
    container.innerHTML = ROWS.map(row => {
        const pct = pctOf(min, row.codes);
        return `<div class="bar-row">
            <span class="bar-ic" style="background:${row.color}">${row.icon}</span>
            <div class="bar-main">
                <div class="bar-track">
                    <span class="bar-pct" style="left:${pct}%; color:${row.color}">${pct}%</span>
                    <span class="bar-fill" style="width:${pct}%; background:${row.color}"></span>
                </div>
                <span class="bar-label">${row.label}</span>
            </div>
        </div>`;
    }).join('');
}

// ── fill any <strong data-slot> / <span data-slot> for a country ──
function fillSlots(country) {
    const min = ADL.countries[country].minutes;
    const vals = {
        name: nice(country),
        work: pctOf(min, ['PAW', 'UPW']) + '% of the day',
        leisure: pctOf(min, ['LEI']) + '% of the day',
    };
    document.querySelectorAll('[data-slot]').forEach(el => {
        const k = el.dataset.slot;
        if (vals[k] !== undefined) el.textContent = vals[k];
    });
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
            <p>Same 24 hours, two different lives: ${nice(left)} vs ${nice(right)}.</p>
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
                <div class="vs-bar"><span style="width:${rw}%; background:var(--magenta)"></span></div>
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
            <span class="rank-fill" style="width:${(r.unpaid / max) * 100}%; background:var(--purple-light)" title="Unpaid: ${fmtH(r.unpaid)}"></span>
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
            fill="${big ? 'var(--magenta)' : 'var(--blue)'}"><title>${nice(p.c)}: ${p.x} yrs, ${p.y}/10 happy</title></circle>
            ${big ? `<text x="${sx(p.x).toFixed(1)}" y="${(sy(p.y) - 3).toFixed(1)}" class="sc-label" text-anchor="middle">${nice(p.c)}</text>` : ''}`;
    }).join('');

    container.innerHTML = `<svg viewBox="0 0 100 100" class="scatter" preserveAspectRatio="none" aria-label="Life expectancy versus happiness by country">
        <text x="${W / 2}" y="99" class="sc-axis" text-anchor="middle">Life expectancy →</text>
        <text x="1.5" y="${H / 2}" class="sc-axis" text-anchor="middle" transform="rotate(-90 1.5 ${H / 2})">Happiness →</text>
        ${dots}
    </svg>`;
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

    // Section 1 — single country
    const pickerA = document.querySelector('[data-picker="A"]');
    const barsA = document.querySelector('[data-bars="A"]');
    if (pickerA && barsA) {
        buildPicker(pickerA, 'France');
        const drawA = () => { renderBars(barsA, pickerA.value); fillSlots(pickerA.value); };
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

    // scroll reveal
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();
