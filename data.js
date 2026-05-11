// ===== 架空案件のシナリオ =====
const PROJECT = {
  client: '架空株式会社（フィクション）',
  industry: '電子部品の専門商社・東京3拠点',
  employees: '社員120名',
  brief: '20年もののExcel在庫管理を刷新し、東京3拠点（本社千代田・物流センター江東・物流センター大田）でリアルタイムに動く在庫管理システムを構築したい。バーコードによる入出庫、スマホ照会、既存販売管理とのCSV連携が必須。予算は年額1,500万円以内。',
  meta: [
    { label: 'ヒアリング', value: '90分・3名' },
    { label: '対象拠点', value: '東京3拠点' },
    { label: '想定リリース', value: '6ヶ月後' },
    { label: '予算枠', value: '1,500万円/年' },
  ],
};

// kind: 'knowledge' | 'harness' | 'hook' | 'subagent' | 'skill' | 'mcp' | 'command'
const KIND_LABEL = {
  knowledge: 'ナレッジ（AGENTS.md / 規約）',
  harness:   'ハーネス（config.toml）',
  hook:      'Hooks（codex_hooks 有効化）',
  subagent:  'サブエージェント（agents/*.toml）',
  skill:     'Skills（skills/*.md）',
  mcp:       'MCPサーバー（[mcp_servers]）',
  command:   'スラッシュコマンド（Skills 配下）',
};

// ===== 工程データ =====
const PHASES = [

  // ───────────────────────── 01 ─────────────────────────
  {
    num: '01',
    title: 'ヒアリング解析',
    sub: '文字起こしから要求を構造化抽出',
    duration: '約3分',
    outcome: '機能要求48件・非機能要求12件・制約7件・ステークホルダー4名を一括抽出',
    flow: {
      input:     { label: 'ヒアリング文字起こし', detail: 'TXT 約20,000字 / 90分' },
      operation: { label: '/extract-requirements', detail: 'スラッシュコマンド' },
      config:    { label: 'req-extractor agent',   detail: 'サブエージェント定義' },
      output:    { label: 'requirements-raw.md',   detail: '要求一覧（生）' },
    },
    artifactsIn: [
      {
        name: 'transcripts/kakuu-2026-04-15.txt',
        lang: 'text',
        body:
`[架空株式会社 ヒアリング文字起こし 抜粋]
00:14:32 田中物流部長: 在庫数の確認に毎日2時間かかってる。Excel台帳が3つあって、どれが最新か誰もわからない。
00:18:05 佐藤情シス: 既存の販売管理システムは20年もの。改修は厳しい。
00:23:11 山本社長: スマホからリアルタイムで在庫が見られたら理想的。営業先で即答できる。
00:31:48 田中物流部長: バーコード読み取りで入出庫を打てると現場が楽。
00:42:22 佐藤情シス: 既存システムとはCSV連携でいい。リアルタイム連携はオーバースペック。
00:51:09 山本社長: 予算は年額1,500万、内製は無理。
01:02:15 田中物流部長: 拠点は千代田の本社、江東と大田の物流センター。3拠点で同時に動かしたい。
01:18:40 佐藤情シス: Oracle 11gが裏にいる。直接触らせるのは無理。CSVで日次が現実的。
01:24:03 山本社長: 営業時間中は止まってほしくない。深夜のメンテは構わない。
01:31:55 田中物流部長: 棚卸しは年4回。差異が出たら原因を追えるようにしたい。`,
      },
    ],
    configFiles: [
      {
        kind: 'knowledge',
        path: 'AGENTS.md（要求工学のプロジェクト規約 抜粋）',
        lang: 'md',
        body:
`# プロジェクト規約 - 要求工学

## 用語
- 機能要求(FR) / 非機能要求(NFR) / 制約(CON)
- ステークホルダーは「役割 / 関心事 / 権限」の3項で記述

## トレーサビリティ
- すべての要求に発言者・タイムスタンプ・確信度を保持
- 後工程で要求IDから一次ソース（文字起こし行）に辿れること

## 抽出のお作法
- 計測不能な要求は「要具体化」フラグ
- 暗黙要求は (推定) を本文に明示
- 否定の発言（〜は不要）も要求として残す

> /init で雛形生成、/memory でメモリ管理（いずれも公式コマンド）`,
      },
      {
        kind: 'subagent',
        path: '.codex/agents/req-extractor.toml',
        lang: 'toml',
        body:
`name = "req_extractor"
description = "顧客ヒアリング文字起こしから機能要求/非機能要求/制約/ステークホルダーを構造化抽出する"
model = "gpt-5.5-codex-spark"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
あなたは要求工学の専門家です。

入力: ヒアリング文字起こしテキスト
出力: 以下を持つMarkdown

# 機能要求
| ID | 要求 | 発言者 | TS | 確信度(高/中/低) |

# 非機能要求
| ID | 要求 | 種別(性能/可用/セキュ/運用/UX) | 発言者 |

# 制約条件
- 予算 / スケジュール / 既存システム / 法令

# ステークホルダー
- 役割 / 関心事 / 権限 / 連絡先

抽出ルール:
- 発言の根拠タイムスタンプを必ず保持
- 計測不能な要求は「要具体化」フラグを付与
- 暗黙要求は (推定) を本文に明示
- 入力20,000字超の場合は5,000字単位で分割処理しコンテキストを節約
"""`,
      },
      {
        kind: 'subagent',
        path: '.codex/agents/req-reviewer.toml',
        lang: 'toml',
        body:
`name = "req_reviewer"
description = "抽出済み要求一覧をレビューし、計測不能・重複・暗黙要求を検出"
model = "gpt-5.5"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
チェック観点:
1. 計測不能な要求（「使いやすい」「かっこよく」等）
2. 重複 / 矛盾要求
3. ステークホルダー別の網羅性（権限者ごとに最低1件）
4. 暗黙要求の取りこぼし（特にセキュリティ / 法令 / アクセシビリティ）

出力: [INFO]/[WARN]/[ERROR] + 該当ID + 提案
"""`,
      },
      {
        kind: 'command',
        path: '.codex/skills/extract-requirements.md',
        lang: 'md',
        body:
`---
description: 文字起こしtxtを req_extractor に渡し、req_reviewer で自動レビューまで完走
argument-hint: <transcript-path>
---
# 要求抽出パイプライン
1. \`req_extractor\` サブエージェントを spawn して \$ARGUMENTS を解析
2. 完了したら \`req_reviewer\` サブエージェントを spawn して docs/01-requirements-raw.md を点検
3. WARN/ERROR があれば次工程に進まず、人間に提示して確認

引数: $1 = transcript path
全引数: $ARGUMENTS`,
      },
    ],
    bestPractices: [
      { title: '一次ソースの保持を最優先', body: '発言者ラベルとタイムスタンプは「監査の根拠」。後工程で要求IDからヒアリング行に1秒で遡れる構造を最初に作る。' },
      { title: '確信度ラベルで「あいまいさ」を可視化', body: '確信度(高/中/低)を要求テーブルに混ぜず別カラムで管理。MoSCoW分類のときに迷い処理が高速化する。' },
      { title: '長文入力は分割処理', body: '20,000字超のtxtはエージェント側で分割。コンテキストを圧迫すると後段の精度が下がる。' },
      { title: '抽出後すぐにレビューエージェント', body: '別エージェント(req-reviewer)で点検する二段構え。同じ思考で書いた本人レビューより精度が出る。' },
    ],
    officialRefs: [
      { label: '/agent（公式コマンド）', body: 'Codex CLI 内でアクティブなサブエージェントを切替・状態確認。手動で起動・停止する操作系。' },
      { label: 'AGENTS.md（公式仕様）', body: 'プロジェクトルート/ユーザーホームに置くと Codex が起動時に自動読み込み。project_doc_max_bytes で取り込み上限を制御。' },
      { label: 'OpenAI公式ドキュメント: Subagents', body: '~/.codex/agents/*.toml の必須フィールド (name/description/developer_instructions) と、model/sandbox_mode 等の任意オーバーライド。' },
    ],
    execution: {
      command: '/extract-requirements transcripts/kakuu-2026-04-15.txt',
      lines: [
        '> /extract-requirements カスタムコマンドを実行',
        '  Step 1: req_extractor サブエージェントを spawn',
        '    Read: transcripts/kakuu-2026-04-15.txt (19,847字)',
        '    発言抽出: 田中物流部長(48), 佐藤情シス(31), 山本社長(22)',
        '    要求候補を分類中...',
        '    抽出完了: FR48 / NFR12 / CON7 / SH4',
        '    Write: docs/01-requirements-raw.md (3,142行)',
        '',
        '  Step 2: req_reviewer サブエージェントを spawn',
        '    Read: docs/01-requirements-raw.md',
        '    検出: INFO 1件 / WARN 1件 / ERROR 0件',
        '    → ブロッカー無し、次工程進行可',
        '',
        '✓ 完了 (2分47秒)',
      ],
    },
    artifactsOut: [
      {
        name: 'docs/01-requirements-raw.md',
        lang: 'md',
        body:
`# 要求一覧（生）- 架空株式会社 在庫管理システム

## 機能要求
| ID | 要求 | 発言者 | TS | 確信度 |
|----|------|--------|----|--------|
| FR-001 | スマホからリアルタイム在庫照会 | 山本社長 | 00:23:11 | 高 |
| FR-002 | バーコードによる入出庫登録 | 田中物流部長 | 00:31:48 | 高 |
| FR-003 | 3拠点（千代田/江東/大田）の同時稼働 | 田中物流部長 | 01:02:15 | 高 |
| FR-004 | 既存販売管理(Oracle 11g)とCSV日次連携 | 佐藤情シス | 01:18:40 | 高 |
| FR-005 | 棚卸差異の原因追跡（履歴照会） | 田中物流部長 | 01:31:55 | 中 |
| ...   | （以下43件略） | | | |

## 非機能要求
| NFR-001 | 在庫照会レスポンス 2秒以内 | 性能 |
| NFR-002 | 営業時間中（8-19時）の稼働率 99.5% | 可用性 |
| NFR-003 | 認証は多要素必須 (推定) | セキュリティ |

## 制約
- 予算: 年額1,500万円以内
- 既存DB Oracle 11g は直接更新不可（CSV経由のみ）
- 内製不可、ベンダー保守前提

## ステークホルダー
- 山本社長 / ROI判断・最終決裁
- 田中物流部長 / 現場運用・最終受入
- 佐藤情シス / 既存システム連携・運用引取`,
      },
    ],
    review: {
      skillName: '/req_reviewer',
      prompt:
`要求レビュアとして以下を確認:
1. 計測不能な要求（具体化要請）
2. 重複・矛盾
3. ステークホルダー別の網羅
4. 暗黙要求の取りこぼし（特にセキュリティ・法令）
出力: [INFO]/[WARN]/[ERROR] + 該当ID + 提案`,
      comments: [
        { level: 'INFO', target: 'FR-007', body: '「画面はかっこよく」は計測不能。具体化要請が必要' },
        { level: 'WARN', target: 'NFR-003', body: 'セキュリティ要件が暗黙のみ。次回ヒアリングで深堀り推奨' },
        { level: 'OK',   target: '全件',    body: '機能要求48件すべてに発言者ソースとTSを保持' },
      ],
    },
  },

  // ───────────────────────── 02 ─────────────────────────
  {
    num: '02',
    title: '要求精査・優先度付け',
    sub: 'MoSCoW分類とステークホルダー確認',
    duration: '約8分',
    outcome: 'Must16 / Should14 / Could10 / Wont8。確認シート自動生成、先方の同意1往復で完了',
    flow: {
      input:     { label: 'requirements-raw.md',   detail: '要求一覧（生）' },
      operation: { label: '/prioritize',           detail: 'MoSCoW + AskUserQuestion' },
      config:    { label: 'prioritizer agent',     detail: '人間判断を内蔵' },
      output:    { label: 'requirements-final.md', detail: '優先度付き要求' },
    },
    artifactsIn: [
      { name: 'docs/01-requirements-raw.md', lang: 'md', body: '（前工程の成果物：機能要求48件・非機能要求12件・制約7件）' },
    ],
    configFiles: [
      {
        kind: 'subagent',
        path: '.codex/agents/prioritizer.toml',
        lang: 'toml',
        body:
`name = "prioritizer"
description = "要求一覧をMoSCoW分類し、判断に迷う項目は対話で人間に確認する"
model = "gpt-5.5"
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
developer_instructions = """
分類基準:
- Must  : リリース必須。なければプロジェクト失敗
- Should: 重要だが回避策あり
- Could : あれば嬉しい
- Wont  : 今回スコープ外（次フェーズ候補）

迷いが生じる条件（必ずユーザーに対話で確認）:
- 確信度「中・低」かつ Must候補
- 予算/スケジュール制約に抵触する可能性
- ステークホルダー間で対立する要求

出力:
- docs/02-requirements-final.md（優先度カラム付き）
- docs/02-stakeholder-review.md（先方確認シート）
"""`,
      },
      {
        kind: 'harness',
        path: '.codex/config.toml（承認・サンドボックス設定）',
        lang: 'toml',
        body:
`approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
writable_roots = ["./docs"]
network_access = false`,
      },
    ],
    bestPractices: [
      { title: '迷ったら対話確認', body: '「Codex が勝手に決めた」を防ぐ。優先度はビジネス判断、技術判断ではない。approval_policy=on-request で要所止め。' },
      { title: 'Must比率は20-40%', body: '50%超は要求肥大のサイン。「全部Must」は要求精査が機能していない証拠。' },
      { title: 'ステークホルダー別に確認シートを分ける', body: '社長向け/現場向け/情シス向けで関心事が違う。1枚で投げると「自分の論点」だけ見て他は流される。' },
      { title: '次フェーズ候補(Wont)も明記', body: '「捨てた」のではなく「順番に並べた」と伝える。営業上のメリットも大きい。' },
    ],
    officialRefs: [
      { label: 'approval_policy（公式設定）', body: 'untrusted / on-request / never / granular の4種。on-request は Codex が判断に迷う操作で都度ユーザー承認を求める。' },
      { label: 'sandbox_mode（公式設定）', body: 'read-only / workspace-write / danger-full-access。書き込み範囲を sandbox_workspace_write.writable_roots で限定。' },
    ],
    execution: {
      command: '/prioritize docs/01-requirements-raw.md',
      lines: [
        '> prioritizer エージェントを起動...',
        '  分類処理: 48件 / 12件 / 7件',
        '  自動分類: 51件',
        '  人間判断要請: 9件',
        '',
        '? approval_policy=on-request 承認待ち 「FR-021 IoTセンサー連携」は今回のMustですか？',
        '  発言者の確信度: 低 / 予算逼迫: 該当',
        '  選択肢: [Must / Should / Could / Wont / 確認延期]',
        '> Wont (次フェーズ候補)',
        '',
        '... (8件の確認を経て分類完了)',
        '',
        'Must  16件 / Should 14件 / Could 10件 / Wont 8件',
        '✓ 完了 (7分41秒)',
        '  Write: docs/02-requirements-final.md',
        '  Write: docs/02-stakeholder-review.md',
      ],
    },
    artifactsOut: [
      {
        name: 'docs/02-requirements-final.md',
        lang: 'md',
        body:
`# 要求一覧（精査済）

## Must (16件)
- FR-001 スマホからリアルタイム在庫照会
- FR-002 バーコード入出庫
- FR-003 3拠点同時稼働
- FR-004 Oracle CSV日次連携
- NFR-001 照会レスポンス 2秒以内
- NFR-002 稼働率 99.5%
- ...

## Should (14件)
- FR-005 棚卸差異の原因追跡
- FR-009 在庫アラート（下限割れ）
- ...

## Could (10件)
## Wont (今回スコープ外, 次フェーズ候補)
- FR-021 IoTセンサー連携
- FR-034 AI需要予測`,
      },
      {
        name: 'docs/02-stakeholder-review.md',
        lang: 'md',
        body:
`# ステークホルダー確認シート

田中物流部長 / 現場運用 / 確認依頼:
  - FR-005 棚卸差異追跡 を Should にしました。年4回の棚卸でMust相当ですか？
  - FR-013 写真添付 を Could にしました。証跡として必須ではないでしょうか？

山本社長 / ROI判断 / 確認依頼:
  - FR-021 IoTセンサー / FR-034 AI予測 は次フェーズへ。今期スコープ外で問題ありませんか？

佐藤情シス / 連携 / 確認依頼:
  - FR-027 SAML認証 を Should にしました。法令要件として Must では？`,
      },
    ],
    review: {
      skillName: '/review-priority',
      prompt: 'MoSCoW分類結果を確認し、Must比率33%（16/48）が妥当か、ステークホルダー別の偏りがないか、確認シートが必要十分かをチェック。',
      comments: [
        { level: 'OK',   target: 'Must比率',    body: '33%。一般的な健全範囲(20-40%)' },
        { level: 'INFO', target: '確認シート', body: '3名分、計5項目を要確認として整理。次の打合せ前に送付推奨' },
      ],
    },
  },

  // ───────────────────────── 03 ─────────────────────────
  {
    num: '03',
    title: '要件定義書作成',
    sub: '社内規約に沿ったRDDを生成',
    duration: '約12分',
    outcome: '要件定義書（20章/68頁）+ 業務フロー図（Mermaid）+ 用語集が一括生成',
    flow: {
      input:     { label: 'requirements-final.md',         detail: '優先度付き要求' },
      operation: { label: '/generate-rdd',                 detail: 'RDD生成コマンド' },
      config:    { label: 'rdd-template skill + AGENTS.md', detail: '社内規約テンプレ' },
      output:    { label: 'requirements-definition.md',    detail: '要件定義書 v1.0' },
    },
    configFiles: [
      {
        kind: 'knowledge',
        path: 'AGENTS.md（ドキュメント規約）',
        lang: 'md',
        body:
`# プロジェクト規約 - ドキュメント

## ドキュメント規約
- 章立てはISO/IEC/IEEE 29148準拠
- 図はMermaid（PlantUMLは不可）
- 用語は本書末尾の用語集を参照（揺れを禁止）
- 受身形を避け能動態で記述

## トレーサビリティ
- すべての要件にFR/NFR/CON IDを付与し、要求一覧と紐付け
- 章末に「関連要求ID一覧」を必ず付ける

## レビューフロー
- ドラフト生成後、req-reviewer サブエージェントが自動レビュー
- WARN/ERRORが残ったままcommitしない（PreToolUse Hookで防止）`,
      },
      {
        kind: 'skill',
        path: '.codex/skills/rdd-template.md',
        lang: 'md',
        body:
`---
description: 要件定義書(RDD)の標準テンプレートを適用。ISO/IEC/IEEE 29148準拠の章構成を強制し、関連要求IDのトレーサを自動付与する
argument-hint: <requirements-final-path>
---
# RDD章構成

1. はじめに（背景・目的・対象範囲）
2. 用語の定義
3. 業務概要
4. 業務フロー（As-Is / To-Be 各Mermaid）
5. システム化の範囲
6. 機能要件
7. 非機能要件
8. 外部システム連携
9. データ要件
10. セキュリティ要件
11. 運用要件
12. 制約条件
13. 移行要件
14. 教育・サポート
15. 受入基準
16. 用語集
（※ 第17-20章はプロジェクト個別追記）

## 関連リソース
- ./templates/rdd-skeleton.md
- ./templates/glossary.md

引数: $1 = requirements final path
全引数: $ARGUMENTS`,
      },
      {
        kind: 'hook',
        path: '.codex/config.toml（PreToolUse: WARN残りcommit禁止）',
        lang: 'toml',
        body:
`[features]
codex_hooks = true

[[hooks.PreToolUse]]
matcher = "^shell$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = '''
if echo "$CODEX_TOOL_INPUT" | grep -q 'git commit' && grep -rE '\\[(WARN|ERROR)\\]' docs/ >/dev/null 2>&1; then
  echo 'WARN/ERRORが残っています' >&2
  exit 2
fi
'''
timeout = 10
statusMessage = "docs/ の WARN/ERROR を点検"`,
      },
    ],
    bestPractices: [
      { title: '章構成は規約に強制させる', body: '「次の案件でも同じ品質で」を実現するには、人の記憶ではなくスキルに記憶させる。~/.codex/skills/ で雛形を一元化。' },
      { title: 'トレーサIDで「なぜこの仕様か」を5秒で遡る', body: '半年後の改修時、要求まで戻れる構造が事故を防ぐ。' },
      { title: '生成→自動レビュー→コミットを Hook で連鎖', body: 'PreToolUse でWARN/ERROR残りcommitを物理的に止める。レビューを忘れる人間の脆弱性を補う。' },
      { title: 'Mermaidに統一', body: '画像系はバージョン管理で差分が見えない。テキスト系図に絞ると差分レビュー可能。' },
    ],
    officialRefs: [
      { label: 'Skills（公式機能）', body: '~/.codex/skills/*.md をMarkdown + frontmatter (description / argument-hint) で配置すると / 経由のスラッシュコマンドとして起動。旧 prompts は deprecated。' },
      { label: '[features].codex_hooks（公式設定）', body: 'true にすると hooks 機能が有効化。PreToolUse / PostToolUse などのイベントを matcher / type=command / command / timeout / statusMessage で定義。' },
      { label: 'OpenAI公式ドキュメント: Hooks', body: 'config.toml インライン or ~/.codex/hooks.json で定義可能。プロジェクト範囲のフックは trusted プロジェクトのみ読み込み。' },
    ],
    execution: {
      command: '/generate-rdd docs/02-requirements-final.md',
      lines: [
        '> /rdd-template スキルを適用',
        '  AGENTS.md 規約を読込: 章構成 / トレーサ / 図表ルール',
        '  業務フロー(As-Is)を Mermaid で生成中...',
        '  業務フロー(To-Be)を Mermaid で生成中...',
        '  章 1-20 を生成中... (進捗 20/20)',
        '',
        '生成完了:',
        '  本文      8,420行',
        '  Mermaid図   6点',
        '  用語集     38語',
        '',
        '> req_reviewer サブエージェントを spawn...',
        '  WARN 0件 / ERROR 0件',
        '✓ 完了 (11分58秒)',
        '  Write: docs/03-requirements-definition.md',
      ],
    },
    artifactsOut: [
      {
        name: 'docs/03-requirements-definition.md',
        lang: 'md',
        body:
`# 在庫管理システム 要件定義書 v1.0

## 1. はじめに
### 1.1 背景
架空株式会社は3拠点で稼働するExcel在庫管理に依存しており、最新版の特定に毎日2時間を要している。営業現場では在庫照会に半日以上を要する場合があり、機会損失が発生している。

### 1.2 目的
拠点横断のリアルタイム在庫管理を実現し、現場運用効率を改善する。

## 4. 業務フロー
### 4.1 As-Is
\`\`\`mermaid
flowchart LR
  A[受注] --> B[Excel台帳に記入]
  B --> C{台帳3種を確認}
  C -->|差異あり| D[電話で在庫照会]
  C -->|差異なし| E[出荷指示]
  D --> E
\`\`\`
### 4.2 To-Be
\`\`\`mermaid
flowchart LR
  A[受注] --> B[在庫DB照会]
  B --> C[出荷指示]
  C --> D[バーコード読取]
  D --> E[在庫DB更新]
\`\`\`

## 6. 機能要件
### 6.1 在庫照会 (FR-001)
- スマホ/PCブラウザから在庫数を照会できること
- 拠点別/品目別/ロット別で表示できること
- 関連要求: FR-001, FR-003, NFR-001

（以下20章まで継続）`,
      },
    ],
    review: {
      skillName: '/review-rdd',
      prompt: 'RDDの章立てがAGENTS.md準拠か、要求IDのトレーサビリティが全項目で取れているか、図表ルール（Mermaid限定）が守られているかチェック。',
      comments: [
        { level: 'OK',   target: '章構成',           body: '20章すべてテンプレ準拠' },
        { level: 'OK',   target: 'トレーサビリティ', body: '機能要件章すべてに関連要求ID記載' },
        { level: 'INFO', target: '4.1 As-Is図',    body: '業務フローを実測値（毎日2時間）と接続。読み手にインパクト' },
      ],
    },
  },

  // ───────────────────────── 04 ─────────────────────────
  {
    num: '04',
    title: '仕様定義',
    sub: '機能仕様書とユーザーストーリーを生成',
    duration: '約18分',
    outcome: 'ユーザーストーリー36本（US-001〜036）+ 受入基準（Gherkin）+ 機能仕様書',
    flow: {
      input:     { label: 'requirements-definition.md', detail: '要件定義書' },
      operation: { label: '/spec-out',                  detail: '仕様生成コマンド' },
      config:    { label: 'spec-writer agent',          detail: 'Gherkin準拠' },
      output:    { label: 'specification/',             detail: '仕様書一式' },
    },
    configFiles: [
      {
        kind: 'subagent',
        path: '.codex/agents/spec-writer.toml',
        lang: 'toml',
        body:
`name = "spec_writer"
description = "要件定義書から機能仕様書とユーザーストーリーを生成する"
model = "gpt-5.5-codex-spark"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
developer_instructions = """
出力ルール:
- ユーザーストーリーは「As a ... / I want ... / So that ...」形式
- 受入基準は Gherkin (Given/When/Then) で記述
- 1ストーリー = 1ファイル (specification/stories/US-XXX.md)
- 関連要求IDを冒頭にメタデータとして付与
- 画面仕様は ASCII art ワイヤーで補強

INVEST原則:
- Independent: ストーリー間で順序依存しない
- Negotiable: 詳細は会話で詰める
- Valuable: ステークホルダーに価値が届く
- Estimable: 見積もり可能 (13pt以上は分割サイン)
- Small: 1スプリントで完了
- Testable: 受入基準で検証可能
"""`,
      },
      {
        kind: 'knowledge',
        path: 'templates/user-story.md',
        lang: 'md',
        body:
`---
id: US-XXX
related: FR-XXX, NFR-XXX
priority: Must|Should|Could
estimate: <1-13>pt
---
# US-XXX タイトル

As a <ロール>
I want <欲しい振る舞い>
So that <得られる価値>

## 受入基準
\`\`\`gherkin
Feature: ...
  Scenario: 正常系
    Given ...
    When ...
    Then ...
\`\`\`

## ワイヤーフレーム
\`\`\`
（ASCII artで補強）
\`\`\``,
      },
    ],
    bestPractices: [
      { title: '1ストーリー=1ファイル', body: '差分レビューしやすく、PR単位とも一致する。長大な仕様書1本より管理コストが下がる。' },
      { title: 'Gherkinはそのままit()に変換', body: '仕様↔テストのリンクが切れない。後工程の test-writer が同じファイルを読めば自動でテストになる。' },
      { title: '13pt以上は分割サイン', body: '見積もりが大きすぎる=要件が混ざっている。割れない場合はスパイク(調査タスク)に切り出す。' },
      { title: 'ASCIIワイヤーで意図を固定', body: '画像はバージョン管理で差分が読めない。荒くてもテキストの方が後で活きる。' },
    ],
    officialRefs: [
      { label: '~/.codex/agents/*.toml（公式仕様）', body: 'name / description / developer_instructions が必須、model / model_reasoning_effort / sandbox_mode / mcp_servers が任意。親セッションから継承。' },
      { label: 'OpenAI公式ドキュメント: Subagents', body: '専門エージェントごとに model を選び分けることで、コストと性能を両立する設計指針を提示。[agents] max_threads 6 で並列上限を制御。' },
    ],
    execution: {
      command: '/spec-out docs/03-requirements-definition.md',
      lines: [
        '> spec-writer エージェントを起動...',
        '  機能要件 24項 → ユーザーストーリー候補に変換中',
        '  US-001 ~ US-036 を生成 (進捗 36/36)',
        '  受入基準 Gherkin を 124本 生成',
        '  画面仕様 ワイヤー 18面 を生成',
        '',
        '✓ 完了 (17分22秒)',
        '  Write: specification/functional-spec.md',
        '  Write: specification/stories/US-001.md ~ US-036.md',
        '  Write: specification/wireframes/*.txt',
      ],
    },
    artifactsOut: [
      {
        name: 'specification/stories/US-001.md',
        lang: 'md',
        body:
`---
id: US-001
related: FR-001, FR-003, NFR-001
priority: Must
estimate: 3pt
---
# US-001 リアルタイム在庫照会

As a 営業担当
I want スマホから品目コードで在庫を照会し
So that 客先で即答できる

## 受入基準
\`\`\`gherkin
Feature: 在庫照会
  Scenario: 品目コードでの照会
    Given 営業担当者がログイン済みである
    When 品目コード "A-001" を入力する
    Then 千代田/江東/大田の在庫数が2秒以内に表示される

  Scenario: 在庫切れ品目の表示
    Given 在庫が0の品目 "B-099" がある
    When 品目コード "B-099" を入力する
    Then 「在庫切れ」表示と最終出庫日が表示される
\`\`\`

## ワイヤーフレーム
\`\`\`
+----------------------------+
| [≡] 在庫照会        [USER] |
+----------------------------+
| 品目コード: [____ ]    [Q] |
+----------------------------+
| A-001 電子コネクタ TypeA   |
|   千代田 120 / 江東   85   |
|   大田    42 / 計    247   |
+----------------------------+
\`\`\``,
      },
    ],
    review: {
      skillName: '/review-spec',
      prompt: 'ユーザーストーリーが INVEST 原則を満たすか、Gherkinが具体的か、関連要求IDの取りこぼしがないかチェック。',
      comments: [
        { level: 'OK',   target: 'INVEST', body: '36本すべて Independent / Testable を満たす' },
        { level: 'INFO', target: 'US-014', body: '見積もり13ptが過大。分割を検討' },
      ],
    },
  },

  // ───────────────────────── 05 ─────────────────────────
  {
    num: '05',
    title: '基本設計',
    sub: 'アーキ・DB・APIとADRを同時に生成',
    duration: '約25分',
    outcome: 'C4図(L1-L3) / ER図 / OpenAPI仕様 / ADR-0001〜0008',
    flow: {
      input:     { label: 'specification/',          detail: '仕様書一式' },
      operation: { label: '/design-architecture',    detail: '設計コマンド' },
      config:    { label: 'architect agent + ADRテンプレ', detail: '意思決定の記録' },
      output:    { label: 'design/basic/',           detail: '基本設計書一式' },
    },
    configFiles: [
      {
        kind: 'subagent',
        path: '.codex/agents/architect.toml',
        lang: 'toml',
        body:
`name = "architect"
description = "仕様書からシステムアーキテクチャ・DB・API設計を生成。意思決定はADRに記録"
model = "gpt-5.5-codex-spark"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
mcp_servers = ["github"]
developer_instructions = """
意思決定が必要な場面で必ずADR(Architecture Decision Record)を生成。

## 設計の前提
- 技術スタック既定: Next.js 15 / TypeScript / PostgreSQL / Vercel
- 認証: Auth.js + SAML2.0 (社内IdP連携)
- 既存Oracle 11gとはCSV(SFTP) 日次バッチ

## 出力
- C4 Level 1 (System Context)
- C4 Level 2 (Container)
- C4 Level 3 (Component) ※主要コンテナのみ
- ER図 (Mermaid)
- OpenAPI 3.1 仕様
- ADR-NNNN.md (意思決定ごと)
"""`,
      },
      {
        kind: 'knowledge',
        path: 'templates/adr.md',
        lang: 'md',
        body:
`# ADR-NNNN: <決定タイトル>

## ステータス
提案 / 採用 / 廃止

## 文脈
何が課題で、なぜ今決める必要があるのか

## 決定
何を選んだか

## 結果
良い影響 / 悪い影響 / 受け入れたトレードオフ

## 代替案
検討したが採用しなかった選択肢と却下理由`,
      },
      {
        kind: 'mcp',
        path: '~/.codex/config.toml（MCPサーバー定義）',
        lang: 'toml',
        body:
`[mcp_servers.github]
enabled = true
command = "docker"
args = [
  "run", "-i", "--rm",
  "-e", "GITHUB_PERSONAL_ACCESS_TOKEN",
  "ghcr.io/github/github-mcp-server",
]
env = { GITHUB_PERSONAL_ACCESS_TOKEN = "\${GITHUB_TOKEN}" }
startup_timeout_sec = 30
enabled_tools = ["create_pr", "list_issues", "comment_issue"]`,
      },
    ],
    bestPractices: [
      { title: '意思決定の瞬間にADRを書く', body: '半年後に「なぜこの選択にした？」を再現できないと、改修時に必ず後悔する。' },
      { title: '代替案と却下理由まで書く', body: 'ADRの本体は「却下した道」。そこを残さないと意思決定の再現性が0になる。' },
      { title: 'C4のレベル粒度を統一', body: 'L1〜L3で抽象度がブレると読み手が迷う。L3はサービス1〜2個に絞る。' },
      { title: 'OpenAPIをmainブランチに置く', body: 'フロントとサーバーが同じファイルを参照することで、契約破壊を即検知。' },
    ],
    officialRefs: [
      { label: 'GitHub MCP（GitHub公式提供）', body: 'PR/Issue/コメントを Codex CLI から直接操作。設計決定をPRとして残せる。enabled_tools で公開ツールを限定できる。' },
      { label: '[mcp_servers] 設定（公式仕様）', body: 'config.toml に command/args/env/startup_timeout_sec/enabled_tools を記述。プロジェクト固有は .codex/config.toml、ユーザー共通は ~/.codex/config.toml。' },
      { label: 'OpenAI公式ドキュメント: Model Context Protocol', body: 'stdio / HTTP / SSE のトランスポート、認可フロー、サーバー実装ガイド。' },
    ],
    execution: {
      command: '/design-architecture specification/',
      lines: [
        '> architect エージェントを起動...',
        '  C4 L1 System Context を生成',
        '  C4 L2 Container を生成 (Web/API/DB/Batch/IdP)',
        '  C4 L3 Component を主要3コンテナで生成',
        '  ER図: 12テーブル, 主要関連18本',
        '  OpenAPI: 24エンドポイント',
        '',
        '  意思決定が発生 → ADR生成:',
        '    ADR-0001 フロントは Next.js 採用',
        '    ADR-0002 DBは PostgreSQL 採用',
        '    ADR-0003 認証は Auth.js + SAML2.0',
        '    ADR-0004 バーコード読取はWeb Bluetooth不採用、PWAカメラ採用',
        '    ADR-0005 拠点ルーティングはアプリ層で処理',
        '    ADR-0006 監査ログは別DBに分離',
        '    ADR-0007 デプロイは Vercel + Supabase',
        '    ADR-0008 バッチは Vercel Cron',
        '',
        '✓ 完了 (24分10秒)',
      ],
    },
    artifactsOut: [
      {
        name: 'design/basic/c4-l1.md',
        lang: 'md',
        body:
`# C4 Level 1: System Context
\`\`\`mermaid
flowchart TB
  user1[営業担当 スマホ] --> sys[在庫管理システム]
  user2[現場作業員 タブレット] --> sys
  user3[管理者 PC] --> sys
  sys --> idp[社内IdP SAML2.0]
  sys --> oracle[(Oracle 11g 既存販売管理)]
  sys --> mail[メール配信]
\`\`\``,
      },
      {
        name: 'design/basic/adr/ADR-0002.md',
        lang: 'md',
        body:
`# ADR-0002: DBは PostgreSQL を採用

## ステータス
採用

## 文脈
既存販売管理システムが Oracle 11g。直接更新不可の制約あり (CON-002)。本システムDBの選択肢として Oracle / PostgreSQL / MySQL を比較。

## 決定
PostgreSQL を採用する。

## 結果
良い影響:
- ライセンス費用ゼロ
- Vercel + Supabase で運用負担を最小化
- JSONB対応でロット属性の柔軟な拡張が可能

悪い影響:
- 既存DBA(Oracle経験)の学習コスト

受け入れたトレードオフ:
- バッチ連携は CSV (SFTP) で疎結合に保ち、両DBの差異を吸収

## 代替案
- Oracle 21c: ライセンス費 年700万 → 予算外で却下
- MySQL: JSONB対応に難 → 却下`,
      },
    ],
    review: {
      skillName: '/architecture-review',
      prompt: 'C4図のレベル整合性、ADRの根拠強度、OpenAPIのRESTfulness、性能要件(NFR-001 2秒)が達成可能かをチェック。',
      comments: [
        { level: 'OK',   target: 'ADR-0002', body: 'トレードオフが明示。再現性ある意思決定' },
        { level: 'WARN', target: 'NFR-001 2秒', body: '在庫照会は3拠点同時参照。インデックス設計と接続プールサイズを詳細設計で要確認' },
      ],
    },
  },

  // ───────────────────────── 06 ─────────────────────────
  {
    num: '06',
    title: '詳細設計',
    sub: 'クラス・シーケンス・画面遷移・検証定義',
    duration: '約32分',
    outcome: 'クラス図18点 / シーケンス図24本 / 画面遷移図6本 / 入力検証マトリクス',
    flow: {
      input:     { label: 'design/basic/',       detail: '基本設計書一式' },
      operation: { label: '/detailed-design',    detail: '詳細設計コマンド' },
      config:    { label: 'detail-designer agent', detail: 'シーケンス自動生成' },
      output:    { label: 'design/detail/',      detail: '詳細設計書一式' },
    },
    configFiles: [
      {
        kind: 'subagent',
        path: '.codex/agents/detail-designer.toml',
        lang: 'toml',
        body:
`name = "detail_designer"
description = "基本設計とユーザーストーリーから詳細設計書を生成"
model = "gpt-5.5-codex-spark"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
developer_instructions = """
出力:
- クラス図 (Mermaid classDiagram, レイヤー別)
- シーケンス図 (1ストーリーにつき正常系/異常系2本以上)
- 画面遷移図 (stateDiagram)
- 入力検証マトリクス (項目 / 必須 / 型 / 範囲 / メッセージ)
- エラーコード一覧 (機能ドメインプレフィクス: E_AUTH_xxx, E_STOCK_xxx)
"""`,
      },
      {
        kind: 'knowledge',
        path: 'templates/error-code.md',
        lang: 'md',
        body:
`# エラーコード命名規約

形式: E_<ドメイン>_<連番3桁>
例: E_AUTH_001 / E_STOCK_011 / E_BARCODE_021

## ドメイン
- AUTH    認証・認可
- STOCK   在庫
- BARCODE バーコード読取
- AUDIT   監査ログ
- BATCH   バッチ連携
- SYS     システム共通

## ルール
- HTTPステータスとは1対1にしない（業務エラーは200で返す場合あり）
- 連番は10ずつ空けて始める（追加余地）
- メッセージはユーザー向けとログ向けを分ける`,
      },
    ],
    bestPractices: [
      { title: '異常系シーケンスを正常系の0.5倍以上', body: '異常系こそ事故の温床。正常系1本に対し最低0.5本の異常系を強制すると見落としが減る。' },
      { title: 'エラーコードは機能ドメインで分割', body: 'E0001のような連番だけだと「どこで起きた？」が分からない。E_STOCK_011のようにドメインを前置すると検索性が桁違い。' },
      { title: '入力検証マトリクスをコードと同じリポジトリに', body: '別管理にすると必ず乖離する。コード生成のソースにできる粒度で書く。' },
      { title: '画面遷移図は閉路チェック', body: '「行ったきり戻れない画面」は detail_designer が検知。ユーザーがハマる経路を設計時に潰す。' },
    ],
    officialRefs: [
      { label: 'OpenAI公式ドキュメント: Subagents', body: 'sandbox_mode を read-only に設定するか、書き込みを必要とする agent では writable_roots を限定すると、設計フェーズで誤って外部に書き出す事故を防げる。' },
    ],
    execution: {
      command: '/detailed-design design/basic/ specification/stories/',
      lines: [
        '> detail-designer エージェントを起動...',
        '  Read: 基本設計書 / ユーザーストーリー36本',
        '  クラス図 (Domain/Application/Infrastructure 18点)',
        '  シーケンス図 (US-001 ~ US-036 / 計24本)',
        '  画面遷移図 (主要6画面)',
        '  入力検証マトリクス (212項目)',
        '  エラーコード一覧 (E_AUTH_001 ~ E_BATCH_007)',
        '',
        '✓ 完了 (31分44秒)',
      ],
    },
    artifactsOut: [
      {
        name: 'design/detail/sequence/US-002-barcode-scan.md',
        lang: 'md',
        body:
`# US-002 バーコード入出庫 - シーケンス（正常系）

\`\`\`mermaid
sequenceDiagram
  participant U as 現場作業員
  participant W as PWA
  participant API as API Server
  participant DB as PostgreSQL
  participant L as 監査ログDB

  U->>W: バーコードをカメラでスキャン
  W->>W: コード形式バリデーション
  W->>API: POST /stock/transactions
  API->>API: JWT検証 + 拠点権限確認
  API->>DB: BEGIN
  API->>DB: 在庫数 -1 (品目+拠点)
  API->>L: 監査ログ書込
  API->>DB: COMMIT
  API-->>W: 200 + 残数
  W-->>U: 「出庫完了 残42」表示
\`\`\``,
      },
      {
        name: 'design/detail/validation-matrix.md',
        lang: 'md',
        body:
`# 入力検証マトリクス（抜粋）

| 画面 | 項目 | 必須 | 型 | 範囲 | エラーコード | メッセージ |
|------|------|------|----|----|--------------|------------|
| 在庫照会 | 品目コード | ○ | string | 5-12文字, 半角英数+'-' | E_STOCK_011 | 品目コードを正しく入力してください |
| 入出庫 | バーコード | ○ | string | EAN-13形式 | E_BARCODE_021 | 読取に失敗しました。再スキャンしてください |
| 入出庫 | 数量 | ○ | int | 1 - 99999 | E_STOCK_022 | 数量は1-99999で入力してください |`,
      },
    ],
    review: {
      skillName: '/detailed-design-review',
      prompt: '異常系シーケンスの網羅性、エラーコード重複、画面遷移の閉路をチェック。',
      comments: [
        { level: 'INFO', target: 'US-008',   body: '異常系シーケンスが正常系1本のみ。タイムアウト経路を追加推奨' },
        { level: 'OK',   target: 'エラーコード', body: '全67件、ドメインプレフィクス重複なし' },
      ],
    },
  },

  // ───────────────────────── 07 ─────────────────────────
  {
    num: '07',
    title: '実装',
    sub: 'Hooksでガードレールを敷きつつストーリー単位で実装',
    duration: '約4日（並走）',
    outcome: 'PR #41-#76 / 36ストーリー / 自動修正適用済',
    livePreview: {
      title: '完成版を実際に操作する',
      description: '本工程で実装したアプリの動作デモを別タブで開けます。AI駆動開発12テーマを通して、Codex CLI がどのような成果物を作り出すかを画面ごと確認できます。',
      image: 'assets/app-preview.png',
      imageAlt: '完成版アプリのトップ画面',
      url: 'https://ai-dev-demo.ezoai.jp',
      cta: 'アプリを新規タブで開く',
    },
    flow: {
      input:     { label: 'design/detail/',         detail: '詳細設計書' },
      operation: { label: '/implement-feature',     detail: 'ストーリー単位で実装' },
      config:    { label: 'config.toml + 4種Hooks', detail: 'PreTool/PostTool/Stop' },
      output:    { label: 'PR diff',                detail: 'GitHub Pull Request' },
    },
    configFiles: [
      {
        kind: 'knowledge',
        path: 'AGENTS.md（コーディング規約）',
        lang: 'md',
        body:
`# コーディング規約

## 言語・スタック
- TypeScript strict / Next.js 15 App Router
- Server Components 優先 / 'use client' は最小範囲
- データアクセスは Repository パターン

## 不変性
- 配列は spread / map / filter で更新
- オブジェクトは {...obj, key: value}
- mutate するメソッド (push/sort/reverse) は禁止

## エラー
- 例外は境界層で握る (API Route / Server Action)
- 内部関数は throw を維持

## テスト
- 1ファイル = 1スイート
- 単体テストは Vitest
- E2Eは Playwright`,
      },
      {
        kind: 'harness',
        path: '.codex/config.toml（プロジェクト設定）',
        lang: 'toml',
        body:
`model = "gpt-5.5-codex-spark"
model_reasoning_effort = "high"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
writable_roots = ["./src", "./specification", "./design"]
network_access = false
exclude_tmpdir_env_var = false

[shell_environment_policy]
inherit = "all"
exclude = ["*KEY*", "*TOKEN*", "*SECRET*"]

[features]
codex_hooks = true
shell_tool = true
multi_agent = true

[profiles.strict]
approval_policy = "untrusted"
sandbox_mode = "read-only"`,
      },
      {
        kind: 'hook',
        path: '.codex/config.toml（Hooks 抜粋）',
        lang: 'toml',
        body:
`[features]
codex_hooks = true

[[hooks.PreToolUse]]
matcher = "^shell$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = '\${CODEX_PROJECT_DIR}/.codex/hooks/block-dangerous.sh'
timeout = 10
statusMessage = "危険コマンドを検査"

[[hooks.PreToolUse]]
matcher = "^(apply_patch|edit_file|write_file)$"

[[hooks.PreToolUse.hooks]]
type = "command"
command = '\${CODEX_PROJECT_DIR}/.codex/hooks/check-secrets.sh'
timeout = 10
statusMessage = "機密値の混入を検査"

[[hooks.PostToolUse]]
matcher = "^(apply_patch|edit_file|write_file)$"

[[hooks.PostToolUse.hooks]]
type = "command"
command = "npm run typecheck --silent"
timeout = 60

[[hooks.PostToolUse.hooks]]
type = "command"
command = "npm run lint:fix --silent"
timeout = 60

[[hooks.Stop]]

[[hooks.Stop.hooks]]
type = "command"
command = "npm test --silent"
timeout = 180

notify = ["python3", "\${CODEX_PROJECT_DIR}/.codex/notify.py"]`,
      },
      {
        kind: 'hook',
        path: '.codex/hooks/block-dangerous.sh',
        lang: 'bash',
        body:
`#!/usr/bin/env bash
# PreToolUse: 危険コマンドを物理的に止める
INPUT="\$(cat)"
CMD=\$(echo "\$INPUT" | jq -r '.tool_input.command // empty')

# 強制push / 強制リセット / sudo / rm -rf を拒否
if echo "\$CMD" | grep -qE 'git push.*--force|git reset --hard|^sudo |rm -rf /'; then
  echo "Blocked dangerous command: \$CMD" >&2
  exit 2  # exit 2 で Codex にフィードバック
fi

exit 0`,
      },
      {
        kind: 'hook',
        path: '.codex/hooks/check-secrets.sh',
        lang: 'bash',
        body:
`#!/usr/bin/env bash
# PreToolUse(Write|Edit): 機密値の混入を検知
INPUT="\$(cat)"
CONTENT=\$(echo "\$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# AWS / Stripe / PEM / API Token 様パターン
if echo "\$CONTENT" | grep -qE 'AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24}|-----BEGIN [A-Z ]+PRIVATE KEY-----'; then
  echo "Possible secret detected. 書込を中断します。" >&2
  exit 2
fi

exit 0`,
      },
      {
        kind: 'skill',
        path: '~/.codex/skills/simplify.md',
        lang: 'md',
        body:
`---
description: 変更コードを再利用性・命名・効率の観点でレビューし、必要なら修正する
argument-hint: [--review-only]
---
# simplify

## 観点
1. 既存ユーティリティで置き換えできないか
2. 命名は verb-noun / isXxx / hasXxx になっているか
3. 早すぎる抽象化(YAGNI違反)になっていないか
4. 重複コード(DRY違反)がないか
5. mutateしている箇所(immutable違反)がないか

## 動作
- /simplify を投下するとレビュー → 修正提案 → 同意ある場合のみ反映
- レビューだけ欲しい場合は /simplify --review-only

引数: $ARGUMENTS (--review-only でレビューのみ)`,
      },
      {
        kind: 'command',
        path: '.codex/skills/implement-feature.md',
        lang: 'md',
        body:
`---
description: ユーザーストーリーIDを引数に、ブランチ作成→実装→テスト→PR作成まで一気通貫
argument-hint: <US-XXX>
---
# 実装パイプライン

\$1 のストーリーを実装します。

## 手順
1. specification/stories/\$1.md と design/detail/sequence/\$1-*.md を読込
2. \`git checkout -b feat/\$1-...\`
3. 詳細設計に従い実装
   - PostToolUse: typecheck/lint:fix が自動で走る
   - Stop: 全テスト実行
4. \`/simplify --review-only\` を実行し、対応必要なら修正
5. \`gh pr create\` でPR作成

## 守るべきこと
- src/ 以外には書かない（sandbox_workspace_write.writable_roots で制限）
- mutateしない（AGENTS.md 規約）

引数: $1 = US-ID
全引数: $ARGUMENTS`,
      },
    ],
    bestPractices: [
      { title: 'ガードレールはHooksで敷く', body: 'PostToolUse(apply_patch|edit_file|write_file)で typecheck/lint を自動実行。「忘れる人間」を補強。' },
      { title: '危険コマンドは sandbox_mode + PreToolUse で二段防御', body: 'sandbox_mode=workspace-write でも完全とは限らない。Hookの exit 2 は物理的に阻止。' },
      { title: '${CODEX_PROJECT_DIR}を使う', body: '相対パスはサブシェルで壊れる。公式の環境変数を使うと堅牢。' },
      { title: 'Stop Hookでテストを最終ガード', body: 'Codex が「完了」と返す前にテストが落ちていないかをHookで検査。' },
      { title: 'notify で外部通知を一元化', body: 'notify = ["python3", "..."] に集約。Slack / desktop / CI 連携を JSON payload から分岐。' },
      { title: '1ストーリー=1ブランチ=1PR', body: 'PRサイズが小さいほどレビュー所要時間は二乗で短くなる。' },
    ],
    officialRefs: [
      { label: 'OpenAI公式ドキュメント: Hooks', body: 'PreToolUse / PostToolUse / Stop など。[features].codex_hooks=true で有効化。matcher / type=command / command / timeout / statusMessage を定義。' },
      { label: '${CODEX_PROJECT_DIR}（公式環境変数）', body: 'Hooks 内でプロジェクトルート絶対パスを取得。sub-shell 配下でも壊れない。' },
      { label: '[sandbox_workspace_write]（公式設定）', body: 'writable_roots で書き込みディレクトリを限定、network_access=false でネット遮断。' },
      { label: 'notify（公式設定）', body: 'notify = ["python3", "/path/to/notify.py"] で JSON payload を受け取り、Slack/Desktop/CI 等にプッシュ。' },
      { label: '[profiles.NAME]（公式設定）', body: 'profile を切り替えるだけで approval_policy / sandbox_mode / model を一括変更。strict プロファイルでレビュー時のみ read-only に。' },
    ],
    execution: {
      command: '/implement-feature US-001',
      lines: [
        '> US-001 リアルタイム在庫照会 を実装します',
        '  Read: design/detail/ + specification/stories/US-001.md',
        '',
        '  Bash: git checkout -b feat/US-001-inventory',
        '',
        '  Write: src/app/(stock)/inventory/page.tsx',
        '  → PreToolUse: check-secrets.sh ... ✓',
        '  → PostToolUse: npm run typecheck ... ✓',
        '  → PostToolUse: npm run lint:fix ... ✓',
        '',
        '  Write: src/server/repositories/stock.repository.ts',
        '  → PostToolUse: npm run typecheck ... ✗',
        '    Error: Property "warehouse_id" does not exist on type "Stock"',
        '  → 型定義に warehouse_id を追加',
        '  → PostToolUse: npm run typecheck ... ✓',
        '',
        '  Write: src/server/repositories/stock.repository.test.ts',
        '',
        '  Stop Hook: npm test ... ✓ (8 passed)',
        '',
        '  /simplify --review-only',
        '    INFO: 1件 (mutateなし、命名OK、要対応なし)',
        '',
        '  Bash: gh pr create --title "feat(US-001): リアルタイム在庫照会"',
        '    notify hook が Slack へ完了通知',
        '',
        '✓ 完了 PR #41 作成',
      ],
    },
    artifactsOut: [
      {
        name: 'src/app/(stock)/inventory/page.tsx',
        lang: 'tsx',
        body:
`import { stockRepository } from '@/server/repositories/stock.repository'
import { InventorySearch } from '@/components/inventory/InventorySearch'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  const stocks = code ? await stockRepository.findByItemCode(code) : []

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">在庫照会</h1>
      <InventorySearch defaultCode={code} />
      {code && <InventoryResult stocks={stocks} />}
    </main>
  )
}

function InventoryResult({ stocks }: { stocks: Stock[] }) {
  if (stocks.length === 0) {
    return <p className="text-stone-500">該当する品目がありません</p>
  }
  const total = stocks.reduce((sum, s) => sum + s.quantity, 0)
  return (
    <ul className="mt-4 divide-y">
      {stocks.map((s) => (
        <li key={\`\${s.itemCode}-\${s.warehouseId}\`} className="py-2">
          <span className="font-medium">{s.warehouseName}</span>
          <span className="ml-2 tabular-nums">{s.quantity}</span>
        </li>
      ))}
      <li className="py-2 font-bold">計 {total}</li>
    </ul>
  )
}`,
      },
    ],
    review: {
      skillName: '/simplify',
      prompt: '生成コードに対して再利用性・命名・効率の観点でレビュー。冗長/重複/早すぎる抽象化を指摘し、必要なら修正案を提示。',
      comments: [
        { level: 'INFO', target: 'InventoryResult', body: '同コンポーネント内に表示ロジックが散在。Stock合計の算出を Repository層に寄せる選択肢も検討（YAGNI観点で現状維持も可）' },
        { level: 'OK',   target: '不変性', body: 'reduce / map のみで mutate なし' },
      ],
    },
  },

  // ───────────────────────── 08 ─────────────────────────
  {
    num: '08',
    title: 'テスト & レビュー',
    sub: '3エージェント並列で security / review / qa を一括実行',
    duration: '約45分',
    outcome: 'カバレッジ87% / E2E 24本 / 自動修正18件 / セキュリティ問題ゼロ',
    flow: {
      input:     { label: 'PR #41-#76',                 detail: '実装PR一式' },
      operation: { label: '/security-review + /review', detail: 'レビュー2種' },
      config:    { label: 'code-reviewer + qa-engineer', detail: 'サブエージェント並列' },
      output:    { label: 'review-report.md',           detail: 'レビュー総括' },
    },
    configFiles: [
      {
        kind: 'subagent',
        path: '.codex/agents/code-reviewer.toml',
        lang: 'toml',
        body:
`name = "code_reviewer"
description = "PRのdiffを精査。AGENTS.md規約・命名・不変性・例外境界・性能を確認"
model = "gpt-5.5-codex-spark"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
mcp_servers = ["github"]
developer_instructions = """
レビュー観点:
1. AGENTS.md規約準拠
2. 不変性（mutate禁止）
3. 例外の境界層集約
4. N+1クエリ / 不要なPromise.all 欠落
5. 命名 (verb-noun, isXxx, hasXxx)
6. テスト網羅 (正常/異常系)

出力: PRコメント形式 (file:line + 提案コード)
"""`,
      },
      {
        kind: 'subagent',
        path: '.codex/agents/qa-engineer.toml',
        lang: 'toml',
        body:
`name = "qa_engineer"
description = "ユーザーストーリーから単体/E2Eテストを生成し、Playwright MCPで実行"
model = "gpt-5.5"
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
mcp_servers = ["playwright"]
developer_instructions = """
- 単体: Vitest, AAA(Arrange/Act/Assert)
- E2E: Playwright, ストーリー単位
- 受入基準のGherkin Scenarioをそのまま it() に変換
"""`,
      },
      {
        kind: 'skill',
        path: '~/.codex/skills/security-review.md',
        lang: 'md',
        body:
`---
description: 変更diffをOWASP Top10観点で精査し、検出時はファイル/行/CWE/重大度/修正案を返す
argument-hint: [PR_NUMBER=<number>]
---
# Security Review

## 観点（OWASP Top 10:2021）
- A01 Broken Access Control
- A02 Cryptographic Failures
- A03 Injection
- A04 Insecure Design
- A05 Security Misconfiguration
- A06 Vulnerable & Outdated Components
- A07 Identification & Authentication
- A08 Software and Data Integrity
- A09 Security Logging & Monitoring
- A10 SSRF

## 出力フォーマット
\`\`\`
[A03 Injection] src/api/users.ts:42 (CWE-89, High)
原因: 文字列連結によるSQL組立
修正: parameterized query を使う
\`\`\`

## 動作
- /security-review で起動
- diff 全体を一括レビュー
- 既存実装の追跡コミットがある場合は原典まで遡る

引数: $PR_NUMBER (省略時は HEAD ブランチの未マージ差分)`,
      },
      {
        kind: 'mcp',
        path: '~/.codex/config.toml（Playwright MCP）',
        lang: 'toml',
        body:
`[mcp_servers.playwright]
enabled = true
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
startup_timeout_sec = 60
enabled_tools = [
  "browser_navigate",
  "browser_click",
  "browser_snapshot",
  "browser_take_screenshot",
]`,
      },
      {
        kind: 'command',
        path: '.codex/skills/full-review.md',
        lang: 'md',
        body:
`---
description: security_review / code_reviewer / qa_engineer を並列起動して総括レポートを作成
argument-hint: <PR_NUMBER>
---
# 並列レビュー

[agents] max_threads=6 設定下で3つのサブエージェントを並行 spawn:

\`\`\`
security_review     "PR #$1 の差分をOWASP Top10観点でレビュー"
code_reviewer       "PR #$1 の差分を AGENTS.md 規約観点でレビュー"
qa_engineer         "PR #$1 のストーリーから単体・E2Eテストを生成・実行"
\`\`\`

3者の出力を docs/08-review-report.md に統合し、自動修正可能な指摘は適用、人判断が必要なものは残置。

引数: $1 = PR番号`,
      },
    ],
    bestPractices: [
      { title: '3エージェント並列で時間圧縮', body: 'security / code / qa を直列に回すと2-3時間。並列なら45分。[agents] max_threads=6 がデフォルトで並列スポーンを許可。' },
      { title: '「指摘」より「修正案」', body: 'レビューコメントは修正提案コードを添える方が採用率が高い。code_reviewer に「提案コード必須」を developer_instructions で規約化。' },
      { title: '自動修正対象と人判断を分離', body: 'lint/format/import順は機械が直す。設計レイヤーの指摘は人が決める。Hookで前者を吸収すると後者に集中できる。' },
      { title: 'Playwright MCPでE2Eを内製化', body: 'Playwright MCP は実ブラウザを操作。受入基準のGherkinをそのまま再生できる。' },
    ],
    officialRefs: [
      { label: '~/.codex/skills/security-review.md（テンプレ）', body: 'OWASP Top10ベースで diff を精査するスキル。argument-hint で PR 番号を取り、diff 全体を一括レビュー。' },
      { label: 'Playwright MCP（Microsoft公式）', body: '@playwright/mcp。enabled_tools で公開するツールを限定すると、QA 用途では browser_* のみに絞れる。' },
      { label: 'GitHub MCP（GitHub公式）', body: 'PR/Issue/コメントを直接操作。code_reviewer が指摘をPRコメントとして直接投下できる。' },
      { label: '[agents] max_threads / max_depth（公式設定）', body: 'max_threads=6 で並列スポーン上限、max_depth=1 で再帰防止。並列レビューはこの上限内で発行。' },
    ],
    execution: {
      command: '/full-review 41',
      lines: [
        '> 並列スポーン (3 subagents, max_threads=6)',
        '',
        '[security_review (skill)]',
        '  OWASP Top10 観点でdiffを精査',
        '  検出: 0件',
        '',
        '[code_reviewer]',
        '  PR #41-#76 を順次レビュー',
        '  検出 24件 (INFO 18 / WARN 6 / ERROR 0)',
        '  自動修正適用: 18件',
        '',
        '[qa_engineer]',
        '  単体テスト 124件生成 → 実行 ✓ カバレッジ 87.4%',
        '  E2E 24シナリオ → Playwright MCP で実行 ✓',
        '',
        '✓ 完了 (44分38秒)',
        '  Write: docs/08-review-report.md',
      ],
    },
    artifactsOut: [
      {
        name: 'docs/08-review-report.md',
        lang: 'md',
        body:
`# レビュー総括レポート

## サマリ
- セキュリティ問題: 0件
- レビュー指摘: 24件 (うち18件は自動修正済)
- 単体テスト: 124件 / カバレッジ 87.4%
- E2E: 24シナリオ / 全PASS

## 残課題 (要対応)
| ID | 内容 | 担当 | 期日 |
|----|------|------|------|
| RV-003 | InventoryResult の責務分離 | TL | 04-26 |
| RV-007 | バーコード読取の権限 fallback | DEV | 04-27 |
| RV-014 | 監査ログのバッチ書込再考 | ARCH | 04-30 |

## ブロックなし → デプロイ準備へ`,
      },
    ],
    review: {
      skillName: '/security-review',
      prompt:
`OWASP Top10 (A01: Broken Access / A02: Cryptographic / A03: Injection / A07: Identification ...) 観点で diff を精査。
検出時はファイル/行/CWE/重大度/修正案をPRコメントで返す。`,
      comments: [
        { level: 'OK', target: 'A03 Injection', body: 'Prisma + parameterized query。文字列連結なし' },
        { level: 'OK', target: 'A07 Auth',      body: 'JWT検証ミドルウェアが全API Routeに適用' },
      ],
    },
  },

  // ───────────────────────── 09 ─────────────────────────
  {
    num: '09',
    title: 'CI/CD・デプロイ',
    sub: 'IaCとパイプラインを生成、本番環境を立ち上げ',
    duration: '約20分',
    outcome: 'GitHub Actions / Terraform / 本番URL払い出し / Smoke Test PASS',
    flow: {
      input:     { label: 'main ブランチ',     detail: 'マージ済コード' },
      operation: { label: '/setup-cicd',       detail: 'CI/CD構築' },
      config:    { label: 'devops agent + GitHub MCP', detail: 'Vercel + Supabase' },
      output:    { label: 'pipeline + infra',  detail: '稼働中の本番' },
    },
    configFiles: [
      {
        kind: 'subagent',
        path: '.codex/agents/devops.toml',
        lang: 'toml',
        body:
`name = "devops"
description = "GitHub Actions / Terraform / Vercel / Supabase を一括構築"
model = "gpt-5.5-codex-spark"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
mcp_servers = ["github"]
developer_instructions = """
構築物:
- .github/workflows/ci.yml (lint / typecheck / test / build)
- .github/workflows/cd.yml (Vercel preview / production deploy)
- infra/terraform/ (Supabase RLS / SFTP用VPC)
- Dockerfile (バッチ用)
- Smoke Test (本番疎通)

セキュリティ:
- Secrets はハードコード禁止
- 認証は GitHub OIDC + Vercel Token
- terraform apply は人間承認後のみ実行 (approval_policy=on-request)
"""`,
      },
      {
        kind: 'mcp',
        path: '~/.codex/config.toml（GitHub MCP 再掲）',
        lang: 'toml',
        body:
`[mcp_servers.github]
enabled = true
command = "docker"
args = [
  "run", "-i", "--rm",
  "-e", "GITHUB_PERSONAL_ACCESS_TOKEN",
  "ghcr.io/github/github-mcp-server",
]
env = { GITHUB_PERSONAL_ACCESS_TOKEN = "\${GITHUB_TOKEN}" }
startup_timeout_sec = 30`,
      },
      {
        kind: 'hook',
        path: '.codex/config.toml（Stop Hook で本番直前チェック）',
        lang: 'toml',
        body:
`[features]
codex_hooks = true

[[hooks.Stop]]

[[hooks.Stop.hooks]]
type = "command"
command = '''
if git diff --name-only HEAD~1 | grep -q '^infra/'; then
  echo 'IaC変更検知 - terraform plan を確認してください' >&2
fi
'''
timeout = 15
statusMessage = "infra/ 配下の変更を点検"`,
      },
    ],
    bestPractices: [
      { title: 'Secretsは GitHub OIDC で短期発行', body: 'long-lived token は流出した瞬間に詰む。OIDCは数分有効、ジョブ完了で失効。' },
      { title: 'terraform plan を必ずPRに添付', body: 'apply は承認後の手動。インフラ変更は「読んでから動かす」が大原則。' },
      { title: 'ロールバック手順をRunbookに先に書く', body: 'デプロイ手順書よりロールバック手順書の方が緊急時に必要。順番に注意。' },
      { title: 'Smoke Testで本番疎通を1秒で検知', body: '/api/health + 主要画面1本だけでよい。デプロイ完了≠正常稼働。' },
    ],
    officialRefs: [
      { label: 'GitHub MCP（GitHub公式）', body: 'PR作成・Action実行・Release管理。devops エージェントの主要連携先。' },
      { label: 'OpenAI公式ドキュメント: Configuration Reference', body: 'model / approval_policy / sandbox_mode / [features] / [mcp_servers] / [hooks] / notify など config.toml の全項目を網羅。' },
    ],
    execution: {
      command: '/setup-cicd',
      lines: [
        '> devops エージェントを起動...',
        '  GitHub Actions ワークフロー生成 (ci.yml / cd.yml)',
        '  Terraform module: supabase_project / sftp_vpc',
        '  Dockerfile: バッチ連携コンテナ',
        '  Vercel 接続 (mcp__github__create_repository)',
        '',
        '  terraform plan',
        '    + supabase_project.kakuu',
        '    + supabase_storage.csv_inbox',
        '    + aws_vpc.sftp_bridge',
        '  terraform apply (承認後実行)',
        '',
        '  Vercel deploy production',
        '    https://kakuu-stock.vercel.app',
        '',
        '  Smoke Test:',
        '    GET /api/health → 200 ✓',
        '    GET /inventory?code=A-001 → 200 ✓',
        '',
        '✓ 完了 (19分04秒)',
      ],
    },
    artifactsOut: [
      {
        name: '.github/workflows/ci.yml',
        lang: 'yaml',
        body:
`name: CI
on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test --coverage
      - run: pnpm build
      - uses: codecov/codecov-action@v4`,
      },
      {
        name: 'infra/terraform/main.tf',
        lang: 'hcl',
        body:
`terraform {
  required_providers {
    supabase = { source = "supabase/supabase", version = "~> 1.0" }
    aws      = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

resource "supabase_project" "kakuu" {
  organization_id = var.supabase_org_id
  name            = "kakuu-stock-prod"
  region          = "ap-northeast-1"
  db_pass         = var.db_password
}

resource "aws_vpc" "sftp_bridge" {
  cidr_block = "10.20.0.0/16"
  tags = { Name = "kakuu-sftp-bridge" }
}`,
      },
    ],
    review: {
      skillName: '/cd-review',
      prompt: 'パイプラインのSecrets取り回し、本番Apply前の承認フロー、ロールバック手順をチェック。',
      comments: [
        { level: 'OK',   target: 'Secrets',       body: 'GitHub OIDC + Vercel Token, ハードコード一切なし' },
        { level: 'INFO', target: 'ロールバック', body: 'Vercel rollback コマンドをRunbook 09-2に記載済' },
      ],
    },
  },

  // ───────────────────────── 10 ─────────────────────────
  {
    num: '10',
    title: '保守運用',
    sub: '定期ジョブと障害対応をエージェントで自動化',
    duration: '常時稼働',
    outcome: '監視ダッシュ / Runbook / 週次レポート自動生成 / インシデントPostMortem',
    flow: {
      input:     { label: '本番運用ログ',           detail: 'Datadog / Vercel logs' },
      operation: { label: 'codex exec (cron)',    detail: '外部スケジューラから起動' },
      config:    { label: 'triggers + skills/postmortem', detail: 'リモート起動' },
      output:    { label: 'reports/ + Runbook/',   detail: '運用ドキュメント' },
    },
    configFiles: [
      {
        kind: 'harness',
        path: 'launchd / cron（外部スケジューラから codex exec 起動）',
        lang: 'bash',
        body:
`# crontab -e
# 毎朝9時 JST に Codex CLI を非対話モードで起動
TZ=Asia/Tokyo
0 9 * * * /usr/local/bin/codex exec \\
  --profile prod-readonly \\
  --skip-git-repo-check \\
  "/health-check 24h を実行し、エラー率/レスポンス分布/CSV連携成否を Datadog MCP 経由で取得し reports/daily/$(date +\\%Y-\\%m-\\%d).md にまとめる。閾値超えがあれば Slack に通知。" \\
  >> /var/log/codex/daily-health.log 2>&1

# Codex CLI 単体には cron 機能が無いため、launchd / cron / systemd timer / GitHub Actions 等の
# 外部スケジューラから codex exec を呼び出す運用が公式推奨パターン`,
      },
      {
        kind: 'skill',
        path: '~/.codex/skills/postmortem.md',
        lang: 'md',
        body:
`---
description: 障害発生時、ログ・タイムライン・影響範囲・根本原因・再発防止を5 Whysで分析しPostMortemを生成
argument-hint: <INC-ID>
---
# PostMortem テンプレート

## 概要
発生日時 / 検知日時 / 復旧日時 / 影響範囲

## タイムライン
| 時刻 | 出来事 | 担当 |

## 根本原因 (5 Whys)
1. なぜ発生したか
2. なぜ防げなかったか
...

## 再発防止
- 短期(48h以内): ...
- 中期(2週間以内): ...
- 長期(次四半期): ...

## NG表現
- 「気をつける」「徹底する」「意識する」は再発防止として認めない
- 必ず「仕組み」「自動化」「Hook化」で書く`,
      },
      {
        kind: 'mcp',
        path: '~/.codex/config.toml（Datadog / Slack MCP）',
        lang: 'toml',
        body:
`[mcp_servers.datadog]
enabled = true
command = "npx"
args = ["-y", "@datadog/mcp-server-datadog"]
env = { DD_API_KEY = "\${DD_API_KEY}", DD_APP_KEY = "\${DD_APP_KEY}", DD_SITE = "datadoghq.com" }
startup_timeout_sec = 30

[mcp_servers.slack]
enabled = true
command = "npx"
args = ["-y", "@modelcontextprotocol/server-slack"]
env = { SLACK_BOT_TOKEN = "\${SLACK_BOT_TOKEN}" }
startup_timeout_sec = 30`,
      },
      {
        kind: 'subagent',
        path: '.codex/agents/incident-responder.toml',
        lang: 'toml',
        body:
`name = "incident_responder"
description = "アラート受信時、ログ集約 → タイムライン構築 → 5 Whys → 仮説提示 → Slack共有まで自動化"
model = "gpt-5.5-codex-spark"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
mcp_servers = ["datadog", "slack"]
developer_instructions = """
動作:
1. Datadog MCP で発生時刻前後30分のメトリクス・ログを取得
2. タイムラインに整形
3. postmortem skill を適用し 5 Whys を実行
4. 根本原因候補を3つ提示（確信度付き）
5. Slack #incident に共有、対応方針を募る
"""`,
      },
      {
        kind: 'command',
        path: '.codex/skills/incident-respond.md',
        lang: 'md',
        body:
`---
description: 障害IDを引数に incident_responder を起動、PostMortemドラフトまで作成
argument-hint: <INC-YYYY-MM-DD>
---
# 障害対応パイプライン
incident_responder サブエージェントを spawn し、$1 の関連ログを集約。
postmortem skill を適用し、ドラフトを incidents/$1/postmortem.md に書き出す。

引数: $1 = INC-YYYY-MM-DD
全引数: $ARGUMENTS`,
      },
    ],
    bestPractices: [
      { title: '定期トリガーで「報告書を書く時間」を週次から日次に圧縮', body: '人が書くと「週次がやっと」。エージェントなら日次で粒度が上がる。' },
      { title: '5 Whysは「組織課題」まで掘る', body: 'なぜ→「徹底できなかった」で止めると再発する。「なぜ徹底できない仕組みか？」まで掘る。' },
      { title: '再発防止に期日を必ず明記', body: '短期48h / 中期2週間 / 長期次四半期。期日のない対策は実装されない。' },
      { title: '「気をつける」を禁則ワードに', body: 'postmortem skill 内でNG表現として明記。仕組み・自動化・Hook化で書かせる。' },
      { title: 'インシデント検知→Slack共有を1分以内', body: 'incident-responder + Slack MCP で初動を自動化。人間は「方針判断」だけに集中。' },
    ],
    officialRefs: [
      { label: 'codex exec（非対話モード）', body: '--profile / --skip-git-repo-check 等で外部スケジューラから起動可能。launchd / cron / systemd timer / GitHub Actions と組合せる。' },
      { label: 'Slack MCP（公式提供）', body: '@modelcontextprotocol/server-slack。チャネル投稿・スレッド返信・ユーザー検索が標準操作。' },
      { label: 'Datadog MCP（Datadog公式）', body: 'メトリクス/ログ/モニタを Codex CLI から直接取得。インシデント対応で必須。' },
      { label: '[profiles.prod-readonly]（公式設定）', body: 'cron 実行用プロファイル。approval_policy="never" + sandbox_mode="read-only" で完全自律＋安全境界を両立。' },
    ],
    execution: {
      command: '/health-check 24h（cron 起動）',
      lines: [
        '> 外部スケジューラ (cron / launchd) から codex exec 起動...',
        '  profile: prod-readonly',
        '  approval_policy=never / sandbox_mode=read-only',
        '',
        '--- 翌朝9時 自動実行 ---',
        '> /health-check 24h',
        '  Datadog MCP: APM metrics 取得 (24h)',
        '  エラー率: 0.04% (閾値0.5%以下)',
        '  p95レスポンス: 1.2s (閾値2.0s以下)',
        '  CSV連携: 全1件成功',
        '',
        '  Write: reports/daily/2026-04-26.md',
        '  notify: Slack #ops にサマリ送付',
        '✓ 完了',
        '',
        '--- 障害発生時 ---',
        '> /incident-respond INC-2026-04-30',
        '  incident_responder サブエージェントを spawn',
        '  Datadog ログ取得 → タイムライン構築',
        '  postmortem skill を適用',
        '  5 Whys 自動分析 → 根本原因候補3つ提示',
        '  Slack #incident に共有',
        '  Write: incidents/INC-2026-04-30/postmortem.md',
      ],
    },
    artifactsOut: [
      {
        name: 'reports/weekly/2026-W17.md',
        lang: 'md',
        body:
`# 週次運用レポート 2026-W17

## サマリ
- 稼働率: 99.97% (SLO 99.5% 達成)
- 平均レスポンス: 0.8s
- 取引件数: 14,820件
- インシデント: 0件

## トレンド
- 在庫照会のp95が前週比+12% (1.07s → 1.21s)
- 大田拠点のCSV連携が3日連続で1分遅延
  → 原因: SFTP接続タイムアウト
  → 対応: 次週中に接続プール拡張 (Issue #182)

## 来週の予定メンテ
- 04-30 02:00-04:00 Supabase メジャーアップデート`,
      },
      {
        name: 'incidents/INC-2026-04-30/postmortem.md',
        lang: 'md',
        body:
`# INC-2026-04-30 PostMortem

## 概要
- 発生 13:42 / 検知 13:43 / 復旧 14:11 (29分)
- 影響: 大田拠点のバーコード入出庫が一時停止 (取引数 0)

## タイムライン
| 時刻 | 出来事 |
|------|--------|
| 13:42 | API 5xx 急増 (Datadog アラート発火) |
| 13:43 | オンコール検知、Slack #incident |
| 13:50 | 原因切り分け: 大田 VPN 切断 |
| 14:05 | 自動フェイルオーバー手順実行 |
| 14:11 | 全拠点で復旧確認 |

## 根本原因 (5 Whys)
1. なぜ停止? → 大田-本社間のVPN切断
2. なぜ切断? → 拠点ルータのファーム自動更新
3. なぜ自動更新? → メンテ枠の合意がなかった
4. なぜ合意なし? → 拠点ネットワーク変更の連絡経路が未整備
5. なぜ未整備? → 開発スコープ外として後回し

## 再発防止
- 短期: ルータ自動更新を停止 (本日中)
- 中期: 拠点ネットワーク変更の連絡経路を明文化 (2週間)
- 長期: 拠点フェイルオーバーをアプリ層で吸収するADR追加 (次四半期)`,
      },
    ],
    review: {
      skillName: '/postmortem',
      prompt: '5 Whysが浅くないか、再発防止が「気をつける」「徹底する」で終わっていないか、期日が明示されているかチェック。',
      comments: [
        { level: 'OK', target: '5 Whys',     body: '組織課題まで掘り下げ' },
        { level: 'OK', target: '再発防止',   body: '短期/中期/長期に分かれ、期日明示' },
      ],
    },
  },
];
