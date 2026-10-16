# Contributing to WarDOGE

Thanks for helping! WarDOGE is a free, open-source meme game. Much wow.

## Run it locally
The game is a single `index.html` with no build step.

```bash
git clone https://github.com/<you>/wardoge && cd wardoge
python3 -m http.server 8000   # then open http://localhost:8000
```

## How to contribute
1. Look for issues labeled `good first issue` or `help wanted`, or open an issue to discuss a bigger idea first.
2. Fork the repo and create a branch: `git checkout -b feat/short-name`.
3. Keep pull requests small and focused on one thing.
4. Test in a desktop browser **and** on a phone (touch controls).
5. Open a PR describing what changed and why. Add a screenshot or GIF for visual changes.

## Code guidelines
- Plain JavaScript and Canvas, no frameworks, no build tools.
- Keyboard input uses `e.code` so controls work on any keyboard layout. Keep it that way.
- Keep the game fair: anything that affects scoring or damage will eventually be checked by the server, so don't rely on client-only logic for it.
- Balance changes (weapon damage, prices, timers) should explain the reasoning in the PR.

## Ideas we'd love help with
- New weapons, gear, and map features
- Sound effects and music
- Art: sprites, skins, doge hats
- Online multiplayer server (WebSocket)
- Accessibility and performance on low-end phones

## Community
Be kind. No harassment, hate, or spam. Maintainers may close PRs or issues that break this.

## License
By contributing, you agree your work is released under the MIT License (see `LICENSE`).
