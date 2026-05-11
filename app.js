// ============================================
// 23DocDemo (Codex): Codex CLI 上流→下流 説明資料
// ============================================

// ---- helpers ----
const h = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
};
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---- rail ----
function renderRail() {
  const list = $('#rail-list');
  list.innerHTML = '';
  list.appendChild(h('div', { class: 'rail-line' }));
  PHASES.forEach((p, i) => {
    const item = h('li', {
      class: 'rail-item',
      dataset: { phase: i },
      onclick: () => {
        const target = $(`#phase-${i}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    }, [
      h('div', { class: 'rail-num' }, p.num),
      h('div', { class: 'rail-name' }, p.title),
    ]);
    list.appendChild(item);
  });
}

// ---- file block ----
function renderFile(file) {
  const copyBtn = h('button', {
    class: 'file-copy',
    onclick: (e) => {
      navigator.clipboard.writeText(file.body);
      e.currentTarget.textContent = 'COPIED';
      e.currentTarget.classList.add('copied');
      setTimeout(() => {
        e.currentTarget.textContent = 'COPY';
        e.currentTarget.classList.remove('copied');
      }, 1500);
    },
  }, 'COPY');
  return h('div', { class: 'file' }, [
    h('div', { class: 'file-head' }, [
      h('span', { class: 'file-path' }, file.name || file.path),
      h('div', { style: 'display:flex;gap:8px;align-items:center' }, [
        h('span', { class: 'file-lang' }, file.lang || 'text'),
        copyBtn,
      ]),
    ]),
    h('pre', {}, file.body),
  ]);
}

// ---- terminal ----
function renderTerminal(execution) {
  const body = h('div', { class: 'terminal-body' });
  const cmdLine = h('div', {}, [
    h('span', { class: 'terminal-prompt' }, '$ codex'),
    h('br'),
    h('span', { class: 'terminal-prompt' }, '> '),
    h('span', { class: 'terminal-cmd' }, execution.command),
    h('br'), h('br'),
  ]);

  const linesContainer = h('div', {});

  const renderLines = () => {
    linesContainer.innerHTML = '';
    execution.lines.forEach((l) => {
      linesContainer.appendChild(h('span', { class: 'terminal-line' }, l + '\n'));
    });
  };

  const playLines = () => {
    linesContainer.innerHTML = '';
    let i = 0;
    const cursor = h('span', { class: 'terminal-cursor' });
    linesContainer.appendChild(cursor);
    const tick = () => {
      if (i >= execution.lines.length) {
        cursor.remove();
        runBtn.disabled = false;
        runBtn.textContent = '再生';
        return;
      }
      const line = h('span', { class: 'terminal-line' }, execution.lines[i] + '\n');
      linesContainer.insertBefore(line, cursor);
      i++;
      const delay = execution.lines[i - 1].length < 4 ? 80 : 200;
      setTimeout(tick, delay);
    };
    tick();
  };

  const runBtn = h('button', {
    class: 'terminal-run',
    onclick: () => {
      runBtn.disabled = true;
      runBtn.textContent = '実行中...';
      playLines();
    },
  }, '実行');

  body.appendChild(cmdLine);
  body.appendChild(linesContainer);
  // 初期は空。実行ボタンでタイプライター演出
  const initHint = h('span', { class: 'terminal-line', style: 'color:#777' }, '右上「実行」ボタンを押すと出力が流れます\n');
  linesContainer.appendChild(initHint);

  return h('div', { class: 'terminal' }, [
    h('div', { class: 'terminal-head' }, [
      h('div', { class: 'terminal-dots' }, [
        h('span', { class: 'terminal-dot' }),
        h('span', { class: 'terminal-dot' }),
        h('span', { class: 'terminal-dot' }),
      ]),
      h('div', { class: 'terminal-title' }, 'Codex CLI'),
      runBtn,
    ]),
    body,
  ]);
}

// ---- config panel (kind別グルーピング + best practices + official refs) ----
const KIND_ORDER = ['knowledge', 'harness', 'hook', 'subagent', 'skill', 'mcp', 'command'];

function renderConfigPanel(phase) {
  const out = [];
  const groups = new Map();
  (phase.configFiles || []).forEach((f) => {
    const k = f.kind || 'knowledge';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(f);
  });

  KIND_ORDER.forEach((kind) => {
    const files = groups.get(kind);
    if (!files || files.length === 0) return;
    out.push(h('div', { class: 'config-section' }, [
      h('div', { class: 'config-section-head' }, [
        h('span', { class: `config-section-kind kind-${kind}` }, kind.toUpperCase()),
        h('span', { class: 'config-section-label' }, KIND_LABEL[kind] || kind),
      ]),
      ...files.map(renderFile),
    ]));
  });

  if (phase.bestPractices && phase.bestPractices.length) {
    out.push(h('div', { class: 'callout callout-bp' }, [
      h('div', { class: 'callout-head' }, 'ベストプラクティス'),
      h('ul', { class: 'callout-list' },
        phase.bestPractices.map((bp) => h('li', { class: 'callout-item' }, [
          h('div', { class: 'callout-title' }, bp.title),
          h('div', { class: 'callout-body' }, bp.body),
        ]))
      ),
    ]));
  }

  if (phase.officialRefs && phase.officialRefs.length) {
    out.push(h('div', { class: 'callout callout-ref' }, [
      h('div', { class: 'callout-head' }, '公式リファレンス・公開設定'),
      h('ul', { class: 'callout-list' },
        phase.officialRefs.map((r) => h('li', { class: 'callout-item' }, [
          h('div', { class: 'callout-title' }, r.label),
          h('div', { class: 'callout-body' }, r.body),
        ]))
      ),
    ]));
  }

  return out;
}

// ---- review ----
function renderReview(review) {
  const items = [
    h('div', { class: 'section-label' }, 'レビュースキル'),
    h('div', { class: 'section-desc' }, `スキル: ${review.skillName}`),
    renderFile({ name: 'プロンプト', lang: 'md', body: review.prompt }),
    h('div', { class: 'spacer' }),
    h('div', { class: 'section-label' }, 'レビュー結果'),
  ];
  review.comments.forEach((c) => {
    items.push(h('div', { class: 'review-comment' }, [
      h('span', { class: `review-level ${c.level}` }, c.level),
      h('div', { style: 'flex:1' }, [
        h('span', { class: 'review-target' }, c.target),
        h('span', { class: 'review-body' }, c.body),
      ]),
    ]));
  });
  return items;
}

// ---- phase card ----
function renderPhase(phase, index) {
  const flowSteps = [
    { tag: '入力', step: phase.flow.input },
    { tag: '操作', step: phase.flow.operation },
    { tag: '設定', step: phase.flow.config },
    { tag: '成果', step: phase.flow.output },
  ];

  const tabs = [
    {
      id: 'in', label: '入力',
      render: () => phase.artifactsIn?.length
        ? phase.artifactsIn.map(renderFile)
        : [h('p', { style: 'color:var(--ink-3)' }, '前工程の成果物を入力とする')],
    },
    { id: 'cfg', label: 'Codex CLI 設定', render: () => renderConfigPanel(phase) },
    { id: 'run', label: '実行', render: () => [renderTerminal(phase.execution)] },
    { id: 'out', label: '成果物', render: () => phase.artifactsOut.map(renderFile) },
    { id: 'rev', label: 'レビュー', render: () => renderReview(phase.review) },
  ];

  const tabBar = h('div', { class: 'tabs' });
  const panels = h('div', {});

  tabs.forEach((t, i) => {
    const panel = h('div', { class: 'tab-panel' + (i === 0 ? ' active' : '') });
    [].concat(t.render()).forEach((c) => panel.appendChild(c));
    panels.appendChild(panel);

    const tabBtn = h('button', {
      class: 'tab' + (i === 0 ? ' active' : ''),
      onclick: () => {
        $$('.tab', tabBar).forEach((b) => b.classList.remove('active'));
        $$('.tab-panel', panels).forEach((p) => p.classList.remove('active'));
        tabBtn.classList.add('active');
        panel.classList.add('active');
      },
    }, t.label);
    tabBar.appendChild(tabBtn);
  });

  const detail = h('div', { class: 'phase-detail' }, [tabBar, panels]);

  const toggleBtn = h('button', { class: 'phase-toggle' }, [
    h('span', { class: 'phase-toggle-label' }, '詳細を見る'),
    h('span', { class: 'phase-toggle-icon' }),
  ]);
  toggleBtn.addEventListener('click', () => {
    const isOpen = detail.classList.toggle('is-open');
    toggleBtn.classList.toggle('is-open', isOpen);
    $('.phase-toggle-label', toggleBtn).textContent = isOpen ? '詳細を閉じる' : '詳細を見る';
  });

  const livePreviewBlock = phase.livePreview ? renderLivePreview(phase.livePreview) : null;

  return h('section', { class: 'phase', id: `phase-${index}`, dataset: { index } }, [
    h('div', { class: 'phase-head' }, [
      h('div', { class: 'phase-row1' }, [
        h('span', { class: 'phase-num' }, phase.num),
        h('span', { class: 'phase-title' }, phase.title),
        h('span', { class: 'phase-duration' }, phase.duration),
      ]),
      h('div', { class: 'phase-sub' }, phase.sub),
      h('div', { class: 'phase-outcome' }, phase.outcome),
    ]),
    h('div', { class: 'flow' }, flowSteps.map(({ tag, step }) =>
      h('div', { class: 'flow-step' }, [
        h('div', { class: 'flow-step-tag' }, tag),
        h('div', { class: 'flow-step-label' }, step.label),
        h('div', { class: 'flow-step-detail' }, step.detail),
      ])
    )),
    livePreviewBlock,
    h('div', { class: 'phase-toggle-wrap' }, toggleBtn),
    detail,
  ]);
}

// ---- live preview (完成版アプリ) ----
function renderLivePreview(preview) {
  const ctaIcon = h('span', { class: 'live-preview-cta-icon', 'aria-hidden': 'true' });
  return h('div', { class: 'live-preview' }, [
    h('div', { class: 'live-preview-body' }, [
      h('div', { class: 'live-preview-text' }, [
        h('div', { class: 'live-preview-tag' }, '完成版プレビュー'),
        h('div', { class: 'live-preview-title' }, preview.title),
        h('p', { class: 'live-preview-desc' }, preview.description),
        h('a', {
          class: 'live-preview-cta',
          href: preview.url,
          target: '_blank',
          rel: 'noopener noreferrer',
        }, [preview.cta, ctaIcon]),
      ]),
      h('a', {
        class: 'live-preview-figure',
        href: preview.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': preview.cta,
      }, [
        h('img', {
          src: preview.image,
          alt: preview.imageAlt || preview.title,
          loading: 'lazy',
        }),
        h('span', { class: 'live-preview-figure-overlay' }, '別タブで開く'),
      ]),
    ]),
  ]);
}

// ---- summary footer ----
function renderSummary() {
  const stats = [
    { num: '10', label: '工程' },
    { num: '10', label: 'サブエージェント' },
    { num: '4',  label: 'Skills' },
    { num: '7+', label: 'Hooks' },
    { num: '4',  label: 'MCPサーバー' },
    { num: '4',  label: 'スラッシュコマンド' },
  ];
  return h('div', { class: 'footer-summary' },
    stats.map((s) => h('div', { class: 'footer-summary-item' }, [
      h('div', { class: 'footer-summary-num' }, s.num),
      h('div', { class: 'footer-summary-label' }, s.label),
    ]))
  );
}

// ---- scroll spy ----
function setupScrollSpy() {
  const railItems = $$('.rail-item');
  const phases = $$('.phase');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const idx = Number(e.target.dataset.index);
        railItems.forEach((it, i) => {
          it.classList.toggle('active', i === idx);
          it.classList.toggle('passed', i < idx);
        });
        phases.forEach((p, i) => p.classList.toggle('active', i === idx));
      }
    });
  }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
  phases.forEach((p) => observer.observe(p));
}

// ---- init ----
function init() {
  // hero scenario
  $('#scenario-name').textContent = PROJECT.client;
  $('#scenario-industry').textContent = PROJECT.industry + ' / ' + PROJECT.employees;
  $('#scenario-brief').textContent = PROJECT.brief;
  const metaList = $('#scenario-meta');
  metaList.innerHTML = '';
  PROJECT.meta.forEach((m) => {
    const wrap = h('div', { class: 'scenario-meta-item' }, [
      h('dt', {}, m.label),
      h('dd', {}, m.value),
    ]);
    metaList.appendChild(wrap);
  });

  // rail
  renderRail();

  // phases
  const main = $('#phases');
  main.innerHTML = '';
  PHASES.forEach((p, i) => main.appendChild(renderPhase(p, i)));

  // summary
  $('#summary').appendChild(renderSummary());

  // scroll spy
  setupScrollSpy();
}

document.addEventListener('DOMContentLoaded', init);
