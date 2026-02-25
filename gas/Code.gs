// ============================================================
// 教材制作進捗管理 API — Google Apps Script
// このコードをGASエディタ(script.google.com)にコピペしてください
// ============================================================

const SHEET_NAME = '原本（新バージョン）';
const DATA_START_ROW = 3; // ヘッダー2行の次

// ===== Slack設定 =====
// ここにSlack Incoming Webhook URLを設定してください
const SLACK_WEBHOOK_URL = 'YOUR_SLACK_WEBHOOK_URL';
// 通知を有効にするか（Webhook URL設定前はfalseにしておく）
const SLACK_ENABLED = SLACK_WEBHOOK_URL !== 'YOUR_SLACK_WEBHOOK_URL';

// ===== Google Drive設定 =====
const SPREADSHEET_ID = '1UoSunbhvRT1NwyOZ5Mvipj-pJfKV2XftYg35wTY8xWU';
const PARENT_FOLDER_ID = '1NQFsKvPKD-l_GtpILBzy6ip9hqav_7qm';
const TEMPLATE_FOLDER_ID = '12Qtt9HUAKLWAV4xSeJPSJ8fhscflbUz-';
const TEMPLATE_SHEET_NAME = '原本（新バージョン）';

// Slack通知を送る列名（C列:キックオフ, E列:アウトライン作成, G列:スライド構成案作成, L列:台本チェック）
const SLACK_NOTIFY_COLUMNS = ['キックオフ', 'アウトライン作成', 'スライド構成案作成', '台本チェック'];

const COLUMN_MAP = {
  '担当者名': 1,
  'レッスン名': 2,
  'キックオフ': 3,
  'リサーチ': 4,
  'アウトライン作成': 5,
  'アウトラインマネージャーCK': 6,
  'スライド構成案作成': 7,
  'スライド構成案マネージャーCK': 8,
  'スライド作成依頼': 9,
  'スライド完了チェック': 10,
  '台本作成': 11,
  '台本チェック': 12,
  '台本マネージャーCK': 13,
  'アバター音声入力依頼': 14,
  'アバター音声入力完了': 15,
  '動画編集依頼': 16,
  '動画初稿チェック': 17,
  '動画校了確認': 18,
  'サムネイル依頼': 19,
  'サムネイル確認': 20,
  'サムネイル校了': 21,
  '告知依頼': 22,
  '格納依頼': 23,
  '格納チェック': 24,
  '告知終了': 25,
  '開始日': 26,
  '納期': 27,
  'リリース日': 28
};

const PRE_PROCESS_KEYS = [
  'キックオフ', 'リサーチ', 'アウトライン作成', 'アウトラインマネージャーCK',
  'スライド構成案作成', 'スライド構成案マネージャーCK', 'スライド作成依頼', 'スライド完了チェック',
  '台本作成', '台本チェック', '台本マネージャーCK', 'アバター音声入力依頼', 'アバター音声入力完了'
];

const POST_PROCESS_KEYS = [
  '動画編集依頼', '動画初稿チェック', '動画校了確認', 'サムネイル依頼',
  'サムネイル確認', 'サムネイル校了', '告知依頼', '格納依頼', '格納チェック', '告知終了'
];

// ===== GET =====
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getAll';
    let result;

    switch (action) {
      case 'getAll':
        result = getAllLessons();
        break;
      default:
        result = { error: '不明なアクション: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== POST =====
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;

    switch (action) {
      case 'updateCheckbox':
        result = updateCheckbox(body.rowIndex, body.columnName, body.value);
        break;
      case 'addLesson':
        result = addLesson(body.担当者名, body.レッスン名);
        break;
      case 'deleteLesson':
        result = deleteLesson(body.rowIndex);
        break;
      case 'requestReview':
        result = requestReview(body.rowIndex, body.columnName);
        break;
      case 'addLessonWithData':
        result = addLessonWithData(body);
        break;
      case 'updateField':
        result = updateField(body.rowIndex, body.columnName, body.value);
        break;
      default:
        result = { error: '不明なアクション: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== データ取得 =====
function getAllLessons() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();

  if (lastRow < DATA_START_ROW) {
    return { lessons: [] };
  }

  const numRows = lastRow - DATA_START_ROW + 1;
  const data = sheet.getRange(DATA_START_ROW, 1, numRows, 28).getValues();

  const lessons = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    // 担当者もレッスン名も空なら空行としてスキップ
    if (row[0] === '' && row[1] === '') continue;

    const preProcess = {};
    let preCount = 0;
    PRE_PROCESS_KEYS.forEach(key => {
      const val = row[COLUMN_MAP[key] - 1] === true;
      preProcess[key] = val;
      if (val) preCount++;
    });

    const postProcess = {};
    let postCount = 0;
    POST_PROCESS_KEYS.forEach(key => {
      const val = row[COLUMN_MAP[key] - 1] === true;
      postProcess[key] = val;
      if (val) postCount++;
    });

    const totalSteps = PRE_PROCESS_KEYS.length + POST_PROCESS_KEYS.length;

    // 日付列の取得（Date型→ISO文字列に変換）
    var startDate = row[COLUMN_MAP['開始日'] - 1];
    var deadline = row[COLUMN_MAP['納期'] - 1];
    var releaseDate = row[COLUMN_MAP['リリース日'] - 1];

    lessons.push({
      rowIndex: i + DATA_START_ROW,
      担当者名: row[0],
      レッスン名: row[1],
      前工程: preProcess,
      後工程: postProcess,
      進捗率: {
        全体: Math.round(((preCount + postCount) / totalSteps) * 100),
        前工程: Math.round((preCount / PRE_PROCESS_KEYS.length) * 100),
        後工程: Math.round((postCount / POST_PROCESS_KEYS.length) * 100)
      },
      開始日: (startDate instanceof Date) ? startDate.toISOString() : (startDate || ''),
      納期: (deadline instanceof Date) ? deadline.toISOString() : (deadline || ''),
      リリース日: (releaseDate instanceof Date) ? releaseDate.toISOString() : (releaseDate || '')
    });
  }

  return { lessons: lessons };
}

// ===== チェックボックス更新 =====
function updateCheckbox(rowIndex, columnName, value) {
  const colNum = COLUMN_MAP[columnName];
  if (!colNum) {
    return { error: '不明な列名: ' + columnName };
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  sheet.getRange(rowIndex, colNum).setValue(value === true);

  // 特定の列でチェックがONになった場合のみSlack通知を送信
  if (value === true && SLACK_ENABLED && SLACK_NOTIFY_COLUMNS.includes(columnName)) {
    try {
      const assignee = sheet.getRange(rowIndex, COLUMN_MAP['担当者名']).getValue();
      const lessonName = sheet.getRange(rowIndex, COLUMN_MAP['レッスン名']).getValue();

      // 工程の種別を判定
      const processType = PRE_PROCESS_KEYS.includes(columnName) ? '前工程' : '後工程';

      // 現在の進捗を計算
      const keys = processType === '前工程' ? PRE_PROCESS_KEYS : POST_PROCESS_KEYS;
      let doneCount = 0;
      keys.forEach(key => {
        if (key === columnName || sheet.getRange(rowIndex, COLUMN_MAP[key]).getValue() === true) {
          doneCount++;
        }
      });
      const progress = Math.round((doneCount / keys.length) * 100);

      sendSlackNotification(assignee, lessonName, columnName, processType, progress);
    } catch (slackErr) {
      // Slack通知エラーでもチェック更新自体は成功させる
      console.error('Slack通知エラー: ' + slackErr.message);
    }
  }

  return { success: true, rowIndex: rowIndex, columnName: columnName, value: value };
}

// ===== Slack通知送信 =====
function sendSlackNotification(assignee, lessonName, stepName, processType, progress) {
  const emoji = progress === 100 ? '🎉' : '✅';
  const progressBar = createProgressBar(progress);

  let message = emoji + ' *' + stepName + '* が完了しました\n';
  message += '> 📚 *' + lessonName + '* （担当: ' + assignee + '）\n';
  message += '> ' + processType + ' 進捗: ' + progressBar + ' ' + progress + '%';

  if (progress === 100) {
    message += '\n> 🎊 *' + processType + 'がすべて完了しました！*';
  }

  const payload = {
    text: message,
    mrkdwn: true
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
}

// ===== プログレスバー生成 =====
function createProgressBar(percent) {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ===== レビュー依頼送信 =====
function requestReview(rowIndex, columnName) {
  if (!SLACK_ENABLED) {
    return { error: 'Slack通知が無効です。SLACK_WEBHOOK_URLを設定してください。' };
  }

  const colNum = COLUMN_MAP[columnName];
  if (!colNum) {
    return { error: '不明な列名: ' + columnName };
  }

  // 許可された列のみ
  const REVIEW_COLUMNS = ['アウトラインマネージャーCK', 'スライド構成案マネージャーCK', '台本マネージャーCK'];
  if (!REVIEW_COLUMNS.includes(columnName)) {
    return { error: 'この項目にはレビュー依頼を送信できません: ' + columnName };
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const assignee = sheet.getRange(rowIndex, COLUMN_MAP['担当者名']).getValue();
  const lessonName = sheet.getRange(rowIndex, COLUMN_MAP['レッスン名']).getValue();

  sendReviewRequestNotification(assignee, lessonName, columnName);

  return { success: true };
}

// ===== レビュー依頼Slack通知 =====
function sendReviewRequestNotification(assignee, lessonName, stepName) {
  var deliverableName = '';
  if (stepName === 'アウトラインマネージャーCK') {
    deliverableName = 'アウトライン';
  } else if (stepName === 'スライド構成案マネージャーCK') {
    deliverableName = 'スライド構成案';
  } else if (stepName === '台本マネージャーCK') {
    deliverableName = '台本';
  }

  var message = '📋 *レビュー依頼*\n';
  message += '> 📚 *' + lessonName + '* （担当: ' + assignee + '）\n';
  message += '> ' + deliverableName + 'のレビューをお願いします 🙏';

  var payload = {
    text: message,
    mrkdwn: true
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
}

// ===== 実データの最終行を取得（カラムA/Bの値で判定） =====
function getNextDataRow(sheet) {
  var values = sheet.getRange('A:B').getValues();
  var lastDataRow = DATA_START_ROW - 1; // ヘッダー行（2行目）
  for (var i = values.length - 1; i >= DATA_START_ROW - 1; i--) {
    if (values[i][0] !== '' || values[i][1] !== '') {
      lastDataRow = i + 1; // 1-indexed
      break;
    }
  }
  return lastDataRow + 1;
}

// ===== レッスン追加 =====
function addLesson(担当者名, レッスン名) {
  if (!担当者名 || !レッスン名) {
    return { error: '担当者名とレッスン名は必須です' };
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const newRow = getNextDataRow(sheet);

  sheet.getRange(newRow, 1).setValue(担当者名);
  sheet.getRange(newRow, 2).setValue(レッスン名);

  // C〜Y列(3〜25)にチェックボックスを挿入
  for (let col = 3; col <= 25; col++) {
    sheet.getRange(newRow, col).insertCheckboxes();
  }

  return { success: true, rowIndex: newRow };
}

// ===== レッスン追加（データ入力フォーム用） =====
function addLessonWithData(data) {
  if (!data.担当者名 || !data.レッスン名) {
    return { error: '担当者名とレッスン名は必須です' };
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const newRow = getNextDataRow(sheet);

  // 基本情報を設定
  sheet.getRange(newRow, 1).setValue(data.担当者名);
  sheet.getRange(newRow, 2).setValue(data.レッスン名);

  // C〜Y列(3〜25)にチェックボックスを挿入
  for (var col = 3; col <= 25; col++) {
    sheet.getRange(newRow, col).insertCheckboxes();
  }

  // 初期工程ステータスを設定
  var initialSteps = data.initialSteps || {};
  for (var stepName in initialSteps) {
    if (initialSteps[stepName] === true && COLUMN_MAP[stepName]) {
      sheet.getRange(newRow, COLUMN_MAP[stepName]).setValue(true);
    }
  }

  // 日付列を設定
  var dateColumns = ['開始日', '納期', 'リリース日'];
  for (var d = 0; d < dateColumns.length; d++) {
    var colName = dateColumns[d];
    if (data[colName]) {
      sheet.getRange(newRow, COLUMN_MAP[colName]).setValue(new Date(data[colName]));
    }
  }

  // Google Driveにテンプレートフォルダをコピー（ベストエフォート）
  var folderUrl = null;
  var folderError = null;
  try {
    folderUrl = copyTemplateFolder(data.レッスン名);
  } catch (driveErr) {
    folderError = driveErr.message;
  }

  // テンプレートシートをコピー（ベストエフォート）
  var sheetUrl = null;
  var sheetError = null;
  try {
    sheetUrl = copyTemplateSheet(data.レッスン名);
  } catch (sheetErr) {
    sheetError = sheetErr.message;
  }

  var result = { success: true, rowIndex: newRow };
  if (folderUrl) result.folderUrl = folderUrl;
  if (folderError) result.folderError = folderError;
  if (sheetUrl) result.sheetUrl = sheetUrl;
  if (sheetError) result.sheetError = sheetError;
  return result;
}

// ===== レッスン削除 =====
function deleteLesson(rowIndex) {
  if (!rowIndex) {
    return { error: '行番号が必要です' };
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  sheet.deleteRow(rowIndex);

  return { success: true };
}

// ===== テンプレートフォルダ コピー =====
function copyTemplateFolder(lessonName) {
  var parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
  var templateFolder = DriveApp.getFolderById(TEMPLATE_FOLDER_ID);
  var newFolder = parentFolder.createFolder(lessonName);
  copyFolderContents_(templateFolder, newFolder);
  return newFolder.getUrl();
}

function copyFolderContents_(source, destination) {
  // ファイルをコピー
  var files = source.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    file.makeCopy(file.getName(), destination);
  }
  // サブフォルダを再帰コピー
  var folders = source.getFolders();
  while (folders.hasNext()) {
    var folder = folders.next();
    var newSub = destination.createFolder(folder.getName());
    copyFolderContents_(folder, newSub);
  }
}

// ===== テンプレートシート コピー =====
function copyTemplateSheet(lessonName) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var templateSheet = ss.getSheetByName(TEMPLATE_SHEET_NAME);
  if (!templateSheet) {
    throw new Error('テンプレートシート「' + TEMPLATE_SHEET_NAME + '」が見つかりません');
  }
  // 同名シートが既に存在する場合はエラー
  if (ss.getSheetByName(lessonName)) {
    throw new Error('同名のシート「' + lessonName + '」が既に存在します');
  }
  var newSheet = templateSheet.copyTo(ss);
  newSheet.setName(lessonName);
  // 一番右のタブに移動
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(ss.getNumSheets());
  var sheetId = newSheet.getSheetId();
  return 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/edit#gid=' + sheetId;
}

// ===== フィールド更新（担当者名・レッスン名） =====
const EDITABLE_COLUMNS = ['担当者名', 'レッスン名'];

function updateField(rowIndex, columnName, value) {
  if (!EDITABLE_COLUMNS.includes(columnName)) {
    return { error: '編集不可の列: ' + columnName };
  }
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { error: columnName + 'が空です' };
  }
  var colNum = COLUMN_MAP[columnName];
  if (!colNum) {
    return { error: '不明な列名: ' + columnName };
  }
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  sheet.getRange(rowIndex, colNum).setValue(value.trim());
  return { success: true, rowIndex: rowIndex, columnName: columnName, value: value.trim() };
}
