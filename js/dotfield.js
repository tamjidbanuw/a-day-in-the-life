/**
 * Dot-field opener — a dense field of dots that spells "WORLD".
 * Fly-in intro, perpetual drift, hover ripple, feathered edges.
 * Runs only if #df-canvas exists on the page.
 */
(function () {
    const canvas = document.getElementById('df-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, dots = [], raf;

    // Mask of the word, CROPPED to its actual ink bounding box so any word
    // (short or long) fills the field tightly with no dead space.
    function wordMask(word) {
        const cw = 1600, ch = 500;
        const off = document.createElement('canvas');
        off.width = cw; off.height = ch;
        const o = off.getContext('2d');
        o.fillStyle = '#000';
        o.textAlign = 'center';
        o.textBaseline = 'middle';
        let fs = 300;
        o.font = `800 ${fs}px Poppins, Arial, sans-serif`;
        fs = Math.min(fs * (cw * 0.9) / o.measureText(word).width, ch * 0.8);
        o.font = `800 ${fs}px Poppins, Arial, sans-serif`;
        o.fillText(word, cw / 2, ch / 2);
        const data = o.getImageData(0, 0, cw, ch).data;

        // find the tight bounding box of inked pixels
        let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
            if (data[(y * cw + x) * 4 + 3] > 128) {
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
        const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        return { w: bw, h: bh, hit: (nx, ny) => {
            const x = x0 + Math.min(bw - 1, Math.max(0, Math.floor(nx * bw)));
            const y = y0 + Math.min(bh - 1, Math.max(0, Math.floor(ny * bh)));
            return data[(y * cw + x) * 4 + 3] > 128;
        }};
    }

    function size() {
        const r = canvas.getBoundingClientRect();
        W = canvas.width = r.width * devicePixelRatio;
        H = canvas.height = r.height * devicePixelRatio;
    }

    function build() {
        size();
        dots = [];
        const mask = wordMask('WORLD');
        const ar = mask.h / mask.w;
        let bw = W * 0.96, bh = bw * ar;
        if (bh > H * 0.88) { bh = H * 0.88; bw = bh / ar; }
        const bx = (W - bw) / 2, by = (H - bh) / 2;
        const inWord = (px, py) => {
            const nx = (px - bx) / bw, ny = (py - by) / bh;
            if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false;
            return mask.hit(nx, ny);
        };

        const GAP = 11 * devicePixelRatio;
        const JIT = GAP * 0.28;
        for (let gy = GAP / 2; gy < H; gy += GAP) {
            for (let gx = GAP / 2; gx < W; gx += GAP) {
                const hx = gx + (Math.random() * 2 - 1) * JIT;
                const hy = gy + (Math.random() * 2 - 1) * JIT;
                const on = inWord(hx, hy);
                const mX = W * 0.12, mY = H * 0.12;
                const fx = Math.min(hx, W - hx) / mX;
                const fy = Math.min(hy, H - hy) / mY;
                const edge = Math.max(0, Math.min(1, Math.min(fx, fy)));
                if (!on && Math.random() > edge * 0.85 + 0.15) continue;
                dots.push({
                    hx, hy, x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
                    r: (on ? 3.9 : 2.8) * devicePixelRatio,
                    color: on ? '184,115,51' : '206,196,182',
                    hi: on,
                    alpha: on ? 1 : (0.55 + edge * 0.45),
                    delay: (hx / W) * 500 + Math.random() * 200,
                    phx: Math.random() * Math.PI * 2, phy: Math.random() * Math.PI * 2,
                    spx: 0.6 + Math.random() * 0.8, spy: 0.6 + Math.random() * 0.8,
                    amp: (2.2 + Math.random() * 2.2) * devicePixelRatio
                });
            }
        }
    }

    // Ripple system: hovering drops expanding rings that push dots outward as
    // the wavefront passes over them (like ripples on water).
    const ripples = [];
    const RIPPLE_SPEED = 230 * devicePixelRatio;  // px/sec the ring expands
    const RIPPLE_LIFE = 0.9;                        // seconds a ripple lives
    const RIPPLE_BAND = 84 * devicePixelRatio;      // thickness of the wavefront
    const RIPPLE_FORCE = 3.2;                        // push strength
    let lastRipple = 0, lastMx = 0, lastMy = 0;
    canvas.addEventListener('pointermove', e => {
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * devicePixelRatio;
        const my = (e.clientY - r.top) * devicePixelRatio;
        const now = performance.now();
        const moved = Math.hypot(mx - lastMx, my - lastMy);
        // spawn a ripple when the cursor has moved enough, throttled in time
        if (now - lastRipple > 90 && moved > 6 * devicePixelRatio) {
            ripples.push({ x: mx, y: my, born: now });
            lastRipple = now; lastMx = mx; lastMy = my;
        }
    });

    let t0 = null;
    function frame(ts) {
        if (!t0) t0 = ts;
        const t = ts - t0;
        ctx.clearRect(0, 0, W, H);

        const now = performance.now();
        // drop expired ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
            if ((now - ripples[i].born) / 1000 > RIPPLE_LIFE) ripples.splice(i, 1);
        }

        dots.forEach(d => {
            const p = Math.max(0, Math.min(1, (t - d.delay) / 900));
            const e = 1 - Math.pow(1 - p, 3);

            const ts2 = t / 1000;
            const driftX = Math.sin(ts2 * d.spx + d.phx) * d.amp;
            const driftY = Math.cos(ts2 * d.spy + d.phy) * d.amp;
            let ax = (d.hx + driftX - d.x) * 0.08;
            let ay = (d.hy + driftY - d.y) * 0.08;

            // ripple force: each ring pushes the dot outward when the wavefront
            // is near it; strength fades over the ripple's life
            for (const rp of ripples) {
                const age = (now - rp.born) / 1000;
                const radius = age * RIPPLE_SPEED;
                const rx = d.x - rp.x, ry = d.y - rp.y;
                const rd = Math.hypot(rx, ry);
                const band = Math.abs(rd - radius);
                if (band < RIPPLE_BAND && rd > 0.01) {
                    const near = 1 - band / RIPPLE_BAND;       // 1 at the crest
                    const fade = 1 - age / RIPPLE_LIFE;         // dies with age
                    const push = near * fade * RIPPLE_FORCE;
                    ax += (rx / rd) * push;
                    ay += (ry / rd) * push;
                }
            }

            d.vx = (d.vx + ax) * 0.59;
            d.vy = (d.vy + ay) * 0.59;

            if (p < 1) {
                d.x = d.x + (d.hx - d.x) * e;
                d.y = d.y + (d.hy - d.y) * e;
            } else {
                d.x += d.vx; d.y += d.vy;
            }

            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, 7);   // no grow — dots keep their size
            ctx.fillStyle = `rgba(${d.color},${d.alpha})`;
            ctx.fill();
        });
        raf = requestAnimationFrame(frame);
    }

    function play() { cancelAnimationFrame(raf); t0 = null; build(); raf = requestAnimationFrame(frame); }
    window.addEventListener('resize', play);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(play); else play();
})();
