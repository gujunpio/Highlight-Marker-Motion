let lastHmId = null;

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'start-motion') {
        startMotion();
    } else if (request.action === 'clear-motion') {
        clearMotion();
    }
});

function startMotion() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return replayMotion();
    }

    chrome.storage.sync.get(['bgColor', 'textColor', 'speed', 'animStyle', 'lineDelay', 'thickness'], (data) => {
        const bgColor       = data.bgColor    || '#ffff00';
        const textColor     = data.textColor  || '#000000';
        const speedMapping  = { slow: 300, medium: 700, fast: 1200 };
        const speedPxPerSec = speedMapping[data.speed || 'medium'];
        const animStyle     = data.animStyle  || 'sequential';
        const lineDelayMs   = data.lineDelay  !== undefined ? parseFloat(data.lineDelay) : 0.2;
        
        let padVal = '0.05em'; // medium
        if (data.thickness === 'thin') padVal = '0';
        if (data.thickness === 'thick') padVal = '0.1em';

        const range    = selection.getRangeAt(0);
        const fragment = range.extractContents();

        const treeWalker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
        const textNodes  = [];
        let node;
        while ((node = treeWalker.nextNode())) textNodes.push(node);

        const wordsList    = [];
        const currentHmId  = Date.now().toString();
        lastHmId           = currentHmId;

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            if (!text) return;

            const segments = text.match(/\S+\s*|\s+/g) || [];
            const parent   = textNode.parentNode;

            segments.forEach(segment => {
                const span = document.createElement('span');
                span.className      = 'hm-word';
                span.dataset.hmId   = currentHmId;
                span.style.setProperty('--hm-pad', padVal);

                const inner = document.createElement('span');
                inner.className  = 'hm-text';
                inner.textContent = segment;

                span.appendChild(inner);
                parent.insertBefore(span, textNode);
                wordsList.push(span);
            });
            parent.removeChild(textNode);
        });

        range.insertNode(fragment);
        selection.removeAllRanges();

        requestAnimationFrame(() => {
            applyTimingsAndAnimate(wordsList, speedPxPerSec, bgColor, textColor, animStyle, lineDelayMs);
        });
    });
}

function applyTimingsAndAnimate(wordsList, speedPxPerSec, bgColor, textColor, animStyle, lineDelayMs) {
    const lines       = [];
    let currentLine   = [];
    let currentTop    = -1;

    wordsList.forEach(span => {
        const rect = span.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        if (currentTop === -1) {
            currentTop = rect.top;
            currentLine.push({ span, rect });
        } else if (Math.abs(rect.top - currentTop) < 6) {
            currentLine.push({ span, rect });
        } else {
            lines.push(currentLine);
            currentTop  = rect.top;
            currentLine = [{ span, rect }];
        }
    });
    if (currentLine.length > 0) lines.push(currentLine);

    let totalDelay  = 0;

    lines.forEach((line, index) => {
        const lineStart = line[0].rect.left;
        const lineEnd   = line[line.length - 1].rect.right;
        const lineWidth = lineEnd - lineStart;
        if (lineWidth <= 0) return;

        const lineDuration = lineWidth / speedPxPerSec;
        let currentLineDelay;
        if (animStyle === 'overlapping') {
            currentLineDelay = index * lineDelayMs;
        } else {
            currentLineDelay = totalDelay;
        }

        line.forEach(item => {
            const wordWidth  = item.rect.width;
            const wordOffset = item.rect.left - lineStart;
            const wordDuration = wordWidth / speedPxPerSec;
            const wordDelay    = currentLineDelay + (wordOffset / speedPxPerSec);

            const origColor = window.getComputedStyle(item.span.parentElement).color || '#000000';

            item.span.style.setProperty('--hm-bg',  bgColor);
            item.span.style.setProperty('--hm-dur', wordDuration + 's');
            item.span.style.setProperty('--hm-del', wordDelay + 's');

            const inner = item.span.querySelector('.hm-text');
            inner.style.setProperty('--hm-tx',   textColor);
            inner.style.setProperty('--hm-orig',  origColor);
            inner.style.setProperty('--hm-dur',   wordDuration + 's');
            inner.style.setProperty('--hm-del',   wordDelay + 's');

            item.span.classList.add('hm-animate');
            inner.classList.add('hm-animate-text');
        });

        totalDelay += lineDuration;
    });
}

function replayMotion() {
    if (!lastHmId) return;
    const elements = document.querySelectorAll(`span[data-hm-id="${lastHmId}"]`);
    if (elements.length === 0) return;

    elements.forEach(span => {
        span.classList.remove('hm-animate');
        const inner = span.querySelector('.hm-text');
        if (inner) inner.classList.remove('hm-animate-text');
    });

    void document.body.offsetWidth;

    elements.forEach(span => {
        span.classList.add('hm-animate');
        const inner = span.querySelector('.hm-text');
        if (inner) inner.classList.add('hm-animate-text');
    });
}

function clearMotion() {
    document.querySelectorAll('.hm-word').forEach(word => {
        word.replaceWith(document.createTextNode(word.textContent));
    });
    lastHmId = null;
}
