// ==UserScript==
// @name         Genius.com - Syllabify Lyrics
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Converts lyrics on Genius.com into syllables separated by a middle dot
// @author       lisiki
// @match        https://genius.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=genius.com
// @grant        none
// @run-at       document-end
// @updateURL    https://github.com/l1siki/english101/raw/refs/heads/main/syllabify-lyrics-genius.com.user.js
// @downloadURL  https://github.com/l1siki/english101/raw/refs/heads/main/syllabify-lyrics-genius.com.user.js

// ==/UserScript==

(function() {
    'use strict';

    const SEPARATOR = "·";

    // --- Syllabification Logic (Heuristic) ---
    // English is complex, but this regex-based vowel-cluster splitter works well for visual reading.
    function getSyllables(word) {
        if (word.length <= 3) return word; // Skip very short words
        if (word.includes(SEPARATOR)) return word; // Already processed

        // 1. Split word from trailing punctuation
        const match = word.match(/^([^\w]*)(\w+)([^\w]*)$/);
        if (!match) return word;

        const [_, prefix, coreWord, suffix] = match;

        // Regex logic:
        // Match a vowel group, optionally followed by consonants that don't start the next syllable
        const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;
        const parts = coreWord.match(syllableRegex);

        if (!parts || parts.length < 2) return word;

        return prefix + parts.join(SEPARATOR) + suffix;
    }

    function processText(text) {
        // Split by space to handle individual words, then rejoin
        return text.split(' ').map(word => getSyllables(word)).join(' ');
    }

    // --- DOM Traversal ---
    function traverseAndSyllabify(node) {
        // If it's a Text Node
        if (node.nodeType === 3) {
            const text = node.nodeValue;

            // Basic check to ensure we have content and it's not just whitespace
            if (text.trim().length > 0) {
                // Heuristic: Do not process lines that look like headers e.g. [Chorus]
                // We check the parent's previous sibling or the text itself
                if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
                    return;
                }

                const newText = processText(text);
                if (newText !== text) {
                    node.nodeValue = newText;
                }
            }
        }
        // If it's an Element Node (like <a> or <span>), traverse children
        else if (node.nodeType === 1) {
            // Skip script/style tags just in case
            if (['SCRIPT', 'STYLE', 'SVG', 'IMG'].includes(node.tagName)) return;

            // Genius "Metadata" headers usually have distinct classes, but checking text content (above) is safer
            // Recursively process child nodes
            Array.from(node.childNodes).forEach(traverseAndSyllabify);
        }
    }

    // --- Main Processor ---
    function runSyllabifier() {
        // Genius uses `data-lyrics-container` for the actual lyrics blocks
        const containers = document.querySelectorAll('[data-lyrics-container="true"]:not(.syllabified-processed)');

        containers.forEach(container => {
            // Mark as processed immediately to prevent loops/double processing
            container.classList.add('syllabified-processed');
            traverseAndSyllabify(container);
        });
    }

    // --- Observer for SPA (Single Page Application) ---
    // Genius loads content dynamically, so we watch the body for changes
    let timeout;
    const observer = new MutationObserver((mutations) => {
        // Debounce to avoid running on every single tiny DOM change
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            runSyllabifier();
        }, 500);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial run
    setTimeout(runSyllabifier, 1000);

})();
