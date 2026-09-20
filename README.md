# monki world

A small shared place for David, Julia, Monki, Sernik, and Galgan.

Open it, touch something, leave a little evidence. The characters take care of themselves.

## Play on this Mac

Double-click **Start Monki World.command**, then choose David or Julia.

Or, in this folder:

```sh
npm start
```

Open **http://localhost:4173**. Node.js 20 or newer is required. There are no production dependencies to install.

## Play together

1. Keep the server running on this Mac.
2. Connect both phones to the same Wi-Fi as the Mac.
3. Open the Wi-Fi address printed in the terminal on the first phone. Choose your character.
4. Tap **Us two → Invite your person**. Send the private link to the other phone.
5. Open that invitation and tap **Enter the world**. It selects the other character automatically.

Start from the Wi-Fi address on your first phone if that is where you intend to play. Opening `localhost` on the Mac and the Wi-Fi address on a phone uses separate browser storage; those tabs will not automatically select the same world. The invitation joins the same world for the second player. For an additional device for the first player, use the device-transfer link in Settings.

The link is a key to your world. Keep it between the two of you. Reopening it restores the invited player's seat on another device.

Moving a sofa, changing a hat, wrapping a present, drawing on the wall, and finishing an incident all save to the shared world. Two phones can act at once. Changes generally arrive within 3.5 seconds while the game is open.

Close the terminal or press Control-C to stop the server. Start it again to continue the same saved world. Nobody needs feeding while it is off.

## What is in this version

- Five original pixel characters, drawn using your Downloads reference photos: David's dark middle-parted hair, Julia's long hair and round glasses, Monki's orange-brown fur and long arms, Sernik's cream coat, and Galgan's dark coat and light eyebrows.
- A furnished house, a garden, a roof, and a secret extra place.
- Furniture and characters you can drag, wearable objects, presents, a shared drawing, and a visual history.
- Independent frog choices, revealed only after both people have chosen.
- Four small modifiers you can leave in your partner's next game.
- 28 authored situations built on seven gestures: tapping, catching, aiming, wiping, balancing, holding/releasing, and finding.
- Situation variants, actor-specific aftermath, time-of-day eligibility, rare events, recent-event avoidance, and small changes after time away.
- Physical discoveries: the garden after three incidents, the roof after eight, and several hidden interactions.
- Local persistence, a durable shared server, offline action queues, optional sound, and a web-app manifest.

The opening event is Monki with balloons. Tap one. After a short incident, the house keeps a trace of it and a new object becomes available. The next incident appears after a short quiet interval. There is no daily claim screen or maintenance loop.

This is a complete first playable version, not an infinite-content generator. New combinations lengthen the novelty; genuinely new situations still need to be added over time. The content catalogue is designed to make that inexpensive.

## Controls

- **Tap a strange object / sparkle:** investigate an incident.
- **Tap a resident:** a small reaction; the buttons below the room also open each resident's actions.
- **Hold and drag:** move residents and furniture.
- **Little things:** place something, wear it, or wrap it for the other person.
- **Leave a doodle:** draw with a finger; it appears in the wall frame.
- **A small surprise:** change a partner's next incident.
- **Us two:** choose a frog independently or share an invitation.
- **Settings:** sound, day/night view, save a copy, and help.

Short games accept touch or a mouse. Arrow keys move the pointer/support, and Space or Enter presses/releases. The pause button pauses the game; hiding the page also pauses it. Leaving early keeps the incident available.

## Saves and offline use

The authoritative shared saves live in **data/** as JSON files. Back up this directory to preserve every world and its access keys. It is ignored by Git and is not served to browsers. Each accepted batch is written to a temporary file and atomically renamed before acknowledgment.

The browser keeps a cached copy and a queue of unsent operations. When connectivity returns, the server merges the operations with current state; one phone does not upload an entire older world over the other phone's changes. Retried operations have IDs so they are not applied twice. A sealed gift and a partner's unrevealed frog choice are hidden from the recipient's API response.

Settings → **Save a copy** downloads a readable snapshot of your world. It is an archive, not a one-click restore file. Backing up **data/** is the way to restore the running server, including player access.

On `localhost` or an HTTPS host, the service worker caches the app so it can reopen offline after a first online visit. Ordinary LAN HTTP addresses do not support service workers on phones; an already-open page can still queue offline actions, but reopening a closed page requires the server. Browser storage must be available. If it fills up, the app tells you to export a copy.

## Hosting beyond the same Wi-Fi

This folder is currently local. Nothing has been pushed to GitHub or published.

Shared play from different locations needs an always-available Node server with HTTPS and persistent storage. Deploy this folder to a Node-capable host, use `npm start`, and mount a durable directory at `MONKI_DATA_DIR`. The server also respects `PORT` and `HOST`. Keep a single server process per data directory; the operation queue is coordinated in one process.

GitHub Pages alone cannot run the shared server. `npm run build` produces **dist/** for a static, single-device preview, including all art and app files. It deliberately labels itself as a device-only world when no server is present. For actual two-phone play, use the Node version.

No cloud services, paid APIs, accounts, third-party scripts, or trackers are required. The original photos have not been copied into this folder or published; only the original code-drawn pixel characters are included.

## Work on the game

```sh
npm test        # shared-state, content, persistence, and HTTP integration checks
npm run dev    # restart the server when its files change
npm run build  # optional static preview
```

| File | Responsibility |
| --- | --- |
| `shared/world.js` | Situations, state, operations, discoveries and secrets |
| `public/scene.js` | Places, residents, hit areas, object movement and aftermath |
| `public/art.js` | Every pixel character, object and icon |
| `public/microgames.js` | Seven short-game mechanics and their input |
| `public/app.js` | Screens, gifts, drawings, choices and navigation |
| `public/store.js` | Saving, joining and offline operation replay |
| `server.mjs` | Private rooms, serial operation application and durable files |

To add a situation, add an entry in `INCIDENTS`. Use an existing `kind`, choose the actor, item, reward and aftermath, and optionally limit it to night or make it rare. New gameplay mechanics live in `microgames.js`. New aftermath visuals live in `Scene.trace()`.

The tone to preserve: small physical changes, a quiet presentation, and room for both players to make their own nonsense.
