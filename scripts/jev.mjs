// A thin client for TypeSafe's System One API.
//
// Jev is not a text model: you hand it state and typed questions, and it returns
// decisions with a probability distribution over the options. For this project the
// distribution is the measurement — a flat one means the screen is ambiguous.
//
// Official endpoint only. Set JEV_API_KEY in the environment; never read it from a
// file into a transcript, and never post it anywhere but api.typesafe.ai.

const ENDPOINT='https://api.typesafe.ai/v1/systemone';
const MODEL=process.env.JEV_MODEL||'jev-latest';

export const configured=()=>Boolean(process.env.JEV_API_KEY);

/** Shannon entropy of a probability map, normalised to 0..1 against a flat spread.
 * 0 means "obvious", 1 means "no idea" — the same thing confidence reports, kept
 * here so a stubbed run still produces the measurement. */
export function spread(probabilities){
  const values=Object.values(probabilities||{}).filter(p=>p>0);
  if(values.length<2)return 0;
  const total=values.reduce((a,b)=>a+b,0)||1;
  const h=-values.reduce((sum,p)=>sum+(p/total)*Math.log2(p/total),0);
  return h/Math.log2(values.length);
}

/** One request, many questions — System One answers them in a single parallel pass. */
export async function ask(state,questions,{retries=2}={}){
  if(!configured())return stub(questions);
  const body=JSON.stringify({state,model:MODEL,questions});
  for(let attempt=0;attempt<=retries;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(ENDPOINT,{method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.JEV_API_KEY}`},body});
      const text=await response.text();
      if(!response.ok){
        // A bad key or a bad question will not fix itself on a retry.
        if(response.status===401||response.status===403)throw new Error(`Jev rejected the key (${response.status})`);
        if(response.status===400)throw new Error(`Jev rejected the question: ${text.slice(0,200)}`);
        throw new Error(`Jev returned ${response.status}: ${text.slice(0,200)}`);
      }
      return JSON.parse(text);
    }catch(error){
      if(attempt===retries||/rejected the key|rejected the question/.test(error.message))throw error;
      await new Promise(r=>setTimeout(r,400*(attempt+1)));
    }finally{clearTimeout(timer);}
  }
}

/** Without a key the harness still runs end to end, and says so. Every answer is
 * deliberately flat, so a stubbed run reads as "no idea" rather than as a pass. */
function stub(questions){
  const answers={};
  for(const [id,q] of Object.entries(questions)){
    if(q.type==='noul'){answers[id]={type:'noul',noul:0.5};continue;}
    const options=Array.isArray(q.criteria)?q.criteria.map((_,i)=>String(i)):Object.keys(q.criteria||{});
    const probabilities=Object.fromEntries(options.map(o=>[o,1/Math.max(options.length,1)]));
    answers[id]=q.type==='score'
      ? {type:'score',score:(options.length-1)/2,legend:Object.fromEntries(options.map((o,i)=>[String(i),o])),probabilities,confidence:0}
      : {type:'choice',choice:options[0],probabilities,confidence:0};
  }
  return {model:'stub (no JEV_API_KEY set)',answers,usage:{input_tokens:0,output_tokens:0},stubbed:true};
}
