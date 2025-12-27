// API Configuration
const API_BASE = 'https://api.frankfurter.app';

// State Management
const state = {
  currencies: {},
  favorites: JSON.parse(localStorage.getItem('favorites')) || ['USD', 'EUR', 'GBP', 'INR', 'JPY'],
  history: JSON.parse(localStorage.getItem('history')) || [],
  rates: {},
  lastUpdate: null,
  calcDisplay: '0'
};

// DOM Elements
const elements = {
  amount: document.getElementById('amount'),
  fromCurrency: document.getElementById('fromCurrency'),
  toCurrency: document.getElementById('toCurrency'),
  resultContainer: document.getElementById('resultContainer'),
  resultAmount: document.getElementById('resultAmount'),
  resultRate: document.getElementById('resultRate'),
  resultDate: document.getElementById('resultDate'),
  loader: document.getElementById('loader'),
  historyList: document.getElementById('historyList'),
  liveRates: document.getElementById('liveRates'),
  lastUpdate: document.getElementById('lastUpdate'),
  baseRateCurrency: document.getElementById('baseRateCurrency'),
  swapBtn: document.getElementById('swapBtn'),
  starFrom: document.getElementById('starFrom'),
  starTo: document.getElementById('starTo'),
  clearHistory: document.getElementById('clearHistory'),
  quickButtons: document.getElementById('quickButtons'),
  calcBtn: document.getElementById('calcBtn'),
  calculatorModal: document.getElementById('calculatorModal'),
  closeCalc: document.getElementById('closeCalc'),
  calcDisplay: document.getElementById('calcDisplay'),
  calcClear: document.getElementById('calcClear')
};

// Popular Currency Pairs
const popularPairs = [
  { from: 'USD', to: 'EUR', name: 'USD → EUR' },
  { from: 'EUR', to: 'USD', name: 'EUR → USD' },
  { from: 'USD', to: 'GBP', name: 'USD → GBP' },
  { from: 'USD', to: 'INR', name: 'USD → INR' },
  { from: 'EUR', to: 'GBP', name: 'EUR → GBP' },
  { from: 'GBP', to: 'INR', name: 'GBP → INR' }
];

// Initialize App
async function init() {
  await loadCurrencies();
  setupEventListeners();
  renderQuickButtons();
  updateStarButtons();
  renderHistory();
  await fetchLiveRates();
  
  // Auto-convert on load
  convertCurrency();
  
  // Update rates every minute
  setInterval(fetchLiveRates, 60000);
}

// Load Currencies
async function loadCurrencies() {
  try {
    const response = await fetch(`${API_BASE}/currencies`);
    state.currencies = await response.json();
    populateCurrencySelects();
  } catch (error) {
    console.error('Error loading currencies:', error);
  }
}

// Populate Currency Dropdowns
function populateCurrencySelects() {
  const favoritesOptgroup = (select) => {
    const group = document.createElement('optgroup');
    group.label = '⭐ Favorites';
    state.favorites.forEach(code => {
      if (state.currencies[code]) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${state.currencies[code]}`;
        group.appendChild(option);
      }
    });
    return group;
  };

  const allCurrenciesOptgroup = () => {
    const group = document.createElement('optgroup');
    group.label = 'All Currencies';
    Object.entries(state.currencies).forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${code} - ${name}`;
      group.appendChild(option);
    });
    return group;
  };

  [elements.fromCurrency, elements.toCurrency].forEach(select => {
    select.innerHTML = '';
    select.appendChild(favoritesOptgroup(select));
    select.appendChild(allCurrenciesOptgroup());
  });

  elements.fromCurrency.value = 'USD';
  elements.toCurrency.value = 'INR';
}

// Convert Currency
async function convertCurrency() {
  const amount = parseFloat(elements.amount.value);
  const from = elements.fromCurrency.value;
  const to = elements.toCurrency.value;

  if (!amount || amount <= 0 || isNaN(amount)) {
    elements.resultContainer.classList.add('hidden');
    return;
  }

  if (from === to) {
    displayResult(amount, amount, 1, new Date().toISOString().split('T')[0]);
    return;
  }

  showLoader();

  try {
    const response = await fetch(`${API_BASE}/latest?amount=${amount}&from=${from}&to=${to}`);
    const data = await response.json();
    const convertedAmount = data.rates[to];
    const rate = convertedAmount / amount;

    displayResult(amount, convertedAmount, rate, data.date);
    addToHistory(amount, from, to, convertedAmount, rate);
  } catch (error) {
    console.error('Conversion error:', error);
    alert('Error converting currency. Please try again.');
  } finally {
    hideLoader();
  }
}

// Display Result
function displayResult(amount, converted, rate, date) {
  const from = elements.fromCurrency.value;
  const to = elements.toCurrency.value;

  elements.resultAmount.textContent = `${converted.toFixed(2)} ${to}`;
  elements.resultRate.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
  elements.resultDate.textContent = `As of ${date}`;
  
  elements.resultContainer.classList.remove('hidden');
}

// Show/Hide Loader
function showLoader() {
  elements.loader.classList.remove('hidden');
  elements.resultContainer.classList.add('hidden');
}

function hideLoader() {
  elements.loader.classList.add('hidden');
}

// Fetch Live Rates
async function fetchLiveRates() {
  const from = elements.fromCurrency.value;
  
  try {
    const response = await fetch(`${API_BASE}/latest?from=${from}`);
    const data = await response.json();
    state.rates = data.rates;
    state.lastUpdate = new Date();
    
    elements.baseRateCurrency.textContent = from;
    elements.lastUpdate.textContent = `Last updated: ${state.lastUpdate.toLocaleTimeString()}`;
    
    renderLiveRates();
  } catch (error) {
    console.error('Error fetching rates:', error);
  }
}

// Render Live Rates
function renderLiveRates() {
  const sortedRates = Object.entries(state.rates)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (sortedRates.length === 0) {
    elements.liveRates.innerHTML = '<p class="loading-text">Loading rates...</p>';
    return;
  }

  elements.liveRates.innerHTML = sortedRates.map(([currency, rate]) => `
    <div class="rate-item" onclick="selectToCurrency('${currency}')">
      <span class="rate-currency">${currency}</span>
      <span class="rate-value">${rate.toFixed(4)}</span>
    </div>
  `).join('');
}

// Select To Currency
function selectToCurrency(currency) {
  elements.toCurrency.value = currency;
  updateStarButtons();
  convertCurrency();
}

// Add to History
function addToHistory(amount, from, to, result, rate) {
  const entry = {
    id: Date.now(),
    amount,
    from,
    to,
    result,
    rate,
    date: new Date().toLocaleString()
  };

  state.history = [entry, ...state.history].slice(0, 20);
  localStorage.setItem('history', JSON.stringify(state.history));
  renderHistory();
}

// Render History
function renderHistory() {
  if (state.history.length === 0) {
    elements.historyList.innerHTML = '<p class="empty-text">No history yet</p>';
    return;
  }

  elements.historyList.innerHTML = state.history.map(entry => `
    <div class="history-item" onclick="loadFromHistory(${entry.id})">
      <div class="history-conversion">
        ${entry.amount} ${entry.from} → ${entry.result.toFixed(2)} ${entry.to}
      </div>
      <div class="history-date">${entry.date}</div>
    </div>
  `).join('');
}

// Load from History
function loadFromHistory(id) {
  const entry = state.history.find(h => h.id === id);
  if (entry) {
    elements.amount.value = entry.amount;
    elements.fromCurrency.value = entry.from;
    elements.toCurrency.value = entry.to;
    updateStarButtons();
    convertCurrency();
  }
}

// Clear History
function clearHistoryHandler() {
  if (confirm('Are you sure you want to clear all history?')) {
    state.history = [];
    localStorage.removeItem('history');
    renderHistory();
  }
}

// Swap Currencies
function swapCurrencies() {
  const temp = elements.fromCurrency.value;
  elements.fromCurrency.value = elements.toCurrency.value;
  elements.toCurrency.value = temp;
  updateStarButtons();
  convertCurrency();
  fetchLiveRates();
}

// Toggle Favorite
function toggleFavorite(currency, starBtn) {
  if (state.favorites.includes(currency)) {
    state.favorites = state.favorites.filter(c => c !== currency);
  } else {
    state.favorites.push(currency);
  }
  
  localStorage.setItem('favorites', JSON.stringify(state.favorites));
  populateCurrencySelects();
  
  // Restore selected values
  const from = elements.fromCurrency.value;
  const to = elements.toCurrency.value;
  elements.fromCurrency.value = from;
  elements.toCurrency.value = to;
  
  updateStarButtons();
}

// Update Star Buttons
function updateStarButtons() {
  const from = elements.fromCurrency.value;
  const to = elements.toCurrency.value;

  elements.starFrom.classList.toggle('active', state.favorites.includes(from));
  elements.starTo.classList.toggle('active', state.favorites.includes(to));
}

// Render Quick Buttons
function renderQuickButtons() {
  elements.quickButtons.innerHTML = popularPairs.map(pair => `
    <button class="quick-btn" onclick="selectQuickPair('${pair.from}', '${pair.to}')">
      ${pair.name}
    </button>
  `).join('');
}

// Select Quick Pair
function selectQuickPair(from, to) {
  elements.fromCurrency.value = from;
  elements.toCurrency.value = to;
  updateStarButtons();
  convertCurrency();
  fetchLiveRates();
}

// Calculator Functions
function showCalculator() {
  elements.calculatorModal.classList.remove('hidden');
  state.calcDisplay = elements.amount.value || '0';
  elements.calcDisplay.textContent = state.calcDisplay;
}

function hideCalculator() {
  elements.calculatorModal.classList.add('hidden');
}

function handleCalcInput(value) {
  if (state.calcDisplay === '0' && value !== '.') {
    state.calcDisplay = value;
  } else if (value === '.' && state.calcDisplay.includes('.')) {
    return;
  } else {
    state.calcDisplay += value;
  }
  elements.calcDisplay.textContent = state.calcDisplay;
}

function calculateResult() {
  try {
    const result = eval(state.calcDisplay);
    state.calcDisplay = result.toString();
    elements.calcDisplay.textContent = state.calcDisplay;
    elements.amount.value = result;
    hideCalculator();
    convertCurrency();
  } catch (error) {
    state.calcDisplay = 'Error';
    elements.calcDisplay.textContent = state.calcDisplay;
    setTimeout(() => {
      state.calcDisplay = '0';
      elements.calcDisplay.textContent = state.calcDisplay;
    }, 1000);
  }
}

function clearCalculator() {
  state.calcDisplay = '0';
  elements.calcDisplay.textContent = state.calcDisplay;
}

// Event Listeners
function setupEventListeners() {
  // Amount input
  elements.amount.addEventListener('input', () => {
    convertCurrency();
  });

  // Currency selects
  elements.fromCurrency.addEventListener('change', () => {
    updateStarButtons();
    convertCurrency();
    fetchLiveRates();
  });

  elements.toCurrency.addEventListener('change', () => {
    updateStarButtons();
    convertCurrency();
  });

  // Swap button
  elements.swapBtn.addEventListener('click', swapCurrencies);

  // Star buttons
  elements.starFrom.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(elements.fromCurrency.value, elements.starFrom);
  });

  elements.starTo.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(elements.toCurrency.value, elements.starTo);
  });

  // Clear history
  elements.clearHistory.addEventListener('click', clearHistoryHandler);

  // Calculator
  elements.calcBtn.addEventListener('click', showCalculator);
  elements.closeCalc.addEventListener('click', hideCalculator);
  elements.calcClear.addEventListener('click', clearCalculator);

  // Calculator buttons
  document.querySelectorAll('.calc-btn-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      if (value === '=') {
        calculateResult();
      } else {
        handleCalcInput(value);
      }
    });
  });

  // Close modal on outside click
  elements.calculatorModal.addEventListener('click', (e) => {
    if (e.target === elements.calculatorModal) {
      hideCalculator();
    }
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !elements.calculatorModal.classList.contains('hidden')) {
      calculateResult();
    }
    if (e.key === 'Escape') {
      hideCalculator();
    }
  });
}

// Make functions global for onclick handlers
window.selectToCurrency = selectToCurrency;
window.loadFromHistory = loadFromHistory;
window.selectQuickPair = selectQuickPair;

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);