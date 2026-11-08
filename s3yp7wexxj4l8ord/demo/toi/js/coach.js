// AIの声かけ(試作では決まった規則で出す)
// 方針:価値付け→提案の順/一度に1〜2個/答えを言わない/単元の問いに立ち返る/児童向けの言葉

const VIEW_WORDS = {
  space: { name: '位置や広がり', kid: '場所や広がりで見る見方', words: ['場所', '地図', '地域', 'どこ', '集ま', '近く', '県', '海', '港', '沿い', '分布', '広が', 'まわり', '全国', '海外', '遠い', '各地'] },
  time: { name: '時期や時間の経過', kid: '時間の流れで見る見方', words: ['年', '変化', '増え', 'ふえ', '減', 'へっ', '昔', 'むかし', '今', 'これから', '時代', '以前', 'ごろ', 'うつりかわ', '前より', '将来'] },
  relation: { name: '事象や人々の相互関係', kid: '人やものごとのつながりで見る見方', words: ['ため', 'ので', 'から、', 'つなが', '協力', '関係', '支え', '影響', 'によって', '人々', '願い', 'こたえ', '助け', 'おかげ', '工夫'] },
};

const VIEW_SUGGEST = {
  space: '地図で、それがどこに集まっているかを見ると、何か分かるかな?',
  time: 'グラフで、年ごとにどう変わってきたかを見ると、何か分かるかな?',
  relation: 'そのことで、だれが助かっているのか(人どうしのつながり)を考えると、どうかな?',
};

const VIEW_PRAISE = {
  space: '場所や広がりに目をつけたね。「位置や空間の広がり」で見る見方ができているよ。',
  time: '年ごとの変化や昔と今に目をつけたね。「時間の経過」で見る見方ができているよ。',
  relation: 'ものごとや人どうしのつながりに目をつけたね。「相互関係」(つながり)で見る見方ができているよ。',
};

const DEPTH = {
  evidence: { name: '根拠', words: ['資料', 'グラフ', '教科書', '資料集', '地図', '表', '分かる', 'わかる', 'p.', 'ページ', '%', '台', '万'], ask: 'そう考えたのは、どの資料から分かったからかな?資料の名前やページを書き加えると、もっと伝わるよ。', praise: '資料をもとにして書けているね。' },
  relate: { name: '関連づけ', words: ['また', 'さらに', 'だから', 'つまり', 'そのため', 'このように', 'それで', 'ことで', 'つながって'], ask: 'いくつかの事実から、どんなことが言えるかな?事実と事実を「だから」「そのため」でつないでみよう。', praise: '事実と事実をつないで書けているね。' },
  compare: { name: '比べる', words: ['比べ', 'くらべ', 'ちがい', 'ちがう', '一方', 'より', '同じ'], ask: 'ほかの工場や昔のようすと比べると、どんなちがいがあるかな?', praise: '比べて考えられているね。' },
  meaning: { name: '社会にとっての意味', words: ['社会', '人々', '日本', '消費者', '願い', 'くらし', '国民', 'みんな'], ask: 'そのことは、社会や人々にとってどんな意味があるのかな?', praise: '社会や人々にとっての意味まで考えられているね。' },
  life: { name: '自分たちの生活', words: ['わたしたち', '私たち', 'ぼくたち', '自分', '生活', '家', '家族'], ask: 'わたしたちの生活とは、どうつながっているかな?', praise: '自分たちの生活とつなげて考えられているね。' },
};

function hasAny(text, words) { return words.some(w => text.includes(w)); }

function sentences(text) {
  return (text || '').split(/(?<=[。!?])/).map(t => t.trim()).filter(Boolean);
}

function findSentence(text, words) {
  return sentences(text).find(t => hasAny(t, words)) || '';
}

// 漢字・カタカナの2文字以上のまとまりをキーワードとみなす
function keywords(text) {
  const m = (text || '').match(/[一-鿿゠-ヿ々ー]{2,}/g) || [];
  return [...new Set(m)];
}

function sharesWord(a, b) {
  const kb = keywords(b);
  return keywords(a).filter(w => kb.some(x => x.includes(w) || w.includes(x)));
}

function viewsUsed(text) {
  return Object.keys(VIEW_WORDS).filter(k => hasAny(text || '', VIEW_WORDS[k].words));
}

function depthOf(text) {
  const r = {};
  Object.keys(DEPTH).forEach(k => { r[k] = hasAny(text || '', DEPTH[k].words); });
  return r;
}

function domainOf(id) { return S.unit.domains.find(d => d.id === id); }
function studentOf(id) { return S.students.find(s => s.id === id); }

function domainWords(d) {
  return [d.name, ...(d.keywords || '').split(/[,、]/).map(x => x.trim()).filter(Boolean)];
}

// 他の領域の言葉が出てくるか
function otherDomainsMentioned(text, myDomainId) {
  return S.unit.domains.filter(d => d.id !== myDomainId && hasAny(text || '', domainWords(d)));
}

function questionWords() {
  return keywords(S.unit.question + S.unit.aim) .concat(S.unit.domains.flatMap(domainWords));
}

function onQuestion(text) {
  const qw = questionWords();
  const kw = keywords(text);
  return kw.some(w => qw.some(q => q.includes(w) || w.includes(q)));
}

// 上限は「声かけを受けた回数」で数える(1回に1〜2文)。先生からの声かけは数えない
function coachCount(sid) { return new Set(S.coachLog.filter(c => c.studentId === sid && c.kind !== 'teacher').map(c => c.at)).size; }
function coachLeft(sid) { return Math.max(0, S.settings.coachLimit - coachCount(sid)); }

function logCoach(sid, kind, texts) {
  const at = Date.now();
  const items = texts.map(t => ({ id: uid('k'), studentId: sid, kind, text: t, at, hidden: false, edited: false }));
  S.coachLog.push(...items);
  return items;
}

// ① 要素カード・イメージマップの問い返し
function coachMap(sid) {
  const mine = S.cards.filter(c => c.studentId === sid);
  const myIds = new Set(mine.map(c => c.id));
  const linked = S.links.filter(l => myIds.has(l.from) || myIds.has(l.to) || l.studentId === sid);
  const out = [];
  if (mine.length < 3) {
    const usedSrc = mine.map(c => c.source).join(' ');
    const notUsed = S.unit.materials.find(m => !usedSrc.includes(m.split(' ')[0]));
    out.push(notUsed
      ? `「${notUsed}」からも、分かることがありそうだよ。見てみたかな?`
      : '教科書や資料集のグラフ・地図からも、分かることがありそうだよ。');
  }
  const off = mine.filter(c => !onQuestion(c.text));
  if (off.length && out.length < 2) {
    out.push(`単元の問いは「${S.unit.question}」だったね。「${off[0].text}」のカードは、問いの答えにどうつながるかな?`);
  }
  if (mine.length >= 2 && linked.length === 0 && out.length < 2) {
    out.push(`「${mine[0].text}」と「${mine[1].text}」には、どんなつながりがあるかな?線でつないでみよう。`);
  }
  if (mine.length >= 3 && out.length < 2) {
    out.push('単元の問いに答えるには、どのカードがいちばん大事かな?そのカードから線をのばしてみよう。');
  }
  if (!out.length) out.push('カードをつなげてマップが育ってきたね。友達のカードとつながるものはないかな?');
  return out.slice(0, 2);
}

// ③ 資料の見方フィードバック(書き終えた後に出す)
function coachReading(sid) {
  const text = S.work[sid].reading;
  const used = viewsUsed(text);
  const out = [];
  if (used.length) out.push(VIEW_PRAISE[used[0]]);
  else out.push('資料から分かったことを、自分の言葉で書けたね。');
  const notUsed = Object.keys(VIEW_WORDS).filter(k => !used.includes(k));
  if (notUsed.length) out.push(VIEW_SUGGEST[notUsed[0]]);
  else out.push('3つの見方(場所・時間・つながり)を全部使えているね。別の資料でも試してみよう。');
  return out;
}

// ② まとめ深化コーチ
function coachSummary(sid) {
  const w = S.work[sid];
  const text = w.summary;
  const me = studentOf(sid);
  const d = depthOf(text);
  const others = otherDomainsMentioned(text, me.domainId);
  const out = [];
  if (!text.trim()) return ['まずは、問いに対する今の自分の考えを書いてみよう。'];
  // 価値付け:できているところを具体的に
  if (others.length) out.push(`「${others[0].name}」の領域の情報と関係づけて書けたね。説得力が増したよ。`);
  else {
    const done = Object.keys(DEPTH).find(k => d[k]);
    out.push(done ? DEPTH[done].praise + `(「${findSentence(text, DEPTH[done].words) || text.slice(0, 30)}」のところ)` : '問いに対する自分の考えを書けたね。');
  }
  // 提案:1つだけ
  const order = ['evidence', 'relate', 'meaning', 'compare', 'life'];
  const next = order.find(k => !d[k]);
  if (next) out.push(DEPTH[next].ask);
  else if (!others.length) out.push('ほかの領域で調べている友達の情報とつなげると、もっと深まりそうだよ。のぞき窓を見てみよう。');
  return out.slice(0, 2);
}

// ④ のぞき窓:つながりそうな他の領域の情報
function connections(sid) {
  const me = studentOf(sid);
  const myText = S.work[sid].notes + ' ' + S.cards.filter(c => c.studentId === sid).map(c => c.text).join(' ');
  if (!myText.trim()) return [];
  const res = [];
  S.students.forEach(o => {
    if (o.id === sid || !o.domainId || o.domainId === me.domainId) return;
    const t = S.work[o.id].notes + ' ' + S.cards.filter(c => c.studentId === o.id).map(c => c.text).join(' ');
    const common = sharesWord(myText, t).filter(w => w.length >= 2);
    if (common.length) res.push({ student: o, domain: domainOf(o.domainId), words: common.slice(0, 2) });
  });
  return res.slice(0, 3).map(r =>
    ({ ...r, text: `「${r.domain.name}」の領域で調べている${r.student.nick}さんが、「${r.words.join('」「')}」について書いているよ。あなたの調べたこととつながりそうだね。` }));
}

// ⑤ ダッシュボードの印
function studentStatus(s) {
  const w = S.work[s.id];
  const cards = S.cards.filter(c => c.studentId === s.id);
  const peeks = S.peeks.filter(p => p.studentId === s.id && p.domainId !== s.domainId);
  const idleMin = Math.round((Date.now() - (w.lastActive || 0)) / 60000);
  const flags = [];
  if (idleMin >= 10) flags.push({ key: 'idle', label: '手が止まっている', level: 2 });
  const texts = [w.notes, w.summary, ...cards.map(c => c.text)].filter(t => t && t.trim());
  if (texts.length && !texts.some(onQuestion)) flags.push({ key: 'off', label: '問いからずれている?', level: 2 });
  if (!s.domainId && S.settings.stage !== 'cards') flags.push({ key: 'nodomain', label: '領域が未選択', level: 2 });
  if (peeks.length === 0 && S.settings.stage !== 'cards') flags.push({ key: 'nopeek', label: '他の領域を見ていない', level: 1 });
  const stage = w.published ? '完成' : w.versions.length ? `書き直し${w.versions.length}回` : w.summary.trim() ? '書きかけ' : w.notes.trim() ? '調べ中' : '未着手';
  return {
    cards: cards.length,
    links: S.links.filter(l => l.studentId === s.id).length,
    peeks: peeks.length,
    reacts: S.reactions.filter(r => r.from === s.id).length,
    views: [...new Set([...viewsUsed(w.reading), ...viewsUsed(w.summary), ...viewsUsed(w.notes)])],
    idleMin, flags, stage,
    priority: flags.reduce((a, f) => a + f.level, 0),
  };
}

// ⑥ 評価案(根拠となる記述と理由を必ず添える)
function draftEval(sid) {
  const s = studentOf(sid);
  const w = S.work[sid];
  const st = studentStatus(s);
  const d = depthOf(w.summary);
  const readViews = viewsUsed(w.reading);
  const others = otherDomainsMentioned(w.summary, s.domainId);
  const cardsText = S.cards.filter(c => c.studentId === sid).map(c => c.text);

  const k = (() => {
    const ev = findSentence(w.summary, DEPTH.evidence.words) || w.reading || cardsText[0] || '';
    const n = (st.cards >= 3 ? 1 : 0) + (d.evidence ? 1 : 0) + (readViews.length >= 2 ? 1 : 0) + (w.reading.trim() ? 1 : 0);
    const grade = n >= 3 ? 'A' : n >= 1 ? 'B' : 'C';
    return { grade, evidence: ev, reason: `要素カード${st.cards}枚/読み取りで使った見方${readViews.length}つ/まとめの根拠${d.evidence ? 'あり' : 'なし'}` };
  })();
  const t = (() => {
    const ev = others.length ? findSentence(w.summary, domainWords(others[0])) : findSentence(w.summary, DEPTH.relate.words) || w.summary.slice(0, 60);
    const n = (d.relate ? 1 : 0) + (d.evidence ? 1 : 0) + (others.length ? 1 : 0) + (d.meaning ? 1 : 0) + (st.links >= 2 ? 1 : 0);
    const grade = !w.summary.trim() ? 'C' : n >= 4 ? 'A' : n >= 2 ? 'B' : 'C';
    return { grade, evidence: ev, reason: `関連づけ${d.relate ? '○' : '×'}/根拠${d.evidence ? '○' : '×'}/他の領域の情報${others.length ? '○(' + others.map(o => o.name).join('・') + ')' : '×'}/社会にとっての意味${d.meaning ? '○' : '×'}/マップの線${st.links}本` };
  })();
  const a = (() => {
    const ev = w.reflection || (w.versions.length ? `書き直し前:「${w.versions[0].text}」` : '');
    const n = (w.versions.length >= 1 ? 1 : 0) + (w.versions.length >= 2 ? 1 : 0) + (st.peeks >= 2 ? 1 : 0) + (st.reacts >= 1 ? 1 : 0) + (w.reflection.trim() ? 1 : 0);
    const grade = n >= 4 ? 'A' : n >= 2 ? 'B' : 'C';
    return { grade, evidence: ev, reason: `書き直し${w.versions.length}回/他の領域を見た回数${st.peeks}/送ったスタンプ${st.reacts}/振り返り${w.reflection.trim() ? 'あり' : 'なし'}` };
  })();
  return { chishiki: k, shiko: t, taido: a };
}

const KANTEN = { chishiki: '知識・技能', shiko: '思考・判断・表現', taido: '主体的に学習に取り組む態度' };

function draftFeedback(sid) {
  const w = S.work[sid];
  const s = studentOf(sid);
  const d = depthOf(w.summary);
  const others = otherDomainsMentioned(w.summary, s.domainId);
  const views = viewsUsed(w.reading + w.summary);
  let good;
  if (others.length) good = `「${others[0].name}」の領域の情報とつなげて考えを書けたところがすばらしいです。`;
  else if (d.evidence) good = `「${findSentence(w.summary, DEPTH.evidence.words)}」のように、資料をもとに書けています。`;
  else if (views.length) good = `${VIEW_WORDS[views[0]].kid}で資料を読み取れていました。`;
  else if (w.notes.trim()) good = '自分の領域について、ていねいに調べられました。';
  else good = '問いについて考えようとしていました。';
  if (w.versions.length) good += `声かけを受けて${w.versions.length}回書き直し、考えを深めようとしていましたね。`;
  const next = ['evidence', 'relate', 'meaning', 'compare'].find(k => !d[k]);
  const tip = next ? {
    evidence: '次は、考えの根拠になった資料の名前やページも書くと、もっと伝わります。',
    relate: '次は、いくつかの事実を「だから」「そのため」でつないで、言えることを書いてみましょう。',
    meaning: '次は、そのことが社会や人々にとってどんな意味があるかまで考えてみましょう。',
    compare: '次は、ほかのものと比べて考えると、ちがいがはっきりしますよ。',
  }[next] : others.length ? '次の単元でも、ちがう見方の友達の考えを生かしていきましょう。' : '次は、ほかの領域の友達の情報ともつなげてみましょう。';
  return `${s.nick}さんへ\n${good}\n${tip}`;
}

// Copilot などに頼むときの依頼文(氏名は入れない)
function copilotPrompt(sid) {
  const s = studentOf(sid);
  const w = S.work[sid];
  const u = S.unit;
  const cr = Object.keys(KANTEN).map(k => `【${KANTEN[k]}】A:${u.criteria[k].A} / B:${u.criteria[k].B}`).join('\n');
  return `あなたは小学校${u.grade}の社会科の評価を手伝う補助者です。次の評価規準に照らして、児童「${s.nick}」(出席番号${s.no})の3観点の評価案(A・B・C)をつくってください。
各観点に、判断の根拠になった児童の記述をそのまま引用し、理由を1文で添えてください。最終的な評価は教師が決めます。
最後に、児童向けのフィードバック文(できているところの価値付け+次に生かせる一言、高学年が読んで分かる言葉、3文以内、答えは言わない)をつくってください。

■単元:${u.title}
■単元の問い:${u.question}
■ねらい:${u.aim}
■評価規準
${cr}
${u.criteriaNote ? '■補足\n' + u.criteriaNote + '\n' : ''}
■児童の記録
・領域:${s.domainId ? domainOf(s.domainId).name : '未選択'}
・要素カード:${S.cards.filter(c => c.studentId === sid).map(c => c.text + '(' + c.source + ')').join(' / ') || 'なし'}
・資料の読み取り:${w.reading || 'なし'}
・調べたこと:${w.notes || 'なし'}
・まとめ(完成):${w.summary || 'なし'}
・書き直しの履歴:${w.versions.map((v, i) => `${i + 1}回目前「${v.text}」`).join(' / ') || 'なし'}
・振り返り:${w.reflection || 'なし'}`;
}

const NG_WORDS = ['ばか', 'バカ', 'きもい', 'キモい', 'うざ', 'しね', '死ね', 'ブス', 'へた', 'きらい', 'むかつく', 'アホ'];
function isHurtful(text) { return hasAny(text || '', NG_WORDS); }
