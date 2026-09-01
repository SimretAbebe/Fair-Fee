import { api } from './services/api';
import { POPULAR_PRESETS, KNOWN_PROVIDERS } from './config/presets';
import {
  AppApiError,
  FeeComparisonResponse,
  FeeComparisonResult,
  FeeTier,
  FairnessCategory,
  ProviderFairnessReport,
  TransferType,
} from './types/api';
import {
  formatETB,
  formatNumber,
  formatPercent,
  getFairnessBadgeConfig,
  getPlainLanguageSummary,
  getProviderBrand,
  getTransferTypeLabel,
} from './utils/formatters';

interface ProviderTierGroup {
  id: string;
  transferType: TransferType | string;
  transferTypeLabel: string;
  channel: string;
  destinationWallet: string | null;
  tiers: FeeTier[];
  fairnessSummary: {
    isUnanimous: boolean;
    category?: FairnessCategory;
    mixedSummaryText?: string;
  };
}

interface AppState {
  currentView: 'compare' | 'directory';
  amount: number | null;
  transferType: TransferType;
  comparisonData: FeeComparisonResponse | null;
  sortOrder: 'fee-asc' | 'fee-desc' | 'percent-asc' | 'name-asc';
  isLoading: boolean;
  activeNotesRowIndex: number | null;
  directoryProvider: string | null;
  directoryData: ProviderFairnessReport | null;
  directoryGroups: ProviderTierGroup[];
  expandedGroupIds: Set<string>;
  expandedDirectoryNotesKeys: Set<string>;
  isDirectoryLoading: boolean;
}

const state: AppState = {
  currentView: 'compare',
  amount: null,
  transferType: 'interbank_mobile',
  comparisonData: null,
  sortOrder: 'fee-asc',
  isLoading: false,
  activeNotesRowIndex: null,
  directoryProvider: null,
  directoryData: null,
  directoryGroups: [],
  expandedGroupIds: new Set<string>(),
  expandedDirectoryNotesKeys: new Set<string>(),
  isDirectoryLoading: false,
};

const elements = {
  tabCompare: document.getElementById('tab-compare') as HTMLButtonElement,
  tabDirectory: document.getElementById('tab-directory') as HTMLButtonElement,
  viewCompare: document.getElementById('view-compare') as HTMLElement,
  viewDirectory: document.getElementById('view-directory') as HTMLElement,
  statusDot: document.getElementById('status-dot') as HTMLElement,
  statusText: document.getElementById('status-text') as HTMLElement,

  presetsContainer: document.getElementById('presets-container') as HTMLElement,

  compareForm: document.getElementById('compare-form') as HTMLFormElement,
  amountInput: document.getElementById('amount-input') as HTMLInputElement,
  transferTypeSelect: document.getElementById('transfer-type-select') as HTMLSelectElement,
  submitBtn: document.getElementById('submit-btn') as HTMLButtonElement,
  btnText: document.getElementById('btn-text') as HTMLElement,
  btnSpinner: document.getElementById('btn-spinner') as HTMLElement,

  alertBanner: document.getElementById('alert-banner') as HTMLElement,
  alertTitle: document.getElementById('alert-title') as HTMLElement,
  alertDesc: document.getElementById('alert-desc') as HTMLElement,
  alertIcon: document.getElementById('alert-icon') as HTMLElement,

  initialState: document.getElementById('initial-state') as HTMLElement,
  resultsWrapper: document.getElementById('results-wrapper') as HTMLElement,
  spotlightCard: document.getElementById('spotlight-card') as HTMLElement,
  comparisonTbody: document.getElementById('comparison-tbody') as HTMLElement,
  resultCountPill: document.getElementById('result-count-pill') as HTMLElement,
  sortSelect: document.getElementById('sort-select') as HTMLSelectElement,

  providerChips: document.getElementById('provider-chips') as HTMLElement,
  customProviderInput: document.getElementById('custom-provider-input') as HTMLInputElement,
  searchProviderBtn: document.getElementById('search-provider-btn') as HTMLButtonElement,
  directoryAlertBanner: document.getElementById('directory-alert-banner') as HTMLElement,
  directoryAlertTitle: document.getElementById('directory-alert-title') as HTMLElement,
  directoryAlertDesc: document.getElementById('directory-alert-desc') as HTMLElement,
  directoryResults: document.getElementById('directory-results') as HTMLElement,
  directoryProviderName: document.getElementById('directory-provider-name') as HTMLElement,
  directoryGroupCount: document.getElementById('directory-group-count') as HTMLElement,
  directoryTierCount: document.getElementById('directory-tier-count') as HTMLElement,
  directoryGroupsContainer: document.getElementById('directory-groups-container') as HTMLElement,
  expandAllBtn: document.getElementById('expand-all-btn') as HTMLButtonElement,
  collapseAllBtn: document.getElementById('collapse-all-btn') as HTMLButtonElement,
};

function init() {
  renderPresets();
  renderDirectoryProviderChips();
  bindEvents();
  checkApiHealth();
  parseUrlParams();
}

function renderPresets() {
  if (!elements.presetsContainer) return;

  elements.presetsContainer.innerHTML = POPULAR_PRESETS.map((preset) => `
    <button type="button" class="preset-card" data-preset-id="${preset.id}">
      <div class="preset-card-top">
        <span class="preset-amount">${formatNumber(preset.amount)} ETB</span>
        <span class="preset-tag">${preset.tag}</span>
      </div>
      <div class="preset-desc">${preset.description}</div>
    </button>
  `).join('');

  elements.presetsContainer.querySelectorAll<HTMLButtonElement>('.preset-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetId = btn.dataset.presetId;
      const preset = POPULAR_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        elements.amountInput.value = preset.amount.toString();
        elements.transferTypeSelect.value = preset.transfer_type;
        handleCompareSubmit(preset.amount, preset.transfer_type);
      }
    });
  });
}

function renderDirectoryProviderChips() {
  if (!elements.providerChips) return;

  elements.providerChips.innerHTML = KNOWN_PROVIDERS.map((p) => `
    <button type="button" class="provider-chip" data-provider-name="${p.name}">
      ${p.name}
    </button>
  `).join('');

  elements.providerChips.querySelectorAll<HTMLButtonElement>('.provider-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.providerName;
      if (name) {
        elements.customProviderInput.value = name;
        elements.providerChips.querySelectorAll('.provider-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        fetchProviderDirectory(name);
      }
    });
  });
}

function bindEvents() {
  elements.tabCompare.addEventListener('click', () => switchView('compare'));
  elements.tabDirectory.addEventListener('click', () => switchView('directory'));

  elements.compareForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amountVal = parseFloat(elements.amountInput.value);
    const transferTypeVal = elements.transferTypeSelect.value as TransferType;

    if (isNaN(amountVal) || amountVal <= 0) {
      showError(
        'error',
        'Invalid amount',
        'Please enter a valid transfer amount greater than 0 ETB.'
      );
      return;
    }

    handleCompareSubmit(amountVal, transferTypeVal);
  });

  elements.sortSelect.addEventListener('change', () => {
    state.sortOrder = elements.sortSelect.value as AppState['sortOrder'];
    if (state.comparisonData) {
      renderResults(state.comparisonData);
    }
  });

  elements.searchProviderBtn.addEventListener('click', () => {
    const val = elements.customProviderInput.value.trim();
    if (val) {
      fetchProviderDirectory(val);
    }
  });

  elements.customProviderInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = elements.customProviderInput.value.trim();
      if (val) {
        fetchProviderDirectory(val);
      }
    }
  });

  if (elements.expandAllBtn) {
    elements.expandAllBtn.addEventListener('click', () => {
      state.directoryGroups.forEach((g) => state.expandedGroupIds.add(g.id));
      renderDirectoryGroupCards();
    });
  }

  if (elements.collapseAllBtn) {
    elements.collapseAllBtn.addEventListener('click', () => {
      state.expandedGroupIds.clear();
      renderDirectoryGroupCards();
    });
  }
}

function switchView(view: 'compare' | 'directory') {
  state.currentView = view;
  if (view === 'compare') {
    elements.tabCompare.classList.add('active');
    elements.tabCompare.setAttribute('aria-selected', 'true');
    elements.tabDirectory.classList.remove('active');
    elements.tabDirectory.setAttribute('aria-selected', 'false');

    elements.viewCompare.style.display = 'block';
    elements.viewDirectory.style.display = 'none';
  } else {
    elements.tabDirectory.classList.add('active');
    elements.tabDirectory.setAttribute('aria-selected', 'true');
    elements.tabCompare.classList.remove('active');
    elements.tabCompare.setAttribute('aria-selected', 'false');

    elements.viewDirectory.style.display = 'block';
    elements.viewCompare.style.display = 'none';

    if (!state.directoryData && !state.isDirectoryLoading) {
      const firstChip = elements.providerChips.querySelector<HTMLButtonElement>('.provider-chip');
      if (firstChip) {
        firstChip.click();
      }
    }
  }
}

async function checkApiHealth() {
  try {
    const health = await api.checkHealth();
    if (health.online) {
      elements.statusDot.className = 'status-dot online';
      elements.statusText.textContent = 'API online';
    } else {
      elements.statusDot.className = 'status-dot offline';
      elements.statusText.textContent = 'API offline';
    }
  } catch {
    elements.statusDot.className = 'status-dot offline';
    elements.statusText.textContent = 'API offline';
  }
}

function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const amountParam = urlParams.get('amount');
  const typeParam = urlParams.get('transfer_type') || urlParams.get('type');

  if (amountParam && !isNaN(parseFloat(amountParam))) {
    elements.amountInput.value = amountParam;
    if (typeParam) {
      elements.transferTypeSelect.value = typeParam;
    }
    handleCompareSubmit(parseFloat(amountParam), elements.transferTypeSelect.value as TransferType);
  }
}

function syncUrlParams(amount: number, transferType: TransferType) {
  const url = new URL(window.location.href);
  url.searchParams.set('amount', amount.toString());
  url.searchParams.set('transfer_type', transferType);
  window.history.replaceState({}, '', url.toString());
}

async function handleCompareSubmit(amount: number, transferType: TransferType) {
  state.amount = amount;
  state.transferType = transferType;
  state.isLoading = true;
  hideError();
  setLoadingState(true);

  try {
    const data = await api.compareFees(amount, transferType);
    state.comparisonData = data;
    syncUrlParams(amount, transferType);
    renderResults(data);
  } catch (error: unknown) {
    handleApiError(error);
  } finally {
    state.isLoading = false;
    setLoadingState(false);
  }
}

function setLoadingState(loading: boolean) {
  if (loading) {
    elements.submitBtn.disabled = true;
    elements.btnText.textContent = 'Computing...';
    elements.btnSpinner.style.display = 'inline-block';
  } else {
    elements.submitBtn.disabled = false;
    elements.btnText.textContent = 'Compare fees';
    elements.btnSpinner.style.display = 'none';
  }
}

function renderResults(data: FeeComparisonResponse) {
  elements.initialState.style.display = 'none';
  elements.resultsWrapper.style.display = 'flex';

  const results = [...data.results];

  if (state.sortOrder === 'fee-asc') {
    results.sort((a, b) => a.computed_fee - b.computed_fee);
  } else if (state.sortOrder === 'fee-desc') {
    results.sort((a, b) => b.computed_fee - a.computed_fee);
  } else if (state.sortOrder === 'percent-asc') {
    results.sort((a, b) => a.fee_as_percent_of_amount - b.fee_as_percent_of_amount);
  } else if (state.sortOrder === 'name-asc') {
    results.sort((a, b) => a.provider_name.localeCompare(b.provider_name));
  }

  elements.resultCountPill.textContent = `${results.length} provider${results.length === 1 ? '' : 's'}`;

  renderSpotlight(data, results);
  renderTable(data, results);
}

function renderSpotlight(data: FeeComparisonResponse, sortedResults: FeeComparisonResult[]) {
  if (!sortedResults || sortedResults.length === 0) {
    elements.spotlightCard.innerHTML = '';
    return;
  }

  const cheapestResult = data.cheapest_provider
    ? sortedResults.find((r) => r.provider_name.toLowerCase() === data.cheapest_provider?.toLowerCase()) || sortedResults[0]
    : sortedResults[0];

  const highestResult = [...sortedResults].sort((a, b) => b.computed_fee - a.computed_fee)[0];
  const maxSavings = highestResult.computed_fee - cheapestResult.computed_fee;

  const brand = getProviderBrand(cheapestResult.provider_name);
  const fairnessBadge = getFairnessBadgeConfig(cheapestResult.fairness_category);
  const transferLabel = getTransferTypeLabel(data.transfer_type);

  elements.spotlightCard.innerHTML = `
    <div class="spotlight-header">
      <div class="spotlight-tag">
        Cheapest verified option
      </div>
      <div class="spotlight-meta-text">
        Transfer of <strong>${formatETB(data.amount)}</strong> via <strong>${transferLabel}</strong>
      </div>
    </div>

    <div class="spotlight-body">
      <div class="spotlight-provider">
        <div class="provider-avatar" style="background: ${brand.bg}; color: ${brand.textColor};">
          ${brand.abbr}
        </div>
        <div class="provider-info">
          <div class="provider-name">${cheapestResult.provider_name}</div>
          <div class="provider-sub">
            ${cheapestResult.channel.replace(/_/g, ' ')}
            ${cheapestResult.destination_wallet ? ` • ${cheapestResult.destination_wallet}` : ''}
          </div>
        </div>
      </div>

      <div class="spotlight-stat">
        <span class="stat-label">Computed transfer fee</span>
        <span class="stat-value highlight">
          ${cheapestResult.computed_fee === 0 ? 'Free' : formatETB(cheapestResult.computed_fee)}
        </span>
        <span class="stat-desc">${formatPercent(cheapestResult.fee_as_percent_of_amount)} of transfer</span>
      </div>

      <div class="spotlight-stat">
        <span class="stat-label">Fairness rating</span>
        <div style="margin: 4px 0 6px;">
          <span class="fairness-badge ${fairnessBadge.badgeClass}" title="${fairnessBadge.description}">
            <span class="badge-dot"></span>
            ${fairnessBadge.label}
          </span>
        </div>
        <span class="stat-desc">
          ${maxSavings > 0 ? `Saves <strong>${formatETB(maxSavings)}</strong> vs highest fee` : 'Lowest fee for this transfer'}
        </span>
      </div>
    </div>
  `;
}

function renderTable(data: FeeComparisonResponse, results: FeeComparisonResult[]) {
  const maxFee = Math.max(...results.map((r) => r.computed_fee), 1);
  const cheapestName = data.cheapest_provider?.toLowerCase();

  elements.comparisonTbody.innerHTML = results.map((item, index) => {
    const brand = getProviderBrand(item.provider_name);
    const badge = getFairnessBadgeConfig(item.fairness_category);
    const isCheapest = cheapestName ? item.provider_name.toLowerCase() === cheapestName : index === 0;
    const feeBarWidth = Math.max((item.computed_fee / maxFee) * 100, item.computed_fee === 0 ? 0 : 4);
    const isNotesOpen = state.activeNotesRowIndex === index;
    const plainSummary = getPlainLanguageSummary(item);

    let barColor = '#4B5563';
    if (badge.ratingLevel === 'best') barColor = '#059669';
    else if (badge.ratingLevel === 'good') barColor = '#2563EB';
    else if (badge.ratingLevel === 'fair') barColor = '#D97706';
    else if (badge.ratingLevel === 'poor' || badge.ratingLevel === 'worst') barColor = '#DC2626';

    return `
      <tr class="${isCheapest ? 'is-cheapest' : ''}">
        <td>
          <div class="table-provider-cell">
            <div class="table-provider-avatar" style="background: ${brand.bg}; color: ${brand.textColor};">
              ${brand.abbr}
            </div>
            <div class="table-provider-details">
              <div class="table-provider-name">
                ${item.provider_name}
                ${isCheapest ? `<span class="cheapest-microbadge">Cheapest</span>` : ''}
              </div>
              <div class="table-provider-channel">
                ${item.channel.replace(/_/g, ' ')}
                ${item.destination_wallet ? ` • ${item.destination_wallet}` : ''}
              </div>
            </div>
          </div>
        </td>

        <td>
          <div class="fee-cell-amount ${item.computed_fee === 0 ? 'is-zero' : ''}">
            ${item.computed_fee === 0 ? '0.00 ETB' : formatETB(item.computed_fee)}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            ${item.fee_type.replace(/_/g, ' ')}
          </div>
        </td>

        <td>
          <div class="fee-percent-bar-wrapper">
            <span class="fee-percent-text">${formatPercent(item.fee_as_percent_of_amount)}</span>
            <div class="fee-bar-track">
              <div class="fee-bar-fill" style="width: ${feeBarWidth}%; background-color: ${barColor};"></div>
            </div>
          </div>
        </td>

        <td>
          <span class="fairness-badge ${badge.badgeClass}" title="${badge.description}">
            <span class="badge-dot"></span>
            ${badge.label}
          </span>
        </td>

        <td>
          <div class="plain-fee-summary" style="font-weight: 500; color: var(--text-primary); line-height: 1.4;">
            ${plainSummary}
          </div>
          ${item.notes ? `
            <div style="margin-top: 6px;">
              <button type="button" class="notes-toggle-btn" data-toggle-index="${index}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                ${isNotesOpen ? 'Hide source details' : 'Source details'}
              </button>
            </div>
          ` : ''}
        </td>
      </tr>

      ${item.notes ? `
        <tr class="notes-drawer ${isNotesOpen ? 'open' : ''}" id="notes-row-${index}">
          <td colspan="5">
            <div class="notes-drawer-content">
              <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Source details & published notes:</div>
              <div>${item.notes}</div>
            </div>
          </td>
        </tr>
      ` : ''}
    `;
  }).join('');

  elements.comparisonTbody.querySelectorAll<HTMLButtonElement>('.notes-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.toggleIndex || '-1', 10);
      if (idx >= 0) {
        state.activeNotesRowIndex = state.activeNotesRowIndex === idx ? null : idx;
        renderTable(data, results);
      }
    });
  });
}

function buildTierGroups(tiers: FeeTier[]): ProviderTierGroup[] {
  const groupsMap = new Map<string, ProviderTierGroup>();

  tiers.forEach((tier) => {
    const key = `${tier.transfer_type}__${tier.channel}__${tier.destination_wallet || ''}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        id: key,
        transferType: tier.transfer_type,
        transferTypeLabel: getTransferTypeLabel(tier.transfer_type),
        channel: tier.channel,
        destinationWallet: tier.destination_wallet,
        tiers: [],
        fairnessSummary: {
          isUnanimous: true,
          categoriesCount: {},
        } as any,
      });
    }
    groupsMap.get(key)!.tiers.push(tier);
  });

  const groups = Array.from(groupsMap.values());

  groups.forEach((group) => {
    const categoriesCount: Record<string, number> = {};
    group.tiers.forEach((t) => {
      const cat = t.fairness_category;
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
    });

    const uniqueCategories = Object.keys(categoriesCount);

    if (uniqueCategories.length === 1) {
      group.fairnessSummary = {
        isUnanimous: true,
        category: uniqueCategories[0] as FairnessCategory,
      };
    } else {
      const parts = uniqueCategories.map((cat) => {
        const count = categoriesCount[cat];
        let shortName = cat;
        if (cat.includes('uncapped')) shortName = 'uncapped flat';
        else if (cat.includes('highly regressive')) shortName = 'highly regressive';
        else if (cat.includes('moderately regressive')) shortName = 'moderately regressive';
        else if (cat.includes('negligible')) shortName = 'negligible';
        else if (cat === 'proportional') shortName = 'proportional';
        else if (cat === 'free') shortName = 'free';

        return `${count} ${shortName}`;
      });

      group.fairnessSummary = {
        isUnanimous: false,
        mixedSummaryText: `Mixed: ${parts.join(', ')}`,
      };
    }
  });

  return groups;
}

async function fetchProviderDirectory(providerName: string) {
  state.directoryProvider = providerName;
  state.isDirectoryLoading = true;
  hideDirectoryError();
  elements.directoryResults.style.display = 'none';

  try {
    const report = await api.getProviderFairness(providerName);
    state.directoryData = report;
    state.directoryGroups = buildTierGroups(report.fee_tiers);

    state.expandedGroupIds.clear();
    if (state.directoryGroups.length > 0) {
      state.expandedGroupIds.add(state.directoryGroups[0].id);
    }

    renderDirectoryReport(report);
  } catch (error: unknown) {
    handleDirectoryError(error);
  } finally {
    state.isDirectoryLoading = false;
  }
}

function renderDirectoryReport(report: ProviderFairnessReport) {
  elements.directoryResults.style.display = 'block';
  elements.directoryProviderName.textContent = report.provider_name;
  elements.directoryGroupCount.textContent = `${state.directoryGroups.length} transfer type${state.directoryGroups.length === 1 ? '' : 's'}`;
  elements.directoryTierCount.textContent = `${report.total_fee_tiers} total tier${report.total_fee_tiers === 1 ? '' : 's'}`;

  renderDirectoryGroupCards();
}

function renderDirectoryGroupCards() {
  if (!elements.directoryGroupsContainer) return;

  elements.directoryGroupsContainer.innerHTML = state.directoryGroups.map((group) => {
    const isExpanded = state.expandedGroupIds.has(group.id);

    let fairnessIndicatorHtml = '';
    if (group.fairnessSummary.isUnanimous && group.fairnessSummary.category) {
      const badge = getFairnessBadgeConfig(group.fairnessSummary.category);
      fairnessIndicatorHtml = `
        <span class="fairness-badge ${badge.badgeClass}" title="${badge.description}">
          <span class="badge-dot"></span>
          ${badge.label}
        </span>
      `;
    } else {
      fairnessIndicatorHtml = `
        <span class="fairness-badge badge-neutral" title="${group.fairnessSummary.mixedSummaryText}">
          <span class="badge-dot"></span>
          ${group.fairnessSummary.mixedSummaryText}
        </span>
      `;
    }

    const channelText = `Channel: ${group.channel.replace(/_/g, ' ')}${group.destinationWallet ? ` • Destination: ${group.destinationWallet}` : ''}`;

    const tierRowsHtml = group.tiers.map((tier, tierIndex) => {
      const badge = getFairnessBadgeConfig(tier.fairness_category);
      const rangeText = `${formatNumber(tier.min_amount)} ETB — ${tier.max_amount !== null ? `${formatNumber(tier.max_amount)} ETB` : 'No cap'}`;
      const plainSummary = getPlainLanguageSummary(tier);
      const tierKey = `${group.id}__tier_${tierIndex}`;
      const isNotesOpen = state.expandedDirectoryNotesKeys.has(tierKey);

      return `
        <tr>
          <td style="font-weight: 600; color: var(--text-primary); white-space: nowrap;">
            ${rangeText}
          </td>

          <td>
            <div style="font-weight: 500; color: var(--text-primary); line-height: 1.4;">
              ${plainSummary}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              ${tier.fee_type.replace(/_/g, ' ')}
            </div>
          </td>

          <td>
            <span class="fairness-badge ${badge.badgeClass}" title="${badge.description}">
              <span class="badge-dot"></span>
              ${badge.label}
            </span>
          </td>

          <td>
            ${tier.notes ? `
              <button type="button" class="notes-toggle-btn dir-notes-btn" data-toggle-tier-key="${tierKey}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                ${isNotesOpen ? 'Hide details' : 'Source details'}
              </button>
            ` : `
              <span style="font-size: 0.8125rem; color: var(--text-muted);">—</span>
            `}
          </td>
        </tr>

        ${tier.notes ? `
          <tr class="notes-drawer ${isNotesOpen ? 'open' : ''}" id="dir-notes-row-${tierKey}">
            <td colspan="4">
              <div class="notes-drawer-content">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Source details & published notes:</div>
                <div>${tier.notes}</div>
              </div>
            </td>
          </tr>
        ` : ''}
      `;
    }).join('');

    return `
      <div class="directory-group-card ${isExpanded ? 'is-expanded' : ''}" data-group-id="${group.id}">
        <button type="button" class="directory-group-header" data-toggle-group-id="${group.id}">
          <div class="group-header-left">
            <div class="group-transfer-name">${group.transferTypeLabel}</div>
            <div class="group-transfer-channel">${channelText}</div>
          </div>

          <div class="group-header-right">
            <span class="count-pill">${group.tiers.length} tier${group.tiers.length === 1 ? '' : 's'}</span>
            ${fairnessIndicatorHtml}
            <svg class="group-chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </button>

        <div class="directory-group-content">
          <div class="comparison-table-wrapper">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>Tier range (ETB)</th>
                  <th>Fee description</th>
                  <th>Fairness rating</th>
                  <th>Source details</th>
                </tr>
              </thead>
              <tbody>
                ${tierRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }).join('');

  elements.directoryGroupsContainer.querySelectorAll<HTMLButtonElement>('.directory-group-header').forEach((btn) => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.toggleGroupId;
      if (groupId) {
        if (state.expandedGroupIds.has(groupId)) {
          state.expandedGroupIds.delete(groupId);
        } else {
          state.expandedGroupIds.add(groupId);
        }
        renderDirectoryGroupCards();
      }
    });
  });

  elements.directoryGroupsContainer.querySelectorAll<HTMLButtonElement>('.dir-notes-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tierKey = btn.dataset.toggleTierKey;
      if (tierKey) {
        if (state.expandedDirectoryNotesKeys.has(tierKey)) {
          state.expandedDirectoryNotesKeys.delete(tierKey);
        } else {
          state.expandedDirectoryNotesKeys.add(tierKey);
        }
        renderDirectoryGroupCards();
      }
    });
  });
}

function handleApiError(error: unknown) {
  elements.resultsWrapper.style.display = 'none';
  elements.initialState.style.display = 'none';

  if (error instanceof AppApiError) {
    if (error.type === 'validation') {
      showError(
        'error',
        'Validation notice (422)',
        error.details || 'Transfer amount must be a positive number greater than 0 ETB.'
      );
    } else if (error.type === 'not_found') {
      showError(
        'warning',
        'No providers found (404)',
        error.details || 'No provider published tariffs found for this transfer type and amount combination.'
      );
    } else if (error.type === 'network') {
      showError(
        'error',
        'API connection failed',
        `${error.message} Please check that the FastAPI server is running on ${api.getBaseUrl()}.`
      );
    } else {
      showError('error', 'Server error', error.message);
    }
  } else {
    showError(
      'error',
      'Unexpected error',
      error instanceof Error ? error.message : 'An unexpected error occurred.'
    );
  }
}

function handleDirectoryError(error: unknown) {
  elements.directoryResults.style.display = 'none';

  if (error instanceof AppApiError) {
    if (error.type === 'not_found') {
      showDirectoryError(
        'Provider not found (404)',
        error.details || `No published fee tiers found for provider '${state.directoryProvider}'.`
      );
    } else if (error.type === 'network') {
      showDirectoryError(
        'API connection failed',
        `Unable to reach Fair Fee API at ${api.getBaseUrl()}. Please ensure the backend is running.`
      );
    } else {
      showDirectoryError('Request error', error.message);
    }
  } else {
    showDirectoryError(
      'Error',
      error instanceof Error ? error.message : 'Failed to retrieve provider fee tiers.'
    );
  }
}

function showError(type: 'error' | 'warning', title: string, description: string) {
  elements.alertBanner.className = `alert-card ${type}`;
  elements.alertTitle.textContent = title;
  elements.alertDesc.textContent = description;
  elements.alertIcon.textContent = type === 'error' ? '🚫' : '⚠️';
  elements.alertBanner.style.display = 'flex';
}

function hideError() {
  elements.alertBanner.style.display = 'none';
}

function showDirectoryError(title: string, description: string) {
  elements.directoryAlertTitle.textContent = title;
  elements.directoryAlertDesc.textContent = description;
  elements.directoryAlertBanner.style.display = 'flex';
}

function hideDirectoryError() {
  elements.directoryAlertBanner.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);
