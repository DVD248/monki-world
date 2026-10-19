// The server's clock, set by a test. scripts/test-sync.mjs starts server.mjs with
// `--import` of this file and sends {clock: ms} over IPC whenever it moves time on; the server
// then reads that time (and runs on from it) and answers with the same message, so days can
// pass between two phones in seconds. Nothing else in the server knows.
const Real=Date;let offset=0;
class TestDate extends Real{
  constructor(...a){if(a.length)super(...a);else super(Real.now()+offset);}
  static now(){return Real.now()+offset;}
}
globalThis.Date=TestDate;
process.on('message',m=>{if(m&&Number.isFinite(m.clock)){offset=m.clock-Real.now();process.send?.({clock:m.clock});}});
