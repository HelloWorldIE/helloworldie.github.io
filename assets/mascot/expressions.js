// ───────────────────────────────────────────────────────────────────────────
// EXPRESSIONS & ACTIONS — character-agnostic GSAP timelines.
// Every motion drives three layers so it reads as a living thing, not a slide:
//   EYE — the two eyes (array)          → look / squint / widen
//   GRP — the inner group (head+eyes)   → primary motion
//   BOT — the whole icon                → secondary follow-through + tilt
// All transforms are percentages/scales, so these work for ANY character.
// buildExpressions(m) returns a map keyed by name; `blink` is included.
// ───────────────────────────────────────────────────────────────────────────

export function buildExpressions(m){
  const gsap = m.gsap;
  const EYE = m.EYE, eyeL = m.eyeL, eyeR = m.eyeR, GRP = m.grp, BOT = m.bot;
  const P = (b) => m.P(b);

  /* ---- graded blinks ---- light = a flick · medium = normal · strong = full squeeze ---- */
  function blinkSpec(kind){
    if(kind==='light')  return {sy:0.46, sx:1.00, down:0.05, hold:0,    up:0.10};
    if(kind==='strong') return {sy:0.04, sx:0.96, down:0.10, hold:0.05, up:0.17};
    return                     {sy:0.12, sx:1.00, down:0.08, hold:0.02, up:0.13};   // medium
  }
  function blinkInto(t,kind){ const s=blinkSpec(kind);
    t.to(EYE,{scaleY:s.sy,scaleX:s.sx,duration:s.down,ease:'power2.in'});
    if(s.hold) t.to({},{duration:s.hold});
    t.to(EYE,{scaleY:1,scaleX:1,duration:s.up,ease:'power2.out'});
    return t;
  }
  // kind: 'light' | 'medium' | 'strong' | 'double' | number (n medium blinks)
  async function blink(kind){
    if(typeof kind==='number'){ return P(t=>{ for(let k=0;k<kind;k++){ blinkInto(t,'medium'); t.to({},{duration:0.14}); } }); }
    if(kind==='double'){ return P(t=>{ blinkInto(t,'medium'); t.to({},{duration:0.10}); blinkInto(t,'medium'); }); }
    return P(t=>blinkInto(t,kind||'medium'));
  }

  async function happy(){ return P(t=>{ t.to(EYE,{scaleY:0.62,yPercent:-10,duration:0.34,ease:'back.out(2.2)'},0)
     .to(GRP,{yPercent:-5,rotation:-2.5,duration:0.45,ease:'back.out(1.8)'},0)
     .to(BOT,{yPercent:-4,rotation:1.5,duration:0.5,ease:'sine.out'},0)                 // whole icon lifts & tips
     .to(EYE,{scaleY:0.66,yPercent:-7,duration:1.1,ease:'sine.inOut'})
     .to(GRP,{rotation:2.5,duration:0.55,ease:'sine.inOut'},'<')                         // gentle counter-sway
     .to(BOT,{rotation:-1.5,duration:0.55,ease:'sine.inOut'},'<')
     .to(EYE,{scaleY:1,yPercent:0,duration:0.4,ease:'power2.out'})
     .to(GRP,{yPercent:0,rotation:0,duration:0.5,ease:'elastic.out(1,0.6)'},'<')
     .to(BOT,{yPercent:0,rotation:0,duration:0.6,ease:'elastic.out(1,0.5)'},'<'); }); }

  async function excited(){ return P(t=>{
     t.to(GRP,{scaleY:0.88,scaleX:1.08,yPercent:4,duration:0.12,ease:'power2.out'})    // anticipation crouch
      .to(EYE,{scaleY:1.18,duration:0.12,ease:'power2.out'},'<')
      .to(BOT,{yPercent:3,duration:0.12,ease:'power2.out'},'<');
     for(let k=0;k<3;k++){
       const tip=(k%2?1:-1)*2;
       t.to(GRP,{yPercent:-26,scaleY:1.08,scaleX:0.94,duration:0.17,ease:'power3.out'})  // pop up, stretch
        .to(BOT,{yPercent:-7,rotation:tip,duration:0.17,ease:'power3.out'},'<')          // whole icon hops & tilts
        .to(GRP,{yPercent:0,scaleY:0.9,scaleX:1.07,duration:0.13,ease:'power2.in'})      // fast down
        .to(BOT,{yPercent:0,duration:0.13,ease:'power2.in'},'<')
        .to(GRP,{scaleY:1,scaleX:1,duration:0.12,ease:'back.out(3)'});                   // squash → snap
     }
     t.to(EYE,{scaleY:1,duration:0.16,ease:'power2.out'})
      .to(BOT,{rotation:0,duration:0.4,ease:'elastic.out(1,0.5)'},'<'); }); }

  async function thinking(){ return P(t=>{ t.to(EYE,{xPercent:32,yPercent:-16,scaleY:0.9,duration:0.5,ease:'power2.inOut'},0)
     .to(GRP,{rotation:5,xPercent:3,duration:0.55,ease:'power2.inOut'},0)
     .to(BOT,{rotation:3,xPercent:4,yPercent:-2,duration:0.6,ease:'power2.inOut'},0)        // whole icon leans into the thought
     .to(EYE,{xPercent:38,yPercent:-10,duration:0.7,ease:'sine.inOut'})
     .to(EYE,{xPercent:32,yPercent:-16,duration:0.6,ease:'sine.inOut'})
     .to(EYE,{xPercent:0,yPercent:0,scaleY:1,duration:0.45,ease:'power2.out'})
     .to(GRP,{rotation:0,xPercent:0,duration:0.55,ease:'elastic.out(1,0.7)'},'<')
     .to(BOT,{rotation:0,xPercent:0,yPercent:0,duration:0.6,ease:'elastic.out(1,0.6)'},'<'); }); }

  async function sad(){ return P(t=>{ t.to(EYE,{yPercent:20,scaleY:0.78,duration:0.55,ease:'power2.out'},0)
     .to(GRP,{yPercent:6,rotation:-3,duration:0.6,ease:'power2.out'},0)
     .to(BOT,{yPercent:4,rotation:-2,duration:0.75,ease:'power2.out'},0)              // whole icon slumps & droops
     .to({},{duration:0.8})
     .to(EYE,{yPercent:0,scaleY:1,duration:0.5,ease:'power2.inOut'})
     .to(GRP,{yPercent:0,rotation:0,duration:0.6,ease:'power2.inOut'},'<')
     .to(BOT,{yPercent:0,rotation:0,duration:0.7,ease:'power2.inOut'},'<'); }); }

  async function sleep(){ return P(t=>{ t.to(EYE,{yPercent:22,scaleY:0.08,duration:0.55,ease:'power2.inOut'},0)
     .to(GRP,{yPercent:5,rotation:2,duration:0.6,ease:'sine.inOut'},0)
     .to(BOT,{yPercent:3,rotation:1.5,duration:0.7,ease:'sine.inOut'},0)               // whole icon sinks to sleep
     .to(GRP,{yPercent:2,duration:1.1,ease:'sine.inOut',yoyo:true,repeat:1})
     .to(BOT,{yPercent:5,rotation:2.5,duration:1.1,ease:'sine.inOut',yoyo:true,repeat:1},'<')   // slow breathing sway
     .to(EYE,{yPercent:0,scaleY:1,duration:0.45,ease:'back.out(1.8)'})
     .to(GRP,{yPercent:0,rotation:0,duration:0.5,ease:'power2.out'},'<')
     .to(BOT,{yPercent:0,rotation:0,duration:0.55,ease:'power2.out'},'<'); }); }

  async function wave(){ return P(t=>{ t.to(GRP,{rotation:8,xPercent:3,duration:0.18,ease:'sine.inOut'}).to(BOT,{rotation:2,xPercent:2,duration:0.18,ease:'sine.inOut'},'<');
     for(let k=0;k<2;k++){ t.to(GRP,{rotation:-8,xPercent:-3,duration:0.28,ease:'sine.inOut'}).to(BOT,{rotation:-2,xPercent:-2,duration:0.28,ease:'sine.inOut'},'<').to(GRP,{rotation:8,xPercent:3,duration:0.28,ease:'sine.inOut'}).to(BOT,{rotation:2,xPercent:2,duration:0.28,ease:'sine.inOut'},'<'); }
     t.to(GRP,{rotation:0,xPercent:0,duration:0.34,ease:'power2.out'}).to(BOT,{rotation:0,xPercent:0,duration:0.34,ease:'power2.out'},'<'); }); }

  async function look(){ const seq=[[34,-16,4,-3],[-38,8,-5,1],[14,26,2,4],[0,0,0,0]]; return P(t=>{ seq.forEach(([ex,ey,gx,gy])=>{ t.to(EYE,{xPercent:ex,yPercent:ey,duration:0.38,ease:'back.out(2)'}).to(GRP,{xPercent:gx,yPercent:gy,duration:0.45,ease:'power2.out'},'<').to(BOT,{xPercent:gx*0.7,yPercent:gy*0.6,rotation:gx*0.35,duration:0.5,ease:'power2.out'},'<').to({},{duration:0.32}); }); }); }

  async function yes(){ return P(t=>{
     t.to(GRP,{yPercent:-6,duration:0.12,ease:'power2.out'})                 // start up
      .to(BOT,{yPercent:-3,duration:0.12,ease:'power2.out'},'<');
     t.to(GRP,{yPercent:7,duration:0.14,ease:'power3.inOut'})                 // down
      .to(EYE,{yPercent:7,duration:0.14,ease:'power3.inOut'},'<')
      .to(BOT,{yPercent:4,duration:0.14,ease:'power3.inOut'},'<')
      .to(GRP,{yPercent:-6,duration:0.16,ease:'power3.inOut'})               // up
      .to(EYE,{yPercent:-6,duration:0.16,ease:'power3.inOut'},'<')
      .to(BOT,{yPercent:-3,duration:0.16,ease:'power3.inOut'},'<')
      .to(GRP,{yPercent:0,duration:0.22,ease:'power2.out'})                 // center (stop)
      .to(EYE,{yPercent:0,duration:0.22,ease:'power2.out'},'<')
      .to(BOT,{yPercent:0,duration:0.3,ease:'elastic.out(1,0.6)'},'<'); }); }

  async function no(){ return P(t=>{
     t.to(GRP,{xPercent:8,duration:0.14,ease:'power3.inOut'})                 // right
      .to(EYE,{xPercent:14,duration:0.14,ease:'power3.inOut'},'<')
      .to(BOT,{xPercent:4,rotation:2,duration:0.14,ease:'power3.inOut'},'<')
      .to(GRP,{xPercent:-8,duration:0.16,ease:'power3.inOut'})               // left
      .to(EYE,{xPercent:-14,duration:0.16,ease:'power3.inOut'},'<')
      .to(BOT,{xPercent:-4,rotation:-2,duration:0.16,ease:'power3.inOut'},'<')
      .to(GRP,{xPercent:8,duration:0.16,ease:'power3.inOut'})                // right
      .to(EYE,{xPercent:14,duration:0.16,ease:'power3.inOut'},'<')
      .to(BOT,{xPercent:4,rotation:2,duration:0.16,ease:'power3.inOut'},'<')
      .to(GRP,{xPercent:0,duration:0.22,ease:'power2.out'})                 // center (stop)
      .to(EYE,{xPercent:0,duration:0.22,ease:'power2.out'},'<')
      .to(BOT,{xPercent:0,rotation:0,duration:0.3,ease:'elastic.out(1,0.6)'},'<'); }); }

  // surprise — sharp recoil back, eyes blow wide, settle
  async function surprise(){ return P(t=>{
     t.to(GRP,{yPercent:-7,scaleX:0.92,scaleY:1.1,duration:0.1,ease:'power3.out'})
      .to(EYE,{scaleY:1.4,scaleX:1.15,duration:0.1,ease:'power3.out'},'<')
      .to(BOT,{yPercent:-5,rotation:-2,duration:0.1,ease:'power3.out'},'<')           // whole icon recoils back
      .to({},{duration:0.34})
      .to(GRP,{yPercent:0,scaleX:1,scaleY:1,duration:0.5,ease:'elastic.out(1,0.55)'})
      .to(EYE,{scaleY:1,scaleX:1,duration:0.4,ease:'power2.out'},'<')
      .to(BOT,{yPercent:0,rotation:0,duration:0.6,ease:'elastic.out(1,0.45)'},'<'); }); }

  // curious — lean in & tilt, eyes widen and study
  async function curious(){ return P(t=>{
     t.to(GRP,{scale:1.07,rotation:-6,xPercent:-2,duration:0.5,ease:'power2.out'},0)
      .to(EYE,{scaleY:1.12,yPercent:-4,duration:0.5,ease:'power2.out'},0)
      .to(BOT,{rotation:-4,xPercent:-3,yPercent:-2,duration:0.55,ease:'power2.out'},0)   // whole icon tilts & leans in
      .to(EYE,{xPercent:10,duration:0.6,ease:'sine.inOut'})
      .to(BOT,{rotation:-2,duration:0.6,ease:'sine.inOut'},'<')
      .to(EYE,{xPercent:-6,duration:0.7,ease:'sine.inOut'})
      .to(BOT,{rotation:-5,duration:0.7,ease:'sine.inOut'},'<')
      .to(EYE,{xPercent:0,duration:0.5,ease:'sine.inOut'})
      .to(GRP,{scale:1,rotation:0,xPercent:0,duration:0.55,ease:'power2.inOut'})
      .to(EYE,{scaleY:1,yPercent:0,duration:0.45,ease:'power2.out'},'<')
      .to(BOT,{rotation:0,xPercent:0,yPercent:0,duration:0.6,ease:'elastic.out(1,0.7)'},'<'); }); }

  // dizzy — eyes roll in a circle while the head wobbles
  async function dizzy(){ return P(t=>{
     const pts=[[14,-8],[18,4],[6,12],[-8,10],[-16,0],[-10,-10],[4,-12],[14,-8],[0,0]];
     t.to(GRP,{rotation:5,duration:0.3,ease:'sine.inOut'},0)
      .to(GRP,{rotation:-5,duration:0.6,ease:'sine.inOut',yoyo:true,repeat:2},0.3)
      .to(BOT,{rotation:3,xPercent:3,duration:0.45,ease:'sine.inOut',yoyo:true,repeat:3},0.3);   // whole icon woozy sway
     pts.forEach(([x,y],i)=> t.to(EYE,{xPercent:x,yPercent:y,scaleY:0.92,duration:0.16,ease:'none'}, i*0.16));
     t.to(EYE,{scaleY:1,duration:0.3,ease:'power2.out'})
      .to(GRP,{rotation:0,duration:0.4,ease:'power2.out'},'<')
      .to(BOT,{rotation:0,xPercent:0,duration:0.5,ease:'elastic.out(1,0.6)'},'<'); }); }

  // laugh — rapid little bounces with squinted eyes
  async function laugh(){ return P(t=>{
     t.to(EYE,{scaleY:0.55,duration:0.14,ease:'power2.out'},0);
     for(let k=0;k<5;k++){ const tip=k%2?2:-2; t.to(GRP,{yPercent:-9,rotation:tip,duration:0.1,ease:'power2.out'}).to(BOT,{yPercent:-4,rotation:tip*0.6,duration:0.1,ease:'power2.out'},'<').to(GRP,{yPercent:0,duration:0.12,ease:'power2.in'}).to(BOT,{yPercent:0,duration:0.12,ease:'power2.in'},'<'); }
     t.to(GRP,{rotation:0,duration:0.2,ease:'power2.out'})
      .to(BOT,{rotation:0,duration:0.3,ease:'elastic.out(1,0.5)'},'<')
      .to(EYE,{scaleY:1,duration:0.28,ease:'power2.out'},'<'); }); }

  // idea — dip, then a bright eureka pop with an eye flash
  async function idea(){ return P(t=>{
     t.to(GRP,{yPercent:4,scale:0.97,duration:0.3,ease:'power2.in'},0)
      .to(EYE,{scaleY:0.7,duration:0.3,ease:'power2.in'},0)
      .to(BOT,{yPercent:2,duration:0.3,ease:'power2.in'},0)
      .to(GRP,{yPercent:-16,scale:1.05,duration:0.22,ease:'back.out(2.4)'})
      .to(EYE,{scaleY:1.3,scaleX:1.1,duration:0.18,ease:'back.out(3)'},'<')
      .to(BOT,{yPercent:-6,rotation:1.5,duration:0.22,ease:'back.out(2.4)'},'<')   // whole icon springs up on the idea
      .to(EYE,{scaleY:1,scaleX:1,duration:0.5,ease:'sine.inOut'},'+=0.15')
      .to(GRP,{yPercent:0,scale:1,duration:0.55,ease:'elastic.out(1,0.6)'},'<')
      .to(BOT,{yPercent:0,rotation:0,duration:0.6,ease:'elastic.out(1,0.5)'},'<'); }); }

  // shy — lean back, look down & away, small sway
  async function shy(){ return P(t=>{
     t.to(GRP,{rotation:7,xPercent:5,scale:0.97,duration:0.5,ease:'power2.out'},0)
      .to(EYE,{xPercent:-12,yPercent:12,scaleY:0.7,duration:0.5,ease:'power2.out'},0)
      .to(BOT,{rotation:4,xPercent:4,yPercent:2,duration:0.55,ease:'power2.out'},0)     // whole icon shrinks back & away
      .to(GRP,{xPercent:3,duration:0.7,ease:'sine.inOut'})
      .to(BOT,{xPercent:2,rotation:5,duration:0.7,ease:'sine.inOut'},'<')
      .to({},{duration:0.4})
      .to(GRP,{rotation:0,xPercent:0,scale:1,duration:0.6,ease:'power2.inOut'})
      .to(EYE,{xPercent:0,yPercent:0,scaleY:1,duration:0.5,ease:'power2.out'},'<')
      .to(BOT,{rotation:0,xPercent:0,yPercent:0,duration:0.6,ease:'power2.inOut'},'<'); }); }

  // determined — eyes narrow into angled brows + a firm shake
  async function determined(){ return P(t=>{
     t.to(eyeL,{scaleY:0.5,rotation:14,duration:0.3,ease:'power2.out'},0)
      .to(eyeR,{scaleY:0.5,rotation:-14,duration:0.3,ease:'power2.out'},0)
      .to(BOT,{yPercent:2,scale:1.03,duration:0.3,ease:'power2.out'},0)              // whole icon sets itself, leans in
      .to(GRP,{xPercent:-3,duration:0.08,ease:'power2.inOut'},'+=0.1').to(BOT,{xPercent:-2,rotation:-1.5,duration:0.08,ease:'power2.inOut'},'<').to(GRP,{xPercent:3,duration:0.12,ease:'power2.inOut'}).to(BOT,{xPercent:2,rotation:1.5,duration:0.12,ease:'power2.inOut'},'<').to(GRP,{xPercent:0,duration:0.12,ease:'power2.inOut'}).to(BOT,{xPercent:0,rotation:0,duration:0.12,ease:'power2.inOut'},'<')
      .to({},{duration:0.4})
      .to([eyeL,eyeR],{scaleY:1,rotation:0,duration:0.4,ease:'power2.out'})
      .to(BOT,{yPercent:0,scale:1,duration:0.4,ease:'power2.out'},'<'); }); }

  // scan — methodical left-to-right sweep, like reading the web for citations
  async function scan(){ return P(t=>{
     t.to(EYE,{xPercent:-22,duration:0.3,ease:'power2.inOut'},0)
      .to(EYE,{scaleX:0.8,duration:0.2,ease:'sine.inOut'},0)
      .to(BOT,{xPercent:-4,rotation:-1.5,duration:0.3,ease:'power2.inOut'},0);          // head tracks the sweep
     for(let k=0;k<2;k++){ t.to(EYE,{xPercent:22,duration:0.7,ease:'power1.inOut'}).to(BOT,{xPercent:4,rotation:1.5,duration:0.7,ease:'power1.inOut'},'<').to(EYE,{xPercent:-22,duration:0.7,ease:'power1.inOut'}).to(BOT,{xPercent:-4,rotation:-1.5,duration:0.7,ease:'power1.inOut'},'<'); }
     t.to(EYE,{xPercent:0,scaleX:1,duration:0.4,ease:'power2.out'})
      .to(BOT,{xPercent:0,rotation:0,duration:0.5,ease:'power2.out'},'<'); }); }

  // spin — a full playful barrel roll
  async function spin(){ return P(t=>{
     t.to(GRP,{yPercent:-8,duration:0.18,ease:'power2.out'})
      .to(BOT,{yPercent:-6,duration:0.18,ease:'power2.out'},'<')                       // whole icon hops into the roll
      .to(GRP,{rotation:360,duration:0.7,ease:'power2.inOut'},'<')
      .to(GRP,{yPercent:0,duration:0.4,ease:'bounce.out'})
      .to(BOT,{yPercent:0,duration:0.4,ease:'bounce.out'},'<')
      .set(GRP,{rotation:0}); }); }

  // celebrate — big jump, mid-air wiggle, happy landing
  async function celebrate(){ return P(t=>{
     t.to(GRP,{scaleY:0.85,scaleX:1.1,yPercent:5,duration:0.14,ease:'power2.out'})
      .to(EYE,{scaleY:0.6,duration:0.14},'<')
      .to(BOT,{yPercent:4,duration:0.14,ease:'power2.out'},'<')
      .to(GRP,{yPercent:-34,scaleY:1.1,scaleX:0.92,duration:0.26,ease:'power3.out'})
      .to(BOT,{yPercent:-16,duration:0.26,ease:'power3.out'},'<')                       // whole icon leaps
      .to(GRP,{rotation:8,duration:0.12,ease:'sine.inOut'},'-=0.12').to(BOT,{rotation:4,duration:0.12,ease:'sine.inOut'},'<').to(GRP,{rotation:-8,duration:0.16,ease:'sine.inOut'}).to(BOT,{rotation:-4,duration:0.16,ease:'sine.inOut'},'<').to(GRP,{rotation:0,duration:0.12,ease:'sine.inOut'}).to(BOT,{rotation:0,duration:0.12,ease:'sine.inOut'},'<')
      .to(GRP,{yPercent:0,scaleY:0.9,scaleX:1.08,duration:0.2,ease:'power2.in'})
      .to(BOT,{yPercent:0,duration:0.2,ease:'power2.in'},'<')
      .to(GRP,{scaleY:1,scaleX:1,duration:0.4,ease:'elastic.out(1,0.5)'})
      .to(EYE,{scaleY:1,duration:0.3,ease:'power2.out'},'<'); }); }

  // peek — slides in from the left edge and bobs to a stop (entrance)
  async function peek(){ return P(t=>{
     gsap.set(GRP,{xPercent:-60,rotation:-8}); gsap.set(BOT,{xPercent:-20});
     t.to(GRP,{xPercent:6,rotation:3,duration:0.5,ease:'power3.out'})
      .to(BOT,{xPercent:3,duration:0.5,ease:'power3.out'},'<')                          // whole icon slides in
      .to(EYE,{xPercent:10,duration:0.5,ease:'power2.out'},'<')
      .to(GRP,{xPercent:0,rotation:0,duration:0.5,ease:'elastic.out(1,0.6)'})
      .to(BOT,{xPercent:0,duration:0.55,ease:'elastic.out(1,0.55)'},'<')
      .to(EYE,{xPercent:0,duration:0.5,ease:'sine.inOut'},'<'); }); }

  /* ═══════════ EMOTION — extra affective range (Plutchik) ═══════════ */
  // proud — chest-out, lean back a touch, calm-confident eyes
  async function proud(){ return P(t=>{
     t.to(GRP,{yPercent:-3,scale:1.045,duration:0.5,ease:'power2.out'},0)
      .to(BOT,{yPercent:-2,rotation:-1.5,duration:0.55,ease:'power2.out'},0)
      .to(EYE,{scaleY:0.8,yPercent:-3,duration:0.5,ease:'power2.out'},0)
      .to({},{duration:0.5})
      .to(GRP,{yPercent:0,scale:1,duration:0.6,ease:'power2.inOut'})
      .to(EYE,{scaleY:1,yPercent:0,duration:0.5,ease:'power2.out'},'<')
      .to(BOT,{yPercent:0,rotation:0,duration:0.6,ease:'power2.inOut'},'<'); }); }
  // relieved — a visible sigh: rise, then exhale-sink with eyes softly closing
  async function relieved(){ return P(t=>{
     t.to(GRP,{yPercent:-5,duration:0.4,ease:'power2.out'},0)
      .to(EYE,{scaleY:0.5,duration:0.4,ease:'power2.out'},0)
      .to(GRP,{yPercent:3,scaleY:0.97,duration:0.7,ease:'power2.inOut'})       // exhale
      .to(BOT,{yPercent:2,duration:0.7,ease:'power2.inOut'},'<')
      .to(EYE,{scaleY:1,duration:0.5,ease:'power2.out'},'<')
      .to(GRP,{yPercent:0,scaleY:1,duration:0.6,ease:'power2.out'})
      .to(BOT,{yPercent:0,duration:0.6,ease:'power2.out'},'<'); }); }
  // nervous — fast little eye darts + a tiny body jitter, then settle
  async function nervous(){ return P(t=>{
     t.to(EYE,{scaleY:1.05,duration:0.2,ease:'power2.out'},0);
     for(let k=0;k<3;k++){ t.to(EYE,{xPercent:k%2?-9:9,duration:0.12,ease:'sine.inOut'}).to(BOT,{xPercent:k%2?-1.5:1.5,duration:0.12,ease:'sine.inOut'},'<'); }
     t.to(EYE,{xPercent:0,scaleY:1,duration:0.3,ease:'power2.out'})
      .to(BOT,{xPercent:0,duration:0.35,ease:'elastic.out(1,0.6)'},'<'); }); }
  // skeptical — one eye narrows, head cocks, a slow side-eye, recover
  async function skeptical(){ return P(t=>{
     t.to(eyeL,{scaleY:0.38,yPercent:2,duration:0.4,ease:'power2.out'},0)
      .to(eyeR,{scaleY:0.95,duration:0.4,ease:'power2.out'},0)
      .to(GRP,{rotation:-5,duration:0.45,ease:'power2.out'},0)
      .to(BOT,{rotation:-3,xPercent:-1,duration:0.5,ease:'power2.out'},0)
      .to([eyeL,eyeR],{xPercent:6,duration:0.6,ease:'sine.inOut'})              // side-eye
      .to({},{duration:0.25})
      .to([eyeL,eyeR],{scaleY:1,yPercent:0,xPercent:0,duration:0.45,ease:'power2.out'})
      .to(GRP,{rotation:0,duration:0.5,ease:'power2.inOut'},'<')
      .to(BOT,{rotation:0,xPercent:0,duration:0.55,ease:'power2.inOut'},'<'); }); }

  /* ═══════════ REACTION — responses to an event ═══════════ */
  // impressed — eyes blow wide, a slow admiring up-nod ("wow")
  async function impressed(){ return P(t=>{
     t.to(EYE,{scaleY:1.25,scaleX:1.08,duration:0.3,ease:'power2.out'},0)
      .to(GRP,{yPercent:-5,duration:0.35,ease:'power2.out'},0)
      .to(BOT,{yPercent:-3,duration:0.4,ease:'power2.out'},0)
      .to({},{duration:0.3})
      .to(GRP,{yPercent:0,duration:0.5,ease:'power2.inOut'})
      .to(BOT,{yPercent:0,duration:0.55,ease:'power2.inOut'},'<')
      .to(EYE,{scaleY:1,scaleX:1,duration:0.45,ease:'power2.out'},'<'); }); }
  // confused — head cocks, eyes go to mismatched heights ("huh?"), recover
  async function confused(){ return P(t=>{
     t.to(GRP,{rotation:8,duration:0.4,ease:'power2.out'},0)
      .to(BOT,{rotation:5,duration:0.45,ease:'power2.out'},0)
      .to(eyeL,{yPercent:-6,scaleY:1.1,duration:0.4,ease:'power2.out'},0)
      .to(eyeR,{yPercent:6,scaleY:0.85,duration:0.4,ease:'power2.out'},0)
      .to({},{duration:0.5})
      .to([eyeL,eyeR],{yPercent:0,scaleY:1,duration:0.45,ease:'power2.out'})
      .to(GRP,{rotation:0,duration:0.5,ease:'power2.inOut'},'<')
      .to(BOT,{rotation:0,duration:0.55,ease:'power2.inOut'},'<'); }); }
  // wink — one eye closes with a little cheeky tilt + bob
  async function wink(){ return P(t=>{
     t.to(eyeR,{scaleY:0.08,duration:0.1,ease:'power2.in'},0)
      .to(GRP,{rotation:-3,yPercent:-2,duration:0.18,ease:'power2.out'},0)
      .to(BOT,{rotation:-1.5,duration:0.2,ease:'power2.out'},0)
      .to({},{duration:0.16})
      .to(eyeR,{scaleY:1,duration:0.16,ease:'power2.out'})
      .to(GRP,{rotation:0,yPercent:0,duration:0.4,ease:'elastic.out(1,0.6)'},'<')
      .to(BOT,{rotation:0,duration:0.45,ease:'elastic.out(1,0.5)'},'<'); }); }

  /* ═══════════ GESTURE — communicative body language ═══════════ */
  // point — directs attention to one side, eyes lead, holds, returns
  async function point(){ return P(t=>{
     t.to(EYE,{xPercent:20,duration:0.4,ease:'back.out(2)'},0)
      .to(GRP,{xPercent:5,rotation:3,duration:0.45,ease:'power2.out'},0)
      .to(BOT,{xPercent:4,rotation:2,duration:0.5,ease:'power2.out'},0)
      .to({},{duration:0.55})
      .to(EYE,{xPercent:0,duration:0.45,ease:'power2.out'})
      .to(GRP,{xPercent:0,rotation:0,duration:0.5,ease:'power2.inOut'},'<')
      .to(BOT,{xPercent:0,rotation:0,duration:0.55,ease:'power2.inOut'},'<'); }); }
  // shrug — quick rise + tilt, eyes up ("dunno"), settle
  async function shrug(){ return P(t=>{
     t.to(GRP,{yPercent:-4,rotation:4,duration:0.32,ease:'power2.out'},0)
      .to(EYE,{yPercent:-7,scaleY:0.85,duration:0.32,ease:'power2.out'},0)
      .to(BOT,{yPercent:-2,rotation:2,duration:0.36,ease:'power2.out'},0)
      .to({},{duration:0.4})
      .to(GRP,{yPercent:0,rotation:0,duration:0.5,ease:'power2.inOut'})
      .to(EYE,{yPercent:0,scaleY:1,duration:0.45,ease:'power2.out'},'<')
      .to(BOT,{yPercent:0,rotation:0,duration:0.55,ease:'power2.inOut'},'<'); }); }
  // listen — leans in, eyes attentive, a slow patient pulse
  async function listen(){ return P(t=>{
     t.to(GRP,{scale:1.03,rotation:-3,duration:0.5,ease:'power2.out'},0)
      .to(BOT,{rotation:-2,yPercent:-1,duration:0.55,ease:'power2.out'},0)
      .to(EYE,{scaleY:1.08,duration:0.5,ease:'power2.out'},0)
      .to(BOT,{scale:1.012,duration:0.7,ease:'sine.inOut',yoyo:true,repeat:1})   // attentive pulse
      .to(GRP,{scale:1,rotation:0,duration:0.5,ease:'power2.inOut'})
      .to(EYE,{scaleY:1,duration:0.45,ease:'power2.out'},'<')
      .to(BOT,{rotation:0,yPercent:0,duration:0.55,ease:'power2.inOut'},'<'); }); }

  /* ═══════════ PROCESS — functional UI / system states ═══════════ */
  // working — "on it": a couple of focused bobs with eyes scanning side to side
  async function working(){ return P(t=>{
     for(let k=0;k<2;k++){
       t.to(GRP,{yPercent:-4,duration:0.34,ease:'sine.inOut'}).to(EYE,{xPercent:k%2?-10:10,duration:0.34,ease:'sine.inOut'},'<').to(BOT,{yPercent:-2,duration:0.34,ease:'sine.inOut'},'<')
        .to(GRP,{yPercent:0,duration:0.34,ease:'sine.inOut'}).to(EYE,{xPercent:0,duration:0.34,ease:'sine.inOut'},'<').to(BOT,{yPercent:0,duration:0.34,ease:'sine.inOut'},'<');
     } }); }
  // found — a satisfying "got it" snap: zoom in, happy squint, confident settle
  async function found(){ return P(t=>{
     t.to(EYE,{scaleY:1.2,duration:0.16,ease:'power2.out'},0)
      .to(GRP,{scale:1.06,yPercent:-3,duration:0.18,ease:'back.out(2.5)'},0)
      .to(BOT,{yPercent:-3,duration:0.2,ease:'back.out(2)'},0)
      .to(EYE,{scaleY:0.6,duration:0.2,ease:'power2.out'})                      // happy squint
      .to(GRP,{scale:1,yPercent:2,duration:0.18,ease:'power2.in'})
      .to(BOT,{yPercent:0,duration:0.2,ease:'power2.in'},'<')
      .to(GRP,{yPercent:0,duration:0.3,ease:'elastic.out(1,0.5)'})
      .to(EYE,{scaleY:1,duration:0.3,ease:'power2.out'},'<'); }); }
  // notfound — searches left/right, then gives up and looks down (empty state)
  async function notfound(){ return P(t=>{
     t.to(EYE,{xPercent:-16,duration:0.4,ease:'power2.inOut'},0).to(BOT,{xPercent:-3,rotation:-1.5,duration:0.4,ease:'power2.inOut'},0)
      .to(EYE,{xPercent:16,duration:0.6,ease:'power2.inOut'}).to(BOT,{xPercent:3,rotation:1.5,duration:0.6,ease:'power2.inOut'},'<')
      .to(EYE,{xPercent:0,yPercent:9,scaleY:0.8,duration:0.5,ease:'power2.out'})  // give up, look down
      .to(GRP,{yPercent:5,duration:0.5,ease:'power2.out'},'<').to(BOT,{xPercent:0,yPercent:3,rotation:0,duration:0.55,ease:'power2.out'},'<')
      .to({},{duration:0.3})
      .to(EYE,{yPercent:0,scaleY:1,duration:0.5,ease:'power2.inOut'})
      .to(GRP,{yPercent:0,duration:0.5,ease:'power2.inOut'},'<').to(BOT,{yPercent:0,duration:0.55,ease:'power2.inOut'},'<'); }); }
  // error — a sharp "oops" shudder with a scale jitter, then recover
  async function error(){ return P(t=>{
     t.to(EYE,{scaleY:1.15,duration:0.1,ease:'power2.out'},0);
     const xs=[-7,7,-5,5,-3,0];
     xs.forEach((x,i)=> t.to(BOT,{xPercent:x,rotation:x*0.4,duration:0.07,ease:'none'}, 0.06+i*0.07)
                         .to(GRP,{xPercent:x*1.4,duration:0.07,ease:'none'}, 0.06+i*0.07));
     t.to(EYE,{scaleY:1,duration:0.3,ease:'power2.out'})
      .to(GRP,{xPercent:0,duration:0.3,ease:'power2.out'},'<')
      .to(BOT,{xPercent:0,rotation:0,duration:0.4,ease:'elastic.out(1,0.6)'},'<'); }); }
  // alert — a "ping!": pops up wide-eyed and bounces back (notification)
  async function alert(){ return P(t=>{
     t.to(BOT,{yPercent:-9,duration:0.14,ease:'power3.out'},0)
      .to(GRP,{scaleX:0.94,scaleY:1.08,duration:0.14,ease:'power3.out'},0)
      .to(EYE,{scaleY:1.3,scaleX:1.1,duration:0.12,ease:'power3.out'},0)
      .to(GRP,{scaleX:1,scaleY:1,duration:0.4,ease:'elastic.out(1,0.5)'})
      .to(BOT,{yPercent:0,duration:0.55,ease:'bounce.out'},'<')
      .to(EYE,{scaleY:1,scaleX:1,duration:0.3,ease:'power2.out'},'-=0.35'); }); }

  return { happy, excited, thinking, sad, sleep, wave, look, yes, no,
           surprise, curious, dizzy, laugh, idea, shy, determined, scan, spin, celebrate, peek,
           proud, relieved, nervous, skeptical, impressed, confused, wink,
           point, shrug, listen, working, found, notfound, error, alert,
           blink };
}

// Categorised roster — grounded in Plutchik's emotion wheel (Emotion/Reaction),
// communicative body-language (Gesture), and the UX system-status pattern
// (Process). Use this to render grouped controls in your app.
export const CATEGORIES = {
  emotion:  { label:'Emotion',  note:'How he feels — affective range',
              items:['happy','excited','celebrate','laugh','proud','relieved','curious','shy','nervous','skeptical','sad','dizzy'] },
  reaction: { label:'Reaction', note:'Responses to an event',
              items:['yes','no','surprise','impressed','confused','wink','idea'] },
  gesture:  { label:'Gesture',  note:'Communicative body language',
              items:['wave','look','point','shrug','listen','peek','spin','determined'] },
  process:  { label:'Process',  note:'Functional UI / system states',
              items:['thinking','scan','working','found','notfound','error','alert','sleep'] },
};

// Per-expression arousal bump — how much each one lifts the blink rate
// afterwards (calming ones go negative). Consumed by the life module.
export const AROUSE = {
  excited:1.5, celebrate:1.6, laugh:1.3, spin:1.2, dizzy:1.4, surprise:1.1, wave:0.7,
  happy:0.7, idea:0.7, peek:0.6, determined:0.6, scan:0.5, look:0.5, curious:0.4, yes:0.4, no:0.4,
  sad:-0.6, sleep:-3, shy:-0.2,
  // expanded set
  proud:0.6, relieved:-0.4, nervous:1.1, skeptical:0.3, impressed:0.9, confused:0.6, wink:0.7,
  point:0.5, shrug:0.3, listen:-0.2, working:0.6, found:1.1, notfound:-0.3, error:1.2, alert:1.3,
  thinking:0.0,   // processing is calm — should not raise the blink rate
};
