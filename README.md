# monki world

A shared place for David, Julia, Monki, Sernik and Galgan. No feeding duties, punishment or streaks.

## Play

Double-click **Start Monki World.command**, or run `npm start` in this folder. Open http://localhost:4173.

Node.js 20+ is required. There are no production dependencies to install.

For two phones, keep this Mac and server running on the same Wi-Fi. Choose yourself, then use **Us two → Invite**. Use **Settings → Continue on my phone** to move your own seat to another device. Invitation and transfer links are private keys: keep them between you two.

## This version

- **Room-first adventures:** choosing a person opens the shared place, with a situation already happening in it. A normal encounter is one short interaction and returns directly to the room; there is no mandatory three-part sequence or ending popup. The three authored segments per adventure remain available in the isolated test lab.
- **14 mechanics:** pop, wipe, dress, feed, catch, pull, find, steer, aim, follow a path, sort, stack, match and repeat a short pattern.
- Six passes through the collection: original, wind, bubbles, bouncy, giant and night. This gives **144 scheduled incidents / 432 testable segment variations**, not 144 entirely different stories.
- One new incident becomes available 20 hours after the previous one. Progress is shared: once either person resolves an incident, both phones see its aftermath and move on. Older separate-counter saves migrate to the furthest completed chapter. Nothing expires. Completed adventures can be replayed immediately through **Moments** or **Revisit**, without changing shared progression.
- **Us two → Choose their next adventure** lets one player leave a situation for the other. An invitation arriving during a game does not discard that game's completion.
- **Toilet-paper fetch:** pick up the actual roll from the bottom dock, carry it with your finger, then flick and release. Momentum uses the last 90 ms of finger movement, so direction and speed matter consistently across input rates. Pausing before release gently drops it. Gravity, a soft bounce, floor friction, centered rotation and a ground shadow replace the fixed eased path. Sernik reaches the landed roll before picking it up, carries it beside his muzzle to the original dock slot, then walks back to his saved spot. The roll's icon stays absent until deposited. No invisible launch point, wrapping or floor trails. The retired decorative ball is archived, not left on the floor.
- **Bubbles:** drag the wand out of the dock and place it in the room. It stays there. Tap the placed wand for small, same-size bubbles in varied directions; drag from it to aim and grow a larger bubble, then release. Small bubbles pop on contact with residents; only bubbles big enough to enclose their sprite can carry them. The wand gets touch priority, so rapid taps cannot accidentally pop freshly blown bubbles. Manual popping has a 0.65-second grace period. The 18-bubble cap and chained pops safely release every captured resident. Use **×** to put the wand away before placing it elsewhere.
- **Bubbles now float:** release gives a short directional puff, then drag fades into buoyancy and a small side-to-side drift. A dragged bubble grows while still attached to the wand ring; its release speed depends on the gesture. Small taps stay small and float upward instead of shooting across the room.
- **Live shared decorating:** open **Residents → Decorate** to keep the room visible while changing it. A new house starts with a sofa, lamp and dog bowl; each first-pass adventure reveals furniture, a finish or a surface, and later passes occasionally reveal more colours through the final season. A short completion notice names the new options. A **NEW** mark stays on Residents until you view Add or Surfaces, and newly unlocked options lead those trays; this works when your partner finished the adventure too. Existing rooms keep every piece and colour they already chose. Tap a piece in the room or the **In place** tray to refinish, store or remove it; drag to reposition it. **Put away** restores stored pieces by tapping their new spot. Adventure keepsakes, including the kite, can be tapped directly, put away and shown again without losing the adventure. **Surfaces** shows actual crops from the room renderer, including walls, floors, garden, roof and cellar, so previews match what appears in the place. Everything saves to the shared world. There are no decoration coins or chores.
- **A room that carries on:** residents stay where you put them most of the time. At irregular intervals averaging roughly a minute, one silent, contextual scene may play: the dogs reach the bowl at once, David and Julia awkwardly try to pass, Monki performs for two unimpressed dogs, or Sernik repeatedly blocks Julia's path to the bowl. The cast returns to its saved positions afterward. A resident can also notice furniture or a surface changed by either player, and repeated pokes may provoke a response. Scenes avoid recent repeats and stop for touching, decorating, toys, tidying, adventures and menus. There is no constant random wandering, chore or activity-log spam.
- **Put things away:** tap the active paper button again or use **×** beside the toy instruction for either toy. This cancels throws and releases captured residents. **Tidy** gets all five residents sweeping and moving objects together; Monki borrows the bowl as a hat. The 3.2-second animation puts every piece back where it was arranged in **Decorate** (a stray drag or a dog moving it does not count; starter pieces nobody arranged go back to their original spots) and stores loose objects, without losing gifts, drawings or letters. Only the room being tidied is touched: paper left in the garden for a visitor stays there. Local helpers return to their saved spots; visiting helpers walk out and remain in their original rooms. The operation is saved before the animation, so leaving early is safe. Reduced motion uses a brief transition.
- **Pet both dogs directly in the room:** short back-and-forth strokes make them flop belly-up, with a flat tummy, stubby paws and a tiny two-frame wiggle. Pull farther away to pick them up; a stroke can always become a drag, with no timing trick and no accidental saved pet. A stationary hold opens options. The larger **Pet** pad, keyboard and button petting are also available. No care meter or obligation.
- **Poking and options are separate:** tap a resident to poke it. Open **Residents** in the dock and choose a named portrait for its menu; there is no floating three-dot button. Rapid pokes still annoy them. Sleeping dogs tuck their paws and rest on their side, distinct from belly-up petting. Hats follow the head in every pose. Picked-up residents dangle and wiggle, then settle with a short landing squash. The lamp's light follows its moving position too.
- **Fitted accessories:** sunglasses cover the eyes instead of sitting above the head; headphone bands fit each head and their cups sit beside the ears. Bows and flowers attach at the side, while hats use their actual brim/base instead of the inventory sprite's generic origin. Face accessories rotate with belly-up dogs, and all accessories follow sleeping, flipped and carried poses. Julia's normal glasses are replaced, not doubled, when wearing sunglasses. Helmet artwork ends at its brim so it does not cover the eyes.
- **Freezer experiments:** tap the fridge, or choose **Residents → Open the fridge**. Combine two of four ingredients to discover six wearable results. Try the result on, or leave it for the other person to find on their phone. One persistent batch prevents overwriting an uncollected experiment; recipient reservations and stale-batch checks keep simultaneous actions safe. The older delayed potato secret is retained.
- **The arcade:** a small cabinet stands left of the window; **Residents → Play a game** opens it too. Eight endless games after Pou's, open any time for as long as you like. **Sky Jump**: slide your finger and Monki follows, bouncing up clouds from the garden, past the roof, through the birds, the evening and the night to the moon at 1,000 m. **Food Drop**: slide Sernik under the falling food; a dropped snack, an eaten frog or an eaten traffic cone costs one of three hearts, and nothing is lost before the first snack. Both get harder as you go (wider gaps, moving, vanishing and rain clouds, pigeons; faster food, more frogs, swaying drops), then level off at a ceiling a steady player can hold: every next cloud is generated within reach of the last one, and every snack within reach of the one before. `tests/arcade.test.mjs` checks both: a plain bot climbs past 3,000 m with the pigeons left out and past the top of the curve even when it walks into every pigeon, and eats past the plateau. The other six follow the same rule, each with its own file of rules in `shared/` and picture in `public/`: **Hill Drive** (Galgan's car over hills: right half of the screen is the pedal, left the brake; tip him onto his head and it is over, run out of fuel and it rolls to a stop; no hill steeper than the car climbs from a standstill, cans within a tankful), **Jet Monki** (tap to fly between chimneys and storm clouds; each way through within a steady tapper's climb or drop of the last), **Cliff Jump** (hold and let go to leap Sernik from rock to rock; the middle of each is a Perfect, worth more in a row; every leap to a middle clears the near edge), **Water Hop** (tap the lily pad or log for Galgan to hop onto; rows drift, some pads dive, the view rises; no gap wider than a hop), **Fall Down** (slide Monki through the holes as the floors rise, before the roots at the top; holes placed on a time budget a quick finger can always keep) and **Match Tap** (tap three or more snacks the same against the clock; big groups give back more time and seven leave a star that clears its row and column; a shelf with nothing to tap is shaken for free). `tests/arcade-games.test.mjs` plays each with bots: steady ones go on at the top of the curve, slower ones are caught there. The test lab lists every game from every stage. The sofa is a spring, balloons lift Monki, coming down onto a pigeon is a bounce and jumping up into one knocks Monki back down (a lost bounce, and the end only if no cloud catches him; bouncing on the cloud beneath one never reaches it), and streaks, zone names and a line across the sky for your best and your person's mark the way. No coins, energy or lives to refill. A new personal best of at least 25 m or 15 snacks reaches the other phone as one line on their card ("David got Monki 231 metres up in Sky Jump.", "Julia beat David at Food Drop: 84 snacks."), with **Ha!**; the log keeps only the latest best per game. A best counts the moment it happens, including when you leave part-way or the phone locks mid-run. The room holds still under the game and carries on afterwards. `npm run test:arcade` plays every game by finger in a real browser, including a best reaching a second phone.
- **Cleanup payoff:** dust gathers into a little pile, furniture settles in staggered order, and a short shine/sound marks the finish before helpers return. These are visual effects; saved objects and gifts remain safe.
- **Gentle difficulty progression:** three introductory stories, then bounded increases in movement, accuracy and memory. Ice cream and other food must actually be aimed and thrown. The aiming preview matches a gravity-driven flight; misses bounce and settle, while basket and dog hits visibly react. Several misses soften precision challenges. No timers or lives.
- **Physical towers:** the magnet, doughnut and mushroom incidents now feature the stacking game in normal play. Tap to release a moving piece. It falls with gravity and sideways momentum onto the existing tower; support and centre of mass decide whether it settles, wobbles or tips. Early towers need four pieces; later ones grow to five or six. An off-centre piece can take the unsupported upper section down while lower pieces stay put. Fallen pieces rotate and bounce; misses gradually ease the next attempts rather than imposing lives or a restart. The test lab still offers every tower variant and segment.
- Memory games use exactly two of each distinct picture. Later rounds grow from three to four pairs; later catching games mix in objects to avoid. Catching objects accelerate, rotate and bounce if missed, and the basket squashes on contact. Quiet dressing endings remain small payoffs between the more involved games.
- **Outdoor places:** the pond, growing patch, little house and telescope each rotate three short situations. All are available whenever their location is open. Their shared aftermath changes the pond passenger, doorstep object or rooftop constellation.
- **A growing patch:** choose one of three seeds. Four visible stages over eight days; no watering, decay or missed harvest. Pick the result to wear or give away, then plant another.
- **Fictional weather:** clear, cloudy, rain, snow and strong wind, shared deterministically across both phones in three-hour periods. Rain has blue-grey tapered drops, wet ground, dark clouds and splashing puddles. Snow has slow drifting flakes, paler ground and caps on fence posts. Wind carries tumbling leaves. Clouds, trees, ripples and laundry move. No weather API or location access. Reduced-motion preferences are respected.
- **Central European ambience:** a clock fixed to Europe/Warsaw (CET/CEST, including daylight-saving changes), independent of the device's time zone. Light shifts smoothly through dawn, midday, dusk and night, with a moving sun, warm evening tint, stars and indoor lamp glow. Seasonal light is an artistic approximation, not a local sunrise forecast.
- **Edge-to-edge phone world:** a compact 58px location bar and one 156px thumb dock replace stacked controls and unused beige space. Portrait uses the available depth, with characters and objects sharing a 1.4× scale and preserving their pixel proportions. The world and adventure canvases render at display resolution (up to 3× device pixel ratio), rather than stretching a low-resolution backing image. The art remains deliberately pixel-drawn. Portrait and landscape layouts respect safe areas; gameplay does not select text or open long-press menus. Editable link/search fields still allow text selection. The roof has visible walls, windows, eaves and a foundation.
- **Redesigned garden:** trees stand behind a correctly proportioned fence; the shed sits on its own pad in front, with a stepping-stone path, framed growing bed and reed-lined pond. Clouds, fence, props and weather do not inherit the stretched portrait depth. Rain and snow cover the entire visible world rather than stopping at the old canvas height.
- **Cozy nights:** muted plum walls, warm wood, a little moon in the window and a small amber pool around the lamp. The light follows the lamp, without a giant cone obscuring the residents. The dock shifts from forest green by day to plum and amber at night.
- **Physical endings:** after a short payoff, the encounter closes back into the place. The reward, outfit, unlocked route or changed prop is visible there; the keepsake picture stays in Moments for anyone who wants to look later.
- **Sound starts enabled**, including on devices that were muted in an older build. If you turn it off now, that choice persists. The first real interaction unlocks audio; returning from a background interruption resumes it. Safari's supported `audioSession.type = 'playback'` is requested to allow sound through silent mode on compatible iOS versions. Older browsers fall back to normal Web Audio; media volume and browser policy still apply. No microphone access or silent looping media workaround is used.
- The icon is the exact normal, full-body in-game Monki sprite, with 180/192/512px home-screen exports. Already-installed iOS shortcuts may need removing and adding again to refresh their icon.
- **Readable phone controls:** 14–17px labels, a filled 48px-tall Play/Open/Look button, and one selection style for locations and toys. An active toy shows its gesture and a clear exit. **Residents** holds named portraits, outfits, drawings, gifts, mailbox, memories, clock, sound and settings; it closes with an outside tap or Escape. Dotted object outlines and the What can I touch button have been removed.
- **Close together, without stranded residents:** toy and cleanup animations release only their own position overrides. Characters may overlap and stand together; only virtually identical anchors (less than four world pixels apart) receive a tiny deterministic nudge. Close arrangements survive reloads and unrelated actions. Furniture, gifts and progress are untouched.
- **Something daft each day:** a new situation with Sernik, Galgan or Monki (55 of them, never the same one twice for the same person in an autumn, taking turns between the three), on show in the room and on the card as soon as it opens. One poke and it is over; untouched, it is gone by the next day, so nothing waits and nothing piles up. The situation is in the house for both of you (the other one sees Galgan in the teacup too), while the caption and the poke belong to the one it is for; your two are never on the same resident. Three rarer visitors still need a setup (paper or flowers in the garden, glasses on the roof) and those do wait to be found. Everything found enters the shared collection and wardrobe.
- **Their first visit:** opening the invitation says who made this and whose dogs these are. A present left before inviting opens right there, and Galgan puts it on.
- **What the other one did:** the card shows the best thing the other person did since you last looked ("David petted Galgan."), with **Ha!** to laugh back; they see it the next time they open it ("David laughed: you petted Galgan."). What happened while you were looking is not news the next day, and an answer to something you left arrives once, in a sentence ("Julia laughed at your drawing.").
- **Mailbox:** gifts, snapshot drawings and pixel postcards stay available individually. A one-tap reaction returns to the sender. Postcards freeze a character, outfit, expression and backdrop, and can be downloaded as PNGs.
- Gifts, outfits, furniture movement, shared drawings, secret frog choices, relationship-specific character reactions and a shared Moments album.
- Whole-sprite item previews: furniture, tall objects and hats no longer get cropped.

The season provides roughly four months of scheduled content at the fastest cadence. That is content coverage, not a promise of four months of enjoyment. Later passes revisit the authored situations under new conditions. Long-term fun still needs playtesting, especially how quickly gestures become familiar and whether either player opens it without prompting.

## Testing mode

Open **Settings → Testing mode**, or add **?test=1** to the URL.

This opens a separate local sandbox. It does not use your shared room, credentials or offline operation queue and does not synchronize to the server.

The lab includes:

- Every adventure as the normal one-step encounter or the full lab sequence, plus every individual segment, selectable under all six variations.
- Restart segment, skip segment and return-to-lab controls.
- Completion checks recorded only after a segment reaches its goal. Skipping is not a pass.
- Search by adventure title or mechanic.
- A fresh sandbox, player switching, a simulated week away and a gift from the partner.
- All 36 outdoor story segments, tutorial/later-game pace controls, five weather fixtures, every discovery, all plant stages, partner drawings/postcards/reactions and a bonded pet.
- Six seasonal time-of-day fixtures, plus return to the live Central European clock.
- Visiting cleanup helpers and a repaired piled-up save, to check return paths and resident spacing.
- Sunglasses, headphones and helmets on everyone; combine these with the sleeping/belly-up dog fixtures to check fitting.
- Close-together residents, an empty freezer and a freezer gift from the partner.
- Simulating a week also ages growing plants, visitor setups, chapter availability and delayed surprises. It never changes your computer clock.
- All item and character previews, including tall hats, for clipping checks.
- Every available live character scene can be forced by room, without waiting for its random appearance or changing the shared save.
- Decoration milestones (0, 1, 12, 24, 28, 82 and 144 adventures) can be previewed in the isolated sandbox.
- Scene previews place residents on the playable floor in each room, so every interaction can be checked without waiting for the random timer.
- New-furniture and changed-surface fixtures let you check the quieter resident reactions after decorating, also only in the sandbox.
- A visible sandbox banner and an exit button that returns to your untouched normal save.

Room toys work in the sandbox too. Pause freezes game time. Switching away from an adventure pauses it. Leaving a normal encounter does not create an unfinished task; it starts fresh when you return.

## Saves

Shared worlds are JSON files in **data/**. Back up that directory to retain both worlds and access keys. It is ignored by Git and cannot be fetched through the web server.

Clients queue small operations instead of uploading full-state snapshots, so simultaneous partner changes are merged. Retry IDs prevent duplicate actions. Gifts and unrevealed frog choices stay sealed in recipient API responses. Existing generated clutter is archived during migration; player drawings, placed objects and outfits are retained. Background activity is capped at a few changes, even after a long absence.

**Settings → Save a copy** exports a readable world snapshot, not a one-click restore file. The server's data directory is the full backup.

Service-worker offline reopening works on localhost and HTTPS after an online visit. Ordinary LAN HTTP on a phone cannot install a service worker. An already-open page can still queue changes offline. The shared server must be running for phones to synchronize.

## Hosting

Nothing has been published by this update. GitHub Pages can serve the static preview, but cannot run the shared-world server.

For use from different locations, deploy the Node server to an HTTPS host with persistent storage. Configure **MONKI_DATA_DIR**, **PORT** and **HOST** as needed; use one server process per data directory. No paid APIs, trackers or cloud services are required by the code. Original photos are not included in the project.

## Development

```sh
npm test
npm run test:browser
npm run test:flow
npm run test:phone
npm run test:refinement
npm run test:paper
npm run test:accessories
npm run dev
npm run build
```

The static build is written to **dist/**. The Node server serves the same app plus the shared API.

The optional browser tests need the development dependency (`npm install`). Each starts a temporary isolated server and removes its temporary saves. `test:browser` drives **1,296 segment configurations** through actual input/update logic: 36 stories × 3 segments × 6 variations × 2 difficulty endpoints. `test:flow` uses real pointer gestures and two separate browsers to verify room-first onboarding, a one-step encounter, shared progression, fetch, bubbles, mailbox reactions, postcards, PNG download, a complete rooftop test story, discoveries, plants, weather, small-phone dialogs and sandbox isolation. Set **BROWSER_BIN** if Chrome is installed at a nonstandard path. These checks do not establish three months of fun, and real iPhone/Safari testing is still recommended.

`test:phone` checks interrupted toy cleanup, animated tidying and visiting helpers returning home, repaired actor piles, both petting pads and in-room strokes, stroke-to-drag conversion, tall hats, an eight-card match round, small random-direction bubbles, rapid placed-wand taps, selectable input fields, trusted-touch audio unlock and non-silent audio samples, 320/390px and landscape viewport coverage, readable controls, display resolution, the secondary-action menu, and Central European time with the browser set to Los Angeles. `test:refinement` exercises physical paper pickup/return, the placed wand and large aimed bubbles, the poke/options split, sleeping versus belly poses, moving lamp light, carry/drop animation, cleanup finish, full-height weather and visible basket hit/miss feedback. `test:flow` additionally checks the shared freezer through two browser sessions and at 320px/landscape sizes. This is not a physical iPhone silent-switch test. Gesture unit tests also cover size-gated bubble capture, automatic chain-pop cleanup, close arrangements and ownership of animation overrides. `npm run audit` exercises all 38 operations and simulates long-term world operations; `npm run audit:ui` checks generated art and layouts at six widths.

Mobile audio implementation references: [WebKit's silent-switch guidance](https://bugs.webkit.org/show_bug.cgi?id=237322#c6) and [AudioSession type support](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type). `node scripts/build-icons.mjs` regenerates both SVG and PNG icons directly from the game's `character()` renderer.

`test:paper` uses browser touch input for slow and fast flicks, a paused drop, a leftward throw, and complete fetch/return cycles. Physics unit tests check input-rate and frame-rate independence, gravity/bounce/friction, boundaries and interrupted fetches. `test:accessories` renders 1,400 outfit/pose/flip combinations, checks clipping, samples actual sunglasses/headphone pixels against face anchors, checks hat eye clearance, and writes a fitting atlas for visual review.

`test:sync` opens both phones on one world, together and then on separate days, and after every action compares the server, each phone's saved copy and what each phone draws: presents, drawings, reactions, frogs, stories, tidying, offline changes and the daily situations. Anything but the two things kept from each of them on purpose (the other's frog before both pick, an unopened present) fails.

- **shared/adventures.js** — opening stories, episode schedule and variations.
- **shared/extra-adventures.js** — additional authored stories.
- **shared/places.js** — 12 outdoor stories and shared fictional weather.
- **shared/life.js / public/life-ui.js** — discoveries, growing plants, mailbox, reactions and postcards.
- **public/adventure-player.js** — the 14 mechanics and gesture feedback.
- **public/room-toys.js** — aimed paper, a placed wand, drag-sized bubbles, capture and chain reactions.
- **public/paper-physics.js** — time-based flick sampling, gravity, bounce/friction and distance-based fetch movement.
- **shared/fridge.js / public/fridge-ui.js** — freezer recipes and the shared experiment interface.
- **public/petting.js / shared/ambience.js / public/phone.css** — touch petting, time-zone-aware light and phone layout.
- **public/test-lab.js** — isolated manual QA catalogue.
- **shared/world.js** — persistent operations, character tendencies, aftermath and invitations.
- **shared/positions.js / public/tidying.js** — deterministic resident spacing and cleanup choreography with return paths.
- **public/scene.js / art.js** — room rendering, gestures and pixel art.
- **public/store.js / server.mjs** — local caching, offline queue and durable shared storage.

The earlier composed-incident reducer and microgame source remain for save compatibility, but the main Play button uses the adventure system. No automatic catch-up animation rewinds furniture while you are playing.

To add a story, define three supported gesture steps, a clear visible goal for each, a reward and an aftermath; add any new art in **art.js** and persistent decoration in **scene.js**. It automatically appears in the testing catalogue.

## Design choices

Kept: shared consequences, physical discoveries, meaningful outfits, small asynchronous exchanges, and places with things to do. Deferred: live weather/location, photo uploads, date reminders, extra rooms and written relationship prompts. Rejected: five daily tasks, forced weekly chapter locks, missable seasonal rewards, streak pressure and maintenance chores. More content alone cannot guarantee retention; the useful real-world test is whether either of you comes back without being asked.
