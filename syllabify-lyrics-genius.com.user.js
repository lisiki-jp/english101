// ==UserScript==
// @author       lisiki
// @updateURL    https://github.com/l1siki/english101/raw/refs/heads/main/syllabify-lyrics-genius.com.user.js
// @downloadURL  https://github.com/l1siki/english101/raw/refs/heads/main/syllabify-lyrics-genius.com.user.js
// @name         Genius.com - Syllabify Lyrics
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Converts lyrics on Genius.com into syllables separated by a middle dot
// @match        https://genius.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=genius.com
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const SEPARATOR = "·";

    // --- Syllabification Logic ---

    function getSyllables(word) {
        // 1. Basic cleaning and quick returns
        const cleanWord = word.replace(/[.,/#!$%^&*;:{}=_`~()?"']/g,"");
        if (cleanWord.length <= 3) return word; // Skip short words (the, she, and)
        if (word.includes(SEPARATOR)) return word; // Already processed

        // 2. Separate punctuation from the core word
        const match = word.match(/^([^\w]*)(\w+)([^\w]*)$/);
        if (!match) return word;
        const [_, prefix, core, suffix] = match;

        // 3. Regex Breakdown
        // This splits into chunks usually formatted as [Consonants][Vowels][Consonants]
        // But stops before the next Vowel starts.
        const syllableRegex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;
        let parts = core.match(syllableRegex);

        if (!parts || parts.length < 2) return word;

        // 4. Smart Merge (Fixing English Irregularities)
        const merged = [];
        
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            
            // If this isn't the first part, we can check if we should merge with previous
            if (merged.length > 0) {
                const prev = merged[merged.length - 1];
                const combined = prev + part;
                const lowerPart = part.toLowerCase();
                const lowerPrev = prev.toLowerCase();

                // -- RULE A: Silent 'e' handling (e.g., "ha·te" -> "hate") --
                // If the last part is effectively "Consonant + e", merge it.
                // (Matches: 'te', 'ke', 've', 'se', 'ze', 'me', 'ne' etc at end of word)
                if (i === parts.length - 1) {
                     if (/^[bcdfghjklmnpqrstvwxz]e$/i.test(part)) {
                         // Exception: "le" is usually syllabic (ta-ble, cir-cle), don't merge 'le'
                         if (!lowerPart.endsWith('le')) {
                             merged[merged.length - 1] += part;
                             continue;
                         }
                     }
                }

                // -- RULE B: Handling "-ed" (Past Tense) --
                // "looked" -> look·ed (Merge -> looked)
                // "wanted" -> want·ed (Keep -> want·ed)
                // Rule: -ed is only a syllable if preceded by 't' or 'd'
                if (i === parts.length - 1 && lowerPart === 'ed') {
                    if (!lowerPrev.endsWith('t') && !lowerPrev.endsWith('d')) {
                        merged[merged.length - 1] += part;
                        continue;
                    }
                }

                // -- RULE C: Handling "-es" (Plurals/Verbs) --
                // "rates" -> ra·tes (Merge -> rates)
                // "bushes" -> bush·es (Keep -> bush·es)
                // Rule: -es is separate if preceded by s, z, ch, sh, x (sibilants)
                if (i === parts.length - 1 && lowerPart === 'es') {
                    // Check end of previous block
                    const sibilants = ['s', 'sh', 'ch', 'x', 'z', 'ge', 'ce']; 
                    const isSibilant = sibilants.some(s => lowerPrev.endsWith(s));
                    if (!isSibilant) {
                        merged[merged.length - 1] += part;
                        continue;
                    }
                }
            }

            merged.push(part);
        }

        return prefix + merged.join(SEPARATOR) + suffix;
    }

    function processText(text) {
        // Split by space to handle individual words, then rejoin
        return text.split(' ').map(w => getSyllables(w)).join(' ');
    }

    // --- DOM Traversal (Standard) ---
    function traverseAndSyllabify(node) {
        if (node.nodeType === 3) { // Text Node
            const text = node.nodeValue;
            if (text.trim().length > 0) {
                // Skip headers like [Chorus]
                if (text.trim().startsWith('[') && text.trim().endsWith(']')) return;
                
                const newText = processText(text);
                if (newText !== text) node.nodeValue = newText;
            }
        } else if (node.nodeType === 1) { // Element Node
            if (['SCRIPT', 'STYLE', 'SVG', 'IMG'].includes(node.tagName)) return;
            Array.from(node.childNodes).forEach(traverseAndSyllabify);
        }
    }

    // --- Main Processor ---
    function runSyllabifier() {
        const containers = document.querySelectorAll('[data-lyrics-container="true"]:not(.syllabified-processed)');
        containers.forEach(container => {
            container.classList.add('syllabified-processed');
            traverseAndSyllabify(container);
        });
    }

    // --- Observer ---
    let timeout;
    const observer = new MutationObserver(() => {
        clearTimeout(timeout);
        timeout = setTimeout(runSyllabifier, 500);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(runSyllabifier, 1000);

})();
