# Procedural Card Roguelike Demo

A mock-up of a card-based roguelike where every card's border, background, and central artwork is procedurally generated using `texgen.js`.

## Features

- **Procedural Card Art**: Every monster, spell, and ability has a unique, seed-based artwork generated on the fly.
- **Themed Borders**: Ornate frames (Gold, Silver, Stone, Crystal) generated from noise and signed distance fields.
- **Dynamic UI**: Demonstrates how TexGen can be used to create high-detail UI assets without increasing the initial download size.
- **Seed Persistence**: Using seeds to ensure that the same "card" always looks the same during a single run.

## How it works

The game uses several `TexGen` instances to "bake" the card components:
1. **The Frame**: A shader that uses `sdBox` and metallic noise.
2. **The Portrait**: A themed shader (e.g., Fire, Void, Life) that uses the card's unique seed to create an abstract creature or effect.
3. **The Background**: A subtle texture that gives the card body depth.

## Controls

- **Click a Card**: "Play" the card to see it animate and trigger a new procedural generation.
- **Draw Button**: Refresh your hand with entirely new procedural cards.
