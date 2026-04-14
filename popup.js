document.addEventListener('DOMContentLoaded', () => {
    const bgColorInput    = document.getElementById('bgColor');
    const bgColorPicker   = document.getElementById('bgColorPicker');
    const textColorInput  = document.getElementById('textColor');
    const textColorPicker = document.getElementById('textColorPicker');
    const speedSelect     = document.getElementById('speed');
    const animStyleSelect = document.getElementById('animStyle');
    const delayRow        = document.getElementById('delayRow');
    const lineDelayInput  = document.getElementById('lineDelay');
    const thicknessSelect = document.getElementById('thickness');
    const themeToggle     = document.getElementById('themeToggle');
    const popOutBtn       = document.getElementById('popOutBtn');
    const btnPlay         = document.getElementById('btnPlay');
    const btnClear        = document.getElementById('btnClear');

    // ---- POP-OUT WINDOW ----
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'window') {
        popOutBtn.style.display = 'none';
        document.body.style.width = '100%';
        document.body.style.height = '100vh';
        document.documentElement.style.height = '100%';
    } else {
        popOutBtn.addEventListener('click', () => {
            chrome.windows.create({
                url: chrome.runtime.getURL("popup.html?mode=window"),
                type: "popup",
                width: 340,
                height: 520
            });
            window.close();
        });
    }

    // ---- THEME TOGGLE ----
    let currentTheme = 'light';
    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    themeToggle.addEventListener('click', () => {
        const next = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        chrome.storage.sync.set({ theme: next });
    });

    // ---- ACTIONS ----
    btnPlay.addEventListener('click', () => sendAction('start-motion'));
    btnClear.addEventListener('click', () => sendAction('clear-motion'));

    function sendAction(action) {
        chrome.tabs.query({ active: true, windowType: 'normal' }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action }).catch(() => {});
            });
        });
    }

    // ---- STYLE TOGGLE ----
    animStyleSelect.addEventListener('change', () => {
        delayRow.style.display = animStyleSelect.value === 'overlapping' ? 'flex' : 'none';
        save();
    });

    // ---- COLOR SYNC ----
    bgColorPicker.addEventListener('input', (e) => { bgColorInput.value = e.target.value; save(); });
    textColorPicker.addEventListener('input', (e) => { textColorInput.value = e.target.value; save(); });
    bgColorInput.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) bgColorPicker.value = e.target.value;
        save();
    });
    textColorInput.addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) textColorPicker.value = e.target.value;
        save();
    });

    [speedSelect, lineDelayInput, thicknessSelect].forEach(el => el.addEventListener('change', save));

    // ---- LOAD SETTINGS ----
    chrome.storage.sync.get(['bgColor','textColor','speed','animStyle','lineDelay','thickness','theme'], (data) => {
        const bg = data.bgColor || '#ffff00';
        const tx = data.textColor || '#000000';
        bgColorInput.value = bg;
        if (/^#[0-9A-F]{6}$/i.test(bg)) bgColorPicker.value = bg;
        textColorInput.value = tx;
        if (/^#[0-9A-F]{6}$/i.test(tx)) textColorPicker.value = tx;

        if (data.speed) speedSelect.value = data.speed;
        if (data.animStyle) {
            animStyleSelect.value = data.animStyle;
            delayRow.style.display = data.animStyle === 'overlapping' ? 'flex' : 'none';
        }
        if (data.lineDelay !== undefined) lineDelayInput.value = data.lineDelay;
        if (data.thickness) thicknessSelect.value = data.thickness;

        const savedTheme = data.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
    });

    // ---- SAVE ----
    function save() {
        chrome.storage.sync.set({
            bgColor:   bgColorInput.value  || '#ffff00',
            textColor: textColorInput.value || '#000000',
            speed:     speedSelect.value    || 'medium',
            animStyle: animStyleSelect.value|| 'sequential',
            lineDelay: parseFloat(lineDelayInput.value) || 0.2,
            thickness: thicknessSelect.value || 'medium'
        });
    }
});
