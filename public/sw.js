// G-progress Service Worker
const CACHE_NAME = 'g-progress-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
]

// インストール時にキャッシュを作成
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
  )
})

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// フェッチ時にキャッシュを利用（Network First戦略）
self.addEventListener('fetch', (event) => {
  // Cache APIはGETとHEADリクエストのみサポート
  // PATCH, POST, DELETE等のメソッドや、chrome-extension等のスキームはスキップ
  const request = event.request
  const isHttpRequest = request.url.startsWith('http://') || request.url.startsWith('https://')
  const isGetOrHead = request.method === 'GET' || request.method === 'HEAD'

  if (!isHttpRequest || !isGetOrHead) {
    // キャッシュ不可能なリクエストはそのまま通す
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // レスポンスをクローンしてキャッシュに保存
        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache)
        })
        return response
      })
      .catch(() => {
        // ネットワークが利用できない場合はキャッシュから取得
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // キャッシュにも無い場合はオフラインページを表示
          return caches.match('/index.html')
        })
      })
  )
})

// プッシュ通知のサポート（将来の拡張用）
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'G-progressから新しい通知があります',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'g-progress-notification',
    requireInteraction: false
  }

  event.waitUntil(
    self.registration.showNotification('G-progress', options)
  )
})

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/')
  )
})
