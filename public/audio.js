/** A small procedural sound kit. Every sound is built from a couple of oscillators
 * and one noise buffer, so the whole game stays a folder of text with nothing to
 * download. Repeats are detuned slightly so tapping the same dog twice does not
 * sound like a machine. */
export class Sounds{
  constructor(){
    this.enabled=localStorage.getItem('monki-sound')!=='false';
    this.context=null;this.master=null;this.noiseBuffer=null;
  }
  toggle(){this.enabled=!this.enabled;localStorage.setItem('monki-sound',String(this.enabled));if(this.enabled)this.play('pop');return this.enabled;}

  ready(){
    if(!this.enabled)return null;
    try{
      this.context ||= new (window.AudioContext||window.webkitAudioContext)();
      if(this.context.state==='suspended')this.context.resume();
      if(!this.master){this.master=this.context.createGain();this.master.gain.value=.5;this.master.connect(this.context.destination);}
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

  play(kind='tap'){
    const c=this.ready();if(!c)return;
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
        case 'pop':   this.blip(c,{freq:w(680,.14),to:w(1500,.14),dur:.05,peak:.22});
                      this.hiss(c,{dur:.03,peak:.08,from:4000,to:1500});break;
        case 'boop':  this.blip(c,{freq:w(210),to:w(120),type:'square',dur:.13,peak:.13});break;
        case 'throw': this.hiss(c,{dur:.22,peak:.11,from:w(1900),to:420,q:.6});break;

        // --- the residents, each with their own voice ---
        case 'sernik':this.blip(c,{freq:w(880,.12),to:w(1250,.12),type:'triangle',dur:.05,peak:.17});
                      this.blip(c,{freq:w(1150,.12),to:w(680,.12),type:'triangle',dur:.07,peak:.15,at:.06});break;
        case 'galgan':this.blip(c,{freq:w(250,.1),to:w(150,.1),type:'sawtooth',dur:.11,peak:.15});
                      this.hiss(c,{dur:.1,peak:.06,from:700,to:220});break;
        case 'monki': this.blip(c,{freq:w(430,.1),to:w(600,.1),type:'triangle',dur:.09,peak:.16});
                      this.blip(c,{freq:w(600,.1),to:w(450,.1),type:'triangle',dur:.1,peak:.13,at:.085});break;
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
        default:      this.blip(c,{freq:w(300),to:w(240),dur:.05,peak:.14});
      }
    }catch{/* A silent game is still a playable game. */}
  }
}
