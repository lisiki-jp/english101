// ==UserScript==
// @name         Genius.com - Syllabify Lyrics
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Syllabifies lyrics using the Knuth-Liang algorithm (Hypher)
// @author       lisiki
// @match        https://genius.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=genius.com
// @grant        none
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/hypher@0.2.5/dist/jquery.hypher.js
// @require      https://cdn.jsdelivr.net/gh/bramstein/hyphenation-patterns/dist/browser/en-us.js
// @updateURL    https://github.com/l1siki/english101/raw/refs/heads/main/syllabify-lyrics-genius.com.user.js
// @downloadURL  https://github.com/l1siki/english101/raw/refs/heads/main/syllabify-lyrics-genius.com.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Hypher inserts a "soft hyphen" (\u00AD). We will replace it with this:
    const VISUAL_SEPARATOR = "·";

    // Initialize the engine with English patterns (loaded via @require)
    // Note: Hypher.languages['en-us'] is populated by the second @require script
    const engine = new Hypher(Hypher.languages['en-us']);

    function processText(text) {
        // 1. Run the standard Knuth-Liang hyphenation
        let hyphenated = engine.hyphenateText(text);

        // 2. Replace the invisible "soft hyphen" with our visible dot
        // Hypher uses \u00AD (soft hyphen) to mark breaks.
        return hyphenated.replace(/\u00AD/g, VISUAL_SEPARATOR);
    }

    // --- Standard DOM Traversal ---
    function traverseAndSyllabify(node) {
        if (node.nodeType === 3) { // Text Node
            const text = node.nodeValue;
            // Only process if it has content and isn't a metadata tag [Chorus]
            if (text.trim().length > 0) {
                if (text.trim().startsWith('[') && text.trim().endsWith(']')) return;

                // Prevent double processing if the separator is already there
                if (text.includes(VISUAL_SEPARATOR)) return;

                const newText = processText(text);
                if (newText !== text) {
                    node.nodeValue = newText;
                }
            }
        } else if (node.nodeType === 1) { // Element Node
            // Skip technical tags
            if (['SCRIPT', 'STYLE', 'SVG', 'IMG'].includes(node.tagName)) return;
            Array.from(node.childNodes).forEach(traverseAndSyllabify);
        }
    }

    // --- Execution Logic ---
    function runSyllabifier() {
        const containers = document.querySelectorAll('[data-lyrics-container="true"]:not(.syllabified-processed)');
        containers.forEach(container => {
            container.classList.add('syllabified-processed');
            traverseAndSyllabify(container);
        });
    }

    // --- Observer for Single Page Navigation ---
    let timeout;
    const observer = new MutationObserver(() => {
        clearTimeout(timeout);
        timeout = setTimeout(runSyllabifier, 500);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial Run
    setTimeout(runSyllabifier, 1000);

})();
