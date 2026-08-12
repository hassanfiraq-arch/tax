// sw.js - Service Worker لتطبيق حاسبة ضريبة الدخل العراقي
// برمجة: سهاد هادي | suhad.albakri@gmail.com

const CACHE_NAME = 'tax-calculator-iraq-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap'
];

// حدث التثبيت: تخزين الملفات في الكاش مسبقاً
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] تثبيت وتخزين الملفات في الكاش...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// حدث التفعيل: حذف النسخ القديمة من الكاش
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] حذف كاش قديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// حدث الجلب: استخدام الكاش عند انعدام الاتصال (Offline First)
self.addEventListener('fetch', (event) => {
    // تجاهل الطلبات غير HTTP/HTTPS
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            // محاولة الجلب من الشبكة وتخزينه
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // في حالة فشل كل شيء، إعادة الصفحة الرئيسية
                return caches.match('./index.html');
            });
        })
    );
});
