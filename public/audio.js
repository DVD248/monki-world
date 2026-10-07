/** A small sound kit: the dogs' petting voices are local clips, while the rest
 * of the world uses short procedural effects. */
const PET_CLIPS={
  pet:{file:'./sounds/pet-short.mp3',offset:.105,duration:.58,gain:1.9,gap:300},
  'pet-long':{file:'./sounds/pet-long.mp3',offset:.13,duration:1.09,gain:1.4,gap:950}
};
const SOUND_PREFERENCE='monki-sound-v2';
export class Sounds{
  constructor(){
    // Begin this sound revision on for both phones, even if an older build left
    // the previous preference muted. A new explicit mute still persists.
    // Storage can be blocked (private modes, strict settings); that must not stop the game.
    try{this.enabled=localStorage.getItem(SOUND_PREFERENCE)!=='false';}catch{this.enabled=true;}
    this.context=null;this.master=null;this.noiseBuffer=null;this.lastPetSound=-Infinity;
    this.petBuffers={};this.petDecodes={};this.petTicket=0;
    this.petBytes=Object.fromEntries(Object.entries(PET_CLIPS).map(([kind,clip])=>[kind,
      fetch(new URL(clip.file,import.meta.url)).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null)]));
    this.unlock=()=>{const c=this.ready();if(!c)return;for(const kind of Object.keys(PET_CLIPS))this.decodePet(c,kind);try{const b=c.createBufferSource();b.buffer=c.createBuffer(1,1,c.sampleRate);b.connect(this.master);b.start();}catch{}};
    // Safari requires audio activation inside a real gesture, before any await.
    for(const event of ['pointerdown','touchend','keydown'])document.addEventListener(event,this.unlock,{capture:true,passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.context?.suspend().catch(()=>{});else if(this.context&&this.enabled)this.ready();});
  }
  toggle(){this.enabled=!this.enabled;try{localStorage.setItem(SOUND_PREFERENCE,String(this.enabled));}catch{/* Still toggles for this visit. */}if(this.enabled){this.unlock();this.play('pop');}else{if(this.master)this.master.gain.value=0;try{if(navigator.audioSession)navigator.audioSession.type='ambient';}catch{}}return this.enabled;}

  ready(){
    if(!this.enabled)return null;
    try{
      // WebKit's playback category supports the iPhone silent switch (iOS 17+).
      // Feature-detect it: older browsers still get normal gesture-unlocked audio.
      try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{/* Use standard Web Audio when unavailable. */}
      this.context ||= new (window.AudioContext||window.webkitAudioContext)();
      if(this.context.state!=='running'&&this.context.state!=='closed')this.context.resume().catch(()=>{});
      if(!this.master){this.master=this.context.createGain();this.master.gain.value=.5;this.master.connect(this.context.destination);}
      this.master.gain.value=.5;
      return this.context;
    }catch{return null;}
  }
  /** One second of white noise, made once and reused for every rustle and thud. */
  noise(c){
    if(!this.noiseBuffer){
      const n=c.sampleRate,buffer=c.createBuffer(1,n,c.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<n;i++)data[i]=Math.random()*2-1;
      this.noiseBuffer=buffer;
    }
    return this.noiseBuffer;
  }
  /** A pitched blip with a short envelope. */
  blip(c,{freq,to=freq,type='sine',dur=.1,peak=.25,at=0,curve='exp'}){
    const t=c.currentTime+at,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    if(to!==freq){
      if(curve==='exp')o.frequency.exponentialRampToValueAtTime(Math.max(1,to),t+dur);
      else o.frequency.linearRampToValueAtTime(Math.max(1,to),t+dur);
    }
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+Math.min(.012,dur*.25));
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+.02);
  }
  /** Filtered noise: paper, fur, thuds, whooshes. */
  hiss(c,{dur=.2,peak=.15,from=2200,to=600,q=.8,at=0,type='bandpass'}){
    const t=c.currentTime+at,src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    src.buffer=this.noise(c);src.loop=true;
    f.type=type;f.Q.value=q;f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(Math.max(60,to),t+dur);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+Math.min(.02,dur*.3));
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(f);f.connect(g);g.connect(this.master);src.start(t);src.stop(t+dur+.02);
  }
  notes(c,list,{type='triangle',step=.085,dur=.16,peak=.2}={}){
    list.forEach((freq,i)=>this.blip(c,{freq,to:freq,type,dur,peak,at:i*step}));
  }
  /** Soft, slightly rubbery double chirp for a pleased dog, rather than a UI beep. */
  petChirp(c){
    const pitch=1+(Math.random()-.5)*.12;
    this.hiss(c,{dur:.12,peak:.035,from:1450,to:560,q:.45});
    this.blip(c,{freq:390*pitch,to:555*pitch,type:'triangle',dur:.105,peak:.085});
    this.blip(c,{freq:525*pitch,to:335*pitch,type:'sine',dur:.15,peak:.11,at:.07});
  }
  decodePet(c,kind){
    if(this.petBuffers[kind])return Promise.resolve(this.petBuffers[kind]);
    return this.petDecodes[kind] ||= this.petBytes[kind].then(bytes=>bytes?c.decodeAudioData(bytes.slice(0)):null)
      .then(buffer=>{if(buffer)this.petBuffers[kind]=buffer;return buffer;}).catch(()=>null);
  }
  playPet(c,kind){
    const clip=PET_CLIPS[kind];
    const start=buffer=>{
      if(!this.enabled||document.hidden||c.state!=='running')return;
      if(!buffer){this.petChirp(c);return;}
      const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;gain.gain.value=clip.gain;
      source.connect(gain);gain.connect(this.master);source.start(c.currentTime,clip.offset,clip.duration);
    };
    if(this.petBuffers[kind]){start(this.petBuffers[kind]);return;}
    const ticket=++this.petTicket;let resolved=false;
    const fallback=setTimeout(()=>{if(resolved||ticket!==this.petTicket)return;resolved=true;start(null);},160);
    this.decodePet(c,kind).then(buffer=>{if(resolved||ticket!==this.petTicket)return;resolved=true;clearTimeout(fallback);start(buffer);});
  }

  play(kind='tap',pitch=1){
    const c=this.ready();if(!c)return;
    if(c.state!=='running'){c.resume().then(()=>{if(c.state==='running'&&this.enabled&&!document.hidden)this.play(kind,pitch);}).catch(()=>{});return;}
    if(PET_CLIPS[kind]){
      const now=performance.now();if(now-this.lastPetSound<PET_CLIPS[kind].gap)return;
      this.lastPetSound=now;this.playPet(c,kind);return;
    }
    // A little wobble so the same sound twice never lands identically.
    const w=(n,amount=.05)=>n*(1+(Math.random()-.5)*amount);
    try{
      switch(kind){
        // --- touching things ---
        case 'tap':   this.blip(c,{freq:w(300),to:w(215),type:'triangle',dur:.055,peak:.16});
                      this.hiss(c,{dur:.045,peak:.05,from:2600,to:900});break;
        case 'pick':  this.blip(c,{freq:w(430),to:w(560),dur:.05,peak:.14});break;
        case 'drop':  this.blip(c,{freq:w(180),to:w(110),type:'sine',dur:.1,peak:.18});
                      this.hiss(c,{dur:.08,peak:.07,from:900,to:200});break;
        case 'paper-land': this.hiss(c,{dur:.09,peak:.065,from:1700,to:450});this.blip(c,{freq:w(120),to:70,type:'sine',dur:.08,peak:.09});break;
        case 'pop':   this.blip(c,{freq:w(680,.14),to:w(1500,.14),dur:.05,peak:.22});
                      this.hiss(c,{dur:.03,peak:.08,from:4000,to:1500});break;
        case 'bubble':this.blip(c,{freq:w(440,.2),to:w(800,.2),type:'sine',dur:.11,peak:.09});break;
        case 'sweep':this.hiss(c,{dur:.22,peak:.09,from:2100,to:600,q:.35});break;
        case 'tidy':this.notes(c,[660,880,1320],{step:.055,dur:.19,peak:.09});this.hiss(c,{dur:.18,peak:.025,from:4000,to:1800,q:.2});break;
        case 'miss':this.blip(c,{freq:180,to:90,type:'triangle',dur:.15,peak:.12});this.hiss(c,{dur:.08,peak:.06,from:900,to:240});break;
        case 'basket':this.hiss(c,{dur:.13,peak:.09,from:1700,to:600});this.notes(c,[660,990],{step:.045,dur:.12,peak:.08});break;
        case 'boop':  this.blip(c,{freq:w(210),to:w(120),type:'square',dur:.13,peak:.13});break;
        case 'throw': this.hiss(c,{dur:.22,peak:.11,from:w(1900),to:420,q:.6});break;

        // --- the residents, each with their own voice ---
        case 'sernik':this.blip(c,{freq:w(880,.12),to:w(1250,.12),type:'triangle',dur:.05,peak:.17});
                      this.blip(c,{freq:w(1150,.12),to:w(680,.12),type:'triangle',dur:.07,peak:.15,at:.06});break;
        case 'galgan':this.blip(c,{freq:w(250,.1),to:w(150,.1),type:'sawtooth',dur:.11,peak:.15});
                      this.hiss(c,{dur:.1,peak:.06,from:700,to:220});break;
        case 'monki': this.blip(c,{freq:w(430,.1),to:w(600,.1),type:'triangle',dur:.09,peak:.16});
                      this.blip(c,{freq:w(600,.1),to:w(450,.1),type:'triangle',dur:.1,peak:.13,at:.085});break;
        // A small "mi-aow": up, then a longer fall.
        case 'kot':   this.blip(c,{freq:w(620,.1),to:w(1040,.1),type:'triangle',dur:.08,peak:.13});
                      this.blip(c,{freq:w(1080,.1),to:w(560,.1),type:'sine',dur:.2,peak:.14,at:.07});break;
        // Someone at the door: two knocks.
        case 'knock': this.blip(c,{freq:190,to:110,type:'triangle',dur:.07,peak:.2});this.blip(c,{freq:190,to:110,type:'triangle',dur:.07,peak:.2,at:.16});break;
        case 'david':
        case 'julia': this.blip(c,{freq:kind==='julia'?w(520):w(360),to:kind==='julia'?w(430):w(300),type:'sine',dur:.08,peak:.12});break;

        // --- objects ---
        case 'paper': this.hiss(c,{dur:.34,peak:.12,from:w(5200),to:1400,q:.5});
                      this.hiss(c,{dur:.5,peak:.08,from:3000,to:900,q:.4,at:.12});break;
        case 'wood':  this.blip(c,{freq:w(160),to:w(95),type:'triangle',dur:.12,peak:.16});break;

        // --- progress ---
        case 'step':  this.blip(c,{freq:w(784),to:w(784),type:'triangle',dur:.14,peak:.16});break;
        case 'gift':  this.notes(c,[523,659,784],{dur:.15,peak:.15});break;
        case 'win':   this.notes(c,[523,659,784,1047],{step:.1,dur:.26,peak:.16});
                      this.hiss(c,{dur:.5,peak:.05,from:5000,to:2000,q:.3,at:.1});break;
        // --- the arcade; `pitch` climbs with a streak ---
        case 'boing': this.blip(c,{freq:w(260*pitch),to:w(560*pitch),type:'sine',dur:.13,peak:.13});break;
        case 'spring':this.blip(c,{freq:w(200),to:w(980),type:'triangle',dur:.26,peak:.14});this.blip(c,{freq:w(420),to:w(1300),type:'sine',dur:.2,peak:.07,at:.05});break;
        case 'crack': this.hiss(c,{dur:.13,peak:.1,from:2200,to:300,q:.6});this.blip(c,{freq:w(150),to:70,type:'square',dur:.09,peak:.08});break;
        case 'poof':  this.hiss(c,{dur:.18,peak:.09,from:3200,to:900,q:.4});break;
        case 'whoosh':this.hiss(c,{dur:.55,peak:.1,from:500,to:3200,q:.5});this.notes(c,[523,659,784,1047],{step:.07,dur:.12,peak:.06});break;
        case 'bonk':  this.blip(c,{freq:w(420),to:110,type:'square',dur:.15,peak:.11});break;
        case 'chomp': this.hiss(c,{dur:.05,peak:.07,from:2600,to:900});this.blip(c,{freq:w(520*pitch),to:w(390*pitch),type:'triangle',dur:.07,peak:.14});break;
        case 'yuck':  this.blip(c,{freq:w(230),to:140,type:'sawtooth',dur:.18,peak:.1});this.blip(c,{freq:w(190),to:110,type:'sawtooth',dur:.2,peak:.08,at:.12});break;
        case 'splat': this.hiss(c,{dur:.15,peak:.1,from:1300,to:200,q:.5});this.blip(c,{freq:w(150),to:60,type:'sine',dur:.12,peak:.12});break;
        case 'fall':  this.blip(c,{freq:900,to:170,type:'sine',dur:.7,peak:.11});break;
        case 'best':  this.notes(c,[659*pitch,784*pitch,988*pitch,1319*pitch],{step:.075,dur:.16,peak:.12});break;
        case 'zone':  this.notes(c,[523,784],{step:.08,dur:.2,peak:.1});break;
        // --- the later arcade games ---
        case 'jet':   this.hiss(c,{dur:.16,peak:.07,from:w(700),to:2600,q:.6});this.blip(c,{freq:w(150),to:w(220),type:'triangle',dur:.08,peak:.06});break;
        case 'point': this.blip(c,{freq:w(880*pitch),to:w(1180*pitch),type:'sine',dur:.07,peak:.1});break;
        case 'splash':this.hiss(c,{dur:.38,peak:.12,from:1900,to:300,q:.4});this.blip(c,{freq:w(320),to:110,type:'sine',dur:.16,peak:.1});break;
        case 'land':  this.blip(c,{freq:w(150),to:80,type:'sine',dur:.1,peak:.15});this.hiss(c,{dur:.05,peak:.05,from:1200,to:400});break;
        case 'charge':this.blip(c,{freq:w(220),to:w(330),type:'triangle',dur:.12,peak:.07});break;
        case 'peep':  this.blip(c,{freq:w(1500*pitch,.08),to:w(1900*pitch,.08),type:'sine',dur:.05,peak:.07});this.blip(c,{freq:w(1650*pitch,.08),to:w(2100*pitch,.08),type:'sine',dur:.05,peak:.06,at:.07});break;
        case 'tick':  this.blip(c,{freq:w(440*pitch,.02),to:w(470*pitch,.02),type:'triangle',dur:.035,peak:.05});break;
        case 'match': this.blip(c,{freq:w(520*pitch),to:w(780*pitch),type:'triangle',dur:.09,peak:.13});this.hiss(c,{dur:.06,peak:.04,from:3000,to:1400});break;
        case 'shuffle':this.hiss(c,{dur:.4,peak:.08,from:600,to:3000,q:.5});break;
        case 'fuel':  this.notes(c,[587,880,1175],{step:.06,dur:.14,peak:.11});break;
        case 'rev':   this.blip(c,{freq:w(70*pitch),to:w(120*pitch),type:'sawtooth',dur:.22,peak:.05});break;
        default:      this.blip(c,{freq:w(300),to:w(240),dur:.05,peak:.14});
      }
    }catch{/* A silent game is still a playable game. */}
  }
}
