(() => {
  const els = {
    landing: document.getElementById('landing'),
    game: document.getElementById('game'),
    gameTitle: document.getElementById('gameTitle'),
    lowerLabel: document.getElementById('lowerLabel'),
    upperLabel: document.getElementById('upperLabel'),
    timeline: document.getElementById('timeline'),
    tray: document.getElementById('tray'),
    hintRow: document.getElementById('hintRow'),
    fileInput: document.getElementById('fileInput'),
    downloadTemplateBtn: document.getElementById('downloadTemplateBtn'),
    downloadTemplateBtn2: document.getElementById('downloadTemplateBtn2'),
    newGameBtn: document.getElementById('newGameBtn'),
    gameGrid: null,
    errorModal: document.getElementById('errorModal'),
    errorMessage: document.getElementById('errorMessage'),
    closeErrorBtn: document.getElementById('closeErrorBtn'),
  };

  const MAX_ITEMS = 20;
  const TWO_COL_THRESHOLD = 10;

  const state = {
    title: '',
    lowerLabel: 'Lower',
    upperLabel: 'Upper',
    orderedItems: [],
    placed: [],
    availableItems: [],
    slots: [],
    selectedItemIndex: null,
    gameOver: false,
  };

  // --- Audio ---
  let audioCtx = null;
  let masterGain = null;
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.06;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }
  function playBeep(freq, durationMs, type = 'sine', startDelayMs = 0) {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + startDelayMs / 1000);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + startDelayMs / 1000 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (startDelayMs + durationMs) / 1000);
    osc.connect(gain).connect(masterGain);
    osc.start(ctx.currentTime + startDelayMs / 1000);
    osc.stop(ctx.currentTime + (startDelayMs + durationMs + 30) / 1000);
  }
  function playSuccessSound() {
    playBeep(660, 160, 'sine', 0);
    playBeep(880, 160, 'sine', 120);
  }
  function playErrorSound() {
    // ~2s sad buzzer: detuned saws, descending sweep, lowpass closing, subtle sub
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const dur = 2.0;

    // Master envelope for the buzzer
    const buzzGain = ctx.createGain();
    buzzGain.gain.setValueAtTime(0.001, now);
    buzzGain.gain.linearRampToValueAtTime(0.5, now + 0.03);
    buzzGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Lowpass filter sweep to make it feel like it closes/sighs
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(1600, now);
    lp.frequency.exponentialRampToValueAtTime(300, now + dur * 0.9);

    lp.connect(buzzGain).connect(masterGain);

    const makeBuzz = (detune) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + dur * 0.9);
      osc.detune.value = detune; // cents
      osc.connect(lp);
      osc.start(now);
      osc.stop(now + dur);
    };

    // Detuned stack for richness
    makeBuzz(-14);
    makeBuzz(0);
    makeBuzz(14);

    // Sub layer for sadness
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(55, now + dur * 0.9);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    sub.connect(subGain).connect(buzzGain);
    sub.start(now);
    sub.stop(now + dur);
  }

  function $(tag, opts = {}) {
    const e = document.createElement(tag);
    if (opts.className) e.className = opts.className;
    if (opts.text != null) e.textContent = opts.text;
    if (opts.html != null) e.innerHTML = opts.html;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k,v]) => e.setAttribute(k, v));
    return e;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function downsampleKeepOrder(array, max) {
    if (array.length <= max) return array.slice();
    const indices = Array.from({ length: array.length }, (_, i) => i);
    shuffle(indices);
    const chosen = indices.slice(0, max).sort((a, b) => a - b);
    return chosen.map(i => array[i]);
  }

  function cacheGameGrid() {
    if (!els.gameGrid) els.gameGrid = document.querySelector('.game-grid');
  }

  function resetUI() {
    els.timeline.innerHTML = '';
    els.timeline.classList.remove('reveal-mode');
    els.tray.innerHTML = '';
    els.hintRow.textContent = '';
    document.body.classList.remove('win', 'lose');
    cacheGameGrid();
    if (els.gameGrid) els.gameGrid.classList.remove('finished');
  }

  function toLanding() {
    state.gameOver = false;
    els.game.classList.add('hidden');
    els.landing.classList.remove('hidden');
  }

  function toGame() {
    els.landing.classList.add('hidden');
    els.game.classList.remove('hidden');
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsText(file, 'utf-8');
    });
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateTemplate() {
    return {
      title: 'Animal sizes',
      lowerLabel: 'Small',
      upperLabel: 'Big',
      _hint: 'List at least 2 items from lowerLabel → upperLabel (Small → Big). Max 20 items.',
      items: ['Ant','Spider','Mouse','Raven','Cat','Dog','Elephant']
    };
  }

  function setHint(msg) { els.hintRow.textContent = msg; }
  function showError(message) {
    if (!els.errorModal) { alert(message); return; }
    els.errorMessage.textContent = message;
    els.errorModal.showModal();
  }

  function startGameFromData(data) {
    if (!data || typeof data !== 'object') {
      showError('Invalid file format.');
      return;
    }
    const { title, lowerLabel, upperLabel, items } = data;
    if (!Array.isArray(items)) { showError('Missing items list.'); return; }
    if (typeof lowerLabel !== 'string' || typeof upperLabel !== 'string') { showError('Missing lowerLabel or upperLabel.'); return; }
    if (typeof title !== 'string' || title.trim() === '') { showError('Missing title.'); return; }
    if (items.length < 2) { showError('Provide at least 2 items.'); return; }

    state.title = title || 'Sort Quiz';
    state.lowerLabel = lowerLabel || 'Lower';
    state.upperLabel = upperLabel || 'Upper';

    const limited = downsampleKeepOrder(items, MAX_ITEMS);
    state.orderedItems = limited;

    state.availableItems = Array.from({ length: state.orderedItems.length }, (_, i) => i);

    const initialIndex = state.availableItems.splice(Math.floor(Math.random() * state.availableItems.length), 1)[0];
    state.placed = [initialIndex];
    state.placed.sort((a, b) => a - b);

    state.selectedItemIndex = null;
    state.gameOver = false;

    renderGame();
    toGame();
  }

  function renderGame() {
    resetUI();
    document.getElementById('gameTitle').textContent = state.title;
    document.getElementById('lowerLabel').textContent = state.lowerLabel;
    document.getElementById('upperLabel').textContent = state.upperLabel;

    const nPlaced = state.placed.length;
    state.slots = Array.from({ length: nPlaced + 1 }, (_, i) => ({ index: i }));

    els.timeline.innerHTML = '';
    renderSlot(nPlaced, nPlaced + 1);
    for (let i = nPlaced - 1; i >= 0; i--) {
      renderPlacedItem(state.placed[i]);
      renderSlot(i, i + 1);
    }

    const remaining = shuffle(state.availableItems.slice());
    els.tray.classList.toggle('two-col', remaining.length > TWO_COL_THRESHOLD);
    remaining.forEach((itemIdx) => {
      const chip = renderItemChip(itemIdx);
      chip.classList.add('compact');
      els.tray.appendChild(chip);
    });

    setHint('Drag an item into a numbered slot, or click an item then click a slot.');
  }

  function renderSlot(slotIndex, numberLabel) {
    const slot = $(
      'div',
      { className: 'slot', attrs: { 'data-slot-index': String(slotIndex), tabindex: '0' } }
    );
    const badge = $('div', { className: 'slot-number', text: String(numberLabel) });
    slot.appendChild(badge);

    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('active'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('active'));
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('active');
      const itemIdx = Number(e.dataTransfer.getData('text/item-index'));
      tryPlaceItemAtSlot(itemIdx, slotIndex);
    });

    slot.addEventListener('click', () => {
      if (state.selectedItemIndex != null) tryPlaceItemAtSlot(state.selectedItemIndex, slotIndex);
    });

    els.timeline.appendChild(slot);
  }

  function renderPlacedItem(itemIndex) {
    const card = $('div', { className: 'item-chip placed', text: state.orderedItems[itemIndex] });
    const wrapper = $('div', { className: 'slot filled' });
    wrapper.appendChild(card);
    els.timeline.appendChild(wrapper);
  }

  function renderItemChip(itemIndex) {
    const chip = $('div', { className: 'item-chip', text: state.orderedItems[itemIndex], attrs: { draggable: 'true', 'data-item-index': String(itemIndex), tabindex: '0' } });
    chip.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/item-index', String(itemIndex)); chip.classList.add('selected'); });
    chip.addEventListener('dragend', () => chip.classList.remove('selected'));
    chip.addEventListener('click', () => {
      const wasSelected = state.selectedItemIndex === itemIndex;
      clearSelections();
      if (!wasSelected) { state.selectedItemIndex = itemIndex; chip.classList.add('selected'); }
    });
    chip.addEventListener('keydown', (e) => {
      const num = Number(e.key);
      if (!Number.isNaN(num) && num >= 1 && num <= state.slots.length) tryPlaceItemAtSlot(itemIndex, num - 1);
    });
    return chip;
  }

  function clearSelections() {
    state.selectedItemIndex = null;
    document.querySelectorAll('.item-chip.selected').forEach((n) => n.classList.remove('selected'));
  }

  function isCorrectPlacement(itemIndex, slotIndex) {
    const leftNeighbor = state.placed[slotIndex - 1];
    const rightNeighbor = state.placed[slotIndex];
    return (leftNeighbor === undefined || leftNeighbor < itemIndex) && (rightNeighbor === undefined || itemIndex < rightNeighbor);
  }

  function tryPlaceItemAtSlot(itemIndex, slotIndex) {
    if (state.gameOver) return;
    if (!state.availableItems.includes(itemIndex)) { setHint('That item was already placed.'); return; }

    const correct = isCorrectPlacement(itemIndex, slotIndex);
    if (!correct) {
      playErrorSound();
      state.gameOver = true;
      document.body.classList.add('lose');
      centerFinalTimeline();
      revealCorrectOrder();
      return;
    }

    state.placed.splice(slotIndex, 0, itemIndex);
    state.availableItems = state.availableItems.filter((i) => i !== itemIndex);
    playSuccessSound();
    clearSelections();
    renderGame();

    if (state.availableItems.length === 0) {
      state.gameOver = true;
      document.body.classList.add('win');
      centerFinalTimeline();
      revealCorrectOrder();
    }
  }

  function centerFinalTimeline() { cacheGameGrid(); if (els.gameGrid) els.gameGrid.classList.add('finished'); }

  function revealCorrectOrder() {
    els.timeline.innerHTML = '';
    els.timeline.classList.add('reveal-mode');
    const total = state.orderedItems.length;
    const isWin = document.body.classList.contains('win');
    const chipClass = isWin ? 'item-chip win' : 'item-chip lose';
    for (let i = total - 1; i >= 0; i--) {
      const slot = $('div', { className: 'slot filled placed-reveal' });
      const card = $('div', { className: chipClass, text: state.orderedItems[i] });
      slot.appendChild(card);
      els.timeline.appendChild(slot);
    }
    els.tray.innerHTML = '';
    setTimeout(() => setHint('Correct order revealed!'), 200);
  }

  els.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await readFile(file);
      const data = JSON.parse(text);
      startGameFromData(data);
    } catch (err) {
      console.error(err);
      showError('Failed to read file. Ensure it is valid.');
    } finally {
      e.target.value = '';
    }
  });

  function onDownloadTemplate() {
    const data = generateTemplate();
    downloadText('my-animal-quiz.json', JSON.stringify(data, null, 2));
  }

  if (els.downloadTemplateBtn) els.downloadTemplateBtn.addEventListener('click', onDownloadTemplate);
  if (els.downloadTemplateBtn2) els.downloadTemplateBtn2.addEventListener('click', onDownloadTemplate);

  els.newGameBtn.addEventListener('click', () => {
    document.body.classList.remove('win', 'lose');
    cacheGameGrid();
    if (els.gameGrid) els.gameGrid.classList.remove('finished');
    toLanding();
  });

  if (els.closeErrorBtn) els.closeErrorBtn.addEventListener('click', () => els.errorModal.close());

  document.addEventListener('keydown', (e) => {
    if (state.selectedItemIndex == null) return;
    const num = Number(e.key);
    if (!Number.isNaN(num) && num >= 1 && num <= state.slots.length) tryPlaceItemAtSlot(state.selectedItemIndex, num - 1);
  });

  toLanding();
})(); 