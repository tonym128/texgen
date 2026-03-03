/**
 * TexGen Mobile Controls Utility
 * Standardized on-screen touch controls for TexGen examples.
 */

const setupMobileControls = (options = {}) => {
    const {
        container = document.body,
        controls = [], // Array of { id, label, action, position: { bottom, left, right } }
        onPress = (action) => {},
        onRelease = (action) => {}
    } = options;

    // Only inject if touch is supported
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return null;

    const styles = `
        .texgen-mobile-btn {
            width: 70px; height: 70px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            font-size: 1.8rem; color: #fff; backdrop-filter: blur(5px);
            user-select: none; pointer-events: auto;
            position: absolute; z-index: 9000;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.1s, background 0.1s;
        }
        .texgen-mobile-btn:active {
            background: rgba(0, 255, 204, 0.4);
            border-color: #00ffcc;
            transform: scale(0.9);
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const elements = [];

    controls.forEach(cfg => {
        const btn = document.createElement("div");
        btn.className = "texgen-mobile-btn";
        btn.innerHTML = cfg.label;
        
        if (cfg.position.bottom) btn.style.bottom = cfg.position.bottom;
        if (cfg.position.top) btn.style.top = cfg.position.top;
        if (cfg.position.left) btn.style.left = cfg.position.left;
        if (cfg.position.right) btn.style.right = cfg.position.right;

        const start = (e) => { e.preventDefault(); onPress(cfg.action); };
        const end = (e) => { e.preventDefault(); onRelease(cfg.action); };

        btn.addEventListener("touchstart", start);
        btn.addEventListener("touchend", end);
        btn.addEventListener("touchcancel", end);

        container.appendChild(btn);
        elements.push(btn);
    });

    return {
        destroy: () => {
            elements.forEach(el => el.remove());
            styleSheet.remove();
        }
    };
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupMobileControls };
} else {
    window.setupMobileControls = setupMobileControls;
}
