// ============================================================
// メインアプリケーション
// ============================================================

const App = {
  state: {
    lessons: [],
    filterAssignee: 'all',
    isLoading: true,
    pollTimer: null
  },

  // ===== 初期化 =====
  async init() {
    // イベントリスナー
    document.getElementById('filterAssignee').addEventListener('change', (e) => {
      this.state.filterAssignee = e.target.value;
      this.renderLessons();
    });

    document.getElementById('addLessonBtn').addEventListener('click', () => {
      Components.createAddModal(
        (担当者名, レッスン名) => this.onAddLesson(担当者名, レッスン名),
        () => {}
      );
    });

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
      this.renderLessons();
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

    // サマリーだけ再描画（カード内のプログレスバーも更新）
    this.renderSummary();
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
  },

  // ===== レッスン追加 =====
  async onAddLesson(担当者名, レッスン名) {
    Components.showLoader(true);
    try {
      const result = await API.addLesson(担当者名, レッスン名);
      if (result.error) {
        Components.showToast('追加失敗: ' + result.error, 'error');
        return;
      }
      Components.showToast('レッスンを追加しました', 'success');
      await this.loadData();
    } catch (err) {
      Components.showToast('通信エラー: 追加に失敗しました', 'error');
    } finally {
      Components.showLoader(false);
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
  }
};

// ===== 起動 =====
document.addEventListener('DOMContentLoaded', () => App.init());
