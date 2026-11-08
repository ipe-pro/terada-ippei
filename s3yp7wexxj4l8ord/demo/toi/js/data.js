// データの保存と見本データ
const STORE_KEY = 'toiCompass.v1';

function uid(p) { return p + Math.random().toString(36).slice(2, 9); }

function sampleData() {
  const now = Date.now();
  const min = 60 * 1000;
  const domains = [
    { id: 'd1', name: '工場での生産', color: '#e07a5f', keywords: '工場,組み立て,ライン,ロボット,作業,溶接,塗装,検査' },
    { id: 'd2', name: '関連工場と部品', color: '#3d85c6', keywords: '関連工場,部品,シート,タイヤ,ジャストインタイム,協力' },
    { id: 'd3', name: '輸送と販売', color: '#6aa84f', keywords: '輸送,キャリアカー,船,港,販売,消費者,海外,輸出' },
    { id: 'd4', name: 'これからの自動車', color: '#a64d79', keywords: '環境,安全,電気自動車,ハイブリッド,リサイクル,福祉,自動運転' },
  ];
  const students = [
    { id: 's1', no: 1, nick: 'さくら', domainId: 'd1' },
    { id: 's2', no: 2, nick: 'はると', domainId: 'd1' },
    { id: 's3', no: 3, nick: 'ゆい', domainId: 'd2' },
    { id: 's4', no: 4, nick: 'そうた', domainId: 'd2' },
    { id: 's5', no: 5, nick: 'りん', domainId: 'd3' },
    { id: 's6', no: 6, nick: 'かいと', domainId: 'd3' },
    { id: 's7', no: 7, nick: 'みお', domainId: 'd4' },
    { id: 's8', no: 8, nick: 'ひなた', domainId: null },
  ];
  const card = (id, sid, text, source, x, y, domainId, ago) =>
    ({ id, studentId: sid, text, source, x, y, domainId, createdAt: now - ago * min });
  const cards = [
    card('c1', 's1', '組み立てラインで1台ずつ順番に部品を取りつけている', '教科書 p.84 写真', 40, 40, 'd1', 50),
    card('c2', 's2', '危ない作業や重い作業はロボットがしている', '教科書 p.85', 60, 190, 'd1', 48),
    card('c3', 's3', 'シートやタイヤは関連工場でつくられている', '資料集 p.42 図', 330, 60, 'd2', 47),
    card('c4', 's4', '部品は必要なときに必要な数だけ届く', '教科書 p.87', 340, 220, 'd2', 45),
    card('c5', 's5', 'キャリアカーや船で全国や海外へ運ぶ', '教科書 p.90 地図', 640, 50, 'd3', 44),
    card('c6', 's6', '工場は海の近くに多い', '資料集 p.43 地図', 650, 210, 'd3', 40),
    card('c7', 's7', '電気自動車など環境にやさしい車をつくっている', '教科書 p.92', 900, 120, 'd4', 38),
    card('c8', 's1', '検査で1台ずつブレーキなどを確かめる', '教科書 p.85', 120, 330, 'd1', 30),
  ];
  const links = [
    { id: 'l1', from: 'c1', to: 'c3', label: 'だから', studentId: 's3' },
    { id: 'l2', from: 'c5', to: 'c6', label: 'つながり', studentId: 's6' },
  ];
  const work = {};
  students.forEach(s => {
    work[s.id] = { notes: '', reading: '', readingDone: false, summary: '', versions: [], reflection: '', published: false, lastActive: now - 60 * min };
  });
  Object.assign(work.s1, {
    notes: '組み立て工場では、ラインの上を車が少しずつ動き、それぞれの持ち場で部品を取りつけている。1台の車に約3万個の部品が使われている。',
    reading: '教科書のグラフを見ると、1990年ごろから生産台数はあまり変わっていない。',
    readingDone: true,
    summary: '自動車工場では、ラインで順番に組み立てていて、ロボットも使っている。検査もしている。',
    versions: [{ text: '自動車工場ではラインで組み立てている。', at: now - 20 * min }],
    lastActive: now - 3 * min,
  });
  Object.assign(work.s3, {
    notes: '関連工場は組み立て工場の近くに集まっている。時間に合わせて部品を届けるので、工場の近くにあると便利だから。',
    reading: '地図を見ると、関連工場は組み立て工場のまわりに集まっている。',
    readingDone: true,
    lastActive: now - 6 * min,
  });
  Object.assign(work.s5, {
    notes: 'できた自動車はキャリアカーで近くの販売店へ、遠い地域や海外へは船で運ぶ。港の近くに工場があると運びやすい。',
    lastActive: now - 2 * min,
  });
  Object.assign(work.s6, { notes: '海外への輸出は船で運ぶ。', lastActive: now - 25 * min });
  Object.assign(work.s7, {
    notes: '電気自動車は走るときに二酸化炭素を出さない。消費者の「環境にやさしい車がほしい」という願いにこたえている。',
    summary: 'これからの自動車は、環境や安全に気をつけてつくられている。教科書p.92の資料から、電気自動車やハイブリッド車がふえていることが分かる。わたしたちの生活でも、家の車を買いかえるときに環境のことを考える人が多いと思う。',
    versions: [{ text: 'これからの自動車は、環境や安全に気をつけてつくられている。', at: now - 15 * min }],
    reflection: 'はじめは事実を書くだけだったけど、資料をもとに書き直したら説得力が出た。',
    published: true,
    lastActive: now - 1 * min,
  });

  return {
    version: 1,
    unit: {
      grade: '5年',
      title: '自動車をつくる工業',
      question: '自動車工業にかかわる人々は、どのようにして消費者の願いにこたえる自動車をつくっているのだろう。',
      goal: '問いに対する自分の考えを、資料を根拠にしてまとめ、友達と伝え合う。',
      aim: '自動車工業の生産の工夫や努力、関連工場とのつながり、輸送や販売のしくみを関連づけて、工業生産が国民生活を支えていることを考え、表現する。',
      criteria: {
        chishiki: { A: '複数の資料から必要な情報を読み取り、生産の工夫や関連工場とのつながりを正しく理解している。', B: '資料から必要な情報を読み取り、自動車の生産の工夫を理解している。' },
        shiko: { A: '複数の領域の事実を関連づけ、資料を根拠にして、生産の工夫が人々の願いにこたえていることを自分の言葉で表現している。', B: '資料を根拠にして、自動車の生産の工夫について自分の考えを表現している。' },
        taido: { A: '友達の考えや声かけを生かして、自分の考えを粘り強く見直し、学習の調整をしている。', B: '自動車の生産について、問いの解決に向けて意欲的に調べている。' },
      },
      criteriaNote: '',
      materials: ['教科書 p.80〜93', '資料集 p.40〜45', '工場見学の動画', '自動車会社のパンフレット'],
      domains,
    },
    settings: {
      stage: 'research',
      showGrade: false,
      freeComment: false,
      publishScope: 'class',
      coachLimit: 8,
      peekUntil: 0,
    },
    students,
    cards,
    links,
    work,
    reactions: [
      { id: 'r1', from: 's5', to: 's3', domainId: 'd2', stamp: 'つながりそう', comment: '近くにあると運びやすい', at: now - 10 * min, flagged: false },
      { id: 'r2', from: 's1', to: 's7', domainId: 'd4', stamp: 'なるほど', comment: '', at: now - 5 * min, flagged: false },
    ],
    peeks: [
      { studentId: 's5', domainId: 'd2', at: now - 11 * min },
      { studentId: 's1', domainId: 'd4', at: now - 6 * min },
      { studentId: 's1', domainId: 'd3', at: now - 5 * min },
    ],
    coachLog: [],
    evals: {},
  };
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && s.version === 1) return s;
  } catch (e) { /* 読めないときは見本から */ }
  return sampleData();
}

function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* 保存できない環境 */ }
}
