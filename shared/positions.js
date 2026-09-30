// Only repair virtually identical anchors. Visual overlap and close cuddles are
// intentional arrangements, not collisions to push apart.
export function separateResidents(state,moved=null){
  const placed=[];
  const entries=Object.entries(state.actors).sort(([a],[b])=>a===moved?1:b===moved?-1:a<b?-1:1);
  for(const [id,a]of entries){
    const clear=(x,y)=>placed.every(b=>b.room!==a.room||Math.hypot(x-b.x,y-b.y)>=4);
    if(!clear(a.x,a.y)){
      const candidates=[];
      for(let y=Math.max(171,a.y-16);y<=Math.min(314,a.y+16);y+=4)for(let x=Math.max(35,a.x-16);x<=Math.min(365,a.x+16);x+=4)if(clear(x,y))candidates.push({x,y,d:(x-a.x)**2+(y-a.y)**2});
      candidates.sort((a,b)=>a.d-b.d||a.y-b.y||a.x-b.x);
      if(candidates.length){a.x=candidates[0].x;a.y=candidates[0].y;}
    }
    placed.push(a);
  }
  return state;
}
