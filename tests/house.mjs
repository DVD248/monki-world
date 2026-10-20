// A house with everybody already moved in. A new world starts with Monki alone (see ARRIVALS
// in shared/world.js); most tests are about what happens once the whole household is there.
import {createWorld,moveEveryoneIn} from '../shared/world.js';
export const fullHouse=(...args)=>moveEveryoneIn(createWorld(...args));
