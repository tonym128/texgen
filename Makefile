# Makefile for TexGen

.PHONY: all build clean test

all: build

build:
	@node scripts/build.mjs
	@echo "Generating JS fallback for TypeScript Gallery..."
	-cd example/typescript_gallery && ./node_modules/.bin/tsc src/main.ts --target esnext --module esnext --moduleResolution node --noEmit false --skipLibCheck true --outDir src/ && rm -f src/texgen.mjs.js

clean:
	@echo "Cleaning up build artifacts..."
	rm -f texgen.js texgen.mjs texgen.min.js texgen.min.mjs
	rm -f example/platformer/texgen.js
	rm -f example/marble_roller/texgen.js
	rm -f example/maze3d/texgen.js
	rm -f example/texture_generator/texgen.js
	rm -f example/flight_sim/texgen.js
	rm -f example/card_roguelike/texgen.js
	rm -f example/solitaire/texgen.js
	rm -f example/typescript_gallery/texgen.mjs
	rm -f example/typescript_gallery/texgen.d.ts
	rm -f example/typescript_gallery/src/main.js

test:
	npm test
