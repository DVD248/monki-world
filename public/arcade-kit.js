/** What every arcade picture shares: the 400 × 600 frame, the lettering, and colour mixing
 * for skies that change as you go. */
export const W=400,H=600;
export const SANS="'Avenir Next','Nunito',ui-rounded,'Segoe UI',sans-serif";
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
export const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*Math.min(1,Math.max(0,t))).toString(16).padStart(2,'0')).join('');};
export const along=(stops,v)=>{for(let i=1;i<stops.length;i++)if(v<stops[i][0])return mix(stops[i-1][1],stops[i][1],(v-stops[i-1][0])/(stops[i][0]-stops[i-1][0]));return stops.at(-1)[1];};
export const noise=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
/** Stars that twinkle, for any game that reaches the night. */
export function stars(c,rect,t,alpha,{n=60,drift=0,top=0,bottom=H}={}){
  if(alpha<=0)return;
  for(let i=0;i<n;i++){const x=((noise(i)*W-drift*(.2+noise(i+5)*.3))%W+W)%W,y=top+noise(i+99)*(bottom-top),big=noise(i+7)>.8;c.globalAlpha=alpha*(.5+.5*Math.sin(t*2+i));rect(c,x,y,big?2:1,big?2:1,'#f4efd0');}
  c.globalAlpha=1;
}
