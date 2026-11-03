// NoScroll Shorts - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // デフォルト設定
  const defaultSettings = {
    blockScroll: true,
    hideDownButton: true,
    hideNextItems: true,
    showWatchButton: true,
    hideShortsFeed: false,
    redirectToWatch: false,
    stopOnEnd: false,
    timerMinutes: 0,
    showToast: true,
    escapeUrl: 'https://www.google.com',
    stats: {
      blockedCount: 0,
      savedSeconds: 0
    }
  };

  // DOM要素
  const toggles = {
    blockScroll: document.getElementById('blockScroll'),
    hideNextItems: document.getElementById('hideNextItems'),
    showWatchButton: document.getElementById('showWatchButton'),
    stopOnEnd: document.getElementById('stopOnEnd'),
    hideShortsFeed: document.getElementById('hideShortsFeed'),
    redirectToWatch: document.getElementById('redirectToWatch'),
    showToast: document.getElementById('showToast')
  };

  const escapeUrlInput = document.getElementById('escapeUrl');
  const masterCard = document.querySelector('.master-card');
  const masterStatusText = document.getElementById('masterStatusText');
  const timerSelect = document.getElementById('timerMinutes');
  const blockedCountElem = document.getElementById('blockedCount');
  const savedMinutesElem = document.getElementById('savedMinutes');
  const resetStatsBtn = document.getElementById('resetStatsBtn');
  const globalStatus = document.getElementById('globalStatus');

  // 設定のロード
  chrome.storage.local.get(defaultSettings, (settings) => {
    // 各トグルの状態を反映
    for (const [key, element] of Object.entries(toggles)) {
      if (element) {
        element.checked = Boolean(settings[key]);
      }
    }

    if (timerSelect) {
      timerSelect.value = String(settings.timerMinutes || 0);
    }

    if (escapeUrlInput) {
      escapeUrlInput.value = settings.escapeUrl || 'https://www.google.com';
    }

    updateStatsDisplay(settings.stats);
    updateMasterSwitchDisplay(settings.blockScroll);
  });

  // トグルの変更リスナー
  for (const [key, element] of Object.entries(toggles)) {
    if (element) {
      element.addEventListener('change', () => {
        const update = { [key]: element.checked };

        // blockScrollが変更された場合
        if (key === 'blockScroll') {
          update.hideDownButton = element.checked;
          updateMasterSwitchDisplay(element.checked);
        }

        chrome.storage.local.set(update);
      });
    }
  }

  // 脱出先URLの変更リスナー
  if (escapeUrlInput) {
    let escapeTimer = null;
    escapeUrlInput.addEventListener('input', () => {
      clearTimeout(escapeTimer);
      escapeTimer = setTimeout(() => {
        let val = escapeUrlInput.value.trim();
        if (!val) val = 'https://www.google.com';
        chrome.storage.local.set({ escapeUrl: val });
      }, 400);
    });
  }

  // タイマーセレクトの変更リスナー
  if (timerSelect) {
    timerSelect.addEventListener('change', () => {
      chrome.storage.local.set({
        timerMinutes: parseInt(timerSelect.value, 10) || 0
      });
    });
  }

  // 統計リセットボタン
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', () => {
      const emptyStats = { blockedCount: 0, savedSeconds: 0 };
      chrome.storage.local.set({ stats: emptyStats }, () => {
        updateStatsDisplay(emptyStats);
      });
    });
  }

  // マスタースイッチの表示更新
  function updateMasterSwitchDisplay(isBlocked) {
    if (masterStatusText) {
      masterStatusText.textContent = isBlocked ? 'スクロール禁止: 有効 (遮断中)' : 'スクロール禁止: 無効 (許可中)';
    }
    if (masterCard) {
      if (isBlocked) {
        masterCard.classList.remove('inactive');
      } else {
        masterCard.classList.add('inactive');
      }
    }
    if (globalStatus) {
      if (isBlocked) {
        globalStatus.textContent = '遮断中';
        globalStatus.style.background = 'rgba(255, 45, 85, 0.15)';
        globalStatus.style.borderColor = 'rgba(255, 45, 85, 0.4)';
        globalStatus.style.color = '#ff3b65';
      } else {
        globalStatus.textContent = '解除中';
        globalStatus.style.background = 'rgba(0, 229, 255, 0.12)';
        globalStatus.style.borderColor = 'rgba(0, 229, 255, 0.3)';
        globalStatus.style.color = '#00e5ff';
      }
    }
  }

  // 統計表示の更新
  function updateStatsDisplay(stats) {
    const s = stats || { blockedCount: 0, savedSeconds: 0 };
    if (blockedCountElem) {
      blockedCountElem.textContent = s.blockedCount.toLocaleString();
    }
    if (savedMinutesElem) {
      const minutes = Math.floor((s.savedSeconds || 0) / 60);
      savedMinutesElem.textContent = minutes > 0 ? `${minutes}分` : `${s.savedSeconds || 0}秒`;
    }
  }

  // ストレージ変更をリッスンして統計をリアルタイム反映
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.stats) {
        updateStatsDisplay(changes.stats.newValue);
      }
      if (changes.blockScroll && toggles.blockScroll) {
        toggles.blockScroll.checked = changes.blockScroll.newValue;
        updateMasterSwitchDisplay(changes.blockScroll.newValue);
      }
      if (changes.escapeUrl && escapeUrlInput && document.activeElement !== escapeUrlInput) {
        escapeUrlInput.value = changes.escapeUrl.newValue;
      }
    }
  });
});
