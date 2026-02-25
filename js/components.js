// ============================================================
// UIコンポーネント生成関数
// ============================================================

const Components = {

  // ========== グラデーションヘルパー ==========
  _gradientMap: {
    '#7C3AED': 'linear-gradient(135deg, #7C3AED, #9F67FF)',
    '#10B981': 'linear-gradient(135deg, #10B981, #34D399)',
    '#F59E0B': 'linear-gradient(135deg, #F59E0B, #FBBF24)',
    '#EF4444': 'linear-gradient(135deg, #EF4444, #F87171)',
    '#9CA3AF': 'linear-gradient(135deg, #9CA3AF, #D1D5DB)'
  },

  getGradient(color) {
    return this._gradientMap[color] || color;
  },

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // ========== プログレスバー ==========
  createProgressBar(percent, color, label) {
    const wrapper = document.createElement('div');
    wrapper.className = 'progress-wrapper';

    wrapper.innerHTML = `
      <div class="progress-label-row">
        <span class="progress-label">${label}</span>
        <span class="progress-percent">${percent}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percent}%; background: ${this.getGradient(color)};"></div>
      </div>
    `;
    return wrapper;
  },

  // ========== サマリーセクション ==========
  createSummary(lessons) {
    const container = document.createElement('div');
    container.className = 'summary-cards';

    const total = lessons.length;
    const completed = lessons.filter(l => l.進捗率.全体 === 100).length;
    const inProgress = total - completed;

    const avgAll = total > 0 ? Math.round(lessons.reduce((s, l) => s + l.進捗率.全体, 0) / total) : 0;
    const avgPre = total > 0 ? Math.round(lessons.reduce((s, l) => s + l.進捗率.前工程, 0) / total) : 0;
    const avgPost = total > 0 ? Math.round(lessons.reduce((s, l) => s + l.進捗率.後工程, 0) / total) : 0;

    container.innerHTML = `
      <div class="summary-stat-row">
        <div class="stat-card">
          <div class="stat-number">${total}</div>
          <div class="stat-label">総レッスン</div>
        </div>
        <div class="stat-card">
          <div class="stat-number stat-completed">${completed}</div>
          <div class="stat-label">完了</div>
        </div>
        <div class="stat-card">
          <div class="stat-number stat-progress">${inProgress}</div>
          <div class="stat-label">進行中</div>
        </div>
      </div>
    `;

    container.appendChild(this.createProgressBar(avgAll, CONFIG.COLORS.primary, '全体平均'));
    container.appendChild(this.createProgressBar(avgPre, CONFIG.COLORS.前工程, '前工程平均'));
    container.appendChild(this.createProgressBar(avgPost, CONFIG.COLORS.後工程, '後工程平均'));

    return container;
  },

  // ========== チェックボックス項目 ==========
  createCheckboxItem(label, checked, onChange, onReviewRequest) {
    const item = document.createElement('div');
    item.className = 'checkbox-item' + (checked ? ' checked' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;

    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';

    const text = document.createElement('span');
    text.className = 'checkbox-label-text';
    text.textContent = label;

    // div全体のクリックでトグル
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const newVal = !checkbox.checked;
      checkbox.checked = newVal;
      item.classList.toggle('checked', newVal);
      onChange(newVal);
    });

    item.appendChild(checkbox);
    item.appendChild(checkmark);
    item.appendChild(text);

    // レビュー依頼ボタン（マネージャーCK項目のみ）
    if (onReviewRequest) {
      const btn = document.createElement('button');
      btn.className = 'btn-review-request';
      btn.textContent = 'レビュー依頼';
      btn.title = 'マネージャーにレビュー依頼を送信';

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        btn.disabled = true;
        btn.textContent = '送信中...';

        onReviewRequest().then(() => {
          btn.textContent = '送信済み ✓';
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'レビュー依頼';
          }, 3000);
        }).catch(() => {
          btn.disabled = false;
          btn.textContent = 'レビュー依頼';
        });
      });

      item.appendChild(btn);
    }

    return item;
  },

  // ========== 工程セクション（前工程/後工程） ==========
  createProcessSection(title, color, lightColor, steps, data, rowIndex, onCheck, onReviewRequest) {
    const section = document.createElement('div');
    section.className = 'process-section';

    const header = document.createElement('div');
    header.className = 'process-header';
    header.style.background = this.getGradient(color);
    header.innerHTML = `
      <span class="process-title">${title}</span>
      <span class="process-toggle">&#9660;</span>
    `;

    const body = document.createElement('div');
    body.className = 'process-body';
    body.style.background = lightColor;

    steps.forEach(step => {
      const checked = data[step] === true;
      const reviewCallback = (onReviewRequest && CONFIG.REVIEW_REQUEST_STEPS.includes(step))
        ? () => onReviewRequest(rowIndex, step)
        : null;
      const item = this.createCheckboxItem(step, checked, (newValue) => {
        onCheck(rowIndex, step, newValue);
      }, reviewCallback);
      body.appendChild(item);
    });

    // アコーディオン動作
    header.addEventListener('click', () => {
      body.classList.toggle('collapsed');
      header.querySelector('.process-toggle').classList.toggle('rotated');
    });

    section.appendChild(header);
    section.appendChild(body);
    return section;
  },

  // ========== インライン編集フィールド ==========
  createEditableField(text, tagName, className, onSave) {
    const wrapper = document.createElement('div');
    wrapper.className = 'editable-field';

    // 表示モード
    const display = document.createElement('div');
    display.className = 'editable-display';

    const textEl = document.createElement(tagName);
    textEl.className = className;
    textEl.textContent = text;

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit-field';
    editBtn.innerHTML = '&#9998;';
    editBtn.title = '編集';

    display.appendChild(textEl);
    display.appendChild(editBtn);

    // 編集モード
    const editor = document.createElement('div');
    editor.className = 'editable-editor';
    editor.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'editable-input';
    input.value = text;
    input.maxLength = 100;

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-edit-confirm';
    confirmBtn.innerHTML = '&#10003;';
    confirmBtn.title = '確定';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-edit-cancel';
    cancelBtn.innerHTML = '&#10005;';
    cancelBtn.title = 'キャンセル';

    const actions = document.createElement('div');
    actions.className = 'edit-actions';
    actions.appendChild(confirmBtn);
    actions.appendChild(cancelBtn);

    editor.appendChild(input);
    editor.appendChild(actions);

    wrapper.appendChild(display);
    wrapper.appendChild(editor);

    // 編集モード開始
    const startEdit = () => {
      display.style.display = 'none';
      editor.style.display = 'flex';
      input.value = textEl.textContent;
      input.focus();
      input.select();
    };

    // 編集モード終了
    const cancelEdit = () => {
      editor.style.display = 'none';
      display.style.display = 'flex';
    };

    // 保存
    const saveEdit = async () => {
      const newValue = input.value.trim();
      if (!newValue) {
        input.classList.add('editable-input--error');
        input.focus();
        return;
      }
      if (newValue === textEl.textContent) {
        cancelEdit();
        return;
      }
      // 保存中UI
      input.disabled = true;
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      confirmBtn.innerHTML = '...';

      try {
        await onSave(newValue);
        textEl.textContent = newValue;
        cancelEdit();
      } catch (err) {
        // 失敗時は編集モードのまま
      } finally {
        input.disabled = false;
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        confirmBtn.innerHTML = '&#10003;';
      }
    };

    editBtn.addEventListener('click', (e) => { e.stopPropagation(); startEdit(); });
    confirmBtn.addEventListener('click', (e) => { e.stopPropagation(); saveEdit(); });
    cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelEdit(); });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    });

    input.addEventListener('input', () => {
      input.classList.remove('editable-input--error');
    });

    return wrapper;
  },

  // ========== レッスンカード ==========
  createLessonCard(lesson, onCheck, onDelete, onReviewRequest, onEditField) {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.dataset.rowIndex = lesson.rowIndex;

    // ヘッダー
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    const cardInfo = document.createElement('div');
    cardInfo.className = 'card-info';

    // 担当者名（編集可能）
    const assigneeField = this.createEditableField(
      lesson.担当者名 || '',
      'span',
      'card-assignee',
      (newValue) => onEditField(lesson.rowIndex, '担当者名', newValue)
    );
    cardInfo.appendChild(assigneeField);

    // レッスン名（編集可能）
    const lessonNameField = this.createEditableField(
      lesson.レッスン名 || '',
      'h3',
      'card-lesson-name',
      (newValue) => onEditField(lesson.rowIndex, 'レッスン名', newValue)
    );
    cardInfo.appendChild(lessonNameField);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.title = '削除';
    deleteBtn.innerHTML = '&#10005;';
    deleteBtn.addEventListener('click', () => {
      onDelete(lesson.rowIndex, lesson.レッスン名);
    });

    cardHeader.appendChild(cardInfo);
    cardHeader.appendChild(deleteBtn);

    card.appendChild(cardHeader);
    card.appendChild(this.createPhaseBadgeRow(lesson));

    // ===== 遅延アラートバナー =====
    const delay = this.detectDelay(lesson);
    if (delay.isDelayed || delay.isWarning) {
      const banner = document.createElement('div');
      banner.className = 'card-delay-banner' + (delay.isDelayed ? ' card-delay-overdue' : ' card-delay-warning');

      const stuckStep = this.getNextPendingStep(lesson);
      if (delay.isDelayed) {
        banner.innerHTML = `
          <span class="card-delay-icon">🚨</span>
          <span class="card-delay-text">納期を <strong>${delay.daysOverdue}日</strong> 超過</span>
          ${stuckStep ? `<span class="card-delay-step">📍 ${this.escapeHtml(stuckStep)}</span>` : ''}
        `;
      } else {
        banner.innerHTML = `
          <span class="card-delay-icon">⏰</span>
          <span class="card-delay-text">納期まで <strong>あと${Math.abs(delay.daysOverdue)}日</strong></span>
          ${stuckStep ? `<span class="card-delay-step">📍 ${this.escapeHtml(stuckStep)}</span>` : ''}
        `;
      }
      card.appendChild(banner);
    }

    // ===== 日付情報行 =====
    const hasAnyDate = lesson.開始日 || lesson.納期 || lesson.リリース日;
    if (hasAnyDate) {
      const dateRow = document.createElement('div');
      dateRow.className = 'card-dates';

      let dateHtml = '';
      if (lesson.開始日) {
        dateHtml += `<span class="card-date-item">📅 開始: ${this.formatDate(lesson.開始日)}</span>`;
      }
      if (lesson.納期) {
        dateHtml += `<span class="card-date-item">⏰ 納期: ${this.formatDate(lesson.納期)}</span>`;
      }
      if (lesson.リリース日) {
        dateHtml += `<span class="card-date-item">🎯 リリース: ${this.formatDate(lesson.リリース日)}</span>`;
      }
      dateRow.innerHTML = dateHtml;
      card.appendChild(dateRow);
    }

    // ===== ガントチャート風タイムラインバー =====
    if (lesson.開始日 && lesson.納期) {
      const timeline = document.createElement('div');
      timeline.className = 'card-timeline';

      const startD = new Date(lesson.開始日);
      const endD = new Date(lesson.納期);
      const nowD = new Date();
      startD.setHours(0, 0, 0, 0);
      endD.setHours(0, 0, 0, 0);
      nowD.setHours(0, 0, 0, 0);

      const totalDays = Math.max((endD - startD) / (1000 * 60 * 60 * 24), 1);
      const elapsedDays = (nowD - startD) / (1000 * 60 * 60 * 24);
      const timePercent = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
      const progressPercent = lesson.進捗率.全体;

      // バー色: 進捗が時間経過より15%以上遅れ→赤、完了→緑、通常→青
      let progressColor = CONFIG.COLORS.primary;
      if (progressPercent >= 100) {
        progressColor = CONFIG.COLORS.前工程;
      } else if (progressPercent < timePercent - 15) {
        progressColor = CONFIG.COLORS.danger;
      }

      timeline.innerHTML = `
        <div class="timeline-labels">
          <span class="timeline-start">${this.formatDate(lesson.開始日)}</span>
          <span class="timeline-end">${this.formatDate(lesson.納期)}</span>
        </div>
        <div class="timeline-track">
          <div class="timeline-progress" style="width:${progressPercent}%; background:${this.getGradient(progressColor)};"></div>
          <div class="timeline-now-marker" style="left:${timePercent}%;" title="今日"></div>
        </div>
      `;

      card.appendChild(timeline);
    }

    // 進捗バー
    const progressArea = document.createElement('div');
    progressArea.className = 'card-progress';
    progressArea.appendChild(this.createProgressBar(lesson.進捗率.全体, CONFIG.COLORS.primary, '全体'));
    progressArea.appendChild(this.createProgressBar(lesson.進捗率.前工程, CONFIG.COLORS.前工程, '前工程'));
    progressArea.appendChild(this.createProgressBar(lesson.進捗率.後工程, CONFIG.COLORS.後工程, '後工程'));

    // 工程セクション
    const preSection = this.createProcessSection(
      '前工程', CONFIG.COLORS.前工程, CONFIG.COLORS.前工程Light,
      CONFIG.前工程, lesson.前工程, lesson.rowIndex, onCheck, onReviewRequest
    );

    const postSection = this.createProcessSection(
      '後工程', CONFIG.COLORS.後工程, CONFIG.COLORS.後工程Light,
      CONFIG.後工程, lesson.後工程, lesson.rowIndex, onCheck, onReviewRequest
    );

    card.appendChild(progressArea);
    card.appendChild(preSection);
    card.appendChild(postSection);

    return card;
  },

  // ========== トースト通知 ==========
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast toast-' + type;
    toast.hidden = false;

    setTimeout(() => {
      toast.hidden = true;
    }, 3000);
  },

  // ========== フォルダリンクモーダル ==========
  showFolderLinkModal(lessonName, folderUrl) {
    const overlay = document.getElementById('modalOverlay');
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>フォルダ作成完了</h2>
          <button class="modal-close" id="folderModalCloseBtn">&times;</button>
        </div>
        <div class="modal-body" style="text-align:center; padding:24px;">
          <p style="margin-bottom:16px;">
            「${this.escapeHtml(lessonName)}」のフォルダが作成されました。
          </p>
          <a href="${this.escapeHtml(folderUrl)}" target="_blank" rel="noopener noreferrer"
             class="btn-primary" style="display:inline-block; text-decoration:none; padding:10px 24px; color:#fff; background:var(--color-primary); border-radius:6px;">
            📂 Google Driveで開く
          </a>
        </div>
      </div>
    `;
    overlay.classList.add('active');

    const close = () => {
      overlay.classList.remove('active');
      overlay.innerHTML = '';
    };

    document.getElementById('folderModalCloseBtn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  },

  // ========== ローディング ==========
  showLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
  },

  // ========== HTML エスケープ ==========
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  // ========== データ入力フォーム ==========
  createEntryForm(onSubmit, onCancel) {
    const container = document.createElement('div');
    container.className = 'entry-form-container';

    // フォームヘッダー
    const header = document.createElement('div');
    header.className = 'entry-form-header';
    header.innerHTML = `
      <h2>新規レッスン登録</h2>
      <p class="entry-form-description">
        スプレッドシートに新しいレッスンデータを登録します。
      </p>
    `;

    // フォーム本体
    const form = document.createElement('form');
    form.id = 'dataEntryForm';
    form.className = 'entry-form';

    // --- 基本情報セクション ---
    const basicSection = document.createElement('div');
    basicSection.className = 'entry-form-section';
    basicSection.innerHTML = '<h3 class="entry-form-section-title">基本情報</h3>';

    CONFIG.ENTRY_FORM_FIELDS.forEach(field => {
      basicSection.appendChild(this.createFormField(field));
    });
    form.appendChild(basicSection);

    // --- 初期工程ステータス（任意） ---
    if (CONFIG.ENTRY_FORM_SHOW_INITIAL_STEPS) {
      const stepsSection = document.createElement('div');
      stepsSection.className = 'entry-form-section';
      stepsSection.innerHTML = `
        <h3 class="entry-form-section-title">初期工程ステータス（任意）</h3>
        <p class="entry-form-section-desc">
          登録時に既に完了している工程があればチェックしてください。
        </p>
      `;

      stepsSection.appendChild(
        this.createStepCheckboxGroup('前工程', CONFIG.前工程, CONFIG.COLORS.前工程)
      );
      stepsSection.appendChild(
        this.createStepCheckboxGroup('後工程', CONFIG.後工程, CONFIG.COLORS.後工程)
      );

      form.appendChild(stepsSection);
    }

    // --- アクションボタン ---
    const actions = document.createElement('div');
    actions.className = 'entry-form-actions';
    actions.innerHTML = `
      <button type="button" class="btn-secondary" id="entryFormClear">クリア</button>
      <button type="submit" class="btn-primary-filled">登録する</button>
    `;
    form.appendChild(actions);

    // イベント
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = this.collectEntryFormData(form);
      onSubmit(formData);
    });

    actions.querySelector('#entryFormClear').addEventListener('click', () => {
      form.reset();
      if (onCancel) onCancel();
    });

    container.appendChild(header);
    container.appendChild(form);
    return container;
  },

  // ========== 汎用フォームフィールド ==========
  createFormField(config) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.setAttribute('for', 'entry_' + config.id);
    label.textContent = config.label;
    if (config.required) {
      const req = document.createElement('span');
      req.className = 'required-mark';
      req.textContent = ' *';
      label.appendChild(req);
    }
    group.appendChild(label);

    let input;
    switch (config.type) {
      case 'select':
        input = document.createElement('select');
        (config.options || []).forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          input.appendChild(option);
        });
        break;
      case 'textarea':
        input = document.createElement('textarea');
        input.rows = config.rows || 3;
        break;
      default:
        input = document.createElement('input');
        input.type = config.type || 'text';
    }

    input.id = 'entry_' + config.id;
    input.name = config.id;
    if (config.required) input.required = true;
    if (config.placeholder) input.placeholder = config.placeholder;
    if (config.maxlength) input.maxLength = config.maxlength;

    group.appendChild(input);
    return group;
  },

  // ========== 工程チェックボックスグループ（入力フォーム用） ==========
  createStepCheckboxGroup(title, steps, color) {
    const group = document.createElement('div');
    group.className = 'step-checkbox-group';

    const groupHeader = document.createElement('div');
    groupHeader.className = 'step-group-header';
    groupHeader.style.borderLeft = '4px solid ' + color;
    groupHeader.innerHTML = '<span>' + this.escapeHtml(title) + '</span>';
    group.appendChild(groupHeader);

    const grid = document.createElement('div');
    grid.className = 'step-checkbox-grid';

    steps.forEach(step => {
      const item = document.createElement('label');
      item.className = 'step-checkbox-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = 'step_' + step;
      cb.value = step;

      const span = document.createElement('span');
      span.textContent = step;

      item.appendChild(cb);
      item.appendChild(span);
      grid.appendChild(item);
    });

    group.appendChild(grid);
    return group;
  },

  // ============================================================
  // 定例レビューダッシュボード コンポーネント
  // ============================================================

  // ========== ヘルパー: 日付フォーマット ==========
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  },

  // ========== ヘルパー: ステータス分類 ==========
  categorizeLesson(lesson) {
    const cfg = CONFIG.REVIEW.STATUS;
    // リリース済み: 全工程100% or リリース日が過去
    if (lesson.進捗率.全体 === 100) {
      return cfg.RELEASED;
    }
    if (lesson.リリース日) {
      const release = new Date(lesson.リリース日);
      release.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (release <= now) return cfg.RELEASED;
    }
    // 後工程に1つ以上チェック → リリース間近
    const postChecked = CONFIG.後工程.some(s => lesson.後工程[s]);
    if (postChecked) {
      return cfg.NEAR_RELEASE;
    }
    // 前工程に1つ以上チェック → 進行中
    const preChecked = CONFIG.前工程.some(s => lesson.前工程[s]);
    if (preChecked) {
      return cfg.IN_PROGRESS;
    }
    // 進捗0% → 未着手
    return cfg.NOT_STARTED;
  },

  // ========== ヘルパー: 遅延検出 ==========
  detectDelay(lesson) {
    const result = { isDelayed: false, isWarning: false, daysOverdue: 0 };
    if (!lesson.納期) return result;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadline = new Date(lesson.納期);
    deadline.setHours(0, 0, 0, 0);

    // リリース済み（進捗100% or リリース日が過去）なら遅延なし
    if (lesson.進捗率.全体 === 100) return result;
    if (lesson.リリース日) {
      const release = new Date(lesson.リリース日);
      release.setHours(0, 0, 0, 0);
      if (release <= now) return result; // リリース済み
    }

    const diffDays = Math.floor((now - deadline) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      result.isDelayed = true;
      result.daysOverdue = diffDays;
    } else if (diffDays >= -CONFIG.REVIEW.DELAY_WARNING_DAYS && lesson.進捗率.全体 < 80) {
      result.isWarning = true;
      result.daysOverdue = diffDays; // negative = days remaining
    }

    return result;
  },

  // ========== ヘルパー: 最後に完了した工程名 ==========
  getLastCompletedStep(lesson) {
    const allSteps = [...CONFIG.前工程, ...CONFIG.後工程];
    let lastStep = '';
    for (let i = 0; i < allSteps.length; i++) {
      const step = allSteps[i];
      const phase = CONFIG.前工程.includes(step) ? '前工程' : '後工程';
      if (lesson[phase][step]) {
        lastStep = step;
      }
    }
    return lastStep;
  },

  // ========== ヘルパー: 次の工程名（停滞箇所） ==========
  getNextPendingStep(lesson) {
    const allSteps = [...CONFIG.前工程, ...CONFIG.後工程];
    for (let i = 0; i < allSteps.length; i++) {
      const step = allSteps[i];
      const phase = CONFIG.前工程.includes(step) ? '前工程' : '後工程';
      if (!lesson[phase][step]) {
        return step;
      }
    }
    return '';
  },

  // ========== 工程別進捗ビュー: メインコンテナ ==========
  createStepProgressView(lessons, phase, sortKey) {
    const container = document.createElement('div');
    container.className = 'step-progress-container';

    container.appendChild(this.createStepProgressHeader(phase, sortKey));

    const steps = phase === '前工程' ? CONFIG.前工程 : CONFIG.後工程;
    const color = phase === '前工程' ? CONFIG.COLORS.前工程 : CONFIG.COLORS.後工程;

    container.appendChild(this.createStepMatrix(lessons, steps, color, phase));
    container.appendChild(this.createStepDotPipeline(lessons, steps, color, phase));

    return container;
  },

  // ========== 工程別進捗ビュー: ヘッダー（トグル＋ソート） ==========
  createStepProgressHeader(phase, sortKey) {
    const header = document.createElement('div');
    header.className = 'step-progress-header';

    // フェーズトグル
    const toggle = document.createElement('div');
    toggle.className = 'phase-toggle';

    ['前工程', '後工程'].forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'phase-toggle-btn' + (p === phase ? ' phase-toggle-btn--active' : '');
      btn.dataset.phase = p;
      const c = p === '前工程' ? CONFIG.COLORS.前工程 : CONFIG.COLORS.後工程;
      if (p === phase) {
        btn.style.background = this.getGradient(c);
        btn.style.color = '#fff';
        btn.style.boxShadow = `0 2px 8px ${this.hexToRgba(c, 0.3)}`;
      }
      btn.textContent = p;
      toggle.appendChild(btn);
    });
    header.appendChild(toggle);

    // ソートドロップダウン
    const sortSelect = document.createElement('select');
    sortSelect.className = 'step-progress-sort';
    sortSelect.id = 'stepProgressSort';
    CONFIG.STEP_VIEW.SORT_OPTIONS.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.key;
      option.textContent = opt.label;
      option.selected = opt.key === sortKey;
      sortSelect.appendChild(option);
    });
    header.appendChild(sortSelect);

    return header;
  },

  // ========== 工程別進捗ビュー: マトリクス表（デスクトップ） ==========
  createStepMatrix(lessons, steps, color, phase) {
    const wrapper = document.createElement('div');
    wrapper.className = 'step-matrix-wrapper';

    const table = document.createElement('table');
    table.className = 'step-matrix';

    // thead
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const thLesson = document.createElement('th');
    thLesson.className = 'step-matrix-th-lesson';
    thLesson.textContent = 'レッスン';
    headerRow.appendChild(thLesson);

    steps.forEach((step, idx) => {
      const th = document.createElement('th');
      th.className = 'step-matrix-th-step';
      th.title = step;
      const textSpan = document.createElement('span');
      textSpan.className = 'step-matrix-th-text';
      textSpan.textContent = step;
      th.appendChild(textSpan);
      const numSpan = document.createElement('span');
      numSpan.className = 'step-matrix-th-num';
      numSpan.textContent = (idx + 1);
      th.appendChild(numSpan);
      headerRow.appendChild(th);
    });

    const thProgress = document.createElement('th');
    thProgress.className = 'step-matrix-th-progress';
    thProgress.textContent = '進捗';
    headerRow.appendChild(thProgress);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // tbody
    const tbody = document.createElement('tbody');

    lessons.forEach(lesson => {
      const tr = document.createElement('tr');
      const phaseData = lesson[phase];
      const nextStep = this.getNextPendingStep(lesson);
      const nextStepInPhase = (phase === '前工程' ? CONFIG.前工程 : CONFIG.後工程).includes(nextStep) ? nextStep : null;
      const phasePercent = lesson.進捗率[phase];

      // レッスン名セル（sticky）
      const tdName = document.createElement('td');
      tdName.className = 'step-matrix-td-lesson';
      tdName.innerHTML = `
        <span class="step-matrix-assignee">${this.escapeHtml(lesson.担当者名)}</span>
        <span class="step-matrix-lesson-name">${this.escapeHtml(lesson.レッスン名)}</span>
      `;
      tr.appendChild(tdName);

      // 各ステップセル
      steps.forEach(step => {
        const td = document.createElement('td');
        td.className = 'step-matrix-td-step';
        td.title = step;

        const dot = document.createElement('span');
        if (phaseData[step]) {
          dot.className = 'step-dot step-dot--done';
          dot.style.background = this.getGradient(color);
        } else if (step === nextStepInPhase) {
          dot.className = 'step-dot step-dot--current';
          dot.style.borderColor = color;
        } else {
          dot.className = 'step-dot step-dot--pending';
        }
        td.appendChild(dot);
        tr.appendChild(td);
      });

      // 進捗セル
      const tdProg = document.createElement('td');
      tdProg.className = 'step-matrix-td-progress';
      tdProg.innerHTML = `
        <span class="step-matrix-percent" style="color:${color}">${phasePercent}%</span>
        <div class="step-matrix-minibar">
          <div class="step-matrix-minibar-fill" style="width:${phasePercent}%;background:${this.getGradient(color)}"></div>
        </div>
      `;
      tr.appendChild(tdProg);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  },

  // ========== 工程別進捗ビュー: ドットパイプライン（モバイル） ==========
  createStepDotPipeline(lessons, steps, color, phase) {
    const wrapper = document.createElement('div');
    wrapper.className = 'step-pipeline-wrapper';

    lessons.forEach(lesson => {
      const row = document.createElement('div');
      row.className = 'step-pipeline-row';

      const info = document.createElement('div');
      info.className = 'step-pipeline-info';
      info.innerHTML = `
        <span class="step-pipeline-assignee">${this.escapeHtml(lesson.担当者名)}</span>
        <span class="step-pipeline-name">${this.escapeHtml(lesson.レッスン名)}</span>
      `;
      row.appendChild(info);

      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'step-pipeline-dots';

      const phaseData = lesson[phase];
      const nextStep = this.getNextPendingStep(lesson);
      const nextStepInPhase = (phase === '前工程' ? CONFIG.前工程 : CONFIG.後工程).includes(nextStep) ? nextStep : null;

      steps.forEach(step => {
        const dot = document.createElement('span');
        dot.title = step;
        if (phaseData[step]) {
          dot.className = 'pipeline-dot pipeline-dot--done';
          dot.style.background = this.getGradient(color);
        } else if (step === nextStepInPhase) {
          dot.className = 'pipeline-dot pipeline-dot--current';
          dot.style.background = this.getGradient(color);
        } else {
          dot.className = 'pipeline-dot pipeline-dot--pending';
        }
        dotsContainer.appendChild(dot);
      });

      row.appendChild(dotsContainer);

      const pct = document.createElement('span');
      pct.className = 'step-pipeline-percent';
      pct.style.color = color;
      pct.textContent = lesson.進捗率[phase] + '%';
      row.appendChild(pct);

      wrapper.appendChild(row);
    });

    return wrapper;
  },

  // ========== ヘルパー: フェーズステータス取得 ==========
  getPhaseStatuses(lesson) {
    const phasesDef = [
      { name: '前工程', emoji: '🔧', steps: CONFIG.前工程, process: '前工程' },
      { name: '後工程', emoji: '🚀', steps: CONFIG.後工程, process: '後工程' }
    ];

    const phases = phasesDef.map(def => {
      const total = def.steps.length;
      const checked = def.steps.filter(s => lesson[def.process][s]).length;
      let status;
      if (checked === 0) {
        status = 'pending';
      } else if (checked === total) {
        status = 'completed';
      } else {
        status = 'active';
      }
      return { name: def.name, emoji: def.emoji, status, checked, total, process: def.process };
    });

    // 現在ステップ情報
    const nextStep = this.getNextPendingStep(lesson);
    let currentStep = null;
    if (nextStep) {
      const inPre = CONFIG.前工程.includes(nextStep);
      const process = inPre ? '前工程' : '後工程';
      const steps = inPre ? CONFIG.前工程 : CONFIG.後工程;
      const doneCount = steps.filter(s => lesson[process][s]).length;
      currentStep = { stepName: nextStep, process, done: doneCount, total: steps.length };
    }

    return { phases, currentStep };
  },

  // ========== フェーズバッジ行 ==========
  createPhaseBadgeRow(lesson) {
    const container = document.createElement('div');
    container.className = 'phase-badge-row';

    const { phases, currentStep } = this.getPhaseStatuses(lesson);

    // バッジストリップ
    const strip = document.createElement('div');
    strip.className = 'phase-badge-strip';

    phases.forEach((phase, index) => {
      const badge = document.createElement('span');
      badge.className = 'phase-badge phase-badge--' + phase.status;
      badge.innerHTML = `<span class="phase-badge-emoji">${phase.emoji}</span><span class="phase-badge-name">${phase.name} ${phase.checked}/${phase.total}</span>`;
      badge.title = `${phase.name}: ${phase.checked}/${phase.total} 完了`;
      strip.appendChild(badge);

      if (index < phases.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'phase-badge-arrow';
        arrow.textContent = '›';
        strip.appendChild(arrow);
      }
    });

    container.appendChild(strip);

    // 現在ステップテキスト
    if (currentStep) {
      const stepText = document.createElement('div');
      stepText.className = 'phase-current-step';
      stepText.innerHTML = `📍 ${this.escapeHtml(currentStep.stepName)} を進行中（${currentStep.process} ${currentStep.done}/${currentStep.total}）`;
      container.appendChild(stepText);
    } else if (lesson.進捗率.全体 === 100) {
      const stepText = document.createElement('div');
      stepText.className = 'phase-current-step phase-current-step--complete';
      stepText.innerHTML = '✅ 全工程完了';
      container.appendChild(stepText);
    }

    return container;
  },

  // ========== セクション1: 総論レポート（ビジュアルダッシュボード） ==========
  createReviewSummaryReport(reviewData) {
    const section = document.createElement('div');
    section.className = 'review-section';
    section.innerHTML = `<h2 class="review-section-title">📊 総論レポート</h2>`;

    const body = document.createElement('div');
    body.className = 'report-dashboard';
    body.appendChild(this.createNarrativeSummary(reviewData));
    body.appendChild(this.createKpiStrip(reviewData.stats));
    body.appendChild(this.createProgressAndBottleneck(reviewData.stats));
    body.appendChild(this.createAlertBar(reviewData.delays, reviewData.stats));
    section.appendChild(body);
    return section;
  },

  // ========== 箇条書き型 現況サマリー ==========
  createNarrativeSummary(reviewData) {
    const { stats } = reviewData;
    const items = [];

    // 項目1: 全体状況
    if (stats.released > 0) {
      items.push(`全${stats.total}件中${stats.released}件がリリース済み、${stats.inProgress}件が進行中`);
    } else {
      items.push(`全${stats.total}件中${stats.inProgress}件が進行中、リリース済みはまだ0件`);
    }

    // 項目2: ボトルネック
    if (stats.bottleneckSteps && stats.bottleneckSteps.length > 0) {
      const top = stats.bottleneckSteps[0];
      items.push(`${top.phase}の${top.step}に${top.count}件集中 → レビュー待ちの可能性`);
    } else {
      items.push('各工程に大きな停滞なし');
    }

    // 項目3: 遅延
    if (stats.delayCount > 0 && stats.worstDelays && stats.worstDelays.length > 0) {
      const worst = stats.worstDelays[0];
      items.push(`${worst.lesson.レッスン名}が${worst.daysOverdue}日超過、早急な対応が必要`);
    } else if (stats.warningCount > 0) {
      items.push(`${stats.warningCount}件の教材が納期間近（7日以内）`);
    } else {
      items.push('スケジュールに問題なし');
    }

    // 項目4: 最高負荷の担当者
    if (reviewData.assignees) {
      const sorted = Object.entries(reviewData.assignees)
        .map(([name, data]) => ({ name, count: data.lessons.length }))
        .sort((a, b) => b.count - a.count);
      if (sorted.length > 0 && sorted[0].count >= 2) {
        items.push(`${sorted[0].name}が${sorted[0].count}件担当で最も高負荷`);
      }
    }

    const panel = document.createElement('div');
    panel.className = 'narrative-summary';
    panel.innerHTML = items.map(text =>
      `<div class="narrative-item">・${this.escapeHtml(text)}</div>`
    ).join('');

    return panel;
  },

  // ========== KPIストリップ（5カード横並び） ==========
  createKpiStrip(stats) {
    const strip = document.createElement('div');
    strip.className = 'kpi-strip';

    const cards = [
      { value: stats.total, label: '全教材', icon: '📚', color: '#7C3AED' },
      { value: stats.released, label: 'リリース済み', icon: '✅', color: '#10B981' },
      { value: stats.nearRelease, label: 'リリース間近', icon: '🔜', color: '#F59E0B' },
      { value: stats.inProgress, label: '進行中', icon: '🔧', color: '#7C3AED' },
      { value: stats.notStarted, label: '未着手', icon: '⏳', color: '#9CA3AF' }
    ];

    cards.forEach(c => {
      const card = document.createElement('div');
      card.className = 'kpi-card' + (c.value === 0 ? ' kpi-card--zero' : '');
      card.style.borderLeftColor = c.color;
      card.innerHTML = `
        <div class="kpi-icon" style="background:${this.hexToRgba(c.color, 0.1)}; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">${c.icon}</div>
        <div class="kpi-value" style="color:${c.color}">${c.value}</div>
        <div class="kpi-label">${c.label}</div>
      `;
      strip.appendChild(card);
    });

    return strip;
  },

  // ========== 進捗ゲージ + ボトルネック工程 ==========
  createProgressAndBottleneck(stats) {
    const row = document.createElement('div');
    row.className = 'progress-bottleneck-row';

    // 左: 進捗リングゲージ
    const gaugeGroup = document.createElement('div');
    gaugeGroup.className = 'gauge-group';

    const gauges = [
      { label: '全体', percent: stats.avgProgress, color: '#7C3AED' },
      { label: '前工程', percent: stats.avgPreProgress, color: '#10B981' },
      { label: '後工程', percent: stats.avgPostProgress, color: '#F59E0B' }
    ];

    gauges.forEach(g => {
      const gauge = document.createElement('div');
      gauge.className = 'gauge-item';
      // conic-gradient で円グラフ風リング（グラデーショントラック）
      const deg = (g.percent / 100) * 360;
      const trackColor = CONFIG.GRADIENTS.gaugeTrack;
      gauge.innerHTML = `
        <div class="gauge-ring" style="background: conic-gradient(${g.color} 0deg, ${g.color} ${deg}deg, ${trackColor} ${deg}deg, ${trackColor} 360deg);">
          <div class="gauge-center">${g.percent}%</div>
        </div>
        <div class="gauge-label">${g.label}</div>
      `;
      gaugeGroup.appendChild(gauge);
    });

    row.appendChild(gaugeGroup);

    // 右: ボトルネック工程
    const bottleneck = document.createElement('div');
    bottleneck.className = 'bottleneck-card';
    bottleneck.innerHTML = `<div class="bottleneck-title">🔍 ボトルネック工程</div>`;

    const list = document.createElement('div');
    list.className = 'bottleneck-list';

    if (stats.bottleneckSteps && stats.bottleneckSteps.length > 0) {
      const maxCount = stats.bottleneckSteps[0].count;
      stats.bottleneckSteps.forEach(item => {
        const barPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const phaseColor = item.phase === '前工程' ? '#10B981' : '#F59E0B';
        const entry = document.createElement('div');
        entry.className = 'bottleneck-entry';
        entry.innerHTML = `
          <div class="bottleneck-step-row">
            <span class="bottleneck-step-name">${this.escapeHtml(item.step)}</span>
            <span class="bottleneck-step-count" style="color:${phaseColor}">${item.count}件</span>
          </div>
          <div class="bottleneck-bar-track">
            <div class="bottleneck-bar-fill" style="width:${barPercent}%; background:${this.getGradient(phaseColor)};"></div>
          </div>
        `;
        list.appendChild(entry);
      });
    } else {
      list.innerHTML = '<div class="bottleneck-empty">停滞している工程はありません</div>';
    }

    bottleneck.appendChild(list);
    row.appendChild(bottleneck);

    return row;
  },

  // ========== アクション要否アラートバー ==========
  createAlertBar(delays, stats) {
    const container = document.createElement('div');
    container.className = 'alert-bar-container';

    if (stats.delayCount > 0) {
      // 要対応（赤）
      const danger = document.createElement('div');
      danger.className = 'alert-bar alert-bar--danger';
      let dangerHtml = '<span class="alert-bar-icon">🚨</span><span class="alert-bar-label">要対応:</span>';
      if (stats.worstDelays && stats.worstDelays.length > 0) {
        const items = stats.worstDelays.map(d =>
          `${this.escapeHtml(d.lesson.レッスン名)} ${d.daysOverdue}日超過 / 担当: ${this.escapeHtml(d.lesson.担当者名)}`
        );
        dangerHtml += `<span class="alert-bar-content">${items.join(' ｜ ')}</span>`;
      } else {
        dangerHtml += `<span class="alert-bar-content">${stats.delayCount}件の教材で納期超過</span>`;
      }
      danger.innerHTML = dangerHtml;
      container.appendChild(danger);
    }

    if (stats.warningCount > 0) {
      // 注意（黄）
      const warning = document.createElement('div');
      warning.className = 'alert-bar alert-bar--warning';
      warning.innerHTML = `
        <span class="alert-bar-icon">⏰</span>
        <span class="alert-bar-label">注意:</span>
        <span class="alert-bar-content">${stats.warningCount}件の教材が納期間近（7日以内）</span>
      `;
      container.appendChild(warning);
    }

    if (stats.delayCount === 0 && stats.warningCount === 0) {
      // 問題なし（緑）
      const ok = document.createElement('div');
      ok.className = 'alert-bar alert-bar--ok';
      ok.innerHTML = `
        <span class="alert-bar-icon">✅</span>
        <span class="alert-bar-label">問題なし:</span>
        <span class="alert-bar-content">スケジュールの遅延はありません</span>
      `;
      container.appendChild(ok);
    }

    return container;
  },

  // ========== セクション2: 教材ステータス一覧 ==========
  createStatusOverview(statusGroups) {
    const section = document.createElement('div');
    section.className = 'review-section';

    const title = document.createElement('h2');
    title.className = 'review-section-title';
    title.textContent = '📋 教材ステータス一覧';
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'status-overview';

    const statuses = [
      { key: 'released', config: CONFIG.REVIEW.STATUS.RELEASED },
      { key: 'nearRelease', config: CONFIG.REVIEW.STATUS.NEAR_RELEASE },
      { key: 'inProgress', config: CONFIG.REVIEW.STATUS.IN_PROGRESS },
      { key: 'notStarted', config: CONFIG.REVIEW.STATUS.NOT_STARTED }
    ];

    statuses.forEach(({ key, config }) => {
      const lessons = statusGroups[key] || [];
      grid.appendChild(this.createStatusColumn(config, lessons));
    });

    section.appendChild(grid);
    return section;
  },

  createStatusColumn(config, lessons) {
    const col = document.createElement('div');
    col.className = 'status-column';
    col.style.borderTop = '3px solid ' + config.color;

    const header = document.createElement('div');
    header.className = 'status-column-header';
    header.innerHTML = `
      <span class="status-icon">${config.icon}</span>
      <span class="status-title">${config.label}</span>
      <span class="status-count" style="background:${this.getGradient(config.color)}">${lessons.length}</span>
    `;
    col.appendChild(header);

    const list = document.createElement('div');
    list.className = 'status-lesson-list';

    if (lessons.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'status-empty';
      empty.textContent = 'なし';
      list.appendChild(empty);
    } else {
      lessons.forEach(lesson => {
        list.appendChild(this.createStatusLessonItem(lesson));
      });
    }

    col.appendChild(list);
    return col;
  },

  createStatusLessonItem(lesson) {
    const item = document.createElement('div');
    item.className = 'status-lesson-item';

    const delay = this.detectDelay(lesson);
    let delayBadge = '';
    if (delay.isDelayed) {
      delayBadge = `<span class="delay-badge delay-overdue">${delay.daysOverdue}日超過</span>`;
    } else if (delay.isWarning) {
      delayBadge = `<span class="delay-badge delay-warning">あと${Math.abs(delay.daysOverdue)}日</span>`;
    }

    const deadlineText = lesson.納期 ? this.formatDate(lesson.納期) : '';
    const releaseText = lesson.リリース日 ? this.formatDate(lesson.リリース日) : '';

    item.innerHTML = `
      <div class="status-lesson-name">${this.escapeHtml(lesson.レッスン名)}</div>
      <div class="status-lesson-meta">
        <span class="status-assignee">${this.escapeHtml(lesson.担当者名)}</span>
        <span class="status-progress">${lesson.進捗率.全体}%</span>
        ${delayBadge}
      </div>
      ${deadlineText || releaseText ? `<div class="status-date">${releaseText ? '📅 リリース: ' + releaseText : '📅 納期: ' + deadlineText}</div>` : ''}
    `;
    return item;
  },

  // ========== セクション3: 担当者別稼働状況 ==========
  createAssigneeWorkload(assigneesData) {
    const section = document.createElement('div');
    section.className = 'review-section';

    const title = document.createElement('h2');
    title.className = 'review-section-title';
    title.textContent = '👥 担当者別稼働状況';
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'assignee-grid';

    const names = Object.keys(assigneesData).sort();
    names.forEach(name => {
      grid.appendChild(this.createAssigneeCard(name, assigneesData[name]));
    });

    if (names.length === 0) {
      grid.innerHTML = '<div class="status-empty">担当者データなし</div>';
    }

    section.appendChild(grid);
    return section;
  },

  createAssigneeCard(name, data) {
    const card = document.createElement('div');
    card.className = 'assignee-card';

    // 負荷判定
    const workloadCfg = this.getWorkloadConfig(data.lessons.length);

    // 平均進捗率
    const avgProgress = data.lessons.length > 0
      ? Math.round(data.lessons.reduce((s, l) => s + l.進捗率.全体, 0) / data.lessons.length)
      : 0;

    card.innerHTML = `
      <div class="assignee-header">
        <span class="assignee-name">${this.escapeHtml(name)}</span>
        <span class="workload-badge" style="background:${workloadCfg.color}">${workloadCfg.label}（${data.lessons.length}件）</span>
      </div>
      <div class="assignee-progress-bar">
        <div class="progress-bar">
          <div class="progress-fill" style="width:${avgProgress}%;background:${this.getGradient(CONFIG.COLORS.primary)}"></div>
        </div>
        <span class="assignee-progress-text">平均 ${avgProgress}%</span>
      </div>
      <div class="assignee-lessons">
        ${data.lessons.map(l => `
          <div class="assignee-lesson-row">
            <span class="assignee-lesson-name">${this.escapeHtml(l.レッスン名)}</span>
            <span class="assignee-lesson-progress">${l.進捗率.全体}%</span>
          </div>
        `).join('')}
      </div>
    `;
    return card;
  },

  getWorkloadConfig(count) {
    const w = CONFIG.REVIEW.WORKLOAD;
    if (count <= w.LIGHT.max) return w.LIGHT;
    if (count <= w.MEDIUM.max) return w.MEDIUM;
    return w.HEAVY;
  },

  // ========== セクション4: 遅延アラート ==========
  createDelayAlerts(delayData) {
    const section = document.createElement('div');
    section.className = 'review-section';

    const title = document.createElement('h2');
    title.className = 'review-section-title';
    title.textContent = '⚠️ 遅延アラート';
    section.appendChild(title);

    if (delayData.length === 0) {
      const noDelay = document.createElement('div');
      noDelay.className = 'no-delays';
      noDelay.innerHTML = '✅ 現在遅延している教材はありません';
      section.appendChild(noDelay);
      return section;
    }

    const list = document.createElement('div');
    list.className = 'delay-list';

    delayData.forEach(item => {
      list.appendChild(this.createDelayCard(item));
    });

    section.appendChild(list);
    return section;
  },

  createDelayCard(item) {
    const card = document.createElement('div');
    card.className = 'delay-card' + (item.isWarning ? ' delay-card-warning' : '');

    const stuckStep = this.getNextPendingStep(item.lesson);
    const deadlineText = this.formatDate(item.lesson.納期);

    if (item.isWarning) {
      card.innerHTML = `
        <div class="delay-card-header">
          <span class="delay-card-icon">⏰</span>
          <span class="delay-card-title">${this.escapeHtml(item.lesson.レッスン名)}</span>
          <span class="delay-badge delay-warning">あと${Math.abs(item.daysOverdue)}日</span>
        </div>
        <div class="delay-card-body">
          <span class="delay-card-meta">担当: ${this.escapeHtml(item.lesson.担当者名)} / 納期: ${deadlineText}</span>
          <span class="delay-card-progress">進捗 ${item.lesson.進捗率.全体}%</span>
        </div>
        ${stuckStep ? `<div class="delay-stuck-step">📍 次の工程: ${this.escapeHtml(stuckStep)}</div>` : ''}
      `;
    } else {
      card.innerHTML = `
        <div class="delay-card-header">
          <span class="delay-card-icon">🚨</span>
          <span class="delay-card-title">${this.escapeHtml(item.lesson.レッスン名)}</span>
          <span class="delay-badge delay-overdue">${item.daysOverdue}日超過</span>
        </div>
        <div class="delay-card-body">
          <span class="delay-card-meta">担当: ${this.escapeHtml(item.lesson.担当者名)} / 納期: ${deadlineText}</span>
          <span class="delay-card-progress">進捗 ${item.lesson.進捗率.全体}%</span>
        </div>
        ${stuckStep ? `<div class="delay-stuck-step">📍 停滞箇所: ${this.escapeHtml(stuckStep)}</div>` : ''}
      `;
    }

    return card;
  },

  // ========== フォームデータ収集 ==========
  collectEntryFormData(form) {
    const data = {
      担当者名: '',
      レッスン名: '',
      initialSteps: {}
    };

    // 基本フィールド収集
    CONFIG.ENTRY_FORM_FIELDS.forEach(field => {
      const input = form.querySelector('#entry_' + field.id);
      if (input && field.columnName) {
        data[field.columnName] = input.value.trim();
      }
    });

    // 工程チェックボックス収集
    [...CONFIG.前工程, ...CONFIG.後工程].forEach(step => {
      const cb = form.querySelector('input[name="step_' + step + '"]');
      if (cb && cb.checked) {
        data.initialSteps[step] = true;
      }
    });

    return data;
  }
};
