// ───────────────────────────────────────────────────────────────────────────
// LIFE — resting moods + a human-like blink scheduler.
// Three moods:
//   still — near-stationary, only the odd slow blink
//   calm  — gentle breathing + occasional eye darts (default)
//   float — drifts around the scene, leans/looks toward travel, gets "bored"
// Blink cadence follows human physiology (~irregular clusters) and rises with
// `arousal`, which expressions and float-moves bump up and which decays back.
// buildLife(m) returns the controller the core class drives.
// ───────────────────────────────────────────────────────────────────────────

import { AROUSE } from './expressions.js';

export function buildLife(m){
  const gsap = m.gsap;
  const eyeL = m.eyeL, eyeR = m.eyeR, EYE = m.EYE, GRP = m.grp, BOT = m.bot;

  let life, breath, drift, swim, eyeLead;
  let eyeBusy = false;                                  // true while the bored squint owns the eyes
  let timers = { dart:null, bored:null, blink:null };
  let arousal = 0;

  // mean ms between blinks at rest, per mood
  const BLINK_BASE = { still:9000, calm:6200, float:5400 };

  function bump(a){ if(a==null) a=0.3; arousal = Math.max(0, Math.min(2.6, arousal + a)); }
  function arouseFor(key){ bump(AROUSE[key]!=null ? AROUSE[key] : 0.3); }

  function nextBlinkDelay(){
    const base = BLINK_BASE[m.mood] || 4000;
    const mean = base / (1 + arousal*0.9);              // more arousal → shorter gaps
    const j = -Math.log(1 - Math.random());             // exp(1): natural clustering
    return Math.max(650, mean * (0.5 + 0.85*j));
  }
  function doIdleBlink(){
    if(Math.random() < 0.1 + 0.2*Math.min(1,arousal)){  // occasional human double-blink
      gsap.timeline()
        .to(EYE,{scaleY:0.12,duration:0.08,ease:'power2.in'}).to(EYE,{scaleY:1,duration:0.12,ease:'power2.out'})
        .to(EYE,{scaleY:0.12,duration:0.08,ease:'power2.in'},'+=0.07').to(EYE,{scaleY:1,duration:0.12,ease:'power2.out'});
    } else {
      gsap.to(EYE,{scaleY:0.12,duration:0.09,yoyo:true,repeat:1,ease:'power1.inOut'});
    }
  }
  function scheduleBlink(){
    timers.blink = setTimeout(()=>{ if(!m.busy) doIdleBlink(); arousal *= 0.8; scheduleBlink(); }, nextBlinkDelay());
  }

  function stop(){
    [life,breath,drift,swim,eyeLead].forEach(t=>t&&t.kill()); life=breath=drift=swim=eyeLead=null;
    eyeBusy=false;
    Object.values(timers).forEach(t=>t&&clearTimeout(t)); timers={dart:null,bored:null,blink:null};
  }

  // Breath amplitude is scale-only (rule: the eye baseline never moves). The
  // defined 1.4% is right at demo size (~300px) but is under a pixel on a 56px
  // card mount, so small mounts breathe to the same visible depth: ~2.5px.
  function amp(base){ const w = (BOT.getBoundingClientRect && BOT.getBoundingClientRect().width) || 300; return Math.max(base, 1 + 2.5 / w); }
  function start(){
    stop();
    scheduleBlink();                                    // human blink cadence runs across all moods
    // if we were roaming and have left float, glide the whole mascot back to centre
    if(m.roamWithin && m.mood!=='float'){
      const hb=m.roamWithin.getBoundingClientRect(), rb=m.root.getBoundingClientRect();
      gsap.to(m.root,{x:Math.max(0,(hb.width-rb.width)/2), y:Math.max(0,(hb.height-rb.height)/2), duration:0.7, ease:'power2.inOut'});
    }
    if(m.mood==='still'){
      breath = gsap.to(BOT,{scale:amp(1.007),duration:4.2,ease:'sine.inOut',yoyo:true,repeat:-1});  // scale-only keeps eye baseline fixed
    } else if(m.mood==='float'){
      breath = gsap.to(BOT,{scale:amp(1.014),duration:3.2,ease:'sine.inOut',yoyo:true,repeat:-1});
      if(m.roamWithin) roam(); else drift_();
      function drift_(){
      gsap.to(BOT,{xPercent:0,yPercent:0,duration:0.6,ease:'power2.inOut'});
      let fx=0, fy=0;                                   // current float position
      (function wander(){
        const nx=(Math.random()*2-1)*15, ny=(Math.random()*2-1)*9;   // wider range — a single push travels further
        const dx=nx-fx, dy=ny-fy, dist=Math.hypot(dx,dy)||0.001;
        const dirx=dx/dist, diry=dy/dist;
        const k=Math.min(1, dist/22);                  // 0..1 — how big the hop is
        const ov=2.4*k;                                // momentum carry past the target → soft recoil (pure position, no deform)
        const gather=0.36, push=2.6+dist*0.06, settle=1.1, total=gather+push+settle;
        // one jellyfish pulse: gather → strong push that carries momentum → long glide + gentle recoil
        const tl=gsap.timeline({onComplete:()=>{ fx=nx; fy=ny; bump(0.2*k); wander(); }});
        tl.to(BOT,{xPercent:fx-dirx*1.2, yPercent:fy-diry*0.9, duration:gather, ease:'sine.in'})    // gather (contract back)
          .to(BOT,{xPercent:nx+dirx*ov, yPercent:ny+diry*ov, duration:push, ease:'power3.out'})     // push + momentum glide
          .to(BOT,{xPercent:nx, yPercent:ny, duration:settle, ease:'sine.inOut'});                  // settle back from the carry
        drift=tl;
        // eyes lead with the push, ease back over the glide — but not while the bored squint owns them
        if(!m.busy && !eyeBusy){
          eyeLead = gsap.timeline()
            .to(EYE,{xPercent:dirx*22*k,yPercent:diry*13*k,duration:total*0.32,ease:'power2.out'})
            .to(EYE,{xPercent:0,yPercent:0,duration:total*0.68,ease:'sine.inOut'});
        }
        if(!m.busy){
          // ever-so-slight whole-icon tilt toward where he's heading
          gsap.timeline()
            .to(BOT,{rotation:dirx*3*k,duration:total*0.32,ease:'power2.out'})
            .to(BOT,{rotation:0,duration:total*0.68,ease:'sine.inOut'});
        }
      })();
      }
      // ROAM: same jellyfish pulse, but translating the whole mascot (m.root) in px
      // across a larger container — so he genuinely travels the canvas.
      function roam(){
        const host=m.roamWithin, pad=m.roamPad;
        gsap.set(BOT,{xPercent:0,yPercent:0});         // bot stays centred in its mount; the mount travels
        const range=()=>{ const hb=host.getBoundingClientRect(), rb=m.root.getBoundingClientRect();
          return { x:Math.max(0, hb.width-rb.width-2*pad), y:Math.max(0, hb.height-rb.height-2*pad) }; };
        let R=range();
        let rx = (+gsap.getProperty(m.root,'x')) || R.x/2;   // resume from where we are, else centre
        let ry = (+gsap.getProperty(m.root,'y')) || R.y/2;
        gsap.set(m.root,{x:rx,y:ry});
        (function go(){
          R=range();
          const nx=Math.random()*R.x, ny=Math.random()*R.y;
          const dx=nx-rx, dy=ny-ry, dist=Math.hypot(dx,dy)||0.001;
          const dirx=dx/dist, diry=dy/dist;
          const maxDist=Math.hypot(R.x,R.y)||1;
          const k=Math.min(1, dist/(maxDist*0.6));
          const small=Math.min(R.x,R.y)||1;
          const ovpx=small*0.03*k;                       // overshoot in px, scaled to the canvas
          const gather=0.4, push=2.6+dist*0.012, settle=1.2, total=gather+push+settle;
          const tl=gsap.timeline({onComplete:()=>{ rx=nx; ry=ny; bump(0.2*k); go(); }});
          tl.to(m.root,{x:rx-dirx*small*0.02, y:ry-diry*small*0.02, duration:gather, ease:'sine.in'})   // gather
            .to(m.root,{x:nx+dirx*ovpx, y:ny+diry*ovpx, duration:push, ease:'power3.out'})              // push + momentum glide
            .to(m.root,{x:nx, y:ny, duration:settle, ease:'sine.inOut'});                               // settle from carry
          drift=tl;
          if(!m.busy && !eyeBusy){
            eyeLead = gsap.timeline()
              .to(EYE,{xPercent:dirx*22*k,yPercent:diry*13*k,duration:total*0.32,ease:'power2.out'})
              .to(EYE,{xPercent:0,yPercent:0,duration:total*0.68,ease:'sine.inOut'});
          }
          if(!m.busy){
            gsap.timeline()
              .to(BOT,{rotation:dirx*3*k,duration:total*0.32,ease:'power2.out'})
              .to(BOT,{rotation:0,duration:total*0.68,ease:'sine.inOut'});
          }
        })();
      }
      (function bored(){ timers.bored=setTimeout(()=>{ if(!m.busy && m.mood==='float'){
        if(Math.random()<0.45){
          // take exclusive control of the eyes so the directional lead can't fight the squint
          eyeBusy=true; if(eyeLead){ eyeLead.kill(); eyeLead=null; }
          gsap.timeline({onComplete:()=>{ eyeBusy=false; }})
            .to(GRP,{yPercent:4,rotation:-2,duration:0.9,ease:'power2.inOut'},0)
            .to(EYE,{scaleY:0.7,yPercent:7,xPercent:0,duration:0.9,ease:'power2.inOut'},0)            // squint in place, eyes recentred
            .to(GRP,{yPercent:0,rotation:0,duration:1,ease:'power2.inOut'},'+=0.7')
            .to(EYE,{scaleY:1,yPercent:0,xPercent:0,duration:1,ease:'power2.inOut'},'<');
        }
        else { gsap.timeline().to(GRP,{rotation:6,duration:0.8,ease:'power2.inOut'}).to(GRP,{rotation:0,duration:0.8,ease:'power2.inOut'},'+=1.4'); } }
        bored(); }, 3800+Math.random()*4200); })();
    } else {
      m.mood='calm';
      gsap.to(BOT,{xPercent:0,yPercent:0,rotation:0,duration:0.6,ease:'power2.inOut'});
      breath = gsap.to(BOT,{scale:amp(1.014),duration:2.8,ease:'sine.inOut',yoyo:true,repeat:-1});
      (function dart(){ timers.dart=setTimeout(()=>{ if(!m.busy){ const dx=(Math.random()*2-1)*7, dy=(Math.random()*2-1)*4; gsap.to(EYE,{xPercent:dx,yPercent:dy,duration:0.45,ease:'back.out(2)'}); gsap.to(EYE,{xPercent:0,yPercent:0,duration:0.6,delay:0.95,ease:'sine.inOut'}); } dart(); }, 2400+Math.random()*2800); })();
    }
  }

  function setMood(mood){ m.mood=mood; if(!m.busy){ m.neutral(); start(); } }

  return { start, stop, setMood, bump, arouseFor };
}
