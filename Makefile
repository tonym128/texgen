# Makefile for TexGen

.PHONY: all build clean test

all: build

build:
	@echo "Copying library to examples..."
	cp texgen.js example/platformer/
	cp texgen.js example/marble_roller/
	cp texgen.js example/maze3d/
	cp texgen.js example/texture_generator/
	cp texgen.js example/flight_sim/
	cp texgen.js example/card_roguelike/
	cp texgen.js example/solitaire/
	cp texgen.js example/typescript_gallery/
	cp texgen.d.ts example/typescript_gallery/

clean:
	@echo "Cleaning up build artifacts..."
	rm -f example/platformer/texgen.js
	rm -f example/marble_roller/texgen.js
	rm -f example/maze3d/texgen.js
	rm -f example/texture_generator/texgen.js
	rm -f example/flight_sim/texgen.js
	rm -f example/card_roguelike/texgen.js
	rm -f example/solitaire/texgen.js
	rm -f example/typescript_gallery/texgen.js
	rm -f example/typescript_gallery/texgen.d.ts

test:
	npm test
