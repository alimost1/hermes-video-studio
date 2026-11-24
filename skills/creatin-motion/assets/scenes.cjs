'use strict';

// Nine scenes adapted from the original Creatin SEO Web animation.
module.exports = function makeFilm(canvas, makeCanvas, cfg, images = {}) {
  const W = 600,
    H = 1066.6667;
  const ctx = canvas.getContext('2d');
  function coverImage(image, x, y, w, h) {
    const scale = Math.max(w / image.width, h / image.height);
    const cropW = w / scale,
      cropH = h / scale;
    ctx.drawImage(image, (image.width - cropW) / 2, (image.height - cropH) / 2, cropW, cropH, x, y, w, h);
  }
  const cuts = [0, 4.5, 9, 13.5, 18, 23.5, 28.5, 33.5, 39, 45];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    mix = (a, b, p) => a + (b - a) * p;
  const out = p => 1 - (1 - clamp(p)) ** 4;
  const smooth = p => (p = clamp(p), p * p * (3 - 2 * p));
  const ease = (t, a, d) => out((t - a) / d);
  const spring = p => {
    p = clamp(p);
    return 1 - Math.exp(-7 * p) * Math.cos(8 * p);
  };
  const back = (t, a, d) => spring((t - a) / d);
  const K = '#10271d',
    FOREST = '#0b3328',
    PAPER = '#fbfbf2',
    MUT = '#4f6458';
  const accent = () => cfg.accent;
  function box(x, y, w, h, r, fill, stroke, lw = 1) {
    if (w <= 0 || h <= 0) return;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }
  function circle(x, y, r, color, stroke, lw = 1) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (color) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }
  function line(x, y, X, Y, c, w = 1) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(X, Y);
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  function tr(x, y, s, angle, fun) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.rotate(angle);
    fun();
    ctx.restore();
  }
  function alpha(v, fun) {
    if (v <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(v);
    fun();
    ctx.restore();
  }
  function clip(x, y, w, h, r, fn) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.clip();
    fn();
    ctx.restore();
  }
  function tx(str, x, y, size, color = K, weight = 650, align = 'left', max = 9999, font = 'sans') {
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    const family = font === 'mono' ? '"Courier New",monospace' : font === 'serif' ? 'Georgia,"Times New Roman",serif' : 'Arial,Helvetica,sans-serif';
    let f = s => {
      ctx.font = (weight >= 600 ? 'bold' : 'normal') + ' ' + s + 'px ' + family;
      ctx.letterSpacing = (font === 'sans' ? -.049 * s : font === 'mono' ? .035 * s : -.055 * s) + 'px';
    };
    f(size);
    let m = ctx.measureText(str).width;
    if (m > max) {
      size *= max / m;
      f(size);
      m = ctx.measureText(str).width;
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.letterSpacing = '0px';
    return m;
  }
  function roundShadow(x, y, w, h, r, fill, stroke) {
    ctx.save();
    ctx.shadowColor = 'rgba(13,38,22,.15)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 9;
    box(x, y, w, h, r, fill);
    ctx.restore();
    if (stroke) box(x, y, w, h, r, null, stroke);
  }
  function arrow(x, y, size, color = K, angle = 0) {
    tr(x, y, size / 24, angle, () => {
      line(-8, 0, 8, 0, color, 2.3);
      line(2, -6, 8, 0, color, 2.3);
      line(8, 0, 2, 6, color, 2.3);
    });
  }
  function searchIcon(x, y, size, c) {
    tr(x, y, size / 24, 0, () => {
      circle(-2, -2, 6.4, null, c, 2);
      line(3, 3, 9, 9, c, 2.4);
    });
  }
  function check(x, y, c) {
    line(x - 5, y, x - 1, y + 4, c, 2.1);
    line(x - 1, y + 4, x + 6, y - 4, c, 2.1);
  }
  function mouse(x, y, scale = 1, r = 0) {
    tr(x, y, scale, r, () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(4, 27);
      ctx.lineTo(10, 19);
      ctx.lineTo(17, 30);
      ctx.lineTo(22, 26);
      ctx.lineTo(15, 16);
      ctx.lineTo(24, 15);
      ctx.closePath();
      ctx.fillStyle = K;
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    });
  }
  function mark(x, y, s, col) {
    if (images.logo) {
      const logo = images.logo;
      const scale = 36 * s / Math.max(logo.width, logo.height);
      ctx.drawImage(logo, x - logo.width * scale / 2, y - logo.height * scale / 2, logo.width * scale, logo.height * scale);
      return;
    }
    if (cfg.brand.toLowerCase() !== 'creatin seo web') {
      tx(Array.from(cfg.brand.trim())[0].toUpperCase(), x, y + s * 11, s * 36, col, 700, 'center', s * 38);
      return;
    }
    tr(x, y, s, 0, () => {
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 17 - i * 5, Math.PI * .23, Math.PI * 1.74);
        ctx.lineWidth = 3.1;
        ctx.strokeStyle = col;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(3, -1);
      ctx.lineTo(15, -7);
      ctx.stroke();
    });
  }
  function lockup(x, y, scale = 1, dark = false) {
    tr(x, y, scale, 0, () => {
      mark(0, -1, .76, dark ? accent() : K);
      tx(cfg.brand, 21, 5, 16, dark ? PAPER : K, 700, 'left', 172);
    });
  }
  function pill(x, y, w, h, text, bg, fg, icon = false, sz = 18) {
    box(x, y, w, h, h / 2, bg);
    tx(text, icon ? x + w / 2 - 10 : x + w / 2, y + h / 2 + sz * .32, sz, fg, 650, 'center', w - (icon ? 56 : 22));
    if (icon) arrow(x + w - 24, y + h / 2, 18, fg, -.64);
  }
  function grad(g, stops) {
    for (const [v, c] of stops) g.addColorStop(v, c);
    return g;
  }
  const backgrounds = {};
  function backgroundLayer(dark) {
    if (backgrounds[dark]) return backgrounds[dark];
    const c = makeCanvas(1, 1);
    c.width = 540;
    c.height = 960;
    const b = c.getContext('2d');
    let g = b.createLinearGradient(0, 0, 540, 960);
    g.addColorStop(0, dark ? '#09291f' : '#f3f6e7');
    g.addColorStop(.54, dark ? '#103832' : '#fdfdf8');
    g.addColorStop(1, dark ? '#09271f' : '#f0f3e4');
    b.fillStyle = g;
    b.fillRect(0, 0, 540, 960);
    const blobs = dark ? [[40, 45, 330, 'rgba(120,168,42,.27)'], [525, 430, 360, 'rgba(100,149,42,.17)'], [20, 975, 365, 'rgba(88,126,22,.26)']] : [[510, 35, 310, 'rgba(177,233,112,.45)'], [30, 760, 355, 'rgba(190,222,130,.33)'], [570, 950, 260, 'rgba(189,231,115,.35)']];
    for (let [x, y, r, col] of blobs) {
      g = b.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col);
      g.addColorStop(1, col.replace(/,[^,]+\)$/, ',0)'));
      b.fillStyle = g;
      b.fillRect(0, 0, 540, 960);
    }
    return backgrounds[dark] = c;
  }
  function bg(dark, t) {
    const drift = Math.sin(t * .27);
    ctx.drawImage(backgroundLayer(dark), -11 + 6 * drift, -14 + 6 * Math.cos(t * .25), W + 22, H + 28);
  }
  function heading(lines, y, t, dark = false, size = 66) {
    lines.forEach((str, i) => {
      const p = ease(t, .07 + i * .105, .65);
      alpha(p, () => tx(str, 300, y + i * size * .97 + (1 - p) * 34, size, i === lines.length - 1 && dark ? accent() : dark ? PAPER : K, 700, 'center', 528));
    });
  }
  function topLine(dark = false) {
    lockup(49, 84, 1, dark);
  }
  function badge(x, y, label, dark = false) {
    const fg = dark ? '#e0f2cf' : '#395e43';
    circle(x, y - 4, 3, dark ? accent() : '#557f30');
    tx(label, x + 12, y, 12, fg, 600, 'left', 240, 'mono');
  }
  const posterCache = {};
  function makePoster(index) {
    let c = makeCanvas(1, 1);
    c.width = 400;
    c.height = 482;
    let b = c.getContext('2d');
    const bases = ['#ee744f', '#e9e5cc', '#123e33'];
    b.fillStyle = bases[index % 3];
    b.fillRect(0, 0, 400, 482);
    b.save();
    b.beginPath();
    b.rect(20, 20, 360, 385);
    b.clip();
    const ink = ['#222a25', '#2c5147', '#dfebbb'][index % 3];
    b.strokeStyle = ink;
    b.fillStyle = ink;
    b.lineWidth = 9;
    if (index % 3 === 0) {
      for (let i = 0; i < 19; i++) {

        b.beginPath();
        b.moveTo(15, 50 + i * 11);
        b.bezierCurveTo(140, 66 + i * 9, 175, 70 - i * 1.3, 205, 204);
        b.bezierCurveTo(225, 313 - i * .3, 296, 270 + i * 9, 387, 235 + i * 10);
        b.stroke();
      }
    }
    if (index % 3 === 1) {
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
        const x = 18 + i * 94,
          y = 26 + j * 127;
        b.beginPath();
        b.moveTo(x, y + 125);
        b.bezierCurveTo(x + 4, y + 38, x + 46, y + 5, x + 86, y);
        b.lineTo(x + 86, y + 74);
        b.quadraticCurveTo(x + 40, y + 74, x + 9, y + 125);
        b.fill();
      }
    }
    if (index % 3 === 2) {
      for (let i = 0; i < 12; i++) {
        b.beginPath();
        b.ellipse(200, 214, 51 + i * 10, 120 + i * 3.1, -.50 + i * .10, 0, Math.PI * 2);
        b.lineWidth = 4;
        b.stroke();
      }
    }
    b.restore();
    b.fillStyle = ink;
    b.font = 'bold 20px Arial';
    b.fillText(['BEND / 01', 'FOLIO / 02', 'ORBIT / 03'][index % 3], 20, 443);
    b.font = '13px monospace';
    b.textAlign = 'right';
    b.fillText('ED. 01', 380, 443);
    let sd = 11;
    let img = b.getImageData(0, 0, 400, 482);
    for (let i = 0; i < img.data.length; i += 4) {
      sd = Math.imul(1664525, sd) + 1013904223 >>> 0;
      let v = ((sd >>> 24) - 128) * .043;
      for (let j = 0; j < 3; j++) img.data[i + j] += v;
    }
    b.putImageData(img, 0, 0);
    return c;
  }
  function poster(x, y, w, h, n) {
    if (images.artwork && n === 0) {
      coverImage(images.artwork, x, y, w, h);
      return;
    }
    if (!posterCache[n]) posterCache[n] = makePoster(n);
    ctx.drawImage(posterCache[n], x, y, w, h);
  }
  function gallery(x, y, w, h, t) {
    if (images.artwork) {
      coverImage(images.artwork, x, y, w, h);
      return;
    }
    if (cfg.brand.toLowerCase() !== 'creatin seo web') {
      box(x, y, w, h, 0, '#dce6ce');
      clip(x, y, w, h, 0, () => {
        for (let j = 0; j < 9; j++) {
          const size = w * .16 + j * w * .064;
          ctx.beginPath();
          ctx.ellipse(x + w * .63, y + h * .55, size, size * .44, -.31, 0, 2 * Math.PI);
          ctx.strokeStyle = j % 3 === 0 ? accent() : '#74927b';
          ctx.lineWidth = w * .011;
          ctx.stroke();
        }
      });
      return;
    }
    clip(x, y, w, h, 0, () => {
      const g = grad(ctx.createLinearGradient(x, y, x + w, y + h), [[0, '#ded7c0'], [.5, '#e8ddc6'], [1, '#a9a98d']]);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(114,108,74,.16)';
      ctx.beginPath();
      ctx.moveTo(x, y + h * .81);
      ctx.lineTo(x + w, y + h * .9);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.fill();
      [1, 0].forEach((n, i) => {
        let px = x + w * (i ? .49 : .72),
          py = y + h * (i ? .47 : .48);
        let pw = w * (i ? .36 : .27),
          ph = pw * 1.205;
        const f = Math.min(1, h * .83 / ph);
        pw *= f;
        ph *= f;
        tr(px, py, 1, (i ? -.095 : .12) + .012 * Math.sin(t * .65), () => {
          ctx.save();
          ctx.shadowColor = 'rgba(36,37,24,.38)';
          ctx.shadowBlur = w * .037;
          ctx.shadowOffsetX = w * .016;
          ctx.shadowOffsetY = w * .028;
          box(-pw / 2, -ph / 2, pw, ph, 0, '#e6dfca');
          ctx.restore();
          poster(-pw / 2, -ph / 2, pw, ph, n);
        });
      });
    });
  }
  function desktop(x, y, w, t) {
    const s = w / 440;
    tr(x, y, s, 0, () => {
      roundShadow(0, 0, 440, 412, 14, '#fbfaef', '#ced1bb');
      clip(0, 0, 440, 412, 14, () => {
        box(0, 0, 440, 26, 0, '#e4e6d8');
        [0, 1, 2].forEach(i => circle(14 + i * 9, 13, 2.3, ['#899581', '#9da795', '#b2b7a5'][i]));
        tx(cfg.browserLabel, 220, 16.5, 9, '#50604e', 500, 'center', 180, 'mono');
        tx(cfg.sample, 20, 57, 24, '#192d20', 700, 'left', 207);
        tx(cfg.category, 361, 54, 10, K, 600, 'center');
        line(20, 70, 420, 70, '#c5c5b1', 1);
        tx(cfg.hero1, 18, 121, 54, '#28372a', 500, 'left', 230, 'serif');
        tx(cfg.hero2, 18, 170, 54, '#28372a', 500, 'left', 246, 'serif');
        pill(293, 119, 126, 33, cfg.shopCTA, '#28372a', '#fff', true, 13);
        gallery(15, 190, 410, 174, t);
        tx(cfg.galleryTitle, 18, 390, 17, K, 650);
        tx(cfg.galleryMeta, 418, 389, 11, K, 500, 'right', 90, 'mono');
      });
    });
  }
  function phone(x, y, w, t, cal = 0, pick = 0, conf = 0, cur = null) {
    tr(x, y, w / 208, 0, () => {
      roundShadow(0, 0, 208, 357, 25, '#f9f7ed', '#4b6552');
      clip(6, 6, 196, 345, 20, () => {
        box(6, 6, 196, 345, 18, '#f9f7ed');
        tx(cfg.sample, 19, 39, 18, K, 700, 'left', 142);
        line(174, 28, 188, 28, K, 1.5);
        line(174, 34, 188, 34, K, 1.5);
        line(19, 49, 188, 49, '#bfc4af');
        const picker = !!cfg.pickTitle;
        if (!picker) cal = 0;
        const gh = mix(120, 66, cal);
        alpha(1 - cal * 1.6, () => {
          tx(cfg.hero1, 17, 92, 41, K, 500, 'left', 170, 'serif');
          tx(cfg.hero2, 17, 132, 41, K, 500, 'left', 174, 'serif');
        });
        const gy = mix(146, 60, cal);
        gallery(15, gy, 178, gh, t);
        alpha(1 - cal * 1.6, () => pill(17, 282, 133, 35, cfg.shopCTA, K, '#fff', true, 13));
        alpha(cal, () => {
          const o = (1 - cal) * 26;
          tx(cfg.pickLabel || cfg.galleryTitle, 17, 143 + o, 10.5, '#53664c', 500, 'left', 170);
          tx(cfg.pickTitle, 17, 171 + o, 28, K, 700, 'left', 170);
          tx(cfg.pickNote || '', 18, 189 + o, 11.5, K, 600, 'left', 100);
          [cfg.pick1, cfg.pick2, cfg.pick3].map(v => String(v || '').split('|')).forEach(([d, n = ''], i) => {
            const bx = 18 + i * 60, by = 198 + o, on = i === 1 ? smooth(pick) : 0;
            const sc = i === 1 ? 1 + .08 * Math.sin(Math.PI * clamp(pick)) : 1;
            tr(bx + 26, by + 28, sc, 0, () => {
              box(-26, -28, 52, 56, 12, on > .5 ? accent() : '#ecebdc', on > .5 ? '#8fc43c' : '#d4d6c2', 1.2);
              tx(d, 0, -9, 10.5, K, 500, 'center', 46);
              tx(n, 0, 17, 25, K, 700, 'center', 46);
            });
          });
          alpha(conf, () => {
            const cy = 270 + (1 - conf) * 14;
            box(18, cy, 172, 34, 17, K);
            circle(37, cy + 17, 8, accent());
            check(37, cy + 17, K);
            tx(cfg.pickConfirm || '', 52, cy + 22, 12.5, '#fbfbf2', 650, 'left', 132);
          });
        });
      });
    });
  }
  function searchCard(x, y, w, t, compact = false) {
    tr(x, y, w / 456, 0, () => {
      roundShadow(0, 0, 456, compact ? 150 : 208, 19, '#fffff9', '#d9dfc9');
      circle(35, 34, 13, '#e0e7ca');
      tx(Array.from(cfg.sample.trim())[0] || '', 35, 39, 15, '#315139', 700, 'center');
      tx(cfg.sample, 59, 39, 18, K, 700, 'left', 285);
      tx(cfg.cardLabel, 427, 37, 11, '#687364', 500, 'right', 125, 'mono');
      line(23, 57, 431, 57, '#dce2d3');
      tx(cfg.result, 23, 101, 34, '#264f46', 700, 'left', 406);
      tx(cfg.resultBody, 24, 129, 17, '#596657', 500, 'left', 408);
      if (!compact) {
        box(24, 149, 408, 38, 11, '#f1f4e7');
        tx(cfg.resultLink, 38, 174, 17, '#426045', 600, 'left', 337);
        arrow(408, 169, 17, '#426045', -.69);
      }
    });
  }
  function queryBar(x, y, w, txt, caret, t) {
    roundShadow(x, y, w, 68, 34, '#fffff6', '#d2dfbc');
    searchIcon(x + 33, y + 34, 23, '#31513a');
    let width = tx(txt, x + 60, y + 43, 24, K, 550, 'left', w - 104);
    if (caret && Math.sin(t * 9) > -.25) box(x + 62 + width, y + 20, 2, 30, 1, '#559223');
  }
  function tile(x, y, s, ang, t) {
    tr(x, y, s, ang, () => {
      ctx.save();
      ctx.shadowColor = '#203d264f';
      ctx.shadowBlur = 27;
      ctx.shadowOffsetY = 16;
      box(-58, -56, 116, 116, 27, '#769e3b');
      ctx.restore();
      let g = grad(ctx.createLinearGradient(-50, -62, 50, 60), [[0, '#efffb4'], [.33, accent()], [1, '#86c83d']]);
      box(-58, -60, 116, 116, 27, g, '#eaffe0', 1.8);
      mark(0, -2, 2.28, '#153e22');
    });
  }
  function fleck(x, y, r, c) {
    tr(x, y, r, 0, () => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.quadraticCurveTo(.08, -.09, 1, 0);
      ctx.quadraticCurveTo(.08, .09, 0, 1);
      ctx.quadraticCurveTo(-.08, .09, -1, 0);
      ctx.quadraticCurveTo(-.08, -.09, 0, -1);
      ctx.fill();
    });
  }
  function opening(t) {
    bg(false, t);
    const phase = smooth((t - 1.80) / .46);
    topLine();
    const xx = -phase * 560;
    alpha(1 - phase, () => tr(xx, 0, 1, 0, () => {
      badge(50, 357, cfg.openLabel);
      const p = ease(t, .03, .65);
      tx(cfg.intro1, 49, 463 + (1 - p) * 50, 92, K, 700, 'left', 510);
      const q = ease(t, .18, .64);
      alpha(q, () => tx(cfg.intro2, 46, 550 + (1 - q) * 55, 96, K, 700, 'left', 520));
    }));
    alpha(phase, () => tr((1 - phase) * 500, 0, 1, 0, () => {
      badge(50, 352, cfg.questionLabel);
      tx(cfg.hook, 47, 454, 78, K, 700, 'left', 512);
      const p = ease(t, 2.21, .45);
      ctx.font = '700 92px Arial';
      let ww = Math.min(492, ctx.measureText(cfg.hook2).width + 19);
      box(46, 480, ww * p, 89, 8, accent());
      tx(cfg.hook2, 53, 550, 92, K, 700, 'left', 506);
    }));
    const p = ease(t, .4, .75);
    let yy = 704 + (1 - p) * 76;
    tr(300, yy, 1, .02 * Math.sin(t), () => {
      queryBar(-238, -31, 476, phase > .5 ? cfg.searchHint : '', false, t);
      if (phase < .5) {
        box(-169, -11, 176, 7, 3, '#d7ddcc');
        box(-169, 2, 111, 6, 3, '#e4e8db');
      }
    });
    const a = ease(t, 2.5, .8);
    alpha(a, () => mouse(486 - a * 129, 813 - a * 80, .97, -.12));
  }
  function searchScene(t) {
    bg(true, t);
    topLine(true);
    heading([cfg.s1a, cfg.s1b], 330, t, true, 65);
    const p = ease(t, .32, .7);
    const qs = cfg.query.slice(0, Math.floor(clamp((t - .53) / 1.25) * cfg.query.length));
    tr(300, 521 + (1 - p) * 36, 1 + .035 * smooth((t - 2.6) / 1.5), -.03 * (1 - p), () => queryBar(-250, -34, 500, qs, true, t));
    const chips = [[-23, 640, 194, cfg.chip1, -.09], [349, 650, 214, cfg.chip2, .11], [80, 742, 245, cfg.chip3, .045]];
    chips.forEach(([x, y, w, s, r], i) => {
      let q = ease(t, .3 + i * .20, .85);
      alpha(q * .88, () => tr(x + (i % 2 ? 80 : -80) * (1 - q), y + 8 * Math.sin(t * 1.4 + i), 1, r, () => {
        box(0, 0, w, 45, 22, '#244e3b', '#638258');
        searchIcon(22, 22, 15, '#c9e4a6');
        tx(s, 43, 29, 17, '#ebf7d9', 500, 'left', w - 51);
      }));
    });
    const cur = ease(t, 2, .8);
    alpha(cur, () => mouse(520 - 75 * cur, 685 - 140 * cur, 1.1, -.18));
  }
  function brandScene(t) {
    bg(true, t + 9);
    ctx.save();
    ctx.strokeStyle = 'rgba(221,243,186,.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 8]);
    for (let j = 0; j < 2; j++) {
      ctx.beginPath();
      ctx.ellipse(300, 456, 160 + j * 67, 78 + j * 40, -.38 + t * .045, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    const sat = [[-160, -181, 1], [153, -162, 2], [-181, 125, 0], [159, 168, 2]];
    sat.forEach(([x, y, n], i) => {
      const f = 1 - smooth((t - .18 - i * .065) / .9);
      alpha(f * .82, () => tr(300 + x * f, 435 + y * f, .63 + .37 * f, -.13 * f * (i % 2 ? 1 : -1), () => {
        box(-43, -33, 86, 66, 14, '#f0f7dc');
        if (n === 0) searchIcon(0, 0, 30, FOREST);else if (n === 1) mark(0, 0, 1.1, FOREST);else arrow(0, 0, 38, FOREST, -.67);
      }));
    });
    const p = back(t, .34, 1.28);
    tile(300, 457 + (1 - p) * 59, Math.max(.08, p) * 1.30, (-1 + p) * .65 - .09 + .016 * Math.sin(t * 2), t);
    const a = ease(t, .86, .65);
    alpha(a, () => tx(cfg.brand, 300, 635 + (1 - a) * 40, 68, PAPER, 700, 'center', 526));
    const b = ease(t, 1.15, .57);
    alpha(b, () => tx(cfg.service, 300, 688 + (1 - b) * 23, 25, '#cfdfc5', 500, 'center', 445));
    [[160, 379, 8], [450, 502, 11], [218, 577, 5]].forEach(([x, y, r], i) => alpha(ease(t, .69 + i * .13, .4), () => fleck(x, y, r * (1 + .23 * Math.sin(t * 3 + i)), accent())));
  }
  function previewScene(t) {
    bg(false, t + 13.5);
    topLine();
    heading([cfg.s3a, cfg.s3b], 306, t, false, 69);
    let p = ease(t, .34, .64);
    tr(300, 508 + (1 - p) * 55, .93 + .07 * p, 0, () => queryBar(-238, -34, 476, cfg.query, false, t));
    p = ease(t, .6, .76);
    const yy = 580 + (1 - p) * 93;
    tr(300, yy, .97 + .03 * p, (1 - p) * .055, () => searchCard(-244, 0, 488, t));
    const c = ease(t, 1.6, .80);
    alpha(c, () => mouse(483 - c * 130, 857 - c * 153, 1.05, -.1));
  }
  function structureScene(t) {
    bg(true, t + 18);
    topLine(true);
    heading([cfg.s4a, cfg.s4b], 290, t, true, 66);
    const list = [[cfg.detail1, cfg.result, cfg.detailIcon1], [cfg.detail2, cfg.hero1 + ' ' + cfg.hero2, cfg.detailIcon2], [cfg.detail3, cfg.shopLink, '↗']];
    list.forEach(([kind, txt, s], i) => {
      let p = back(t, .37 + i * .28, 1.0),
        yp = 445 + i * 127 + (1 - p) * 65,
        dx = (1 - p) * (i % 2 ? 70 : -70);
      tr(300 + dx, yp, .97 + .03 * p, (i - 1) * .018 * (1 - .7 * p), () => {
        roundShadow(-235, -1, 470, 103, 18, '#fcfcf1', '#c7dcaf');
        box(-217, 19, 59, 59, 14, i === 1 ? '#e2eacb' : accent());
        if (i === 2) arrow(-187, 48, 26, K, -.65);else tx(s, -187, 58, 26, K, 700, 'center', 48);
        tx(kind, -136, 33, 15, '#53664c', 500, 'left', 310);
        tx(txt, -136, 68, 25, K, 700, 'left', 314);
        alpha(ease(t, 1.3 + i * .28, .42), () => {
          circle(203, 50, 12, '#deedcb');
          check(203, 50, '#345c2e');
        });
      });
    });
  }
  function siteScene(t) {
    bg(false, t + 23.5);
    topLine();
    heading([cfg.s5a, cfg.s5b], 292, t, false, 70);
    const p = back(t, .27, 1.03),
      z = 1 + .045 * smooth((t - 1.6) / 2.7);
    tr(300, 690 + (1 - p) * 140, z * (.94 + .06 * p), -.04 * (1 - p) - .018, () => desktop(-246, -230, 492, t));
    const a = ease(t, 1.65, .86);
    alpha(a, () => {
      let x = 519 - a * 57,
        y = 818 - a * 204;
      mouse(x, y, .86, -.12);
    });
  }
  function mobileScene(t) {
    bg(true, t + 28.5);
    topLine(true);
    heading([cfg.s6a, cfg.s6b], 292, t, true, 69);
    let p = ease(t, .14, .88);
    const sweep = smooth((t - 1.18) / 1.12);
    alpha(1 - .26 * sweep, () => tr(300 - sweep * 93, 621, 1 - .14 * sweep, -.02 - .038 * sweep, () => desktop(-230, -171 + (1 - p) * 60, 460, t)));
    // phone arrives, then moves forward as the calendar opens
    let a = back(t, 1.17, 1.0);
    const picker = !!cfg.pickTitle;
    const fwd = picker ? smooth((t - 2.0) / .8) : 0;
    const cal = picker ? smooth((t - 2.55) / .6) : 0;
    const pick = clamp((t - 3.55) / .5);
    const conf = ease(t, 4.05, .5);
    const px = mix(435, 345, fwd), py = mix(719, 800, fwd), sc = (1.04 + .025 * Math.sin(t * .8)) * (1 + .26 * fwd);
    alpha(a, () => tr(px + (1 - a) * 230, py + (1 - a) * 96, sc, .039 * (1 - fwd) + (1 - a) * .17, () => {
      phone(-101, -178, 202, t, cal, pick, conf);
      const cp = picker ? ease(t, 2.9, .6) * (1 - smooth((t - 3.9) / .5)) : 0;
      const e = ease(t, 2.9, .65);
      alpha(cp, () => mouse(4 + 60 * (1 - e), 44 + 70 * (1 - e) + 3 * Math.sin(Math.PI * clamp(pick)), .8, -.12));
    }));
  }
  function routeScene(t) {
    bg(true, t + 33.5);
    topLine(true);
    heading([cfg.s7a, cfg.s7b], 293, t, true, 70);
    let nodes = [[92, 479, cfg.route1], [313, 614, cfg.route2], [485, 767, cfg.route3]];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(92, 479);
    ctx.bezierCurveTo(97, 611, 270, 487, 313, 614);
    ctx.bezierCurveTo(350, 729, 444, 650, 485, 767);
    ctx.strokeStyle = '#7c9a6f';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 7]);
    ctx.stroke();
    ctx.restore();
    nodes.forEach(([x, y, lab], i) => {
      const p = back(t, .32 + i * .37, .76);
      alpha(p, () => tr(x, y + (1 - p) * 38, .82 + .18 * p, 0, () => {
        if (i === 0) {
          roundShadow(-53, -37, 106, 74, 18, '#f4f8e8');
          searchIcon(0, 0, 40, FOREST);
        } else if (i === 1) {
          roundShadow(-83, -49, 166, 98, 13, '#fbfaed');
          line(-69, -34, 69, -34, '#c7c8b2');
          tx(cfg.sample, -71, -18, 12, K, 700, 'left', 130);
          gallery(-70, -11, 51, 50, t);
          box(-10, -8, 70, 4, 2, '#324d3d');
          box(-10, 2, 49, 4, 2, '#adb79d');
          box(-10, 17, 36, 11, 5, '#c4e49d');
        } else {
          box(-50, -34, 100, 68, 28, accent());
          arrow(0, 0, 42, K, -.66);
        }
        tx(lab, 0, i === 1 ? 79 : 69, 22, PAPER, 650, 'center', 170);
      }));
    });
    const pt = (t - .75) / 2.16;
    if (pt > 0 && pt < 1) {
      let a = clamp(pt) * 2,
        i = Math.min(1, Math.floor(a)),
        f = a - i;
      let [x1, y1] = nodes[i],
        [x2, y2] = nodes[i + 1];
      fleck(mix(x1, x2, f), mix(y1, y2, f) - 14 * Math.sin(Math.PI * f), 5, accent());
    }
  }
  function endScene(t) {
    bg(false, t + 39);
    let p = back(t, .03, .95);
    tile(300, 220 + (1 - p) * 52, .91 * p, -.088, t);
    const a = ease(t, .37, .68);
    alpha(a, () => tx(cfg.brand, 300, 355 + (1 - a) * 31, 72, K, 700, 'center', 531));
    const b = ease(t, .63, .6);
    alpha(b, () => tx(cfg.service, 300, 406 + (1 - b) * 24, 26, MUT, 500, 'center', 470));
    const mock = ease(t, .72, .76);
    alpha(mock, () => tr(300, 466 + (1 - mock) * 60, 1, -.018, () => desktop(-152, 0, 304, 1.5)));
    const c = back(t, 1.12, .76);
    alpha(c, () => tr(300, 844 + (1 - c) * 24, .9 + .1 * c, 0, () => pill(-140, -34, 280, 68, cfg.cta, K, PAPER, true, 23)));
    let q = ease(t, 1.8, 1.06);
    alpha(q, () => mouse(506 - 76 * q, 954 - 92 * q, .94, -.12));
  }
  const scenes = [opening, searchScene, brandScene, previewScene, structureScene, siteScene, mobileScene, routeScene, endScene];
  function draw(t) {
    t = clamp(t, 0, 44.999);
    let i = 0;
    while (i < 8 && t >= cuts[i + 1]) i++;
    const lt = t - cuts[i];
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    scenes[i](lt);
    if (i > 0 && lt < .32) {
      const p = smooth(lt / .32),
        old = cuts[i] - cuts[i - 1] - .002;
      if ([1, 4, 7].includes(i)) {
        const xx = mix(0, 620, p);
        ctx.save();
        ctx.beginPath();
        ctx.rect(xx, 0, Math.max(0, 600 - xx), H);
        ctx.clip();
        ctx.translate(p * 65, 0);
        scenes[i - 1](old);
        ctx.restore();
        alpha(1 - p, () => box(xx - 5, 0, 5, H, 0, accent()));
      } else if ([2, 6, 8].includes(i)) {
        alpha(1 - p, () => tr(300, 530, 1 + .16 * p, 0, () => tr(-300, -530, 1, 0, () => scenes[i - 1](old))));
      } else {
        const y = mix(0, H + 4, p);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, W, Math.max(0, H - y));
        ctx.clip();
        ctx.translate(0, p * 42);
        scenes[i - 1](old);
        ctx.restore();
      }
    }
    return i;
  }
  return {
    draw,
    cuts
  };
};
