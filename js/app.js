// ============================================================
// メインアプリケーション
// ============================================================

const App = {
  state: {
    lessons: [],
    filterAssignee: 'all',
    isLoading: true,
    pollTimer: null,
    currentView: 'progress',
    stepViewPhase: CONFIG.STEP_VIEW.DEFAULT_PHASE,
    stepViewSort: 'default'
  },

  // ===== 初期化 =====
  async init() {
    // イベントリスナー
    document.getElementById('filterAssignee').addEventListener('change', (e) => {
      this.state.filterAssignee = e.target.value;
      this.renderStepProgressView();
      this.renderLessons();
    });

    // タブナビゲーション
    document.querySelectorAll('#headerTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchView(btn.dataset.view);
      });
    });

    // データ入力フォームを描画
    this.renderEntryForm();

    // 初回データ取得
    await this.loadData();

    // ポーリング開始
    this.state.pollTimer = setInterval(() => this.loadData(true), CONFIG.POLL_INTERVAL);
  },

  // ===== データ取得 =====
  async loadData(silent = false) {
    if (!silent) Components.showLoader(true);

    try {
      const data = await API.getAll();

      if (data.error) {
        Components.showToast('データ取得エラー: ' + data.error, 'error');
        return;
      }

      this.state.lessons = data.lessons || [];
      this.state.isLoading = false;

      this.updateFilterOptions();
      this.renderSummary();
      this.renderStepProgressView();
      this.renderLessons();

      // レビュービュー表示中ならダッシュボードも更新
      if (this.state.currentView === 'review') {
        this.renderReviewDashboard();
      }
    } catch (err) {
      Components.showToast('通信エラー: サーバーに接続できません', 'error');
    } finally {
      if (!silent) Components.showLoader(false);
    }
  },

  // ===== 担当者フィルターの選択肢を更新 =====
  updateFilterOptions() {
    const select = document.getElementById('filterAssignee');
    const current = select.value;
    const assignees = [...new Set(this.state.lessons.map(l => l.担当者名).filter(Boolean))];

    // 先頭の「全担当者」以外を削除
    while (select.options.length > 1) {
      select.remove(1);
    }

    assignees.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    // フィルター値を復元
    if (assignees.includes(current) || current === 'all') {
      select.value = current;
    } else {
      select.value = 'all';
      this.state.filterAssignee = 'all';
    }
  },

  // ===== サマリー描画 =====
  renderSummary() {
    const container = document.getElementById('summary');
    container.innerHTML = '';
    container.appendChild(Components.createSummary(this.state.lessons));
  },

  // ===== 工程別進捗ビュー描画 =====
  renderStepProgressView() {
    const container = document.getElementById('stepProgressView');
    container.innerHTML = '';

    let filtered = this.state.lessons;
    if (this.state.filterAssignee !== 'all') {
      filtered = filtered.filter(l => l.担当者名 === this.state.filterAssignee);
    }

    if (filtered.length === 0) return;

    filtered = this.sortLessonsForStepView(filtered, this.state.stepViewPhase, this.state.stepViewSort);

    const view = Components.createStepProgressView(
      filtered,
      this.state.stepViewPhase,
      this.state.stepViewSort
    );

    // トグルイベント
    view.querySelectorAll('.phase-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.stepViewPhase = btn.dataset.phase;
        this.renderStepProgressView();
      });
    });

    // ソートイベント
    const sortSelect = view.querySelector('#stepProgressSort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.stepViewSort = e.target.value;
        this.renderStepProgressView();
      });
    }

    container.appendChild(view);
  },

  // ===== 工程別進捗ビュー: ソート =====
  sortLessonsForStepView(lessons, phase, sortKey) {
    const sorted = [...lessons];
    switch (sortKey) {
      case 'progress_asc':
        sorted.sort((a, b) => a.進捗率[phase] - b.進捗率[phase]);
        break;
      case 'progress_desc':
        sorted.sort((a, b) => b.進捗率[phase] - a.進捗率[phase]);
        break;
      case 'assignee':
        sorted.sort((a, b) => (a.担当者名 || '').localeCompare(b.担当者名 || ''));
        break;
      default:
        break;
    }
    return sorted;
  },

  // ===== レッスンカード描画 =====
  renderLessons() {
    const grid = document.getElementById('lessonGrid');
    grid.innerHTML = '';

    let filtered = this.state.lessons;
    if (this.state.filterAssignee !== 'all') {
      filtered = filtered.filter(l => l.担当者名 === this.state.filterAssignee);
    }

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state">レッスンがありません</div>';
      return;
    }

    filtered.forEach(lesson => {
      const card = Components.createLessonCard(
        lesson,
        (rowIndex, columnName, value) => this.onCheckboxChange(rowIndex, columnName, value),
        (rowIndex, lessonName) => this.onDeleteLesson(rowIndex, lessonName),
        (rowIndex, stepName) => this.onReviewRequest(rowIndex, stepName, lesson.レッスン名)
      );
      grid.appendChild(card);
    });
  },

  // ===== チェックボックス変更（楽観的更新） =====
  async onCheckboxChange(rowIndex, columnName, newValue) {
    // ローカルの state を即時更新
    const lesson = this.state.lessons.find(l => l.rowIndex === rowIndex);
    if (!lesson) return;

    const phase = CONFIG.前工程.includes(columnName) ? '前工程' : '後工程';
    const oldValue = lesson[phase][columnName];
    lesson[phase][columnName] = newValue;

    // 進捗率を再計算
    const preCount = CONFIG.前工程.filter(k => lesson.前工程[k]).length;
    const postCount = CONFIG.後工程.filter(k => lesson.後工程[k]).length;
    const totalSteps = CONFIG.前工程.length + CONFIG.後工程.length;
    lesson.進捗率.全体 = Math.round(((preCount + postCount) / totalSteps) * 100);
    lesson.進捗率.前工程 = Math.round((preCount / CONFIG.前工程.length) * 100);
    lesson.進捗率.後工程 = Math.round((postCount / CONFIG.後工程.length) * 100);

    // サマリー＋工程別ビュー再描画（カード内のプログレスバーも更新）
    this.renderSummary();
    this.renderStepProgressView();
    this.updateCardProgress(rowIndex, lesson);

    // バックグラウンドで GAS に送信
    try {
      const result = await API.updateCheckbox(rowIndex, columnName, newValue);
      if (result.error) {
        throw new Error(result.error);
      }
    } catch (err) {
      // 失敗時はロールバック
      lesson[phase][columnName] = oldValue;
      Components.showToast('更新に失敗しました。元に戻します。', 'error');
      await this.loadData();
    }
  },

  // ===== カード内プログレスバーだけ更新 =====
  updateCardProgress(rowIndex, lesson) {
    const card = document.querySelector(`.lesson-card[data-row-index="${rowIndex}"]`);
    if (!card) return;

    const progressArea = card.querySelector('.card-progress');
    progressArea.innerHTML = '';
    progressArea.appendChild(Components.createProgressBar(lesson.進捗率.全体, CONFIG.COLORS.primary, '全体'));
    progressArea.appendChild(Components.createProgressBar(lesson.進捗率.前工程, CONFIG.COLORS.前工程, '前工程'));
    progressArea.appendChild(Components.createProgressBar(lesson.進捗率.後工程, CONFIG.COLORS.後工程, '後工程'));

    // フェーズバッジ更新
    const existingBadgeRow = card.querySelector('.phase-badge-row');
    if (existingBadgeRow) {
      existingBadgeRow.replaceWith(Components.createPhaseBadgeRow(lesson));
    }
  },

  // ===== レビュー依頼送信 =====
  async onReviewRequest(rowIndex, stepName, lessonName) {
    try {
      const result = await API.requestReview(rowIndex, stepName);
      if (result.error) {
        throw new Error(result.error);
      }
      Components.showToast(
        `「${lessonName}」の${stepName}のレビュー依頼を送信しました`,
        'success'
      );
    } catch (err) {
      Components.showToast('レビュー依頼の送信に失敗しました', 'error');
      throw err;
    }
  },

  // ===== レッスン削除 =====
  async onDeleteLesson(rowIndex, lessonName) {
    if (!confirm(`「${lessonName}」を削除しますか？\nこの操作は元に戻せません。`)) {
      return;
    }

    Components.showLoader(true);
    try {
      const result = await API.deleteLesson(rowIndex);
      if (result.error) {
        Components.showToast('削除失敗: ' + result.error, 'error');
        return;
      }
      Components.showToast('レッスンを削除しました', 'success');
      await this.loadData();
    } catch (err) {
      Components.showToast('通信エラー: 削除に失敗しました', 'error');
    } finally {
      Components.showLoader(false);
    }
  },

  // ===== ビュー切り替え =====
  switchView(viewName) {
    this.state.currentView = viewName;

    // ビューパネル切り替え
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('view-active');
    });

    let targetPanel;
    switch (viewName) {
      case 'progress':
        targetPanel = document.getElementById('viewProgress');
        break;
      case 'entry':
        targetPanel = document.getElementById('viewEntry');
        break;
      case 'review':
        targetPanel = document.getElementById('viewReview');
        break;
      default:
        targetPanel = document.getElementById('viewProgress');
    }
    targetPanel.classList.add('view-active');

    // タブのアクティブ状態
    document.querySelectorAll('#headerTabs .tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // 進捗管理ビュー固有のコントロール表示/非表示
    const controls = document.getElementById('headerControls');
    controls.style.display = viewName === 'progress' ? '' : 'none';

    // レビューダッシュボードを描画
    if (viewName === 'review') {
      this.renderReviewDashboard();
    }
  },

  // ===== データ入力フォーム描画 =====
  renderEntryForm() {
    const container = document.getElementById('entryForm');
    container.innerHTML = '';
    const form = Components.createEntryForm(
      (formData) => this.onEntryFormSubmit(formData),
      () => {}
    );
    container.appendChild(form);
  },

  // ============================================================
  // 定例レビューダッシュボード
  // ============================================================

  // ===== レビューデータ計算 =====
  computeReviewData(lessons) {
    const statusGroups = {
      released: [],
      nearRelease: [],
      inProgress: [],
      notStarted: []
    };

    const assignees = {};
    const delays = [];

    lessons.forEach(lesson => {
      // ステータス分類
      const status = Components.categorizeLesson(lesson);
      statusGroups[status.key].push(lesson);

      // 担当者別集計
      const name = lesson.担当者名 || '（未割当）';
      if (!assignees[name]) {
        assignees[name] = { lessons: [] };
      }
      assignees[name].lessons.push(lesson);

      // 遅延検出
      const delay = Components.detectDelay(lesson);
      if (delay.isDelayed || delay.isWarning) {
        delays.push({
          lesson: lesson,
          daysOverdue: delay.daysOverdue,
          isWarning: delay.isWarning,
          isDelayed: delay.isDelayed
        });
      }
    });

    // 遅延を超過日数順にソート（超過大→小、警告はその後）
    delays.sort((a, b) => {
      if (a.isDelayed && !b.isDelayed) return -1;
      if (!a.isDelayed && b.isDelayed) return 1;
      return b.daysOverdue - a.daysOverdue;
    });

    // ボトルネック工程を計算（進行中レッスンのみ）
    const bottleneckSteps = this.computeBottleneckSteps(lessons);

    // 最悪の遅延教材（アラートバー用、上位2件）
    const worstDelays = delays.filter(d => d.isDelayed).slice(0, 2);

    const stats = {
      total: lessons.length,
      released: statusGroups.released.length,
      nearRelease: statusGroups.nearRelease.length,
      inProgress: statusGroups.inProgress.length,
      notStarted: statusGroups.notStarted.length,
      avgProgress: lessons.length > 0
        ? Math.round(lessons.reduce((s, l) => s + l.進捗率.全体, 0) / lessons.length)
        : 0,
      avgPreProgress: lessons.length > 0
        ? Math.round(lessons.reduce((s, l) => s + l.進捗率.前工程, 0) / lessons.length)
        : 0,
      avgPostProgress: lessons.length > 0
        ? Math.round(lessons.reduce((s, l) => s + l.進捗率.後工程, 0) / lessons.length)
        : 0,
      delayCount: delays.filter(d => d.isDelayed).length,
      warningCount: delays.filter(d => d.isWarning).length,
      bottleneckSteps,
      worstDelays
    };

    return { statusGroups, assignees, delays, stats };
  },

  // ===== ボトルネック工程計算 =====
  computeBottleneckSteps(lessons) {
    const stepCounts = {};

    lessons.forEach(lesson => {
      // 進行中レッスンのみ対象（進捗0%と100%は除外）
      if (lesson.進捗率.全体 === 0 || lesson.進捗率.全体 === 100) return;

      const nextStep = Components.getNextPendingStep(lesson);
      if (!nextStep) return;

      const phase = CONFIG.前工程.includes(nextStep) ? '前工程' : '後工程';
      if (!stepCounts[nextStep]) {
        stepCounts[nextStep] = { step: nextStep, count: 0, phase };
      }
      stepCounts[nextStep].count++;
    });

    // 件数順にソート → 上位3件
    return Object.values(stepCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  },

  // ===== レポートテキスト生成 =====
  generateReportText(stats, delays) {
    const lines = [];

    // 全体概要
    lines.push(`全 <span class="report-highlight">${stats.total}件</span> の教材のうち、`);
    lines.push(`<span class="report-highlight">${stats.released}件</span> がリリース済み、`);

    if (stats.nearRelease > 0) {
      lines.push(`<span class="report-highlight">${stats.nearRelease}件</span> がリリース間近、`);
    }

    lines.push(`<span class="report-highlight">${stats.inProgress}件</span> が進行中、`);
    lines.push(`<span class="report-highlight">${stats.notStarted}件</span> が未着手です。`);

    // 平均進捗
    lines.push(`<br>全体の平均進捗率は <span class="report-highlight">${stats.avgProgress}%</span> です。`);

    // 遅延状況
    if (stats.delayCount > 0) {
      lines.push(`<br>⚠️ <span class="report-highlight report-danger">${stats.delayCount}件</span> の教材で納期超過が発生しています。`);
    }
    if (stats.warningCount > 0) {
      lines.push(`⏰ <span class="report-highlight report-warning">${stats.warningCount}件</span> の教材が納期間近（7日以内）です。`);
    }
    if (stats.delayCount === 0 && stats.warningCount === 0) {
      lines.push(`<br>✅ 現在、スケジュールの遅延はありません。`);
    }

    return lines.join('');
  },

  // ===== レビューダッシュボード描画 =====
  renderReviewDashboard() {
    const container = document.getElementById('reviewDashboard');
    container.innerHTML = '';

    if (this.state.lessons.length === 0) {
      container.innerHTML = '<div class="empty-state">データがありません。進捗管理でレッスンを登録してください。</div>';
      return;
    }

    const reviewData = this.computeReviewData(this.state.lessons);

    // セクション1: 総論レポート（ビジュアルダッシュボード）
    container.appendChild(Components.createReviewSummaryReport(reviewData));

    // セクション2: 教材ステータス一覧
    container.appendChild(Components.createStatusOverview(reviewData.statusGroups));

    // セクション3: 担当者別稼働状況
    container.appendChild(Components.createAssigneeWorkload(reviewData.assignees));

    // セクション4: 遅延アラート
    container.appendChild(Components.createDelayAlerts(reviewData.delays));
  },

  // ===== データ入力フォーム送信 =====
  async onEntryFormSubmit(formData) {
    if (!formData.担当者名 || !formData.レッスン名) {
      Components.showToast('担当者名とレッスン名は必須です', 'error');
      return;
    }

    Components.showLoader(true);
    try {
      const result = await API.addLessonWithData(formData);
      if (result.error) {
        Components.showToast('登録失敗: ' + result.error, 'error');
        return;
      }
      // フォルダ作成結果に応じたトースト表示
      if (result.folderUrl) {
        Components.showToast('レッスンを登録しました（フォルダ作成済み）', 'success');
        Components.showFolderLinkModal(formData.レッスン名, result.folderUrl);
      } else if (result.folderError) {
        Components.showToast('レッスン登録済み（フォルダ作成失敗）', 'info');
      } else {
        Components.showToast('レッスンを登録しました', 'success');
      }

      // フォームリセット
      const form = document.getElementById('dataEntryForm');
      if (form) form.reset();

      // データリロードして進捗管理ビューに切り替え
      await this.loadData();
      this.switchView('progress');
    } catch (err) {
      Components.showToast('通信エラー: 登録に失敗しました', 'error');
    } finally {
      Components.showLoader(false);
    }
  }
};

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', () => App.init());
