// NoScroll Shorts - Content Script
// YouTube Shorts scroll blocker and dopamine detox Chrome extension

(function () {
  'use strict';

  // OSS Lucide Icons (MIT License) - Clean SVG Definitions
  const ICONS = {
    shield: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    tv: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tv"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>',
    externalLink: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link"><path d="M15 3h6v6"/><path d="10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    globe: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
    home: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    rotateCcw: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    alertTriangle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  };

  // デフォルト設定
  const defaultSettings = {
    blockScroll: true,       // スクロール・次送り封殺 (ポップアップでON/OFF切替)
    hideDownButton: true,    // 下に行くボタン非表示
    hideNextItems: true,     // 下の項目（次の動画）完全消滅
    showWatchButton: true,   // Watchビューへ行くボタンを表示
    hideShortsFeed: false,   // ホーム・検索のShorts棚を全消去
    redirectToWatch: false,  // 通常のYouTubeプレーヤー(/watch)に自動転送
    stopOnEnd: false,        // 1本見たら自動一時停止 (ループ防止)
    timerMinutes: 0,         // ドパガキタイマー (0: 無効)
    showToast: true,         // ブロック通知トースト
    escapeUrl: 'https://www.google.com', // 視聴後ポップアップの脱出URL (変更可)
    stats: {
      blockedCount: 0,
      savedSeconds: 0
    }
  };

  let currentSettings = { ...defaultSettings };
  let currentShortsVideoId = null;
  let timerInterval = null;
  let timeSpentOnShorts = 0; // 秒
  let toastElement = null;
  let toastTimeout = null;
  let blockedSessionCount = 0;
  let watchBtnElement = null;

  // ---------------------------------------------------------
  // ページ判定 & URLユーティリティ
  // ---------------------------------------------------------
  function isShortsPage() {
    return window.location.pathname.startsWith('/shorts');
  }

  function isWatchPage() {
    return window.location.pathname.startsWith('/watch');
  }

  function getShortsVideoId() {
    const match = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  // ---------------------------------------------------------
  // 設定のロードと適用 (Watchビューでは何もしない)
  // ---------------------------------------------------------
  function applyHtmlAttributes(settings) {
    const root = document.documentElement;
    if (!root) return;

    // Note: watchビューでは一切の属性を付与しない (完全にネイティブ動作)
    if (isWatchPage()) {
      root.removeAttribute('data-block-scroll');
      root.removeAttribute('data-hide-down-button');
      root.removeAttribute('data-hide-next-items');
      root.removeAttribute('data-hide-shorts-feed');
      return;
    }

    if (isShortsPage()) {
      const isLocked = Boolean(settings.blockScroll);
      root.setAttribute('data-block-scroll', isLocked ? 'true' : 'false');
      root.setAttribute('data-hide-down-button', isLocked ? 'true' : 'false');
      root.setAttribute('data-hide-next-items', isLocked && settings.hideNextItems ? 'true' : 'false');
      root.removeAttribute('data-hide-shorts-feed');
    } else {
      // ホームや検索画面など
      root.removeAttribute('data-block-scroll');
      root.removeAttribute('data-hide-down-button');
      root.removeAttribute('data-hide-next-items');
      root.setAttribute('data-hide-shorts-feed', settings.hideShortsFeed ? 'true' : 'false');
    }
  }

  function loadSettings(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(defaultSettings, (stored) => {
        currentSettings = { ...defaultSettings, ...stored };
        applyHtmlAttributes(currentSettings);
        if (callback) callback(currentSettings);
      });
    } else {
      applyHtmlAttributes(currentSettings);
      if (callback) callback(currentSettings);
    }
  }

  // 初期ロード (document_start で最速属性付与)
  loadSettings();

  // ポップアップ等での設定変更をリアルタイム同期
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        for (const [key, value] of Object.entries(changes)) {
          currentSettings[key] = value.newValue;
        }
        applyHtmlAttributes(currentSettings);
        updateWatchButton();
      }
    });
  }

  // ---------------------------------------------------------
  // 画面上のWatch遷移ボタン (通常プレーヤーで見る)
  // ---------------------------------------------------------
  function updateWatchButton() {
    // watchビューやShorts以外、または設定でOFFの場合は即座に削除
    if (!isShortsPage() || !currentSettings.showWatchButton) {
      if (watchBtnElement) {
        watchBtnElement.remove();
        watchBtnElement = null;
      }
      return;
    }

    if (!watchBtnElement) {
      watchBtnElement = document.createElement('button');
      watchBtnElement.type = 'button';
      watchBtnElement.id = 'noscroll-to-watch-btn';
      watchBtnElement.setAttribute('title', '現在の動画を通常のYouTube動画プレーヤーで開きます');
      document.body.appendChild(watchBtnElement);

      watchBtnElement.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        goToWatchView();
      };
    }

    watchBtnElement.innerHTML = `
      <span class="btn-icon">${ICONS.tv}</span>
      <span>通常プレーヤー(Watch)で見る</span>
      <span class="btn-arrow">${ICONS.externalLink}</span>
    `;
  }

  // 通常動画(Watch)へジャンプ
  function goToWatchView() {
    const videoId = getShortsVideoId();
    let watchUrl = 'https://www.youtube.com/';

    if (videoId) {
      watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } else {
      watchUrl = window.location.href.replace('/shorts/', '/watch?v=');
    }

    // 現在の再生秒数を取得して引き継ぐ
    const activeVideo = document.querySelector('ytd-reel-video-renderer[is-active] video') ||
                        document.querySelector('video');
    if (activeVideo && activeVideo.currentTime > 1) {
      const t = Math.floor(activeVideo.currentTime);
      watchUrl += `${watchUrl.includes('?') ? '&' : '?'}t=${t}s`;
    }

    window.location.href = watchUrl;
  }

  // ---------------------------------------------------------
  // トースト通知（スクロール遮断時の視覚フィードバック）
  // ---------------------------------------------------------
  function showBlockToast() {
    if (!currentSettings.showToast || !isShortsPage()) return;

    if (!toastElement) {
      toastElement = document.createElement('div');
      toastElement.className = 'noscroll-shield-toast';
      document.body.appendChild(toastElement);
    }

    toastElement.innerHTML = `
      <span class="toast-icon">${ICONS.shield}</span>
      <span>スクロールを阻止しました</span>
      <span class="toast-count">#${blockedSessionCount}</span>
    `;

    toastElement.classList.add('visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      if (toastElement) {
        toastElement.classList.remove('visible');
      }
    }, 1200);
  }

  // 統計カウント加算 (Throttle)
  let pendingBlockCount = 0;
  let saveTimer = null;

  function recordBlock() {
    blockedSessionCount++;
    pendingBlockCount++;

    showBlockToast();

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ stats: { blockedCount: 0, savedSeconds: 0 } }, (data) => {
          const stats = data.stats || { blockedCount: 0, savedSeconds: 0 };
          stats.blockedCount += pendingBlockCount;
          stats.savedSeconds += pendingBlockCount * 20;
          pendingBlockCount = 0;
          chrome.storage.local.set({ stats });
        });
      }
    }, 600);
  }

  // ---------------------------------------------------------
  // 鉄壁のイベント遮断 (スクロール・ホイール・キーボード・タッチ)
  // Note: isShortsPage() かつ ポップアップ設定の blockScroll が ON のときのみ発動
  // ---------------------------------------------------------

  // 1. ホイール (マウスホイール / トラックパッド)
  window.addEventListener(
    'wheel',
    function (e) {
      if (!isShortsPage() || !currentSettings.blockScroll) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      recordBlock();
      return false;
    },
    { capture: true, passive: false }
  );

  // 2. キーボード (ArrowDown, PageDown, Space等での次送り防止)
  window.addEventListener(
    'keydown',
    function (e) {
      if (!isShortsPage() || !currentSettings.blockScroll) return;

      // コメント入力フォームや検索バー内での操作は除外
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // 下スクロール / 次送りキー
      const blockedKeys = ['ArrowDown', 'Down', 'PageDown', 'End'];
      if (blockedKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        recordBlock();
        return false;
      }

      // YouTube Shorts でリール移動に割り当てられているキー (j / k など)
      if (e.key === 'j' || e.key === 'J' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        recordBlock();
        return false;
      }
    },
    { capture: true, passive: false }
  );

  // 3. タッチ操作 / スワイプ防止
  let touchStartY = 0;
  window.addEventListener(
    'touchstart',
    function (e) {
      if (!isShortsPage() || !currentSettings.blockScroll) return;
      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    },
    { capture: true, passive: true }
  );

  window.addEventListener(
    'touchmove',
    function (e) {
      if (!isShortsPage() || !currentSettings.blockScroll) return;
      if (e.touches && e.touches.length > 0) {
        const deltaY = e.touches[0].clientY - touchStartY;
        if (Math.abs(deltaY) > 8) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          recordBlock();
          return false;
        }
      }
    },
    { capture: true, passive: false }
  );

  // 4. クリックイベント遮断（次へボタンや下矢印ボタンのクリックを横取り）
  window.addEventListener(
    'click',
    function (e) {
      if (!isShortsPage() || !currentSettings.blockScroll) return;

      const target = e.target;
      if (!target) return;

      const nextBtn = target.closest(
        '#navigation-button-down, [aria-label*="Next"], [aria-label*="次の動画"], [aria-label*="次へ"]'
      );
      if (nextBtn) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        recordBlock();
        return false;
      }
    },
    { capture: true }
  );

  // ---------------------------------------------------------
  // ドパガキ対策: 通常プレーヤー (/watch) 自動転送モード
  // ---------------------------------------------------------
  function checkRedirectToWatch() {
    if (!currentSettings.redirectToWatch) return false;

    const videoId = getShortsVideoId();
    if (videoId) {
      const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
      window.location.replace(newUrl);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------
  // モーダル用アクションボタンHTML生成 (Googleトップ, YouTubeトップ, Watchビュー, リプレイ)
  // ---------------------------------------------------------
  function getModalActionButtonsHtml(watchUrl) {
    let escapeUrl = (currentSettings.escapeUrl || '').trim();
    if (!escapeUrl) escapeUrl = 'https://www.google.com';
    if (!escapeUrl.startsWith('http://') && !escapeUrl.startsWith('https://')) {
      escapeUrl = 'https://' + escapeUrl;
    }

    let escapeLabel = 'Googleトップ (変更可)';
    try {
      const parsed = new URL(escapeUrl);
      if (parsed.hostname.includes('google.')) {
        escapeLabel = 'Googleトップへ脱出';
      } else {
        escapeLabel = `${parsed.hostname} へ脱出`;
      }
    } catch (e) {
      escapeLabel = 'Googleトップ (変更可)';
    }

    return `
      <div class="noscroll-modal-actions">
        <!-- 1. Googleトップ (変更可) -->
        <a href="${escapeUrl}" class="noscroll-btn-escape">
          <span class="btn-icon">${ICONS.globe}</span>
          <span>${escapeLabel}</span>
        </a>

        <!-- 2. YouTubeトップ -->
        <a href="https://www.youtube.com/" class="noscroll-btn-yt">
          <span class="btn-icon">${ICONS.home}</span>
          <span>YouTubeトップ</span>
        </a>

        <!-- 3. watchビュー -->
        <a href="${watchUrl}" class="noscroll-btn-watch">
          <span class="btn-icon">${ICONS.tv}</span>
          <span>Watchビューでじっくり見る</span>
        </a>

        <!-- 4. もう一度見る (リプレイ) -->
        <button type="button" class="noscroll-btn-replay" id="noscroll-replay-btn">
          <span class="btn-icon-inline">${ICONS.rotateCcw}</span>
          <span>もう一度この動画を見る</span>
        </button>
      </div>
    `;
  }

  // ---------------------------------------------------------
  // ドパガキ対策: 1本見たら自動停止 (ループ防止)
  // ---------------------------------------------------------
  let activeVideoElement = null;
  let videoEndedModalShown = false;

  function setupVideoStopOnEnd() {
    if (!currentSettings.stopOnEnd || !isShortsPage()) return;

    const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]');
    const video = activeReel ? activeReel.querySelector('video') : document.querySelector('ytd-shorts video');

    if (!video || video === activeVideoElement) return;
    activeVideoElement = video;
    videoEndedModalShown = false;

    video.addEventListener('timeupdate', function () {
      if (!currentSettings.stopOnEnd || videoEndedModalShown) return;

      // 動画の末尾0.3秒前で停止（自動ループ防止）
      if (video.duration > 0 && video.currentTime >= video.duration - 0.3) {
        video.pause();
        videoEndedModalShown = true;
        showEndStopperModal();
      }
    });

    video.addEventListener('ended', function () {
      if (!currentSettings.stopOnEnd || videoEndedModalShown) return;
      video.pause();
      videoEndedModalShown = true;
      showEndStopperModal();
    });
  }

  function showEndStopperModal() {
    if (document.querySelector('.noscroll-dopamine-overlay')) return;

    const videoId = getShortsVideoId();
    const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : 'https://www.youtube.com/';

    const overlay = document.createElement('div');
    overlay.className = 'noscroll-dopamine-overlay';
    overlay.innerHTML = `
      <div class="noscroll-modal-card">
        <div class="noscroll-modal-badge">Playback Finished</div>
        <h2 class="noscroll-modal-title">1本視聴完了</h2>
        <p class="noscroll-modal-desc">
          動画の再生が終了しました。<br>
          次の動画への無限スワイプは遮断されています。<br>
          ここで一息ついて、自分のやるべきことに戻りましょう。
        </p>
        <div class="noscroll-modal-stats">
          <span class="stats-icon">${ICONS.checkCircle}</span>
          <span>ドパミン消費ストップ。集中力を守り抜きました</span>
        </div>
        ${getModalActionButtonsHtml(watchUrl)}
      </div>
    `;

    document.body.appendChild(overlay);

    const replayBtn = overlay.querySelector('#noscroll-replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        overlay.remove();
        videoEndedModalShown = false;
        if (activeVideoElement) {
          activeVideoElement.currentTime = 0;
          activeVideoElement.play();
        }
      });
    }
  }

  // ---------------------------------------------------------
  // ドパガキ対策: 警告タイマー
  // ---------------------------------------------------------
  function startShortsTimer() {
    clearInterval(timerInterval);
    timeSpentOnShorts = 0;

    if (!isShortsPage() || currentSettings.timerMinutes <= 0) return;

    const targetSeconds = currentSettings.timerMinutes * 60;

    timerInterval = setInterval(() => {
      if (!isShortsPage()) {
        clearInterval(timerInterval);
        return;
      }

      timeSpentOnShorts++;

      if (timeSpentOnShorts >= targetSeconds) {
        clearInterval(timerInterval);
        showTimerAlertModal();
      }
    }, 1000);
  }

  function showTimerAlertModal() {
    if (document.querySelector('.noscroll-dopamine-overlay')) return;

    // 再生中の動画を一時停止
    const videos = document.querySelectorAll('video');
    videos.forEach((v) => v.pause());

    const videoId = getShortsVideoId();
    const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : 'https://www.youtube.com/';

    const overlay = document.createElement('div');
    overlay.className = 'noscroll-dopamine-overlay';
    overlay.innerHTML = `
      <div class="noscroll-modal-card">
        <div class="noscroll-modal-badge" style="background: rgba(255, 59, 48, 0.2); color: #ff3b30; border-color: #ff3b30;">
          Time Limit Exceeded
        </div>
        <h2 class="noscroll-modal-title">
          <span class="modal-alert-icon">${ICONS.alertTriangle}</span>
          制限時間到達
        </h2>
        <p class="noscroll-modal-desc">
          Shortsの制限時間（${currentSettings.timerMinutes}分）が経過しました。<br>
          これ以上見ても脳が疲れるだけです。<br>
          深呼吸をして、画面を閉じて現実に戻りましょう。
        </p>
        <div class="noscroll-modal-stats">
          <span class="stats-icon">${ICONS.clock}</span>
          <span>滞在時間: ${currentSettings.timerMinutes}分達成</span>
        </div>
        ${getModalActionButtonsHtml(watchUrl)}
      </div>
    `;

    document.body.appendChild(overlay);

    const replayBtn = overlay.querySelector('#noscroll-replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        overlay.remove();
        timeSpentOnShorts = (currentSettings.timerMinutes - 1) * 60;
        startShortsTimer();
        const activeVideo = document.querySelector('video');
        if (activeVideo) activeVideo.play();
      });
    }
  }

  // ---------------------------------------------------------
  // ナビゲーション・SPA遷移のハンドリング
  // Note: watchビューでは何もしないクリーンアップ
  // ---------------------------------------------------------
  function handleLocationChange() {
    applyHtmlAttributes(currentSettings);

    // watchビューにいる場合は、拡張機能のUI要素を全て消去し、何もしない
    if (isWatchPage()) {
      clearInterval(timerInterval);
      timeSpentOnShorts = 0;
      if (watchBtnElement) {
        watchBtnElement.remove();
        watchBtnElement = null;
      }
      const existingOverlay = document.querySelector('.noscroll-dopamine-overlay');
      if (existingOverlay) existingOverlay.remove();
      return;
    }

    if (checkRedirectToWatch()) return;

    if (isShortsPage()) {
      const newVideoId = getShortsVideoId();
      if (newVideoId !== currentShortsVideoId) {
        currentShortsVideoId = newVideoId;
        videoEndedModalShown = false;
        const existingOverlay = document.querySelector('.noscroll-dopamine-overlay');
        if (existingOverlay) existingOverlay.remove();
      }

      startShortsTimer();
      setupVideoStopOnEnd();
      updateWatchButton();
    } else {
      clearInterval(timerInterval);
      timeSpentOnShorts = 0;
      if (watchBtnElement) {
        watchBtnElement.remove();
        watchBtnElement = null;
      }
      const existingOverlay = document.querySelector('.noscroll-dopamine-overlay');
      if (existingOverlay) existingOverlay.remove();
    }
  }

  // YouTube SPA ナビゲーションイベント
  window.addEventListener('yt-navigate-finish', handleLocationChange);
  window.addEventListener('popstate', handleLocationChange);

  // MutationObserver は間引き(Debounce)して安全に実行
  let debounceTimeout = null;
  const observer = new MutationObserver(() => {
    if (debounceTimeout) return;
    debounceTimeout = setTimeout(() => {
      debounceTimeout = null;
      if (isShortsPage()) {
        if (!document.getElementById('noscroll-to-watch-btn')) {
          updateWatchButton();
        }
        setupVideoStopOnEnd();
      }
    }, 250);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true });
      handleLocationChange();
    });
  }

  // 初回実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleLocationChange);
  } else {
    handleLocationChange();
  }
})();
