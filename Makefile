# Makefile for TexGen

.PHONY: all build clean test

all: build

build:
	@node scripts/build.mjs
	@echo "Generating JS fallback for TypeScript Gallery..."
	-cd example/typescript_gallery && npx tsc src/main.ts --target esnext --module esnext --moduleResolution node --noEmit false --skipLibCheck true --outDir src/ && rm -f src/texgen.mjs.js

clean:
	@echo "Cleaning up build artifacts..."
	rm -rf dist/

test:
	npm test
