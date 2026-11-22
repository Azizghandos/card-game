# Ember Court

A turn-based card duel against **the Ashen Warden**, built for the
[make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826).
Everything is original — names, art, sounds — and drawn or synthesised in code:
no images, no fonts, no network requests.

## How to play

- You and the Warden each have **30 life** and a **30-card deck** of original
  ember creatures and spells.
- Each turn you gain one more mana crystal (up to 10) and draw a card.
- **Creatures** cost mana and fight on the table: Ember Imp (1 mana, 2/1),
  Cinder Wolf (2 mana, 3/2), Flame Guard (3 mana, 2/5, Guard), Ash Drake
  (6 mana, 6/6) and more. A creature attacks the turn after it is played.
- **Spells**: Spark Burst (deal 3 damage to any target), Mend (heal 5),
  Kindling (draw 2), Cinder Rain (2 damage to all enemy creatures).
- **Guard** creatures must be struck before anything behind them — including
  the Warden's face.
- Win by reducing the Warden to 0 life. Lose if yours reaches 0. An empty
  deck burns you for growing fatigue damage.

Controls: click a card to play it, click one of your ready creatures then an
enemy (or the Warden's portrait) to attack, click **END TURN** or press **E**
to end your turn. **Enter/Space** starts a duel, **Escape** cancels a
selection. A battle log on the right narrates every move.

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies. `game/index.html` opens in desktop Chrome
and plays offline.

## Screenshots

`?shot=title|play|win|loss&seed=1` stages each scene from the real rules
(the win and loss scenes play the finishing move through the game itself),
for repeatable screenshots — see `shots.json`.

## Structure

- `game/src/config.js` — tuning, palette, the original card pool
- `game/src/random.js` — seeded shuffle (mulberry32)
- `game/src/world.js` — the duel's rules: turns, mana, combat, the Warden's AI
- `game/src/render.js` — the table, cards, HUD and panels, all drawn in code
- `game/src/input.js` — keyboard and pointer input
- `game/src/audio.js` — WebAudio synth blips
- `game/src/shots.js` — screenshot scenes played through the real rules
- `game/src/main.js` — boot, screens and the game loop
- `main.ts` — hands the entry in (copies `game/` and `screenshots/`, writes `dossier.json`)
