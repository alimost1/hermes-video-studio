'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { once } = require('node:events');
const { parseArgs } = require('node:util');
const makeFilm = require('../assets/scenes.cjs');
const reference = require('../references/creatin-brief.json');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    seconds: { type: 'string', default: '45' },
    sheet: { type: 'boolean' },
    silent: { type: 'boolean' },
    progress: { type: 'boolean' },
    help: { type: 'boolean' }
  }
});
if (values.help || positionals.length !== 2) {
  console.log('node render.cjs BRIEF.json OUTPUT.mp4 [--seconds 15|45] [--silent] [--progress]\nnode render.cjs BRIEF.json OUTPUT.jpg --sheet [--seconds 15|45]');
  process.exit(values.help ? 0 : 2);
}
const seconds = Number(values.seconds);
const [briefFile, outputFile] = positionals.map(p => path.resolve(p));
const fps = 30;
const shortEdit = [
  { at: 0, source: 0 },
  { at: 3.4, source: 9.57 },
  { at: 5.8, source: 14.04 },
  { at: 8.3, source: 23.95 },
  { at: 11.6, source: 39.57 }
];
function sceneTime(t) {
  if (seconds === 45) return t;
  const beat = shortEdit.findLast(segment => t >= segment.at);
  return beat.source + t - beat.at;
}
function loadCanvas() {
  try { return require('@napi-rs/canvas'); }
  catch (err) {
    if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw err;
    return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, '@napi-rs/canvas'));
  }
}
function readBrief() {
  const data = JSON.parse(fs.readFileSync(briefFile, 'utf8'));
  const optional = ['artwork', 'logo', 'pickLabel', 'pickTitle', 'pickNote', 'pick1', 'pick2', 'pick3', 'pickConfirm'];
  const allowed = new Set([...Object.keys(reference), ...optional]);
  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) throw Error('Unknown brief field: ' + key);
    if (typeof data[key] !== 'string') throw Error('Expected text in ' + key);
  }
  for (const key of Object.keys(reference)) {
    if (!Object.hasOwn(data, key)) throw Error('Missing field: ' + key + '. Start from the bundled example brief.');
  }
  if (![data.brand, data.sample, data.cta].every(text => text.trim())) throw Error('Provide a brand, featured product or sample, and CTA.');
  if (!/^#[0-9a-f]{6}$/i.test(data.accent)) throw Error('Use a six-digit hex accent color.');
  return data;
}
function registerFonts(fonts) {
  for (const [name, file] of [['Arial','Sans'],['Georgia','Serif'],['Courier New','Mono']]) {
    for (const weight of ['Regular','Bold']) {
      const f = '/usr/share/fonts/truetype/liberation/Liberation' + file + '-' + weight + '.ttf';
      if (fs.existsSync(f)) fonts.registerFromPath(f, name);
    }
  }
}
function storyboard(lib, film, screen, out) {
  const samples = seconds === 45 ? [3.2,7.6,12,16.6,21.3,26.6,31.6,36.8,43.5] : [3,5.3,7.9,10.9,14.5];
  const tileW = 216, tileH = 384, cols = 3, caption = 26;
  const sheet = lib.createCanvas(tileW * cols, (tileH + caption) * Math.ceil(samples.length / cols));
  const g = sheet.getContext('2d');
  g.fillStyle = '#183427'; g.fillRect(0,0,sheet.width,sheet.height);
  samples.forEach((t,i) => {
    film.draw(sceneTime(t));
    const x = tileW*(i%cols), y = (tileH+caption)*Math.floor(i/cols);
    g.drawImage(screen,x,y,tileW,tileH);
    g.fillStyle = '#fff'; g.font = '14px Arial'; g.fillText(t.toFixed(1)+' s',x+10,y+tileH+18);
  });
  fs.writeFileSync(out, sheet.toBuffer('image/jpeg', 91));
}
async function encode(film, screen, temp, output) {
  const args = ['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','pipe:0'];
  if (!values.silent) {
    // Prefer the prebuilt copy of the original score; regenerate with score.py only if it is missing.
    let wav = path.join(__dirname, '..', 'assets', 'score.m4a');
    if (!fs.existsSync(wav)) {
      wav = path.join(temp, 'score.wav');
      execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python3', [path.join(__dirname,'score.py'), wav], {stdio:'inherit'});
    }
    args.push('-i',wav,'-map','0:v','-map','1:a','-c:a','aac','-b:a','192k');
    if (seconds < 45) args.push('-af','afade=t=out:st=14:d=1');
  }
  args.push('-t',String(seconds),'-c:v','libx264','-preset','veryfast','-crf','17','-pix_fmt','yuv420p','-threads','3','-movflags','+faststart',output);
  const enc = spawn('ffmpeg', args, {stdio:['pipe','ignore','inherit']});
  async function* frames() {
    for (let i = 0; i < seconds*fps; i++) {
      film.draw(sceneTime(i/fps));
      if (values.progress && i % 15 === 0) console.log('progress ' + (i / (seconds * fps)).toFixed(3));
      yield screen.toBuffer('image/jpeg',97);
    }
  }
  try {
    const [exit] = await Promise.all([once(enc,'close'),pipeline(Readable.from(frames()),enc.stdin)]);
    if (exit[0] !== 0) throw Error('FFmpeg exited with ' + exit[0]);
  } finally { if (enc.exitCode === null) enc.kill(); }
}
async function main() {
  if (![15,45].includes(seconds)) throw Error('Choose 15 or 45 seconds.');
  const expected = values.sheet ? /\.jpe?g$/i : /\.mp4$/i;
  if (!expected.test(outputFile)) throw Error(values.sheet ? 'Set a JPG output path for the storyboard.' : 'Set an MP4 output path.');
  const cfg = readBrief(), lib = loadCanvas(), images = {};
  registerFonts(lib.GlobalFonts);
  for (const key of ['artwork','logo']) {
    if (cfg[key]) images[key] = await lib.loadImage(fs.readFileSync(path.resolve(path.dirname(briefFile),cfg[key])));
  }
  const screen = values.sheet ? lib.createCanvas(432,768) : lib.createCanvas(1080,1920);
  const film = makeFilm(screen, lib.createCanvas, cfg, images);
  fs.mkdirSync(path.dirname(outputFile),{recursive:true});
  const temp = fs.mkdtempSync(path.join(path.dirname(outputFile),'.creatin-render-'));
  try {
    const result = path.join(temp,path.basename(outputFile));
    if (values.sheet) storyboard(lib,film,screen,result);
    else await encode(film,screen,temp,result);
    fs.renameSync(result,outputFile);
    console.log(outputFile);
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
}
main().catch(err => { console.error(err.message); process.exitCode=1; });
