export class Sounds{
  constructor(){this.enabled=localStorage.getItem('monki-sound')==='true';this.context=null;}
  toggle(){this.enabled=!this.enabled;localStorage.setItem('monki-sound',String(this.enabled));if(this.enabled)this.play('pop');return this.enabled;}
  play(kind='pop'){
    if(!this.enabled)return;
    try{this.context ||= new (window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')this.context.resume();const c=this.context,o=c.createOscillator(),g=c.createGain();const tones={pop:[610,900,.06],boop:[190,135,.12],throw:[250,600,.08],gift:[420,840,.22],tap:[270,340,.055]};const[a,b,d]=tones[kind]||tones.tap;o.type='sine';o.frequency.setValueAtTime(a,c.currentTime);o.frequency.exponentialRampToValueAtTime(b,c.currentTime+d);g.gain.setValueAtTime(.035,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d);}catch{/* Silent mode remains playable. */}
  }
}
