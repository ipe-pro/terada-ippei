// Service Worker(ビルドのときに vite.config.js が、保存の名前とファイルの一覧を入れて sw.js を作る)
//   ・最初に全部のファイルを保存 → 2回目からは保存したものをすぐ出す(回線が遅くても即起動・オフラインでも開ける)
//   ・新しい版は裏で保存しておき、アプリが「更新する」を押したら切り替える(勝手には切り替えない)
const CACHE = 'gks-0.23.0-4e98dd4ed0';
const ASSETS = ["./","./assets/pink-hmm-CDHcBjQY.png","./assets/pink-laugh-DwfSXk-E.png","./assets/blue-wave-BUn9XdNK.png","./assets/blue-happy-CfcXYpDD.png","./assets/pink-surprise-BdJXf54C.png","./assets/pink-please-CVewCbHN.png","./assets/title-demo-aYXuj_u2.png","./assets/demo-template-C7_nb85Y.xlsx","./assets/index-0CIcruam.css","./assets/index-DP1xUUGs.js","./assets/SnapshotDataSource-DyoemM8H.js","./assets/FolderDataSource-BrI3MCj4.js","./assets/exportLetter-CLMGU05J.js","./assets/drives-CSTVK2AT.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];

self.addEventListener('install', (e) => {
  // ブラウザの一時保存(HTTP キャッシュ)を使わず、必ずサーバーから取り直す(古い index.html を保存しないため)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gks-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // ほかのサイト(本番の Microsoft Graph など)はそのまま
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then((c) => c.match('./')).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(
    caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))),
  );
});
