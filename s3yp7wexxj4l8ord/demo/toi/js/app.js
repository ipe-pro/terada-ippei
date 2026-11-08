// 問いコンパス 画面と操作
let S = loadState();
const UI = Object.assign(
  { role: 'student', me: 's1', view: 'home', sel: null, linkTo: null, peekDomain: null, mapFilter: 'all', cand: {}, coachShown: {} },
  (() => { try { return JSON.parse(sessionStorage.getItem('toiCompass.ui')) || {}; } catch (e) { return {}; } })()
);
if (!studentOf(UI.me)) UI.me = S.students[0] && S.students[0].id;

const STAGES = [
  { key: 'cards', label: '① 要素出し・マップ' },
  { key: 'plan', label: '② 分類・計画' },
  { key: 'research', label: '③ 領域ごとに調べる' },
  { key: 'summary', label: '④ まとめ・表現' },
];
const STAMPS = [
  { key: 'なるほど', icon: '💡' },
  { key: '質問', icon: '❓' },
  { key: 'つながりそう', icon: '🔗' },
  { key: 'ちがう考え', icon: '🤔' },
];
const SET_PHRASES = ['', 'もっと知りたい', 'どの資料から分かったの?', '自分の調べたこととつながる', 'ほかの考えもありそう', '分かりやすい'];
const LINK_LABELS = ['だから', '〜のために', 'つながり', '比べると', 'その結果', ''];
const COLORS = ['#e07a5f', '#3d85c6', '#6aa84f', '#a64d79', '#e69138', '#45818e', '#8e7cc3', '#999999'];

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'いま' : m < 60 ? `${m}分前` : `${Math.round(m / 60)}時間前`; };
const chip = d => d ? `<span class="chip" style="background:${d.color}">${esc(d.name)}</span>` : '<span class="tag">領域なし</span>';
const me = () => studentOf(UI.me);
const isT = () => UI.role === 'teacher';

function saveUI() { try { sessionStorage.setItem('toiCompass.ui', JSON.stringify(UI)); } catch (e) { /* 使えない環境 */ } }
function commit() { saveState(); render(); }
function touch() { if (!isT() && S.work[UI.me]) S.work[UI.me].lastActive = Date.now(); }
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); }

// ───────── 画面の切りかえ ─────────
const NAV = {
  student: [['home', '🏠 ホーム'], ['map', '🗺 要素出し・マップ'], ['research', '🔍 調べる・まとめ'], ['share', '👥 みんなの考え']],
  teacher: [['setup', '⚙ 単元設定'], ['map', '🗺 マップ・分類'], ['dashboard', '📊 ダッシュボード'], ['eval', '📝 評価・フィードバック']],
};

function render() {
  const nav = NAV[UI.role];
  if (!nav.some(n => n[0] === UI.view)) UI.view = nav[0][0];
  document.getElementById('nav').innerHTML = nav.map(([k, l]) => `<button data-act="go" data-v="${k}" class="${UI.view === k ? 'on' : ''}">${l}</button>`).join('');
  document.getElementById('who').innerHTML =
    `<option value="teacher" ${isT() ? 'selected' : ''}>先生</option>` +
    S.students.map(s => `<option value="${s.id}" ${!isT() && UI.me === s.id ? 'selected' : ''}>${s.no} ${esc(s.nick)}</option>`).join('');
  const left = S.settings.peekUntil - Date.now();
  document.getElementById('banner').innerHTML = left > 0 ? `<div class="peek">👀 のぞき合いタイム あと${Math.ceil(left / 60000)}分 ― ほかの領域の友達の調べをのぞいてみよう</div>` : '';
  document.getElementById('main').innerHTML = VIEWS[UI.view]();
  if (UI.view === 'map') setupBoard();
  saveUI();
}

const VIEWS = {
  home: viewHome, map: viewMap, research: viewResearch, share: viewShare,
  setup: viewSetup, dashboard: viewDashboard, eval: viewEval,
};

function stepsBar() {
  return `<div class="steps">${STAGES.map(s => `<span class="${S.settings.stage === s.key ? 'on' : ''}">${s.label}</span>`).join('')}</div>`;
}

function coachBox(sid, kinds, title) {
  const items = S.coachLog.filter(c => c.studentId === sid && kinds.includes(c.kind) && !c.hidden);
  const lastAt = items.length ? items[items.length - 1].at : 0;
  const latest = items.filter(c => c.at === lastAt);
  return `<div class="coach"><h3><span>${title}</span><span class="muted">のこり${coachLeft(sid)}回</span></h3>
    ${latest.length ? latest.map(c => `<div class="say">${esc(c.text)}</div>`).join('') : '<div class="muted">ボタンをおすと、コンパスが声をかけるよ。答えは言わないから、自分で考えてみよう。</div>'}
  </div>`;
}

// ───────── 児童:ホーム ─────────
function viewHome() {
  const s = me(); const w = S.work[s.id]; const u = S.unit;
  const st = studentStatus(s);
  const recv = S.reactions.filter(r => r.to === s.id && !r.hidden).slice(-5).reverse();
  const ev = S.evals[s.id];
  return `
  <div class="panel">
    <div class="muted">${esc(u.grade)} 社会「${esc(u.title)}」</div>
    <div class="question">単元の問い:${esc(u.question)}</div>
    <p><b>ゴール:</b>${esc(u.goal)}</p>
    ${stepsBar()}
    <p>わたしの領域:${chip(domainOf(s.domainId))} ${s.domainId ? '' : '<span class="muted">(「調べる・まとめ」で選べます)</span>'}</p>
  </div>
  <div class="grid2">
    <div class="panel"><h3>わたしの進み</h3>
      <p>要素カード ${st.cards}枚 / マップの線 ${st.links}本 / のぞいた回数 ${st.peeks}回</p>
      <p>まとめ:${esc(st.stage)}</p>
      <p>使えている見方:${st.views.length ? st.views.map(v => `<span class="tag ok">${VIEW_WORDS[v].kid}</span>`).join('') : '<span class="muted">まだ</span>'}</p>
      <div class="row"><button class="primary" data-act="go" data-v="${S.settings.stage === 'cards' || S.settings.stage === 'plan' ? 'map' : 'research'}">つづきをする →</button></div>
    </div>
    <div class="panel"><h3>とどいた反応</h3>
      ${recv.length ? recv.map(reactLine).join('') : '<div class="muted">まだありません</div>'}
      ${ev && ev.sent ? '<p><button data-act="go" data-v="share">📩 先生からのフィードバックがとどいています</button></p>' : ''}
    </div>
  </div>`;
}

function reactLine(r) {
  const from = studentOf(r.from);
  const icon = (STAMPS.find(x => x.key === r.stamp) || {}).icon || '';
  return `<div class="react ${r.flagged ? 'flag' : ''}">${icon} <b>${esc(r.stamp)}</b> ${r.comment ? '「' + esc(r.comment) + '」' : ''} <span class="muted">― ${esc(from ? from.nick : '')}・${ago(r.at)}</span></div>`;
}

// ───────── 要素出し・イメージマップ ─────────
function viewMap() {
  const u = S.unit;
  const sid = UI.me;
  const visible = S.cards.filter(c => isT() || UI.mapFilter === 'all' || c.studentId === sid);
  const selCard = S.cards.find(c => c.id === UI.sel);
  const toCard = S.cards.find(c => c.id === UI.linkTo);
  let bar = '';
  if (selCard && toCard) {
    bar = `<div class="linkbar">「${esc(selCard.text.slice(0, 14))}…」と「${esc(toCard.text.slice(0, 14))}…」を線でつなぐ:
      ${LINK_LABELS.map(l => `<button class="small" data-act="link" data-l="${esc(l)}">${l || 'ことばなし'}</button>`).join('')}
      <button class="small" data-act="unsel">やめる</button></div>`;
  } else if (selCard) {
    bar = `<div class="linkbar">「${esc(selCard.text.slice(0, 20))}」を選んでいます。つなぎたいカードをおしてね。
      ${isT() ? '<span>領域にする:</span>' + u.domains.map(d => `<button class="small" style="border-color:${d.color}" data-act="setdom" data-d="${d.id}">${esc(d.name)}</button>`).join('') + '<button class="small" data-act="setdom" data-d="">なし</button>' : ''}
      <button class="small" data-act="unsel">選ぶのをやめる</button></div>`;
  }
  const cands = Object.keys(UI.cand).length;
  return `
  <div class="question" style="font-size:16px">単元の問い:${esc(u.question)}</div>
  ${isT() ? `
  <div class="panel" style="margin-top:12px"><h3>分類・学習計画(先生が決めます)</h3>
    <div class="row">
      <button data-act="suggestDomains">🧭 分類の候補を出す</button>
      ${cands ? `<button class="primary" data-act="acceptCand">候補を${cands}枚まとめて採用</button><button data-act="clearCand">候補を消す</button>` : ''}
      <span class="muted">カードをおして「領域にする」で分類します。領域の名前は「単元設定」で変えられます。</span>
    </div>
    <div class="row" style="margin-top:6px">${u.domains.map(d => `${chip(d)} ${S.cards.filter(c => c.domainId === d.id).length}枚`).join(' ')}</div>
  </div>` : `
  <div class="split" style="margin-top:12px">
    <div class="panel"><h3>要素カードを出そう</h3>
      <div class="field"><label>分かったこと(問いの解決につながりそうなこと)</label><input type="text" id="cardText" placeholder="例:部品は関連工場から届く"></div>
      <div class="row">
        <select id="cardSrc" style="width:auto">${u.materials.map(m => `<option>${esc(m)}</option>`).join('')}<option value="">その他</option></select>
        <input type="text" id="cardPage" placeholder="ページや資料名" style="width:160px">
        <button class="primary" data-act="addCard">カードを出す</button>
      </div>
    </div>
    <div>
      ${coachBox(sid, ['map', 'peek', 'teacher'], 'コンパスの問い返し')}
      <div class="row" style="margin-top:8px"><button data-act="coachMap" ${coachLeft(sid) ? '' : 'disabled'}>🧭 問い返してもらう</button></div>
    </div>
  </div>`}
  <div class="row" style="margin:8px 0">
    ${isT() ? '' : `<label><input type="radio" name="mf" data-act="mapFilter" data-f="all" ${UI.mapFilter === 'all' ? 'checked' : ''}> クラス全員のカード</label>
    <label><input type="radio" name="mf" data-act="mapFilter" data-f="mine" ${UI.mapFilter === 'mine' ? 'checked' : ''}> 自分のカードだけ</label>`}
    <span class="muted">カードはドラッグで動かせます。カードを2枚順におすと線でつなげます。線のことばをおすと線を消せます。</span>
  </div>
  ${bar}
  <div class="board-wrap"><div class="board" id="board">
    <svg id="lines"></svg>
    ${visible.map(c => cardHtml(c)).join('')}
  </div></div>
  ${isT() ? '' : `<div class="grid2" style="margin-top:16px">${readingPanel(sid)}</div>`}`;
}

function cardHtml(c) {
  const d = domainOf(c.domainId);
  const owner = studentOf(c.studentId);
  const mine = c.studentId === UI.me && !isT();
  const cand = UI.cand[c.id] ? domainOf(UI.cand[c.id]) : null;
  const canDel = isT() || mine;
  return `<div class="card ${mine ? 'mine' : ''} ${UI.sel === c.id || UI.linkTo === c.id ? 'sel' : ''}" data-id="${c.id}"
      style="left:${c.x}px;top:${c.y}px;border-color:${d ? d.color : '#bbb'}">
    ${canDel ? `<button class="x" data-act="delCard" data-id="${c.id}" title="消す">×</button>` : ''}
    ${esc(c.text)}
    <div class="src">📖 ${esc(c.source)}</div>
    <div class="who">${esc(owner ? owner.nick : '')}${d ? ' ・' + esc(d.name) : ''}</div>
    ${cand ? `<div class="cand">候補:${esc(cand.name)}</div>` : ''}
  </div>`;
}

function drawLines() {
  const board = document.getElementById('board'); if (!board) return;
  const pos = {};
  board.querySelectorAll('.card').forEach(el => {
    pos[el.dataset.id] = { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  });
  document.getElementById('lines').innerHTML = S.links.filter(l => pos[l.from] && pos[l.to]).map(l => {
    const a = pos[l.from], b = pos[l.to];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#8a8578" stroke-width="2.5"/>
      <text x="${mx}" y="${my}" text-anchor="middle" data-act="delLink" data-id="${l.id}">${esc(l.label || '―')}</text>`;
  }).join('');
}

function setupBoard() {
  drawLines();
  const board = document.getElementById('board');
  let drag = null;
  board.addEventListener('pointerdown', e => {
    const el = e.target.closest('.card');
    if (!el || e.target.closest('button')) return;
    const c = S.cards.find(x => x.id === el.dataset.id);
    drag = { el, c, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y, moved: false, can: isT() || c.studentId === UI.me };
    el.setPointerCapture(e.pointerId);
  });
  board.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved && drag.can) {
      drag.c.x = Math.max(0, Math.min(board.offsetWidth - 184, drag.ox + dx));
      drag.c.y = Math.max(0, Math.min(board.offsetHeight - 60, drag.oy + dy));
      drag.el.style.left = drag.c.x + 'px'; drag.el.style.top = drag.c.y + 'px';
      drawLines();
    }
  });
  board.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.moved) { if (d.can) { touch(); saveState(); } return; }
    clickCard(d.c.id);
  });
}

function clickCard(id) {
  if (UI.sel && UI.sel !== id && !UI.linkTo) UI.linkTo = id;
  else if (UI.sel === id) { UI.sel = null; UI.linkTo = null; }
  else { UI.sel = id; UI.linkTo = null; }
  render();
}

// ───────── 資料の読み取り(機能③)─────────
function readingPanel(sid) {
  const w = S.work[sid];
  return `<div class="panel"><h3>資料の読み取り</h3>
    <div class="muted">資料(グラフ・地図・写真など)から読み取ったことを書こう。書き終えたらボタンをおしてね。</div>
    <textarea data-w="reading" placeholder="例:グラフを見ると、2000年から生産台数がへっている。">${esc(w.reading)}</textarea>
    <div class="row" style="margin-top:6px"><button data-act="readingDone" ${coachLeft(sid) ? '' : 'disabled'}>書き終えた</button></div>
  </div>
  <div>${w.readingDone ? coachBox(sid, ['reading'], '資料の見方') : '<div class="coach"><h3>資料の見方</h3><div class="muted">読み取りを書き終えると、あなたの「見方」について声をかけるよ。</div></div>'}</div>`;
}

// ───────── 調べる・まとめ(機能②④)─────────
function viewResearch() {
  const s = me(); const sid = s.id; const w = S.work[sid]; const u = S.unit;
  const dom = domainOf(s.domainId);
  return `
  <div class="question" style="font-size:16px">単元の問い:${esc(u.question)}</div>
  <div class="split" style="margin-top:12px">
    <div>
      <div class="panel">
        <div class="row"><b>わたしの領域:</b>
          <select data-act="chooseDomain" style="width:auto">
            <option value="">― 選ぶ ―</option>
            ${u.domains.map(d => `<option value="${d.id}" ${s.domainId === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
          </select> ${chip(dom)}
        </div>
        <div class="field" style="margin-top:8px"><label>調べたこと(調べ途中も友達に見えます)</label>
          <textarea data-w="notes" placeholder="分かったことや、資料の名前を書いていこう">${esc(w.notes)}</textarea></div>
      </div>
      <div class="grid2">${readingPanel(sid)}</div>
      <div class="panel">
        <h3>まとめ ― 単元の問いに対するわたしの考え</h3>
        <textarea data-w="summary" style="min-height:140px" placeholder="問いに対する自分の考えを、調べた事実と資料をもとに書こう">${esc(w.summary)}</textarea>
        <div class="row" style="margin-top:6px">
          <button class="primary" data-act="coachSummary" ${coachLeft(sid) ? '' : 'disabled'}>🧭 コーチに見てもらう</button>
          <button data-act="publish">${w.published ? '公開をやめる' : '✅ 完成として公開する'}</button>
          ${w.published ? '<span class="tag ok">公開中</span>' : ''}
        </div>
        <div style="margin-top:10px">${coachBox(sid, ['summary', 'teacher'], 'まとめコーチ')}</div>
        ${w.versions.length ? `<details style="margin-top:10px"><summary>書き直しの変化を見る(${w.versions.length}回)</summary><div class="versions">
          ${w.versions.map((v, i) => `<div class="v"><b>${i + 1}回目</b>(${ago(v.at)})<br>${esc(v.text)}</div>`).join('')}
          <div class="v" style="color:var(--ink)"><b>いま</b><br>${esc(w.summary)}</div></div></details>` : ''}
        <div class="field" style="margin-top:12px"><label>振り返り(声かけや友達の考えで、どう変わったかな)</label>
          <textarea data-w="reflection" style="min-height:60px">${esc(w.reflection)}</textarea></div>
      </div>
    </div>
    ${peekWindow(sid)}
  </div>`;
}

function peekWindow(sid) {
  const s = studentOf(sid);
  const others = S.unit.domains.filter(d => d.id !== s.domainId);
  const pd = domainOf(UI.peekDomain);
  const conns = connections(sid);
  const peekTime = S.settings.peekUntil > Date.now();
  const myPeeks = S.peeks.filter(p => p.studentId === sid && p.domainId !== s.domainId).length;
  let body = '<div class="muted">上の領域をおすと、その領域の友達の調べ途中が見られるよ。</div>';
  if (pd) {
    const mates = S.students.filter(x => x.domainId === pd.id && x.id !== sid);
    body = mates.length ? mates.map(x => {
      const w = S.work[x.id];
      const cs = S.cards.filter(c => c.studentId === x.id);
      const rs = S.reactions.filter(r => r.to === x.id && r.domainId === pd.id && !r.hidden);
      return `<div class="note"><div class="meta">${esc(x.nick)}さん・最終更新 ${ago(w.lastActive)}</div>
        ${w.notes ? esc(w.notes) : '<span class="muted">(まだ書いていません)</span>'}
        ${cs.length ? `<div class="meta">カード:${cs.map(c => esc(c.text)).join(' / ')}</div>` : ''}
        ${rs.map(reactLine).join('')}
        ${reactForm(x.id, pd.id)}
      </div>`;
    }).join('') : '<div class="muted">この領域を調べている友達はまだいません。</div>';
  }
  return `<aside class="panel peekwin"><h3>👀 のぞき窓</h3>
    ${peekTime && !myPeeks ? '<div class="coach" style="margin-bottom:8px"><div class="say">のぞき合いタイムだよ。ほかの領域の友達が何を調べているか、のぞいてみよう。</div></div>' : ''}
    <div class="tabs">${others.map(d => `<button data-act="peek" data-d="${d.id}" class="${UI.peekDomain === d.id ? 'on' : ''}" style="${UI.peekDomain === d.id ? 'background:' + d.color : 'border-color:' + d.color}">${esc(d.name)}</button>`).join('')}</div>
    ${conns.length ? `<div class="coach" style="margin-bottom:8px"><b>つながりそうな情報</b>${conns.map(c => `<div class="say">${esc(c.text)} <button class="small" data-act="peek" data-d="${c.domain.id}">のぞく</button></div>`).join('')}</div>` : ''}
    ${body}
  </aside>`;
}

function reactForm(toId, domainId) {
  const free = S.settings.freeComment;
  return `<div class="stamps" data-to="${toId}" data-dom="${domainId}">
    ${free ? '<input type="text" class="rc" placeholder="ひとこと(なくてもよい)" maxlength="40">'
      : `<select class="rc">${SET_PHRASES.map(p => `<option value="${esc(p)}">${p || 'ひとことをえらぶ(なくてもよい)'}</option>`).join('')}</select>`}
    ${STAMPS.map(st => `<button data-act="stamp" data-s="${st.key}">${st.icon} ${st.key}</button>`).join('')}
  </div>`;
}

// ───────── みんなの考え ─────────
function viewShare() {
  const s = me();
  const scope = S.settings.publishScope;
  const pub = S.students.filter(x => S.work[x.id].published && (scope === 'class' || x.domainId === s.domainId || x.id === s.id));
  const ev = S.evals[s.id];
  return `
  ${ev && ev.sent ? `<div class="panel"><h3>📩 先生からのフィードバック</h3><div class="feedback">${esc(ev.feedback)}</div>
    ${S.settings.showGrade ? `<p>${Object.keys(KANTEN).map(k => `${KANTEN[k]}:<b>${esc(ev.final[k] || '')}</b>`).join(' / ')}</p>` : ''}</div>` : ''}
  <div class="panel"><h3>みんなのまとめ</h3>
    <div class="muted">${scope === 'class' ? 'クラス全員' : '同じ領域の友達'}の、完成したまとめが見られます。</div>
  </div>
  ${pub.length ? pub.map(x => {
    const w = S.work[x.id];
    const rs = S.reactions.filter(r => r.to === x.id && r.domainId === 'share' && !r.hidden);
    return `<div class="panel"><div class="row"><b>${esc(x.nick)}さん</b> ${chip(domainOf(x.domainId))}</div>
      <p>${esc(w.summary)}</p>
      ${rs.map(reactLine).join('')}
      ${x.id !== s.id ? reactForm(x.id, 'share') : ''}
    </div>`;
  }).join('') : '<div class="panel muted">まだ公開されたまとめはありません。</div>'}`;
}

// ───────── 先生:単元設定 ─────────
function viewSetup() {
  const u = S.unit; const st = S.settings;
  const crit = k => `<tr><td><b>${KANTEN[k]}</b></td>
    <td><textarea data-crit="${k}.A" style="min-height:60px">${esc(u.criteria[k].A)}</textarea></td>
    <td><textarea data-crit="${k}.B" style="min-height:60px">${esc(u.criteria[k].B)}</textarea></td></tr>`;
  return `
  <div class="panel"><h2>単元設定</h2>
    <div class="grid2">
      <div class="field"><label>学年</label><input type="text" data-u="grade" value="${esc(u.grade)}"></div>
      <div class="field"><label>単元名</label><input type="text" data-u="title" value="${esc(u.title)}"></div>
    </div>
    <div class="field"><label>単元の問い</label><textarea data-u="question" style="min-height:60px">${esc(u.question)}</textarea></div>
    <div class="field"><label>ゴール(児童のホームに出ます)</label><input type="text" data-u="goal" value="${esc(u.goal)}"></div>
    <div class="field"><label>ねらい(声かけと評価の基準になります)</label><textarea data-u="aim" style="min-height:60px">${esc(u.aim)}</textarea></div>
  </div>
  <div class="panel"><h3>評価規準</h3>
    <table><tr><th style="width:160px">観点</th><th>A(十分満足)</th><th>B(おおむね満足)</th></tr>${Object.keys(KANTEN).map(crit).join('')}</table>
    <div class="field" style="margin-top:8px"><label>補足(おおむね満足の具体例など。ファイルから読み込めます)</label>
      <textarea data-u="criteriaNote" style="min-height:60px">${esc(u.criteriaNote)}</textarea>
      <input type="file" id="critFile" accept=".txt,.csv,.md" style="margin-top:4px"></div>
  </div>
  <div class="grid2">
    <div class="panel"><h3>資料(1行に1つ)</h3>
      <textarea data-list="materials">${esc(u.materials.join('\n'))}</textarea></div>
    <div class="panel"><h3>領域(1行に「名前|キーワード,キーワード」)</h3>
      <textarea data-list="domains">${esc(u.domains.map(d => d.name + '|' + d.keywords).join('\n'))}</textarea>
      <div class="muted">キーワードは、分類の候補と「つながり」さがしに使います。</div></div>
  </div>
  <div class="grid2">
    <div class="panel"><h3>児童(1行に「出席番号 ニックネーム」)</h3>
      <textarea data-list="students" style="min-height:160px">${esc(S.students.map(s => s.no + ' ' + s.nick).join('\n'))}</textarea>
      <div class="muted">氏名や顔写真は登録しません。</div></div>
    <div class="panel"><h3>運用の設定</h3>
      <div class="field"><label>今の学習段階</label><select data-set="stage">${STAGES.map(s => `<option value="${s.key}" ${st.stage === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div>
      <div class="field"><label>まとめの公開範囲</label><select data-set="publishScope">
        <option value="class" ${st.publishScope === 'class' ? 'selected' : ''}>クラス全員</option>
        <option value="domain" ${st.publishScope === 'domain' ? 'selected' : ''}>同じ領域だけ</option></select></div>
      <div class="field"><label><input type="checkbox" data-set="freeComment" ${st.freeComment ? 'checked' : ''}> 自由記述のコメントを許可する(ふだんは定型のひとことだけ)</label></div>
      <div class="field"><label><input type="checkbox" data-set="showGrade" ${st.showGrade ? 'checked' : ''}> フィードバックといっしょにA・B・Cを児童に見せる</label></div>
      <div class="field"><label>AIの声かけの上限(1人あたり)</label><input type="number" min="1" max="50" data-set="coachLimit" value="${st.coachLimit}" style="width:100px"></div>
    </div>
  </div>
  <div class="panel"><h3>データ</h3>
    <div class="row">
      <button data-act="export">書き出す(.json)</button>
      <label class="row">読み込む <input type="file" id="importFile" accept=".json"></label>
      <button data-act="reset">見本のデータにもどす</button>
    </div>
    <div class="muted">この試作版では、データはこの端末のブラウザの中だけに保存されます。同じ端末の別のタブとは自動で同期します。</div>
  </div>`;
}

// ───────── 先生:ダッシュボード ─────────
function viewDashboard() {
  const rows = S.students.map(s => ({ s, st: studentStatus(s) })).sort((a, b) => b.st.priority - a.st.priority || a.s.no - b.s.no);
  const flagged = S.reactions.filter(r => r.flagged && !r.hidden);
  const log = S.coachLog.slice().reverse().slice(0, 40);
  const peekOn = S.settings.peekUntil > Date.now();
  return `
  <div class="panel"><div class="row" style="justify-content:space-between">
    <h2 style="margin:0">ダッシュボード</h2>
    <div class="row">
      <span>段階:</span><select data-set="stage" style="width:auto">${STAGES.map(s => `<option value="${s.key}" ${S.settings.stage === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
      <span>見合いタイム:</span>
      ${[3, 5, 10].map(m => `<button data-act="peekTime" data-m="${m}">${m}分</button>`).join('')}
      ${peekOn ? '<button data-act="peekTime" data-m="0">終える</button>' : ''}
      <button data-act="refresh">↻ 更新</button>
    </div></div>
    <div class="muted">印の多い児童から上に並びます。机間指導の順番の目安にしてください。</div>
  </div>
  ${flagged.length ? `<div class="panel" style="border-color:var(--warn)"><h3>⚠ 確認が必要な書き込み</h3>
    ${flagged.map(r => `<div class="row">${reactLine(r)} → ${esc(studentOf(r.to) ? studentOf(r.to).nick : '')}さんへ <button class="small" data-act="hideReact" data-id="${r.id}">非表示にする</button></div>`).join('')}</div>` : ''}
  <div class="panel" style="overflow:auto">
    <table><tr><th>番号</th><th>ニックネーム</th><th>領域</th><th>カード</th><th>線</th><th>まとめ</th><th>使っている見方</th><th>他領域を見た</th><th>スタンプ</th><th>最終操作</th><th>印</th><th></th></tr>
    ${rows.map(({ s, st }) => `<tr class="${st.priority >= 2 ? 'hot' : ''}">
      <td>${s.no}</td><td><b>${esc(s.nick)}</b></td><td>${chip(domainOf(s.domainId))}</td>
      <td>${st.cards}</td><td>${st.links}</td><td>${esc(st.stage)}</td>
      <td>${st.views.map(v => `<span class="tag">${VIEW_WORDS[v].name}</span>`).join('') || '―'}</td>
      <td>${st.peeks}</td><td>${st.reacts}</td><td>${ago(S.work[s.id].lastActive)}</td>
      <td>${st.flags.map(f => `<span class="tag ${f.level >= 2 ? 'warn' : ''}">${f.label}</span>`).join('')}</td>
      <td><button class="small" data-act="nudge" data-id="${s.id}">声をかける</button></td></tr>`).join('')}
    </table>
  </div>
  <div class="panel" style="overflow:auto"><h3>AIの声かけの履歴</h3>
    <div class="muted">不適切な声かけは、直したり児童から見えなくしたりできます。</div>
    ${log.length ? `<table><tr><th>時刻</th><th>児童</th><th>種類</th><th>声かけ</th><th></th></tr>
      ${log.map(c => `<tr style="${c.hidden ? 'opacity:.45' : ''}"><td>${ago(c.at)}</td><td>${esc((studentOf(c.studentId) || {}).nick)}</td>
        <td>${{ map: '問い返し', reading: '見方', summary: 'まとめ', peek: 'のぞき窓', teacher: '先生' }[c.kind] || c.kind}</td>
        <td>${esc(c.text)}${c.edited ? ' <span class="tag">修正済み</span>' : ''}</td>
        <td class="row"><button class="small" data-act="editCoach" data-id="${c.id}">直す</button>
        <button class="small" data-act="hideCoach" data-id="${c.id}">${c.hidden ? '見せる' : '非表示'}</button></td></tr>`).join('')}</table>` : '<div class="muted">まだありません</div>'}
  </div>`;
}

// ───────── 先生:評価・フィードバック ─────────
function viewEval() {
  const ks = Object.keys(KANTEN);
  const done = S.students.filter(s => S.evals[s.id] && S.evals[s.id].confirmed);
  let same = 0, total = 0;
  done.forEach(s => ks.forEach(k => { total++; if (S.evals[s.id].draft[k].grade === S.evals[s.id].final[k]) same++; }));
  return `
  <div class="panel"><h2>評価・フィードバック</h2>
    <div class="row">
      <button class="primary" data-act="draftAll">🧭 評価案をつくる(全員)</button>
      <button data-act="fbAll">確定した児童のフィードバック文をつくる</button>
      <button data-act="sendAll">確認済みのフィードバックをまとめて送る</button>
    </div>
    <p class="muted">AIの評価案は下書きです。先生が確定するまで記録にも児童にも反映されません。フィードバックは先生が「送る」をおすまで届きません。</p>
    <p>確定 ${done.length} / ${S.students.length}人${total ? ` ・ 評価案と確定評価の一致 ${same}/${total}(${Math.round(same / total * 100)}%)` : ''}</p>
  </div>
  <div class="panel" style="overflow:auto">
    <table><tr><th>児童</th>${ks.map(k => `<th>${KANTEN[k]}</th>`).join('')}<th style="width:320px">フィードバック</th></tr>
    ${S.students.map(s => evalRow(s, ks)).join('')}</table>
  </div>`;
}

function evalRow(s, ks) {
  const e = S.evals[s.id];
  if (!e) return `<tr><td><b>${s.no} ${esc(s.nick)}</b><br>${chip(domainOf(s.domainId))}</td><td colspan="${ks.length + 1}" class="muted">評価案はまだありません <button class="small" data-act="draftOne" data-id="${s.id}">この児童の評価案をつくる</button></td></tr>`;
  return `<tr class="${e.flag ? 'hot' : ''}"><td><b>${s.no} ${esc(s.nick)}</b><br>${chip(domainOf(s.domainId))}
      <div style="margin-top:6px"><label><input type="checkbox" data-act="flagEval" data-id="${s.id}" ${e.flag ? 'checked' : ''}> 迷う</label></div>
      <div style="margin-top:4px">${e.confirmed ? '<span class="tag ok">確定</span> <button class="small" data-act="unconfirm" data-id="' + s.id + '">もどす</button>' : `<button class="small primary" data-act="confirm" data-id="${s.id}">確定</button>`}</div>
      <div style="margin-top:4px"><button class="small" data-act="copyPrompt" data-id="${s.id}">Copilot用の依頼文</button></div>
      <div style="margin-top:4px"><button class="small" data-act="draftOne" data-id="${s.id}">案をつくり直す</button></div></td>
    ${ks.map(k => `<td>
      <div>案:<span class="grade grade-${e.draft[k].grade}">${e.draft[k].grade}</span>
        → <select data-final="${s.id}.${k}" style="width:auto" ${e.confirmed ? 'disabled' : ''}>${['A', 'B', 'C'].map(g => `<option ${e.final[k] === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      ${e.draft[k].evidence ? `<div class="evid">「${esc(e.draft[k].evidence)}」</div>` : '<div class="evid muted">根拠となる記述なし</div>'}
      <div class="reason">${esc(e.draft[k].reason)}</div></td>`).join('')}
    <td>${e.confirmed ? `<textarea data-fb="${s.id}" style="min-height:110px" ${e.sent ? 'disabled' : ''}>${esc(e.feedback)}</textarea>
      <div class="row" style="margin-top:4px">
        ${e.sent ? `<span class="tag ok">送信済み ${ago(e.sentAt)}</span>` : `<button class="small" data-act="fbOne" data-id="${s.id}">文をつくる</button>
        <button class="small primary" data-act="sendOne" data-id="${s.id}" ${e.feedback.trim() ? '' : 'disabled'}>送る</button>`}
      </div>` : '<span class="muted">評価を確定すると書けます</span>'}</td></tr>`;
}

// ───────── 操作 ─────────
const ACT = {
  go(a) { UI.view = a.dataset.v; UI.sel = UI.linkTo = null; render(); window.scrollTo(0, 0); },
  refresh() { render(); },
  unsel() { UI.sel = UI.linkTo = null; render(); },
  mapFilter(a) { UI.mapFilter = a.dataset.f; render(); },

  addCard() {
    const text = document.getElementById('cardText').value.trim();
    if (!text) return toast('分かったことを書いてね');
    const src = [document.getElementById('cardSrc').value, document.getElementById('cardPage').value.trim()].filter(Boolean).join(' ');
    const n = S.cards.filter(c => c.studentId === UI.me).length;
    S.cards.push({ id: uid('c'), studentId: UI.me, text, source: src || '(資料なし)', x: 30 + Math.random() * 900, y: 30 + Math.random() * 480, domainId: null, createdAt: Date.now() });
    touch(); commit();
    toast(`カードを出したよ(${n + 1}枚目)`);
  },
  delCard(a) {
    if (!confirm('このカードを消しますか?')) return;
    S.cards = S.cards.filter(c => c.id !== a.dataset.id);
    S.links = S.links.filter(l => l.from !== a.dataset.id && l.to !== a.dataset.id);
    UI.sel = UI.linkTo = null; commit();
  },
  link(a) {
    if (S.links.some(l => (l.from === UI.sel && l.to === UI.linkTo) || (l.from === UI.linkTo && l.to === UI.sel))) {
      toast('もうつながっているよ');
    } else {
      S.links.push({ id: uid('l'), from: UI.sel, to: UI.linkTo, label: a.dataset.l, studentId: isT() ? 'teacher' : UI.me });
      touch();
    }
    UI.sel = UI.linkTo = null; commit();
  },
  delLink(a) {
    const l = S.links.find(x => x.id === a.dataset.id);
    if (!l) return;
    if (!isT() && l.studentId !== UI.me) return toast('自分でつないだ線だけ消せるよ');
    if (!confirm(`「${l.label || '―'}」の線を消しますか?`)) return;
    S.links = S.links.filter(x => x.id !== l.id); commit();
  },
  setdom(a) {
    const c = S.cards.find(x => x.id === UI.sel); if (!c) return;
    c.domainId = a.dataset.d || null; UI.sel = null; delete UI.cand[c.id]; commit();
  },
  suggestDomains() {
    UI.cand = {};
    S.cards.filter(c => !c.domainId).forEach(c => {
      let best = null, score = 0;
      S.unit.domains.forEach(d => {
        const sc = domainWords(d).filter(w => w && c.text.includes(w)).length;
        if (sc > score) { score = sc; best = d.id; }
      });
      if (best) UI.cand[c.id] = best;
    });
    const n = Object.keys(UI.cand).length;
    toast(n ? `${n}枚に候補を出しました。決めるのは先生です` : '候補が見つかりませんでした。領域のキーワードをふやしてみてください');
    render();
  },
  acceptCand() { Object.keys(UI.cand).forEach(id => { const c = S.cards.find(x => x.id === id); if (c) c.domainId = UI.cand[id]; }); UI.cand = {}; commit(); },
  clearCand() { UI.cand = {}; render(); },

  coachMap() { if (!coachLeft(UI.me)) return; logCoach(UI.me, 'map', coachMap(UI.me)); touch(); commit(); },
  readingDone() {
    const w = S.work[UI.me];
    if (!w.reading.trim()) return toast('読み取ったことを書いてからおしてね');
    if (!coachLeft(UI.me)) return;
    w.readingDone = true;
    logCoach(UI.me, 'reading', coachReading(UI.me)); touch(); commit();
  },
  coachSummary() {
    const w = S.work[UI.me];
    if (!coachLeft(UI.me)) return;
    const last = w.versions[w.versions.length - 1];
    if (w.summary.trim() && (!last || last.text !== w.summary)) w.versions.push({ text: w.summary, at: Date.now() });
    logCoach(UI.me, 'summary', coachSummary(UI.me)); touch(); commit();
  },
  publish() {
    const w = S.work[UI.me];
    if (!w.published && !w.summary.trim()) return toast('まとめを書いてから公開しよう');
    w.published = !w.published; touch(); commit();
    toast(w.published ? 'まとめを公開しました' : '公開をやめました');
  },
  peek(a) {
    UI.peekDomain = a.dataset.d;
    S.peeks.push({ studentId: UI.me, domainId: a.dataset.d, at: Date.now() });
    touch(); commit();
  },
  stamp(a) {
    const box = a.closest('.stamps');
    const comment = (box.querySelector('.rc').value || '').trim();
    const r = { id: uid('r'), from: UI.me, to: box.dataset.to, domainId: box.dataset.dom, stamp: a.dataset.s, comment, at: Date.now(), flagged: isHurtful(comment), hidden: false };
    S.reactions.push(r);
    if (r.flagged) toast('友達が悲しくなる言葉がふくまれているかもしれません。先生に知らせました');
    else toast('送ったよ');
    if (a.dataset.s === 'つながりそう' && coachLeft(UI.me)) {
      logCoach(UI.me, 'peek', ['「つながりそう」と思ったのはどこかな?イメージマップに線で書き足してみよう。']);
      toast('「つながりそう」と思ったのはどこかな?イメージマップに線で書き足してみよう');
    }
    touch(); commit();
  },

  peekTime(a) {
    const m = +a.dataset.m;
    S.settings.peekUntil = m ? Date.now() + m * 60000 : 0; commit();
    if (m) toast(`${m}分間の見合いタイムを始めました`);
  },
  nudge(a) {
    const s = studentOf(a.dataset.id);
    const t = prompt(`${s.nick}さんへの声かけ(コンパスの欄に出ます)`, '単元の問いにもどって、いちばん大事だと思うカードを選んでみよう。');
    if (t && t.trim()) { logCoach(s.id, 'teacher', [t.trim()]); commit(); toast('声かけを送りました'); }
  },
  editCoach(a) {
    const c = S.coachLog.find(x => x.id === a.dataset.id);
    const t = prompt('声かけを直す', c.text);
    if (t != null && t.trim() && t !== c.text) { c.text = t.trim(); c.edited = true; commit(); }
  },
  hideCoach(a) { const c = S.coachLog.find(x => x.id === a.dataset.id); c.hidden = !c.hidden; commit(); },
  hideReact(a) { const r = S.reactions.find(x => x.id === a.dataset.id); r.hidden = true; commit(); },

  draftAll() { S.students.forEach(s => makeDraft(s.id)); commit(); toast('評価案をつくりました。根拠を見て確定してください'); },
  draftOne(a) { makeDraft(a.dataset.id); commit(); },
  flagEval(a) { S.evals[a.dataset.id].flag = a.checked; commit(); },
  confirm(a) { S.evals[a.dataset.id].confirmed = true; commit(); },
  unconfirm(a) { const e = S.evals[a.dataset.id]; if (e.sent) return toast('送信済みのため、もどせません'); e.confirmed = false; commit(); },
  fbOne(a) { S.evals[a.dataset.id].feedback = draftFeedback(a.dataset.id); commit(); },
  fbAll() {
    let n = 0;
    S.students.forEach(s => { const e = S.evals[s.id]; if (e && e.confirmed && !e.sent && !e.feedback.trim()) { e.feedback = draftFeedback(s.id); n++; } });
    commit(); toast(n ? `${n}人分の文をつくりました。読んで直してから送ってください` : '文をつくる児童がいません(確定済みで未作成の児童が対象です)');
  },
  sendOne(a) {
    const e = S.evals[a.dataset.id];
    if (!confirm(`${studentOf(a.dataset.id).nick}さんにフィードバックを送りますか?`)) return;
    e.sent = true; e.sentAt = Date.now(); commit();
  },
  sendAll() {
    const list = S.students.filter(s => { const e = S.evals[s.id]; return e && e.confirmed && !e.sent && e.feedback.trim(); });
    if (!list.length) return toast('送れるフィードバックがありません');
    if (!confirm(`${list.map(s => s.nick).join('、')}さん(${list.length}人)に送りますか?`)) return;
    list.forEach(s => { S.evals[s.id].sent = true; S.evals[s.id].sentAt = Date.now(); });
    commit();
  },
  copyPrompt(a) {
    const text = copilotPrompt(a.dataset.id);
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast('依頼文をコピーしました。Copilot に貼りつけてください'))
      .catch(() => prompt('この依頼文をコピーしてください', text));
  },

  export() {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `問いコンパス_${S.unit.title}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  },
  reset() { if (confirm('いまのデータを消して、見本のデータにもどしますか?')) { S = sampleData(); UI.cand = {}; commit(); } },
};

function makeDraft(sid) {
  const prev = S.evals[sid];
  if (prev && prev.sent) return;
  const draft = draftEval(sid);
  S.evals[sid] = {
    draft,
    final: Object.fromEntries(Object.keys(draft).map(k => [k, draft[k].grade])),
    flag: prev ? prev.flag : false, confirmed: false, feedback: '', sent: false, sentAt: 0,
  };
}

function parseList(key, text) {
  const lines = text.split('\n').map(x => x.trim()).filter(Boolean);
  if (key === 'materials') S.unit.materials = lines;
  if (key === 'domains') {
    S.unit.domains = lines.map((line, i) => {
      const [name, kw = ''] = line.split('|');
      const old = S.unit.domains.find(d => d.name === name.trim()) || S.unit.domains[i];
      return { id: old ? old.id : uid('d'), name: name.trim(), color: old ? old.color : COLORS[i % COLORS.length], keywords: kw.trim() };
    });
  }
  if (key === 'students') {
    S.students = lines.map(line => {
      const m = line.match(/^(\d+)\s+(.+)$/);
      const no = m ? +m[1] : 0; const nick = m ? m[2].trim() : line;
      const old = S.students.find(s => s.no === no) || S.students.find(s => s.nick === nick);
      const s = old ? Object.assign(old, { no, nick }) : { id: uid('s'), no, nick, domainId: null };
      if (!S.work[s.id]) S.work[s.id] = { notes: '', reading: '', readingDone: false, summary: '', versions: [], reflection: '', published: false, lastActive: Date.now() };
      return s;
    });
  }
}

// ───────── イベント ─────────
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (!a || a.tagName === 'SELECT') return;
  const f = ACT[a.dataset.act];
  if (f) f(a, e);
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.w) { S.work[UI.me][el.dataset.w] = el.value; if (el.dataset.w === 'reading') S.work[UI.me].readingDone = false; touch(); saveState(); }
  else if (el.dataset.u) { S.unit[el.dataset.u] = el.value; saveState(); }
  else if (el.dataset.crit) { const [k, g] = el.dataset.crit.split('.'); S.unit.criteria[k][g] = el.value; saveState(); }
  else if (el.dataset.fb) { S.evals[el.dataset.fb].feedback = el.value; saveState(); }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'who') {
    if (el.value === 'teacher') UI.role = 'teacher';
    else { UI.role = 'student'; UI.me = el.value; }
    UI.view = NAV[UI.role][0][0]; UI.sel = UI.linkTo = null; UI.peekDomain = null;
    render(); return;
  }
  if (el.dataset.act === 'chooseDomain') { me().domainId = el.value || null; UI.peekDomain = null; touch(); commit(); return; }
  if (el.dataset.set) {
    const k = el.dataset.set;
    S.settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Math.max(1, +el.value || 1) : el.value;
    commit(); return;
  }
  if (el.dataset.list) { parseList(el.dataset.list, el.value); commit(); toast('反映しました'); return; }
  if (el.dataset.final) { const [sid, k] = el.dataset.final.split('.'); S.evals[sid].final[k] = el.value; commit(); return; }
  if (el.id === 'critFile' && el.files[0]) {
    el.files[0].text().then(t => { S.unit.criteriaNote = (S.unit.criteriaNote ? S.unit.criteriaNote + '\n' : '') + t.trim(); commit(); toast('評価規準の補足に読み込みました'); });
    return;
  }
  if (el.id === 'importFile' && el.files[0]) {
    el.files[0].text().then(t => {
      try { const d = JSON.parse(t); if (d.version !== 1) throw 0; S = d; commit(); toast('読み込みました'); }
      catch (err) { toast('読み込めないファイルです'); }
    });
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'cardText' && !e.isComposing) ACT.addCard();
});

// 同じ端末の別のタブで変わったら取りこむ(入力中は入力が終わってから)
let pending = false;
window.addEventListener('storage', e => {
  if (e.key !== STORE_KEY) return;
  S = loadState();
  const f = document.activeElement;
  if (f && /^(TEXTAREA|INPUT)$/.test(f.tagName) && f.type !== 'file') pending = true; else render();
});
document.addEventListener('focusout', () => { if (pending) { pending = false; setTimeout(render, 0); } });
setInterval(() => { if (S.settings.peekUntil > Date.now() - 60000 &&!document.activeElement.matches('textarea,input')) render(); }, 30000);

render();
