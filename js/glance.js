/* ══════════════════════════════════════════════════════════════════════════════
   CHAPTER ONE AT A GLANCE  ·  #sec-glance
   ══════════════════════════════════════════════════════════════════════════════

   One sheet that states the chapter before the chapter argues it: a ribbon braid
   of all 35 days, the same-clock day card, and a sortable ranking. Three ways of
   choosing one country, and every panel follows the choice.

   WHY THIS IS A SEPARATE FILE AND EVERY id CARRIES A gl- PREFIX
   ------------------------------------------------------------
   #sec-day already owns dc-bar, dc-rows, dc-foot and dc-who, and app.js's
   initDayCard() resolves those with an UNSCOPED document.getElementById. This
   section sits EARLIER in the document, so sharing those ids would hand app.js
   this card's elements and leave #sec-day rendering nothing. Every id here is
   namespaced, and every lookup is scoped to the section rather than the document,
   so a future collision elsewhere on the page cannot reach in either.

   The ranking classes are renamed too (.gl-row, not .rank-row). style.css already
   defines .rank/.rank-row as a static three-column grid for #work-rank and
   #rest-rank; this ranking is absolutely positioned so rows can animate between
   sort orders. Same name, different component — so it gets its own name.

   Shared furniture IS reused as-is: .day-card, .card-head, .callout, .fig-cap,
   .pc-panel, .dc-card and the .dc-* internals all come from style.css unchanged.
   ══════════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var root = document.getElementById('sec-glance');
    if (!root || !window.ADL || !ADL.countries) return;

    var $ = function (id) { return root.querySelector('#' + id); };
    var NS = 'http://www.w3.org/2000/svg';
    var C = ADL.countries, DAY = 1440;

    var CATS = [
        { key: 'PCA', label: 'Sleep & self-care', color: 'var(--care)' },
        { key: 'PAW', label: 'Paid work', color: 'var(--paid)' },
        { key: 'UPW', label: 'Unpaid work', color: 'var(--unpaid)' },
        { key: 'LEI', label: 'Leisure', color: 'var(--leisure)' },
        { key: 'OTH', label: 'Other', color: 'var(--other)' }
    ];
    /* The braid needs its own ramp because it is the one panel on a #1A1A1A ground:
       the story's greys collapse into that background and sleep, the largest block
       of the day, becomes the hardest one to see. Same five hues stepped lighter,
       used only inside .pc-panel — everything on paper keeps the CATS tokens. */
    var RIB = { PCA: '#7A8189', PAW: '#C0392B', UPW: '#E8A79F', LEI: '#C9CED3', OTH: '#5F6469' };

    /* ── flags ───────────────────────────────────────────────────────────────
       Emoji built from the ISO 3166-1 alpha-2 code rather than image assets:
       every dataset in this story is baked in and works from file://, and 35 flag
       SVGs would be either a bundle or a CDN. macOS, iOS and Android draw them;
       Windows Chrome renders the two letters instead, so support is measured once
       and a bordered two-letter chip is substituted. Both fill the same slot. */
    var ISO2 = {
        'Australia': 'AU', 'Austria': 'AT', 'Belgium': 'BE', 'Bulgaria': 'BG', 'Canada': 'CA',
        'China': 'CN', 'Croatia': 'HR', 'Denmark': 'DK', 'Estonia': 'EE', 'Finland': 'FI',
        'France': 'FR', 'Germany': 'DE', 'Greece': 'GR', 'Hungary': 'HU', 'India': 'IN',
        'Ireland': 'IE', 'Italy': 'IT', 'Japan': 'JP', 'Korea': 'KR', 'Latvia': 'LV',
        'Lithuania': 'LT', 'Luxembourg': 'LU', 'Mexico': 'MX', 'Netherlands': 'NL',
        'New Zealand': 'NZ', 'Norway': 'NO', 'Poland': 'PL', 'Portugal': 'PT',
        'Slovenia': 'SI', 'South Africa': 'ZA', 'Spain': 'ES', 'Sweden': 'SE',
        'T\u00fcrkiye': 'TR', 'United Kingdom': 'GB', 'United States': 'US'
    };
    var FLAG_OK = (function () {
        try {
            var x = document.createElement('canvas').getContext('2d');
            x.font = '20px sans-serif';
            return x.measureText('\uD83C\uDDFA\uD83C\uDDF8').width <
                   x.measureText('\uD83C\uDDFA').width * 1.8;
        } catch (e) { return false; }
    })();
    function flagChar(n) {
        var cc = ISO2[n];
        if (!cc) return '';
        if (!FLAG_OK) return cc;
        return String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65,
                                    0x1F1E6 + cc.charCodeAt(1) - 65);
    }
    function flagHTML(n) {
        return '<span class="gl-flag' + (FLAG_OK ? '' : ' gl-flag-chip') + '">' +
               flagChar(n) + '</span>';
    }

    /* Whether white or black reads better on a given fill, by WCAG relative
       luminance rather than by eye. It matters: on the braid ramp only paid work's
       red takes white, and the sleep grey #7A8189 gives --ink-deep just 4.42:1,
       under the 4.5 bar — which is why .br-val.dark-text is true black. */
    function onDark(hex) {
        var c = [1, 3, 5].map(function (i) {
            var v = parseInt(hex.substr(i, 2), 16) / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
        return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05);
    }

    var nice = function (n) { return n.replace(' (People\u2019s Republic of)', ''); };
    var hm = function (v) {
        var h = Math.floor(v / 60), m = Math.round(v % 60);
        return h + 'h' + (m < 10 ? '0' : '') + m;
    };
    var hmS = function (v) {
        var h = Math.floor(v / 60), m = Math.round(v % 60);
        return h ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm';
    };
    var ord = function (n) {
        return n + (['th', 'st', 'nd', 'rd'][n % 10 > 3 || (n > 10 && n < 14) ? 0 : n % 10] || 'th');
    };
    var el = function (n, a, t) {
        var e = document.createElementNS(NS, n);
        for (var k in a) e.setAttribute(k, a[k]);
        if (t != null) e.textContent = t;
        return e;
    };

    var R = Object.keys(C).filter(function (k) { return C[k].minutes; }).map(function (k) {
        var m = C[k].minutes;
        return { name: nice(k), m: m, work: m.PAW + m.UPW, sleep: m.PCA, leisure: m.LEI,
                 paid: m.PAW, unpaid: m.UPW };
    });
    if (!R.length) return;
    var N = R.length;

    /* N everywhere rather than a literal 35. The country set has already been
       rewritten once in this project's life; copy that states its own size has to
       read it from the data or it silently goes stale. */
    var AVG = { name: 'All ' + N + ' countries', m: {}, avg: true };
    CATS.forEach(function (k) {
        AVG.m[k.key] = R.reduce(function (s, c) { return s + (c.m[k.key] || 0); }, 0) / N;
    });
    AVG.work = AVG.m.PAW + AVG.m.UPW; AVG.sleep = AVG.m.PCA; AVG.leisure = AVG.m.LEI;
    AVG.paid = AVG.m.PAW; AVG.unpaid = AVG.m.UPW;

    function spread(get) {
        var a = R.map(get), mn = Math.min.apply(null, a), mx = Math.max.apply(null, a);
        var mu = a.reduce(function (x, y) { return x + y; }, 0) / a.length;
        return { mn: mn, mx: mx, mu: mu, spread: mx - mn, pct: Math.round((mx - mn) / mu * 100) };
    }
    function rankOf(c, get) {
        return R.slice().sort(function (a, b) { return get(b) - get(a); })
            .findIndex(function (x) { return x.name === c.name; }) + 1;
    }

    /* ── the one thing worth saying about each country ────────────────────────
       The middle line of the readout. Every fact is a rank position inside the 35,
       read off the same accessors the ranking panel sorts on, so the sentence can
       never contradict the chart under it.

       Which fact gets used: whichever measure the country sits closest to an END of.
       Mexico is 1st of 35 for all work, so it gets the working day; Norway is 1st for
       leisure and only 22nd for work, so it gets leisure. Ties go to the earlier
       entry below, which is why the list is ordered by editorial weight rather than
       alphabetically. Countries near the middle of everything still get their least
       average measure, phrased with an ordinal — honest, if quieter.

       Computed once for all 35 rather than inside show(): rankOf sorts the array, and
       doing five sorts on every hover to restate a fixed fact would be wasteful. */
    /* Four sentences per measure rather than one label and a computed ordinal: an
       outright winner reads "The most leisure in the dataset", a near-miss reads
       "Among the most leisure". Ordinals were tried first and they undersell the
       finding — "5th longest working day" is a table cell, not a sentence.

       The wording is written out per case instead of assembled, because English will
       not pluralise these uniformly: "working day" takes an s, while "unpaid work"
       and "leisure" are mass nouns that need "Among the highest for ..." instead.

       "in the dataset", never "of any country": only 35 countries keep diaries of this
       kind, so the superlative is true of the set, not of the world.

       "sleep and self-care", never just "sleep": PCA carries eating and washing too. */
    /* Four sentences per measure. The two outright winners are written as verb-led
       identities with the country as the implied subject — "Works longer than anyone
       else", not "1st for all work" — because a country that leads a measure should
       read as a character rather than a table cell. The two near-misses stay in the
       "Among the ..." register, which is the honest way to say "near the end of this
       list but not at it".

       The wording is written out per case instead of assembled, because English will
       not pluralise these uniformly: "working day" takes an s, unpaid work wants
       "workload", and leisure wants "hours".

       "Sleeps" is shorthand. The measure is sleep AND self-care, which carries eating
       and washing, and the legend under the braid names it in full three lines below
       this sentence. The near-miss line says so outright.

       Six of the ten superlatives never print on today's data, because the country
       holding that extreme wins an earlier measure: France is last for all work but
       leads sleep, Mexico is last for both leisure and sleep but leads all work, Japan
       is last for unpaid but leads paid. They are kept because this country set has
       been rewritten once already. Editing one will look like it does nothing. */
    var FACT_BY = [
        { get: function (c) { return c.work; },
          hi1: 'Works longer than anyone else.',
          hiN: 'Among the longest working days.',
          lo1: 'Works the shortest day of all.',
          loN: 'Among the shortest working days.' },
        { get: function (c) { return c.leisure; },
          hi1: 'Has the most leisure time.',
          hiN: 'Among the longest leisure hours.',
          lo1: 'Has the least leisure time of all.',
          loN: 'Among the shortest leisure hours.' },
        { get: function (c) { return c.unpaid; },
          hi1: 'Carries the heaviest unpaid workload.',
          hiN: 'Among the heaviest unpaid workloads.',
          lo1: 'Carries the lightest unpaid workload.',
          loN: 'Among the lightest unpaid workloads.' },
        { get: function (c) { return c.paid; },
          hi1: 'Spends the longest at paid work.',
          hiN: 'Among the longest paid working days.',
          lo1: 'Spends the least time at paid work.',
          loN: 'Among the shortest paid working days.' },
        { get: function (c) { return c.sleep; },
          hi1: 'Sleeps more than any other country here.',
          hiN: 'Among the longest sleep and self-care hours.',
          lo1: 'Sleeps less than any other country here.',
          loN: 'Among the shortest sleep and self-care hours.' }
    ];
    /* "Among the longest" stretches to about the top fifth and no further: at 7 of 35
       it is fair, at 12 it is a lie. Six countries sit in the dead middle on all five
       measures — the United States is 15th, 22nd, 15th, 15th and 18th — and they fall
       through to the unpaid share of their own working day. No rank, always specific,
       and it ranges from a fifth of the work to over half across this set. */
    var RANK_LIMIT = 7;
    var FACT = (function () {
        var out = {};
        R.forEach(function (c) {
            var best = null;
            FACT_BY.forEach(function (f) {
                var r = rankOf(c, f.get), fromEnd = N + 1 - r;
                var top = r <= fromEnd, place = top ? r : fromEnd;
                /* Nearest an end wins; on a tie the TOP end wins; on a tie at the same
                   end the earlier measure wins. Leading something is a sharper identity
                   than lacking it, and the two countries that pin the extremes need this
                   to come out right. Mexico is simultaneously 1st for all work, 1st for
                   unpaid, last for leisure and last for sleep — four first places — and
                   France is 1st for sleep and last for all work. Without the top-end
                   preference France would be described by what it does least. */
                if (!best || place < best.place ||
                    (place === best.place && top && !best.top)) {
                    best = { place: place, f: f, top: top };
                }
            });
            if (best.place > RANK_LIMIT) {
                out[c.name] = 'Gives ' + Math.round(c.unpaid / c.work * 100) +
                    '% of its working day to unpaid work.';
            } else if (best.place === 1) {
                out[c.name] = best.top ? best.f.hi1 : best.f.lo1;
            } else {
                out[c.name] = best.top ? best.f.hiN : best.f.loN;
            }
        });
        return out;
    })();

    $('gl-key-braid').innerHTML = CATS.map(function (k) {
        return '<span><i style="background:' + RIB[k.key] + '"></i>' + k.label + '</span>';
    }).join('');
    $('gl-key-rank').innerHTML = CATS.map(function (k) {
        return '<span><i style="background:' + k.color + '"></i>' + k.label + '</span>';
    }).join('');

    // ══ SAME CLOCK · the day card ═════════════════════════════════════════════
    var dayCard = (function () {
        var bar = $('gl-dc-bar');
        bar.innerHTML = CATS.map(function (k) {
            return '<span data-cat="' + k.key + '" style="background:' + k.color +
                   ';width:0"></span>';
        }).join('');
        var spans = {};
        Array.prototype.forEach.call(bar.children, function (s) { spans[s.dataset.cat] = s; });
        var pick = $('gl-dc-pick');
        pick.innerHTML = ['<option value="">All ' + N + ' (average)</option>'].concat(
            R.slice().sort(function (a, b) { return a.name.localeCompare(b.name); })
                .map(function (c) { return '<option>' + c.name + '</option>'; })).join('');
        return {
            pick: pick,
            draw: function (c) {
                CATS.forEach(function (k) {
                    spans[k.key].style.width = ((c.m[k.key] || 0) / DAY * 100) + '%';
                });
                $('gl-dc-rows').innerHTML = CATS.map(function (k) {
                    var v = c.m[k.key] || 0;
                    var r = c.avg ? '' :
                        ord(rankOf(c, function (x) { return x.m[k.key] || 0; })) + ' of ' + N;
                    return '<div class="dc-row"><i style="background:' + k.color + '"></i>' +
                        '<span>' + k.label + '</span><span class="v">' + hm(v) + '</span>' +
                        '<span class="r">' + r + '</span></div>';
                }).join('');
                var mw = R.slice().sort(function (a, b) { return b.work - a.work; })[0];
                var lw = R.slice().sort(function (a, b) { return a.work - b.work; })[0];
                var foot = $('gl-dc-foot');
                /* Nothing at rest. This used to read "The average of all 35. Mexico works
                   the longest day at 10h 05m, France the shortest at 6h 25m. Pick a
                   country, or click one anywhere on this sheet." — a third instruction to
                   pick something, and it gave away both extremes before the reader had
                   touched anything. .dc-foot:empty drops its own rule and padding so the
                   card does not carry a hairline over blank space. */
                if (c.avg) {
                    foot.innerHTML = '';
                } else if (c.name === mw.name) {
                    foot.innerHTML = '<b>The longest working day measured anywhere.</b> ' +
                        lw.name + ' works ' + hmS(mw.work - lw.work) + ' less.';
                } else if (c.name === lw.name) {
                    foot.innerHTML = '<b>The shortest working day measured anywhere.</b> ' +
                        mw.name + ' works ' + hmS(mw.work - lw.work) + ' more.';
                } else {
                    foot.innerHTML = '<b>' + mw.name + '</b> works most here at ' + hmS(mw.work) +
                        ', <b>' + lw.name + '</b> least at ' + hmS(lw.work) + '. ' + c.name +
                        ' sits ' + hmS(Math.abs(c.work - mw.work)) + ' off the top.';
                }
            }
        };
    })();

    // ══ THE FIGURES IN THE STANDFIRST ═════════════════════════════════════════
    /* The two spreads are the chapter's whole argument, so they are stated in the
       opening paragraph — and counted here rather than typed into the markup, on
       the same principle as #sec-day's generated prose: copy that sits beside a
       chart must not be able to drift from it. */
    /* EVERY SLOT HERE IS OPTIONAL. The copy that held these figures has been rewritten
       twice and each pass dropped some of them: the standfirst that carried the three
       spreads is gone, and so is the caveat that named the American figures. Writing to
       an element that is no longer in the markup throws on a null and takes the rest of
       the section down with it, silently, because everything below this point stops. So
       each is written only where its element exists, and the copy stays free to drop or
       restore any of them without touching this file. */
    (function () {
        function put(id, value) {
            var el = $(id);
            if (el) el.textContent = value;
        }
        var sl = spread(function (c) { return c.sleep; });
        var pd = spread(function (c) { return c.paid; });
        put('gl-f-share', Math.round(sl.mu / DAY * 100) + '%');
        put('gl-f-sleep', sl.pct + '%');
        put('gl-f-paid', pd.pct + '%');
        var us = R.filter(function (c) { return c.name === 'United States'; })[0];
        if (us) {
            put('gl-f-us-sleep', hmS(us.m.PCA));
            put('gl-f-us-paid', hmS(us.m.PAW));
        }
    })();

    // ══ THE BRAID ═════════════════════════════════════════════════════════════
    var braid = (function () {
        /* TOP and BAND are deeper than they look like they need to be because each
           band carries a name above it and a live figure inside it. */
        var W = 1120, H = 398, TOP = 44, BOT = 38, BAND = 18;
        var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
            'aria-label': (N * CATS.length) + ' ribbons: the day of ' + N +
                          ' countries fanning into five activities' });
        svg.classList.add('gl-braid');
        $('gl-braid').appendChild(svg);
        /* Both the highlight and the hit area run down past the axis to take in the
           flag row, so a flag is part of its column rather than a caption sitting
           outside it — pointing at one selects the country. */
        var FLAG_ROW = H - BOT + 24;
        var hl = el('rect', { class: 'br-hl', y: TOP, height: FLAG_ROW - TOP, x: 0, width: 0,
            opacity: 0 });
        svg.appendChild(hl);
        var order = R.slice().sort(function (a, b) { return b.work - a.work; });
        var grand = N * DAY, GAPT = 6, GAPB = 1.2;
        var topTotal = W - GAPT * (CATS.length - 1);
        var botTotal = W - GAPB * (N - 1);
        var colW = botTotal / N;
        var topX = {}, x = 0;
        CATS.forEach(function (k) {
            var tot = R.reduce(function (s, c) { return s + (c.m[k.key] || 0); }, 0);
            topX[k.key] = { x0: x, w: tot / grand * topTotal, tot: tot, cur: x };
            x += tot / grand * topTotal + GAPT;
        });
        var y0 = TOP + BAND, y1 = H - BOT;
        /* The band widths are the pooled share of all N days and cannot change with
           the selection — every ribbon's top edge is anchored inside them. So the
           figure written on a band has to say whose it is, or a reader who has
           pinned Japan reads the pooled 19% over paid work as Japan's when Japan's
           own share is 26%. One number per band, always attributed. */
        var bandVal = {};
        CATS.forEach(function (k) {
            var b = topX[k.key];
            svg.appendChild(el('rect', { x: b.x0, y: TOP, width: b.w, height: BAND,
                fill: RIB[k.key], rx: 1.5 }));
            if (b.w > 60) {
                svg.appendChild(el('text', { class: 'br-band', x: b.x0 + b.w / 2, y: TOP - 7,
                    'text-anchor': 'middle' }, k.label));
            }
            if (b.w > 52) {
                bandVal[k.key] = el('text', { class: 'br-val' + (onDark(RIB[k.key]) ? '' :
                    ' dark-text'), x: b.x0 + b.w / 2, y: TOP + BAND - 5.5,
                    'text-anchor': 'middle' });
                svg.appendChild(bandVal[k.key]);
            }
        });
        /* SVG gives no text metrics without a reflow per label, so the fit is
           estimated: IBM Plex Sans at 9.5px runs about 5.2px a character. Too wide
           for the band and the label steps down to the ISO code, then to the bare
           percentage. The widest real case, "United Kingdom 45%", measures 95px
           against a narrowest labelled band of 151px, so names survive throughout. */
        function fit(band, name, pct) {
            var opts = [name + ' ' + pct + '%', (ISO2[name] || '') + ' ' + pct + '%', pct + '%'];
            for (var i = 0; i < opts.length; i++) {
                if (opts[i].length * 5.2 < band.w - 10) return opts[i];
            }
            return pct + '%';
        }
        function setBands(c) {
            CATS.forEach(function (k) {
                var t = bandVal[k.key];
                if (!t) return;
                var b = topX[k.key];
                t.textContent = c.avg
                    ? 'all ' + N + ' \u00b7 ' + Math.round(b.tot / grand * 100) + '%'
                    : fit(b, c.name, Math.round((c.m[k.key] || 0) / DAY * 100));
            });
        }
        var ribs = {}, hits = {}, names = {}, flags = {};
        order.forEach(function (c, ci) {
            var bx = ci * (colW + GAPB), byAcc = 0;
            var g = el('g', { class: 'gl-rib', 'data-name': c.name });
            CATS.forEach(function (k) {
                var v = c.m[k.key] || 0;
                if (!v) return;
                var tw = v / topX[k.key].tot * topX[k.key].w, tx = topX[k.key].cur;
                topX[k.key].cur += tw;
                var bw = v / DAY * colW, bxs = bx + byAcc;
                byAcc += bw;
                var ym = (y0 + y1) / 2;
                g.appendChild(el('path', {
                    d: 'M' + tx + ',' + y0 + ' C' + tx + ',' + ym + ' ' + bxs + ',' + ym + ' ' +
                       bxs + ',' + y1 + ' L' + (bxs + bw) + ',' + y1 + ' C' + (bxs + bw) + ',' +
                       ym + ' ' + (tx + tw) + ',' + ym + ' ' + (tx + tw) + ',' + y0 + ' Z',
                    fill: RIB[k.key], 'fill-opacity': .82
                }));
            });
            svg.appendChild(g);
            ribs[c.name] = g;
            var hit = el('rect', { class: 'br-hit', x: bx, y: TOP, width: colW,
                height: FLAG_ROW - TOP, 'data-name': c.name });
            svg.appendChild(hit);
            hits[c.name] = hit;
            /* Anchored above the axis and running upward. Under rotate(-90) the local
               x-axis maps to global -y, so text-anchor:end threw the glyphs DOWNWARD
               through the flag row; 'start' sends them up into the plot, where the
               dimmed ribbons behind sit at 0.07 and white reads clean. No flag in
               this label — there is one under every column already, and a rotated
               flag glyph reads as a smear. */
            var ny = y1 - 6;
            var nm = el('text', { class: 'br-name', x: bx + colW / 2, y: ny,
                'text-anchor': 'start',
                transform: 'rotate(-90 ' + (bx + colW / 2) + ',' + ny + ')' }, c.name);
            svg.appendChild(nm);
            names[c.name] = nm;
            /* A flag under every column at all times. The names can only appear on
               hover — 35 would collide — but a flag is one glyph wide, so the braid
               keeps a labelled axis instead of an anonymous one. It brightens and
               grows with its column, which is also the hint that it can be clicked. */
            var fl = el('text', { class: 'br-flag', x: bx + colW / 2, y: y1 + 18,
                'text-anchor': 'middle' }, flagChar(c.name));
            svg.appendChild(fl);
            flags[c.name] = fl;
        });
        return { svg: svg, hits: hits, ribs: ribs, names: names, flags: flags, hl: hl,
                 setBands: setBands };
    })();

    // ══ THE RANKING ═══════════════════════════════════════════════════════════
    var rank = (function () {
        var host = $('gl-rank'), ROW = 21, rows = {};
        R.forEach(function (c) {
            var d = document.createElement('div');
            d.className = 'gl-row';
            d.innerHTML = '<span class="gl-name">' + flagHTML(c.name) + c.name + '</span>' +
                '<div class="gl-track">' + CATS.map(function (k) {
                    return '<i style="width:' + ((c.m[k.key] || 0) / DAY * 100) +
                        '%;background:' + k.color + '"></i>';
                }).join('') + '</div><span class="gl-val" data-v></span>';
            host.appendChild(d);
            rows[c.name] = d;
        });
        /* The rows are absolutely positioned so re-sorting can animate, which takes
           them out of flow — the host has to be given the height they occupy. */
        host.style.height = (N * ROW + 10) + 'px';
        var MEASURES = [
            { id: 'work', label: 'All work', get: function (c) { return c.work; } },
            { id: 'sleep', label: 'Sleep', get: function (c) { return c.sleep; } },
            { id: 'paid', label: 'Paid', get: function (c) { return c.paid; } },
            { id: 'unpaid', label: 'Unpaid', get: function (c) { return c.unpaid; } },
            { id: 'leisure', label: 'Leisure', get: function (c) { return c.leisure; } }
        ];
        var bar = $('gl-pills');
        bar.innerHTML = MEASURES.map(function (m) {
            return '<button type="button" data-id="' + m.id + '" aria-pressed="false">' +
                m.label + '</button>';
        }).join('');
        function apply(id) {
            var m = MEASURES.filter(function (x) { return x.id === id; })[0];
            Array.prototype.forEach.call(bar.querySelectorAll('button'), function (b) {
                b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false');
            });
            R.slice().sort(function (a, b) { return m.get(b) - m.get(a); })
                .forEach(function (c, i) {
                    rows[c.name].style.transform = 'translateY(' + (i * ROW) + 'px)';
                    rows[c.name].querySelector('[data-v]').textContent = hm(m.get(c));
                });
        }
        bar.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-id]');
            if (b) apply(b.dataset.id);
        });
        apply('work');
        return { rows: rows, host: host };
    })();

    // ══ ONE SELECTION FOR THE WHOLE SHEET ═════════════════════════════════════
    var who = $('gl-who'), note = $('gl-braid-note'), pinnote = $('gl-pinnote');

    function show(c) {
        dayCard.draw(c);
        braid.setBands(c);
        /* Three stacked lines: name, then the country's one fact, then the hours.
           BOTH states are built with the same three children on purpose. This block
           sits above the whole sheet, so a pinned state two lines taller than the
           average state would shove every panel down on hover and pull it back on
           leave. The average branch therefore splits at the middot it already had
           rather than staying a single line. */
        who.innerHTML = '<b>' + (c.avg ? '' : flagHTML(c.name)) + c.name + '</b>' + (c.avg
            ? '<em>the average of all ' + N + '</em>' +
              '<span>hover or click a country to replace it</span>'
            : '<em>' + (FACT[c.name] || '') + '</em>' +
              '<span>' + hm(c.work) + ' working. ' + hm(c.leisure) + ' leisure</span>');
        /* The at-rest note. It used to admit that the braid "is a texture until you
           touch it" and restate the 1,440; it now points at the shape and says why it
           is worth touching. The 1,440 lives on in the day card's own label, two
           panels down, and this is the last place the braid panel stated it. */
        note.innerHTML = c.avg
            ? 'Every ribbon is one country&rsquo;s day.<br>The shape may look familiar ' +
              '&mdash; but no two countries divide their time the same way.'
            : '<b>' + c.name + '</b> gives <b>' + hm(c.m.PAW) + '</b> to paid work and <b>' +
              hm(c.m.UPW) + '</b> to work nobody pays for, sleeps <b>' + hm(c.m.PCA) +
              '</b>, and has <b>' + hm(c.m.LEI) + '</b> left.';
    }

    /* hov previews, sel sticks, and active() prefers the pointer so a pinned country
       can be compared against others without losing it. The picker is a third way
       in: choosing from it pins, which is why it writes to sel and not to hov. */
    var hov = null, sel = null;
    function active() { return hov || sel; }
    function paint() {
        var name = active();
        braid.svg.classList.toggle('probing', !!name);
        rank.host.classList.toggle('probing', !!name);
        Object.keys(braid.ribs).forEach(function (n) {
            braid.ribs[n].classList.toggle('on', n === name);
            braid.ribs[n].classList.toggle('pinned', n === sel);
            braid.names[n].classList.toggle('on', n === name);
            braid.flags[n].classList.toggle('on', n === name);
        });
        Object.keys(rank.rows).forEach(function (n) {
            rank.rows[n].classList.toggle('on', n === name);
            rank.rows[n].classList.toggle('pinned', n === sel);
        });
        if (name && braid.hits[name]) {
            braid.hl.setAttribute('x', braid.hits[name].getAttribute('x'));
            braid.hl.setAttribute('width', braid.hits[name].getAttribute('width'));
            braid.hl.setAttribute('opacity', sel === name ? .18 : .1);
        } else {
            braid.hl.setAttribute('opacity', 0);
        }
        // The country's own name is not repeated here: #gl-who directly above already
        // swaps from "All 35 countries" to whatever is pinned, so naming it twice in
        // two adjacent lines just stuttered.
        pinnote.textContent = sel ? 'Pinned. Click another country to compare.' : '';
        if (dayCard.pick.value !== (sel || '')) dayCard.pick.value = sel || '';
        show(name ? R.filter(function (c) { return c.name === name; })[0] : AVG);
    }
    function hover(n) { hov = n; paint(); }
    function pick(n) { sel = sel === n ? null : n; hov = null; paint(); }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sel) { sel = null; paint(); }
    });
    Object.keys(braid.hits).forEach(function (n) {
        var h = braid.hits[n];
        h.addEventListener('mouseenter', function () { hover(n); });
        h.addEventListener('mouseleave', function () { hover(null); });
        h.addEventListener('click', function () { pick(n); });
    });
    Object.keys(rank.rows).forEach(function (n) {
        var r = rank.rows[n];
        r.tabIndex = 0;
        r.addEventListener('mouseenter', function () { hover(n); });
        r.addEventListener('focus', function () { hover(n); });
        r.addEventListener('mouseleave', function () { hover(null); });
        r.addEventListener('blur', function () { hover(null); });
        r.addEventListener('click', function () { pick(n); });
        r.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(n); }
        });
    });
    dayCard.pick.addEventListener('change', function () {
        sel = dayCard.pick.value || null;
        hov = null;
        paint();
    });

    paint();
})();
