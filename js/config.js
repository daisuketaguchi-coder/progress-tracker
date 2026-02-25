// ============================================================
// 設定定数
// ============================================================

const CONFIG = {
  // GAS Web App の URL（デプロイ後に書き換えてください）
  GAS_URL: 'https://script.google.com/macros/s/AKfycby-tUr8PE31MthqcCEyct7WITZHZOj6_No-YPnWPfesGN1JStW5YPqc7fKLClzbhylo/exec',

  // ポーリング間隔（ミリ秒）
  POLL_INTERVAL: 30000,

  // 前工程の工程名リスト
  前工程: [
    'キックオフ',
    'リサーチ',
    'アウトライン作成',
    'アウトラインマネージャーCK',
    'スライド構成案作成',
    'スライド構成案マネージャーCK',
    'スライド作成依頼',
    'スライド完了チェック',
    '台本作成',
    '台本チェック',
    '台本マネージャーCK',
    'アバター音声入力依頼',
    'アバター音声入力完了'
  ],

  // 後工程の工程名リスト
  後工程: [
    '動画編集依頼',
    '動画初稿チェック',
    '動画校了確認',
    'サムネイル依頼',
    'サムネイル確認',
    'サムネイル校了',
    '告知依頼',
    '格納依頼',
    '格納チェック',
    '告知終了'
  ],

  // レビュー依頼ボタンを表示するマネージャーCK項目
  REVIEW_REQUEST_STEPS: [
    'アウトラインマネージャーCK',
    'スライド構成案マネージャーCK',
    '台本マネージャーCK'
  ],

  // データ入力フォームのフィールド定義（拡張可能）
  ENTRY_FORM_FIELDS: [
    {
      id: 'assignee',
      label: '担当者名',
      type: 'text',
      required: true,
      placeholder: '例: 田中太郎',
      maxlength: 100,
      columnName: '担当者名'
    },
    {
      id: 'lessonName',
      label: 'レッスン名',
      type: 'text',
      required: true,
      placeholder: '例: Lesson 01: ビジネスマナー',
      maxlength: 100,
      columnName: 'レッスン名'
    },
    {
      id: 'startDate',
      label: '開始日',
      type: 'date',
      required: false,
      columnName: '開始日'
    },
    {
      id: 'deadline',
      label: '納期',
      type: 'date',
      required: false,
      columnName: '納期'
    },
    {
      id: 'releaseDate',
      label: 'リリース日',
      type: 'date',
      required: false,
      columnName: 'リリース日'
    }
  ],

  // データ入力フォームで初期工程チェックを表示するか
  ENTRY_FORM_SHOW_INITIAL_STEPS: true,

  // 日付列名
  DATE_COLUMNS: ['開始日', '納期', 'リリース日'],

  // 定例レビューダッシュボード設定
  REVIEW: {
    STATUS: {
      RELEASED:     { key: 'released',    label: 'リリース済み', color: '#4CAF50', icon: '✅' },
      NEAR_RELEASE: { key: 'nearRelease', label: 'リリース間近', color: '#FF9800', icon: '🔜' },
      IN_PROGRESS:  { key: 'inProgress',  label: '進行中',       color: '#1976D2', icon: '🔧' },
      NOT_STARTED:  { key: 'notStarted',  label: '未着手',       color: '#9E9E9E', icon: '⏳' }
    },
    DELAY_WARNING_DAYS: 7,
    WORKLOAD: {
      LIGHT:  { max: 2,        label: '軽', color: '#4CAF50' },
      MEDIUM: { max: 4,        label: '中', color: '#FF9800' },
      HEAVY:  { max: Infinity, label: '高', color: '#E53935' }
    }
  },

  // 工程別進捗ビュー設定
  STEP_VIEW: {
    DEFAULT_PHASE: '前工程',
    SORT_OPTIONS: [
      { key: 'default', label: 'デフォルト順' },
      { key: 'progress_asc', label: '進捗率 昇順' },
      { key: 'progress_desc', label: '進捗率 降順' },
      { key: 'assignee', label: '担当者順' }
    ]
  },

  COLORS: {
    前工程: '#4CAF50',
    前工程Light: '#E8F5E9',
    後工程: '#FF9800',
    後工程Light: '#FFF3E0',
    primary: '#1976D2',
    primaryLight: '#E3F2FD',
    danger: '#E53935',
    bg: '#F5F5F5',
    card: '#FFFFFF',
    text: '#333333',
    textSub: '#757575',
    border: '#E0E0E0'
  }
};
