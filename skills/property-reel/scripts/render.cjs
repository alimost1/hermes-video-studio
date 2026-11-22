/* Render an editorial property tour. Usage and listing fields are in ../SKILL.md. */
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {createCanvas,loadImage,GlobalFonts} = require('@napi-rs/canvas');

const [manifest, output, audio] = process.argv.slice(2);
if (!manifest || !output) throw Error('Usage: node render.cjs listing.json output.mp4|preview.jpg [music.wav]');
const listing = JSON.parse(fs.readFileSync(manifest, 'utf8'));
const {chapters} = listing;
if (!Array.isArray(chapters) || chapters.length === 0) throw Error('Provide at least one property chapter.');
const W=1080, H=1920, FPS=30, intro=3.4, chapterTime=2.8, outro=4.5;
const closeTime=intro+chapterTime*chapters.length, duration=closeTime+outro;
const canvas=createCanvas(W,H), ctx=canvas.getContext('2d');
const charcoal='#1c201e', ink='#151a18', ivory='#fbf6ea', gold='#d8b984', muted='#ded6c6';
const faces=[
  ['Display','/usr/share/fonts/opentype/urw-base35/P052-Roman.otf','serif'],
  ['Italic','/usr/share/fonts/opentype/urw-base35/P052-Italic.otf','serif'],
  ['Thin','/usr/share/fonts/truetype/open-sans/OpenSans-Light.ttf','sans-serif'],
  ['Label','/usr/share/fonts/truetype/open-sans/OpenSans-Semibold.ttf','sans-serif']
];
const family={};
for(const [name,file,backup] of faces) {
  family[name]=fs.existsSync(file) && GlobalFonts.registerFromPath(file,'Estate '+name) ? '"Estate '+name+'"' : backup;
}
const cut = v=>Math.min(1,Math.max(0,v));
const ease = v=>1-Math.pow(1-cut(v),3);
const smooth = v=>{v=cut(v);return v*v*(3-2*v);};
const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const assets=new Map();
function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
function rule(x,y,w,h=2,color=gold){rect(x,y,w,h,color);}
function grad(x1,y1,x2,y2,stops){
  const g=ctx.createLinearGradient(x1,y1,x2,y2);
  stops.forEach(([at,color])=>g.addColorStop(at,color));
  return g;
}
function text(value,x,y,size,font,fill,opts={}){
  if (!value) return;
  let actualSize=size;
  const chars=Array.from(String(value)), gap=/[\u0590-\u08ff\u0900-\u0dff]/u.test(value)?0:(opts.tracking||0), max=opts.max||Infinity;
  ctx.font=actualSize+'px '+family[font];
  function width(){return gap?chars.reduce((sum,c)=>sum+ctx.measureText(c).width,0)+gap*(chars.length-1):ctx.measureText(value).width;}
  let advance=width();
  if(advance>max){
    actualSize*=Math.max(0.1,(max-gap*(chars.length-1))/(advance-gap*(chars.length-1)));
    ctx.font=actualSize+'px '+family[font];advance=width();
  }
  if(opts.align==='right') x-=advance;
  if(opts.align==='center') x-=advance/2;
  ctx.fillStyle=fill;ctx.textBaseline='alphabetic';
  if(!gap){ctx.fillText(value,x,y);return;}
  for(const c of chars){ctx.fillText(c,x,y);x+=ctx.measureText(c).width+gap;}
}
function appear(t,delay,draw,offset=22){
  const p=ease((t-delay)/0.49);
  if(p<=0)return;
  ctx.save();ctx.globalAlpha*=p;ctx.translate(0,(1-p)*offset);draw();ctx.restore();
}
function photo(spec,x,y,w,h,progress,direction=1){
  const img=assets.get(spec.file), p=cut(progress);
  const z=1.025+0.042*p, rawScale=Math.max(w/img.width,h/img.height)*z;
  const sw=w/rawScale,sh=h/rawScale,fx=clamp((spec.x??.5)+(p-.5)*.045*direction,0,1),fy=clamp(spec.y??.50,0,1);
  ctx.drawImage(img,(img.width-sw)*fx,(img.height-sh)*fy,sw,sh,x,y,w,h);
}
function topShadow(h){rect(0,0,W,h,grad(0,0,0,h,[[0,'#00000083'],[1,'#00000000']]));}
function identity(t){
  appear(t,-.28,()=>{
    rule(76,149,50,3,gold);
    text(listing.status,146,159,29,'Label',ivory,{tracking:3,max:485});
    text(listing.reference,985,159,27,'Label',ivory,{tracking:2,align:'right',max:290});
  },12);
}
function introShot(t){
  const split=1082+28*(1-ease(t/.9));
  photo(listing.cover,0,0,W,split,t/intro,-1);
  topShadow(350);identity(t);
  rect(0,split,W,H-split,charcoal);
  rule(0,split,W,3,gold);
  const left=78;
  appear(t,-.12,()=>text(listing.title,left,1290,147,'Display',ivory,{max:928}),38);
  appear(t,.08,()=>text(listing.location,left+4,1383,65,'Italic',gold,{max:913}),24);
  const facts=(listing.facts||[]).filter(f=>f[0]);
  if(facts.length){
    rule(left,1462,924*ease((t+.04)/.8),1.8,'#a19372');
    const cell=920/facts.length;
    facts.forEach(([value,label],i)=>appear(t,.22+i*.08,()=>{
      const x=left+i*cell;
      text(value,x,1581,75,'Display',ivory,{max:cell-15});
      text(label,x+3,1631,25,'Label',muted,{tracking:3,max:cell-15});
    }));
  }
}
function cap(value,x,y,max){
  text(value,x,y,45,'Italic',ivory,{max});
}
function roomShot(index,t){
  const shot=chapters[index],p=cut(t/chapterTime);
  const split=1268+17*Math.sin(Math.PI*p);
  const panel=227+54*(1-ease(t/.78));
  photo(shot.upper,0,0,W,split,p,index%2?-1:1);
  if(shot.upperCaption){
    rect(0,split-254,W,254,grad(0,split-254,0,split,[[0,'#0b111000'],[1,'#0b1110bb']]));
    appear(t,.16,()=>cap(shot.upperCaption,panel+41,split-53,W-panel-107));
  }
  rect(0,0,panel,split,'rgba(23,28,26,0.90)');rule(panel-3,0,3,split,gold);
  ctx.save();ctx.beginPath();ctx.rect(0,0,panel,split);ctx.clip();
  const move=78*(1-ease(t/.75));
  ctx.translate(panel/2-8,split-77+move);ctx.rotate(-Math.PI/2);
  text(shot.name,0,24,99,'Thin',ivory,{tracking:8,max:split-237});
  ctx.restore();
  rule(panel/2-9,87,2,85*ease((t+.05)/.58),gold);
  photo(shot.lower,0,split+5,W,H-split-5,p,index%2?1:-1);
  rule(0,split,W,5,gold);
  if(shot.lowerCaption){
    rect(0,split+5,W,198,grad(0,split,0,split+198,[[0,'#0d120fd6'],[1,'#0d120f00']]));
    appear(t,.22,()=>cap(shot.lowerCaption,62,split+84,910));
  }
}
function closeShot(t){
  const top=691;
  photo(listing.close||listing.cover,0,0,W,top,t/outro,1);
  topShadow(240);identity(1);
  rect(0,top,W,H-top,ink);rule(0,top,W,3,gold);
  const left=80;
  appear(t,-.10,()=>text(listing.agency,left,835,35,'Label',ivory,{max:915,tracking:1.6}));
  if(listing.price){
    appear(t,-.04,()=>text(listing.priceLabel,left,984,24,'Label',gold,{tracking:4,max:900}));
    appear(t,.08,()=>text(listing.price,left-2,1110,108,'Display',ivory,{max:915}));
  }
  const shift=listing.price?0:-210;
  rule(left,1185+shift,918*ease(t/.65),1.7,'#968466');
  appear(t,.22,()=>text(listing.invite,left,1328+shift,79,'Italic',gold,{max:906}));
  appear(t,.32,()=>text(listing.phone,left,1441+shift,65,'Thin',ivory,{max:912}));
  const webY=listing.phone?1512:1441;
  const webSize=listing.phone?36:53;
  appear(t,.40,()=>text(listing.website,left+3,webY+shift,webSize,'Thin',listing.phone?muted:ivory,{max:915}));
}
function scene(index,t){
  if(index===0)introShot(t);
  else if(index<=chapters.length)roomShot(index-1,t);
  else closeShot(t);
}
function paint(t){
  let index=0,start=0,prevDuration=intro;
  if(t>=closeTime){index=chapters.length+1;start=closeTime;prevDuration=chapterTime;}
  else if(t>=intro){index=1+Math.floor((t-intro+0.000001)/chapterTime);start=intro+(index-1)*chapterTime;prevDuration=index===1?intro:chapterTime;}
  const local=t-start;
  if(index>0 && local<.48){
    scene(index-1,prevDuration+local);
    const edge=W*(1-smooth(local/.48));
    ctx.save();ctx.beginPath();ctx.rect(edge,0,W-edge,H);ctx.clip();scene(index,local);ctx.restore();
    if(edge>0 && edge<W)rule(edge-2,0,4,H,gold);
  }else scene(index,local);
}
async function main(){
  const photos=[listing.cover,listing.close||listing.cover,...chapters.flatMap(ch=>[ch.upper,ch.lower])];
  for(const f of photos){
    if(!assets.has(f.file))assets.set(f.file,await loadImage(path.resolve(path.dirname(manifest),f.file)));
  }
  if(output.endsWith('.png')){
    paint(1.6);
    fs.writeFileSync(output,canvas.toBuffer('image/png'));
    return;
  }
  if(output.endsWith('.jpg')){
    const frames=[1.6,...chapters.map((_,i)=>intro+(i+.5)*chapterTime),closeTime+2];
    const w=245,h=436,board=createCanvas(w*frames.length,h),b=board.getContext('2d');
    frames.forEach((t,i)=>{paint(t);b.drawImage(canvas,i*w,0,w,h);});
    fs.writeFileSync(output,board.toBuffer('image/jpeg',94));return;
  }
  const args=['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','pipe:0'];
  if(audio)args.push('-i',audio,'-map','0:v','-map','1:a','-af','apad','-c:a','aac','-b:a','192k');
  else args.push('-an');
  args.push('-t',duration.toFixed(3),'-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709','-c:v','libx264','-preset','veryfast','-crf','17','-threads','4','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',output);
  const enc=spawn('ffmpeg',args,{stdio:['pipe','ignore','inherit']});
  const done=once(enc,'close');
  for(let fr=0;fr<Math.round(duration*FPS);fr++){
    paint(fr/FPS);
    if(!enc.stdin.write(canvas.toBuffer('image/jpeg',96)))await once(enc.stdin,'drain');
  }
  enc.stdin.end();
  if((await done)[0]!==0)throw Error('FFmpeg failed to encode the tour.');
}
main().catch(e=>{console.error(e.message);process.exit(1);});
