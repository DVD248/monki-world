export const FRIDGE_INGREDIENTS=['icecream','potato','fish','carrot'];
const recipes={
  'icecream+potato':'snowflake','fish+icecream':'duck','carrot+icecream':'donut',
  'fish+potato':'mushroom','carrot+potato':'pizza','carrot+fish':'shell',
};
export function fridgeRecipe(ingredients){
  if(!Array.isArray(ingredients)||ingredients.length!==2||new Set(ingredients).size!==2||ingredients.some(i=>!FRIDGE_INGREDIENTS.includes(i)))throw new Error('Choose two different things.');
  return recipes[[...ingredients].sort().join('+')];
}
