# Makefile for TexGen

.PHONY: all build clean test

all: build

build:
	@echo "Copying library to examples..."
	cp texgen.js example/platformer/
	cp texgen.js example/marble_roller/
	cp texgen.js example/maze3d/
	cp texgen.js example/texture_generator/

clean:
	@echo "Cleaning up build artifacts..."
	rm -f example/platformer/texgen.js
	rm -f example/marble_roller/texgen.js
	rm -f example/maze3d/texgen.js
	rm -f example/texture_generator/texgen.js

test:
	npm test
