// ==UserScript==
// @name         Syllabify Everything
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hyphenates text with a dot (·) dynamically on all websites.
// @author       lisiki
// @match        *://*/*
// @grant        none
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/hyphen@1.13.0/patterns/en-us.min.js
// @require      https://cdn.jsdelivr.net/npm/hyphen@1.13.0/hyphen.min.js
// @updateURL    https://github.com/l1siki/english101/raw/refs/heads/main/syllabify-everything.user.js
// @downloadURL  https://github.com/l1siki/english101/raw/refs/heads/main/syllabify-everything.user.js
// ==/UserScript==

/* global createHyphenator, hyphenationPatternsEnUs */

(function() {
    'use strict';

    // --- 1. SAFEGUARD CHECKS ---
    // Ensure the library loaded correctly in the Tampermonkey sandbox
    if (typeof createHyphenator === 'undefined' || typeof hyphenationPatternsEnUs === 'undefined') {
        console.error("🔴 Hyphenator: Libraries failed to load.");
        return;
    }

    // --- 2. CONFIGURATION ---
    const SEPARATOR = '·'; // The requested middle dot
    const IGNORED_TAGS = new Set([
        'SCRIPT', 'STYLE', 'PRE', 'CODE', 'TEXTAREA', 'INPUT',
        'HEAD', 'TITLE', 'META', 'LINK', 'NOSCRIPT', 'SVG', 'IMG', 'VIDEO', 'AUDIO'
    ]);

    // Initialize the hyphenator
    // We use async: false to ensure immediate updates without UI flash
    const hyphenate = createHyphenator(hyphenationPatternsEnUs, {
        hyphenChar: SEPARATOR,
        async: false,
        minWordLength: 6
    });

    // --- 3. PROCESSING LOGIC ---

    /**
     * Decides if a text node needs hyphenation.
     */
    function shouldProcess(node) {
        // 1. Must be a Text Node
        if (node.nodeType !== Node.TEXT_NODE) return false;

        // 2. Must have content
        if (!node.nodeValue || node.nodeValue.trim().length < 6) return false;

        // 3. Prevent infinite loops: If it already has the dot, skip it.
        if (node.nodeValue.includes(SEPARATOR)) return false;

        // 4. Check Parent Element tags
        const parent = node.parentNode;
        if (!parent) return false;

        // Skip ignored tags
        if (IGNORED_TAGS.has(parent.tagName)) return false;

        // Skip editable fields (don't mess up user typing)
        if (parent.isContentEditable) return false;

        return true;
    }

    /**
     * Applies hyphenation to a single node.
     */
    function processNode(node) {
        if (shouldProcess(node)) {
            const original = node.nodeValue;
            const result = hyphenate(original);

            // Only write to DOM if text actually changed
            if (result !== original) {
                node.nodeValue = result;
            }
        }
    }

    /**
     * Walks through a specific part of the page finding text.
     */
    function walkAndHyphenate(root) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Quick filter for parent tags
                    if (node.parentNode && IGNORED_TAGS.has(node.parentNode.tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            processNode(node);
        }
    }

    // --- 4. INITIALIZATION & OBSERVER ---

    console.log("🔵 Dot Hyphenator (Advanced) started.");

    // A. Run immediately on existing content
    walkAndHyphenate(document.body);

    // B. Watch for new content (Infinite Scroll / AJAX)
    const observer = new MutationObserver((mutations) => {
        // Optimization: Pause observer while we make changes to avoid loops
        observer.disconnect();

        let needsHyphenation = false;

        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                // If a whole container was added (div, p, article)
                if (node.nodeType === Node.ELEMENT_NODE) {
                    walkAndHyphenate(node);
                }
                // If just a text snippet was added
                else if (node.nodeType === Node.TEXT_NODE) {
                    processNode(node);
                }
            });
        });

        // Resume observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
