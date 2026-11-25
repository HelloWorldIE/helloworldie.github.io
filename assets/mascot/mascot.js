// ───────────────────────────────────────────────────────────────────────────
// MASCOT — the core engine. Builds the DOM, lays out eyes/screen from the
// character's geometry ratios, owns the rest/neutral pose, the type action,
// and the command driver (play / run / type / blink / setMood).
//
//   import { Mascot } from './mascot/index.js';
//   import helloworld from './mascot/characters/helloworld.js';
//   const bot = new Mascot({ mount:'#bot', character: helloworld });
//   await bot.play('happy');
//   await bot.play('excited & "Found it!"');   // expression + type together
//   await bot.run('thinking, "Loading…", happy');
//   bot.setMood('float');
//
// GSAP is required. Pass it in (`gsap` option) or expose it as window.gsap.
// ───────────────────────────────────────────────────────────────────────────

import { buildExpressions } from './expressions.js';
import { buildLife } from './life.js';

const wait = ms => new Promise(r=>setTimeout(r,ms));
const raf2 = () => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export class Mascot {
  constructor(opts={}){
    this.gsap = opts.gsap || (typeof window!=='undefined' && window.gsap);
    if(!this.gsap) throw new Error('Mascot: GSAP is required (pass {gsap} or load window.gsap).');
    this.char = opts.character;
    if(!this.char) throw new Error('Mascot: a character is required.');

    this.root = typeof opts.mount==='string' ? document.querySelector(opts.mount) : opts.mount;
    if(!this.root) throw new Error('Mascot: mount element not found.');

    this.mood = opts.mood || 'calm';
    this.autoblink = opts.autoblink !== false;     // default on
    this.typeSpeed = opts.typeSpeed || 82;          // ms per character
    this.busy = false;
    this._onStatus = opts.onStatus || null;

    // roam: in float mood, drift the whole mascot across a larger container
    // instead of in-place. Pass { within: el|selector, padding?: px }.
    const rw = opts.roam && (typeof opts.roam.within==='string' ? document.querySelector(opts.roam.within) : opts.roam.within);
    this.roamWithin = rw || null;
    this.roamPad = (opts.roam && opts.roam.padding!=null) ? opts.roam.padding : 14;

    this._build();
    this.EXP = buildExpressions(this);
    this.life = buildLife(this);

    this._layout();
    const boot = () => { this.neutral(true); this.life.start(); };
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>setTimeout(boot,150));
    else setTimeout(boot,300);

    this._onResize = () => { if(!this.busy) this.neutral(true); };
    window.addEventListener('resize', this._onResize);
  }

  /* ---------- DOM ---------- */
  _build(){
    const c = this.char, col = c.colors, g = c.geom;
    this.root.classList.add('mascot');
    this.root.style.setProperty('--m-eye', col.eye);
    this.root.style.setProperty('--m-type', col.type || col.eye);
    this.root.style.setProperty('--m-accent', col.accent || col.eye);
    this.root.style.setProperty('--m-origin', g.transformOrigin || '50% 56%');
    if(g.headWidth) this.root.style.setProperty('--m-head-w', g.headWidth);

    const paths = c.head.paths.map(p=>{
      const fill = p.fill==='head' ? col.head : p.fill==='eye' ? col.eye : p.fill;
      return `<path fill="${fill}" d="${p.d}"/>`;
    }).join('');
    const headSVG = `<svg viewBox="${c.viewBox}" xmlns="http://www.w3.org/2000/svg"><g transform="${c.head.transform||''}">${paths}</g></svg>`;

    this.root.innerHTML =
      `<div class="m-bot"><div class="m-grp">`+
      `<div class="m-head">${headSVG}</div>`+
      `<div class="m-screen"><div class="m-line"><span class="m-typed"></span><span class="m-bar"></span></div></div>`+
      `<div class="m-eye m-eyeL"></div><div class="m-eye m-eyeR"></div>`+
      `</div></div>`;

    const q = s => this.root.querySelector(s);
    this.bot=q('.m-bot'); this.grp=q('.m-grp'); this.head=q('.m-head');
    this.screen=q('.m-screen'); this.line=q('.m-line'); this.typed=q('.m-typed'); this.bar=q('.m-bar');
    this.eyeL=q('.m-eyeL'); this.eyeR=q('.m-eyeR'); this.EYE=[this.eyeL,this.eyeR];
  }

  /* ---------- geometry ---------- */
  _rectIn(el){ const r=el.getBoundingClientRect(), s=this.root.getBoundingClientRect(); return {l:r.left-s.left,t:r.top-s.top,w:r.width,h:r.height}; }
  _layout(){
    const h=this._rectIn(this.head), g=this.char.geom;
    const sh=h.h*g.screen.h, sw=h.w*g.screen.w, sx=h.l+h.w*g.screen.x, sy=h.t+h.h*g.screen.yCenter - sh/2;
    Object.assign(this.screen.style,{left:sx+'px',top:sy+'px',width:sw+'px',height:sh+'px',fontSize:(sh*g.screen.fontScale)+'px'});
    this.line.style.fontSize=(sh*g.screen.fontScale)+'px';
    this.EW=h.w*g.eye.w; this.EH=h.w*g.eye.h; this.CY=h.t+h.h*g.eye.yCenter;
    this.LX0=h.l+h.w*g.eye.lx-this.EW/2; this.RX0=h.l+h.w*g.eye.rx-this.EW/2;
    this.EYE.forEach(e=>{e.style.width=this.EW+'px';e.style.height=this.EH+'px';e.style.borderRadius='999px';});
  }

  /* ---------- rest pose ---------- */
  neutral(hard){
    const g=this.gsap;
    this._layout();
    this.typed.innerHTML=''; this.line.style.transition='none'; this.line.style.transform='translateX(0)';
    this.eyeR.classList.remove('m-cursorblink'); this.bar.style.opacity='0';
    g.killTweensOf([this.eyeL,this.eyeR,this.grp,this.bot]);
    this.EYE.forEach(e=>{e.style.transition='left .2s ease';e.style.opacity='1';e.style.visibility='visible';e.style.top=(this.CY-this.EH/2)+'px';});
    if(hard){
      g.set(this.EYE,{xPercent:0,yPercent:0,scaleY:1,scaleX:1,rotation:0});
      g.set(this.grp,{xPercent:0,yPercent:0,rotation:0,scale:1});
      g.set(this.bot,{xPercent:0,yPercent:0,rotation:0});
    } else {
      g.to(this.EYE,{xPercent:0,yPercent:0,scaleY:1,scaleX:1,rotation:0,duration:0.28,ease:'power2.out'});
      g.to(this.grp,{xPercent:0,yPercent:0,rotation:0,scale:1,duration:0.28,ease:'power2.out'});
      g.to(this.bot,{rotation:0,duration:0.34,ease:'power2.out'});
    }
    this.eyeL.style.left=this.LX0+'px'; this.eyeR.style.left=this.RX0+'px';
  }

  // promise-wrapped GSAP timeline
  P(build){ return new Promise(res=>{ const t=this.gsap.timeline({onComplete:res}); build(t); if(!t.getChildren().length) res(); }); }

  // glide back to rest before an action (so float/drift never throws timing off)
  toRest(){ const g=this.gsap; return new Promise(res=>{ g.timeline({onComplete:res})
    .to(this.bot,{xPercent:0,yPercent:0,rotation:0,duration:0.34,ease:'power2.inOut'},0)
    .to(this.grp,{xPercent:0,yPercent:0,rotation:0,scaleX:1,scaleY:1,duration:0.34,ease:'power2.inOut'},0)
    .to(this.EYE,{xPercent:0,yPercent:0,scaleX:1,scaleY:1,duration:0.34,ease:'power2.inOut'},0); }); }

  _setBusy(b){
    this.busy=b;
    if(b){ this.life.stop(); this.gsap.killTweensOf([this.eyeL,this.eyeR,this.grp,this.bot]); }
    else { this.life.start(); }
    if(this._onBusy) this._onBusy(b);
  }
  _status(s){ if(this._onStatus) this._onStatus(s); }

  /* ---------- type action (eyes → cursor → type → back) ---------- */
  _fit(){ const over=this.line.scrollWidth-this.screen.clientWidth; this.line.style.transform = over>0 ? 'translateX('+(-over-2)+'px)' : 'translateX(0)'; }
  _render(str,i){
    const suffix=this.char.brandSuffix;
    if(suffix && str.endsWith(suffix)){
      const cut=str.length-suffix.length;
      const a=esc(str.slice(0,Math.min(i,cut)));
      const b=i>cut?'<span class="m-accent">'+esc(str.slice(cut,i))+'</span>':'';
      this.typed.innerHTML=a+b;
    } else this.typed.innerHTML=esc(str.slice(0,i));
    this._fit();
  }
  async type(str){
    const g=this.gsap, T=0.275, eyeL=this.eyeL, eyeR=this.eyeR, bar=this.bar, line=this.line;
    g.set([eyeL,eyeR],{xPercent:0,yPercent:0,scaleY:1,scaleX:1,rotation:0}); await wait(20);
    const Rx=parseFloat(eyeR.style.left), Lx=parseFloat(eyeL.style.left), Sx=this._rectIn(bar).l;
    const v=(Rx-Sx)/T, d1=(Rx-Lx)/v;
    await raf2();
    eyeR.style.transition='left '+T+'s linear'; eyeR.style.left=Sx+'px';
    eyeR.classList.add('m-cursorblink');                 // blink as it becomes the cursor bar
    await wait(d1*1000);
    eyeL.style.transition='left '+(T-d1)+'s linear'; eyeL.style.left=Sx+'px';
    await wait((T-d1)*1000+20);
    eyeL.style.opacity='0';
    for(let i=0;i<=str.length;i++){ this._render(str,i); eyeR.style.transition='left .09s linear'; eyeR.style.left=this._rectIn(bar).l+'px'; await wait(this.typeSpeed); }
    await wait(760);
    for(let i=str.length;i>=0;i--){ this._render(str,i); eyeR.style.left=this._rectIn(bar).l+'px'; await wait(40); }
    line.style.transition='transform .25s'; line.style.transform='translateX(0)'; await wait(120);
    eyeR.classList.remove('m-cursorblink');
    const h=this._rectIn(this.head), g2=this.char.geom, ew=h.w*g2.eye.w,
      Rx2=h.l+h.w*g2.eye.rx-ew/2, Lx2=h.l+h.w*g2.eye.lx-ew/2, Sx2=this._rectIn(eyeR).l;
    const v2=(Rx2-Sx2)/T, tL=(Lx2-Sx2)/v2;
    eyeL.style.transition='none'; eyeL.style.left=Sx2+'px'; eyeL.style.opacity='1';
    await raf2();
    eyeR.style.transition='left '+T+'s linear'; eyeR.style.left=Rx2+'px';
    eyeL.style.transition='left '+tL+'s linear'; eyeL.style.left=Lx2+'px';
    await wait(T*1000+40);
  }

  /* ---------- command driver ---------- */
  // a single named expression, a "quoted string" to type, or `a & b` to run both at once
  async play(token){
    if(this.busy) return;
    this._setBusy(true); await this.toRest();
    this._status('▶ '+token);
    await this._runOne(token); this.neutral();
    this._status(''); this._setBusy(false);
  }
  async _runOne(token){
    token=(token||'').trim(); if(!token) return;
    const parts=this._splitAmp(token);
    if(parts.length>1){ await Promise.all(parts.map(p=>this._runAtom(p))); return; }
    await this._runAtom(token);
  }
  async _runAtom(token){
    token=token.trim(); if(!token) return;
    const m=token.match(/["“](.+?)["”]/);                // quoted → type it
    if(m){ await this.type(m[1]); return; }
    let key=token.toLowerCase().replace(/^type\s+/,'');
    const bm=key.match(/^blink(?:\s+(light|medium|strong|double|x?\d+))?$/);
    if(bm){ const a=bm[1]; await this.blink(a ? (/^x?\d+$/.test(a)? parseInt(a.replace('x',''),10) : a) : 'medium'); return; }
    if(this.EXP[key]){ await this.EXP[key](); this.life.arouseFor(key); }
    else this._status('skipped: '+token);
  }
  blink(kind){ return this.EXP.blink(kind); }

  // run a sequence: array of tokens, or a comma/newline string (quoted commas safe)
  async run(seq){
    if(this.busy) return;
    const tokens = Array.isArray(seq) ? seq : this._parse(seq);
    this._setBusy(true); await this.toRest();
    for(let i=0;i<tokens.length;i++){
      const tok=tokens[i].trim();
      this._status('▶ '+tok); await this._runOne(tokens[i]); this.neutral();
      if(this.autoblink && i<tokens.length-1){
        if(/(^|[\s&])look([\s&]|$)/i.test(tok)){ await wait(120); await this.blink('double'); }
        else if(Math.random()<0.55){ await wait(80+Math.random()*120); await this.blink(this._pickBlink()); }
      }
      await wait(160);
    }
    this._status('done'); this._setBusy(false); await wait(900); if(!this.busy) this._status('');
  }
  _pickBlink(){ const r=Math.random(); return r<0.6?'light':r<0.9?'medium':'strong'; }

  setMood(m){ this.life.setMood(m); }
  get moodName(){ return this.mood; }

  _splitAmp(text){ const out=[]; let buf='',q=false; for(const ch of text){ if(ch==='"'||ch==='“'||ch==='”'){q=!q;buf+=ch;} else if(ch==='&'&&!q){ out.push(buf); buf=''; } else buf+=ch; } out.push(buf); return out.map(s=>s.trim()).filter(Boolean); }
  _parse(text){ const out=[]; let buf='',q=false; for(const ch of text){ if(ch==='"'||ch==='“'||ch==='”'){q=!q;buf+=ch;} else if((ch===','||ch==='\n')&&!q){ if(buf.trim())out.push(buf.trim()); buf=''; } else buf+=ch; } if(buf.trim())out.push(buf.trim()); return out; }

  // list of available expression/action names
  get expressions(){ return Object.keys(this.EXP); }

  destroy(){ this.life.stop(); window.removeEventListener('resize', this._onResize); this.root.innerHTML=''; this.root.classList.remove('mascot'); }
}

export default Mascot;
