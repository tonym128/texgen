# Procedural Solitaire Example

A fully functional Klondike Solitaire game demonstrating the use of `texgen.js` to generate classic tabletop gaming assets.

## Features

- **Procedural Felt**: The background table uses a grainy, vignette-shaded green felt shader, typical of casino or card tables.
- **Ornate Card Backs**: The back of the cards features a complex procedural lattice pattern with noise and shading, all generated dynamically.
- **Paper Textures**: The front of the cards uses a subtle noise shader to simulate off-white paper stock.
- **Full Game Logic**: Complete implementation of Klondike drag-and-drop mechanics, including stack moving, tableau flipping, waste recycling, and foundation building.
- **Victory State**: A win detection system that triggers a glowing overlay when all cards are successfully sorted into the foundations.

## Controls

- **Click**: Click the Stock pile to deal cards to the waste pile. Click face-down cards on the Tableau to flip them.
- **Drag & Drop**: Click and drag face-up cards to move them between piles according to standard Solitaire rules.