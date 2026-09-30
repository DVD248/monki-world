// Central European civil time, including summer time, independent of device zone.
export const CLOCK_ZONE='Europe/Warsaw';
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:CLOCK_ZONE,year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function mix(a,b,t){const parse=s=>s.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16));const x=parse(a),y=parse(b);return '#'+x.map((n,i)=>Math.round(n+(y[i]-n)*clamp(t)).toString(16).padStart(2,'0')).join('');}
export function centralTime(now=Date.now()){
  const p=Object.fromEntries(formatter.formatToParts(new Date(now)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  const local=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second),offset=Math.round((local-Math.floor(now/1000)*1000)/3600000);
  return {...p,offset,zone:offset===2?'CEST':'CET',decimal:p.hour+p.minute/60+p.second/3600,label:`${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')} ${offset===2?'CEST':'CET'}`};
}
export function ambienceAt(now=Date.now(),override=null){
  const time=centralTime(now),day=(Date.UTC(time.year,time.month-1,time.day)-Date.UTC(time.year,0,0))/86400000;
  // An artistic seasonal daylight envelope, not a forecast or exact sunrise table.
  const hours=12+4.3*Math.sin((day-80)/365.25*Math.PI*2),noon=12+(time.offset-1),rise=noon-hours/2,set=noon+hours/2;
  const h=Number.isFinite(override)?override:override==='night'?0:override==='day'?noon:time.decimal;
  const light=Math.min(smooth((h-rise+1)/1.5),smooth((set+1-h)/1.5));
  const edge=Math.min(Math.abs(h-rise),Math.abs(h-set)),warm=smooth(1-edge/1.8)*light;
  const progress=clamp((h-rise)/(set-rise));
  const period=light<.12?'night':h<rise+.8?'dawn':h<noon-1.5?'morning':h<noon+1.5?'midday':h<set-.8?'afternoon':'dusk';
  return {time,period,light,warm,progress,night:light<.25,sky:mix(mix('#28354f','#bfdad8',light),'#e5baa0',warm*.7),ground:mix('#687572','#c0d29f',light),sun:{x:50+300*progress,y:103-Math.sin(progress*Math.PI)*85},rise,set};
}
