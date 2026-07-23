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

// ── wire everything up ──
(function init() {
    if (!ADL) return;

    // Section 1 — single country
    const pickerA = document.querySelector('[data-picker="A"]');
    const barsA = document.querySelector('[data-bars="A"]');
    if (pickerA && barsA) {
        buildPicker(pickerA, 'France');
        const drawA = () => { renderBars(barsA, pickerA.value); fillSlots(pickerA.value); };
        pickerA.addEventListener('change', drawA);
        drawA();
    }

    // Section 2 — comparison
    const pickerL = document.querySelector('[data-picker="L"]');
    const pickerR = document.querySelector('[data-picker="R"]');
    const barsL = document.querySelector('[data-bars="L"]');
    const barsR = document.querySelector('[data-bars="R"]');
    const callout = document.querySelector('[data-callout="compare"]');
    if (pickerL && pickerR) {
        buildPicker(pickerL, 'Japan');
        buildPicker(pickerR, 'Italy');
        const drawCompare = () => {
            renderBars(barsL, pickerL.value);
            renderBars(barsR, pickerR.value);
            renderCompareCallout(callout, pickerL.value, pickerR.value);
        };
        pickerL.addEventListener('change', drawCompare);
        pickerR.addEventListener('change', drawCompare);
        drawCompare();
    }

    // scroll reveal
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();
