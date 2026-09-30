// Export the actual game sprite, not a second interpretation of Monki.
import puppeteer from 'puppeteer';
import {readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
const art=await readFile(new URL('../public/art.js',import.meta.url),'utf8');
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||(existsSync(chrome)?chrome:puppeteer.executablePath()),headless:true});
try{
  const page=await browser.newPage();
  const exports=await page.evaluate(async art=>{
    const {character}=await import('data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(art))));
    const c=document.createElement('canvas');c.width=c.height=64;
    const ctx=c.getContext('2d');character(ctx,'monki',32,54,{shadow:false,frame:0});
    const pixels=ctx.getImageData(0,0,64,64).data;
    let x0=64,y0=64,x1=0,y1=0;
    for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    const w=x1-x0+1,h=y1-y0+1,size=Math.max(w,h)+6,left=Math.floor((size-w)/2),top=Math.floor((size-h)/2),rects=[];
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const i=(y*64+x)*4;if(!pixels[i+3])continue;
      rects.push(`<rect x="${x-x0+left}" y="${y-y0+top}" width="1" height="1" fill="rgb(${pixels[i]},${pixels[i+1]},${pixels[i+2]})"/>`);
    }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Monki">${rects.join('')}</svg>\n`;
    const png={};for(const outputSize of [180,192,512]){
      const target=document.createElement('canvas');target.width=target.height=outputSize;
      const t=target.getContext('2d');t.imageSmoothingEnabled=false;
      t.drawImage(c,x0,y0,w,h,left/size*outputSize,top/size*outputSize,w/size*outputSize,h/size*outputSize);
      png[outputSize]=target.toDataURL('image/png').split(',')[1];
    }
    return {svg,png};
  },art);
  await writeFile(new URL('../public/icon.svg',import.meta.url),exports.svg);
  for(const [size,data]of Object.entries(exports.png))await writeFile(new URL(`../public/icon-${size}.png`,import.meta.url),Buffer.from(data,'base64'));
}finally{await browser.close();}
