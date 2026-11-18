[![make.fun](https://make.fun/badge.svg)](https://make.fun/competitions/gta6-01)

# SOLMARA — Streets of the Sun

An original 2D top-down open-world crime game, built for the
[make.fun gta6-01 competition](https://make.fun/competitions/gta6-01) — a
complete rendition of the genre, playable offline in a desktop browser from
static files. Nothing in it comes from Rockstar Games: the city, characters,
vehicles, story, art, sound and music are all original.

## The game

Dario Reyes is back in Solmara, a sun-soaked coastal city. Mama Rosa has five
jobs for him — errands that turn into a bank robbery and a three-star police
chase.

- **Open world on foot and by car** — a 3600×3600 city on an 8×8 road grid,
  with a park, the docks, and the beach
- **Stealable cars** — take a parked car, or jack a slow traffic car (the
  cops will notice)
- **Traffic and pedestrians** — cars drive the grid, peds walk the sidewalks
  and flee from gunfire
- **Wanted system and police** — 0–5 stars, pursuit cars that chase and ram,
  busted if they sit on you, escape by outrunning them
- **Five story missions** from Mama Rosa, with a briefing, objectives,
  rewards, and a victory screen
- **Combat** — punch (F) and shoot (Space), with bullets, particles and
  synthesized sound effects
- **HUD with minimap** — health, cash, wanted stars, mission objective,
  speed, and a live minimap
- **Save** — progress is kept in localStorage; resume where you left off
- **Synthesized audio** — engine hum, sirens, and a bassline, all made with
  WebAudio; no audio files, no network requests

## Controls

| Key | Action |
| --- | ------ |
| WASD / arrows | Move on foot, drive |
| E | Enter / exit a car |
| F | Punch |
| Space | Shoot |
| Enter | Confirm / start |
| P / Esc | Pause |
| M | Mute |

## Play it

Open `game/index.html` in a desktop browser, or serve it locally:

```sh
node serve.ts
# then open http://localhost:8080
```

## Structure

- `game/index.html` — the page, canvas, and module entry point
- `game/src/config.js` — tuning, places, palette
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard input, UI keys split from gameplay keys
- `game/src/audio.js` — WebAudio synthesis (engine, sirens, music, SFX)
- `game/src/city.js` — the road grid, buildings, park, docks, beach
- `game/src/traffic.js` — traffic cars and pedestrians
- `game/src/police.js` — wanted stars and pursuit
- `game/src/missions.js` — the five story missions
- `game/src/player.js` — Dario on foot and driving
- `game/src/world.js` — the world; the layout is built once and kept stable
- `game/src/render.js` — canvas drawing, HUD, minimap, screens
- `game/src/shots.js` — deterministic scenes for the screenshots
- `game/src/save.js` — localStorage save
- `game/src/main.js` — game loop and state machine
- `main.ts` — the make.fun program that hands the game in
- `vendor/makefun-game.ts` — the make.fun dossier library (unchanged)

## License

MIT — see [LICENSE](LICENSE).
