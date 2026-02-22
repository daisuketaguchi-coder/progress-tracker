// ============================================================
// UIコンポーネント生成関数
// ============================================================

const Components = {

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
        <div class="progress-fill" style="width: ${percent}%; background: ${color};"></div>
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
    header.style.background = color;
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

  // ========== レッスンカード ==========
  createLessonCard(lesson, onCheck, onDelete, onReviewRequest) {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    card.dataset.rowIndex = lesson.rowIndex;

    // ヘッダー
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    cardHeader.innerHTML = `
      <div class="card-info">
        <span class="card-assignee">${this.escapeHtml(lesson.担当者)}</span>
        <h3 class="card-lesson-name">${this.escapeHtml(lesson.レッスン名)}</h3>
      </div>
      <button class="btn-delete" title="削除">&#10005;</button>
    `;

    cardHeader.querySelector('.btn-delete').addEventListener('click', () => {
      onDelete(lesson.rowIndex, lesson.レッスン名);
    });

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

    card.appendChild(cardHeader);
    card.appendChild(progressArea);
    card.appendChild(preSection);
    card.appendChild(postSection);

    return card;
  },

  // ========== 新規レッスン追加モーダル ==========
  createAddModal(onSubmit, onClose) {
    const overlay = document.getElementById('modalOverlay');
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>新規レッスン追加</h2>
          <button class="modal-close" id="modalCloseBtn">&times;</button>
        </div>
        <form id="addLessonForm" class="modal-body">
          <div class="form-group">
            <label for="inputAssignee">担当者名</label>
            <input type="text" id="inputAssignee" required maxlength="100" placeholder="例: 田中太郎">
          </div>
          <div class="form-group">
            <label for="inputLesson">レッスン名</label>
            <input type="text" id="inputLesson" required maxlength="100" placeholder="例: Lesson 01: ビジネスマナー">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="modalCancelBtn">キャンセル</button>
            <button type="submit" class="btn-primary">追加</button>
          </div>
        </form>
      </div>
    `;
    overlay.classList.add('active');

    const close = () => {
      overlay.classList.remove('active');
      overlay.innerHTML = '';
      onClose();
    };

    document.getElementById('modalCloseBtn').addEventListener('click', close);
    document.getElementById('modalCancelBtn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.getElementById('addLessonForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const 担当者 = document.getElementById('inputAssignee').value.trim();
      const レッスン名 = document.getElementById('inputLesson').value.trim();
      if (担当者 && レッスン名) {
        onSubmit(担当者, レッスン名);
        close();
      }
    });
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

  // ========== ローディング ==========
  showLoader(show) {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
  },

  // ========== HTML エスケープ ==========
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};
