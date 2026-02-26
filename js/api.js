// ============================================================
// GAS との通信層
// ============================================================

const API = {
  async getAll() {
    try {
      const url = CONFIG.GAS_URL + '?action=getAll';
      const response = await fetch(url);
      if (!response.ok) throw new Error('サーバーエラー: ' + response.status);
      return await response.json();
    } catch (err) {
      console.error('データ取得エラー:', err);
      throw err;
    }
  },

  async postAction(body) {
    try {
      const response = await fetch(CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow'
      });
      if (!response.ok) throw new Error('サーバーエラー: ' + response.status);
      return await response.json();
    } catch (err) {
      console.error('POST エラー:', err);
      throw err;
    }
  },

  async updateCheckbox(rowIndex, columnName, value) {
    return this.postAction({
      action: 'updateCheckbox',
      rowIndex,
      columnName,
      value
    });
  },

  async deleteLesson(rowIndex) {
    return this.postAction({
      action: 'deleteLesson',
      rowIndex
    });
  },

  async requestReview(rowIndex, columnName) {
    return this.postAction({
      action: 'requestReview',
      rowIndex,
      columnName
    });
  },

  async addLessonWithData(formData) {
    return this.postAction({
      action: 'addLessonWithData',
      担当者名: formData.担当者名,
      レッスン名: formData.レッスン名,
      initialSteps: formData.initialSteps || {},
      createDriveFolder: formData.createDriveFolder !== false,
      開始日: formData.開始日 || '',
      納期: formData.納期 || '',
      リリース日: formData.リリース日 || ''
    });
  },

  async updateField(rowIndex, columnName, value) {
    return this.postAction({
      action: 'updateField',
      rowIndex,
      columnName,
      value
    });
  }
};
