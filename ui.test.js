import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Note: JSDOM doesn't support <script type="module"> execution by default.
// We will test the button availability and simulate the click handlers.

const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');

describe('TexGen UI Elements', () => {
    let dom;
    let window;
    let document;

    beforeEach(() => {
        dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
        window = dom.window;
        document = window.document;
    });

    it('should have all functional buttons with correct IDs', () => {
        const buttons = [
            'compile-btn',
            'gallery-btn',
            'compress-btn',
            'bake-btn',
            'close-gallery'
        ];
        
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            expect(btn, `Button with ID "${id}" should exist`).not.toBeNull();
        });
    });

    it('should have the expected tool-bar structure', () => {
        const toolBar = document.querySelector('.tool-bar');
        expect(toolBar).not.toBeNull();
        expect(toolBar.querySelector('#gallery-btn')).not.toBeNull();
        expect(toolBar.querySelector('#compress-btn')).not.toBeNull();
        expect(toolBar.querySelector('#bake-btn')).not.toBeNull();
    });

    it('should have the gallery overlay hidden by default', () => {
        const overlay = document.getElementById('gallery-overlay');
        expect(overlay).not.toBeNull();
        // The display style might be empty initially if not set in inline style but in CSS
        // but it shouldn't be 'flex' or 'block'
        expect(window.getComputedStyle(overlay).display).toBe('none');
    });

    it('should have a toast container', () => {
        const container = document.getElementById('toast-container');
        expect(container).not.toBeNull();
    });
});
