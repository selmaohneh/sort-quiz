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
    // Pick indices uniformly at random without replacement, then sort to keep order
    const indices = Array.from({ length: array.length }, (_, i) => i);
    shuffle(indices);
    const chosen = indices.slice(0, max).sort((a, b) => a - b);
    return chosen.map(i => array[i]);
  }

  function cacheGameGrid() {
    if (!els.gameGrid) {
      els.gameGrid = document.querySelector('.game-grid');
    }
  }

  function resetUI() {
    els.timeline.innerHTML = '';
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
      _hint: 'List items from lowerLabel → upperLabel (Small → Big). Max 20 items.',
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
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      showError('Missing required fields: title, lowerLabel, upperLabel, items[].');
      return;
    }
    if (data.items.length < 3) {
      showError('Provide at least 3 items.');
      return;
    }

    state.title = data.title || 'Timeline Quiz';
    state.lowerLabel = data.lowerLabel || 'Lower';
    state.upperLabel = data.upperLabel || 'Upper';

    // Enforce max items by random downsampling while keeping order
    const items = downsampleKeepOrder(data.items, MAX_ITEMS);
    state.orderedItems = items;

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

    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('active');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('active'));
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('active');
      const itemIdx = Number(e.dataTransfer.getData('text/item-index'));
      tryPlaceItemAtSlot(itemIdx, slotIndex);
    });

    slot.addEventListener('click', () => {
      if (state.selectedItemIndex != null) {
        tryPlaceItemAtSlot(state.selectedItemIndex, slotIndex);
      }
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

    chip.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/item-index', String(itemIndex));
      chip.classList.add('selected');
    });
    chip.addEventListener('dragend', () => chip.classList.remove('selected'));

    chip.addEventListener('click', () => {
      const wasSelected = state.selectedItemIndex === itemIndex;
      clearSelections();
      if (!wasSelected) {
        state.selectedItemIndex = itemIndex;
        chip.classList.add('selected');
      }
    });

    chip.addEventListener('keydown', (e) => {
      const num = Number(e.key);
      if (!Number.isNaN(num) && num >= 1 && num <= state.slots.length) {
        tryPlaceItemAtSlot(itemIndex, num - 1);
      }
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
    const leftOk = leftNeighbor === undefined || leftNeighbor < itemIndex;
    const rightOk = rightNeighbor === undefined || itemIndex < rightNeighbor;
    return leftOk && rightOk;
  }

  function tryPlaceItemAtSlot(itemIndex, slotIndex) {
    if (state.gameOver) return;
    if (!state.availableItems.includes(itemIndex)) {
      setHint('That item was already placed.');
      return;
    }

    const correct = isCorrectPlacement(itemIndex, slotIndex);

    if (!correct) {
      state.gameOver = true;
      document.body.classList.add('lose');
      centerFinalTimeline();
      revealCorrectOrder();
      return;
    }

    state.placed.splice(slotIndex, 0, itemIndex);
    state.availableItems = state.availableItems.filter((i) => i !== itemIndex);

    clearSelections();

    renderGame();

    if (state.availableItems.length === 0) {
      state.gameOver = true;
      document.body.classList.add('win');
      centerFinalTimeline();
      revealCorrectOrder();
      return;
    }
  }

  function centerFinalTimeline() {
    cacheGameGrid();
    if (els.gameGrid) els.gameGrid.classList.add('finished');
  }

  function revealCorrectOrder() {
    els.timeline.innerHTML = '';
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

  // Wire controls
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
    if (!Number.isNaN(num) && num >= 1 && num <= state.slots.length) {
      tryPlaceItemAtSlot(state.selectedItemIndex, num - 1);
    }
  });

  toLanding();
})(); 