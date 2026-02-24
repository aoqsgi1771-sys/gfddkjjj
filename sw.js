// تعريف اسم للإصدار لتسهيل تغييره مستقبلاً
const CACHEB_NAME = 'gfdd-store-v2';

// قائمة الملفات التي نريد تخزينها
const FILES_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js', // تنبيه: تأكد أن اسم الملف لديك هو script.js وليس script.jsvv
    './manifest.json'
];

// 1. حدث التثبيت (Install)
self.addEventListener('install', (e) => {
    // إجبار Service Worker الجديد على العمل فوراً دون انتظار
    self.skipWaiting();
    
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );
});

// 2. حدث التفعيل (Activate) - وظيفته مسح الإصدارات القديمة
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // إذا كان اسم المخزن القديم لا يطابق الاسم الجديد، قم بحذفه
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    // السيطرة على الصفحات المفتوحة وتحديثها فوراً
    return self.clients.claim();
});

// 3. حدث الجلب (Fetch) - استراتيجية "الشبكة أولاً"
self.addEventListener('fetch', (e) => {
    e.respondWith(
        // محاولة جلب الملف من الإنترنت أولاً للحصول على أحدث التعديلات
        fetch(e.request).catch(() => {
            // في حال عدم وجود إنترنت، يتم جلب الملف من التخزين المؤقت
            return caches.match(e.request);
        })
    );
});
