# دليل الرفع والتشغيل الاحترافي على خوادم Render والتشغيل المحلي (Localhost)

يرجى اتباع هذا الدليل خطوة بخطوة لضمان تشغيل الموقع والسكربت بنجاح 100% وبدون أي أخطاء برمجية (Zero Runtime Errors).

---

## 📁 1. هيكل المجلدات والملفات (Folder Structure) على جهازك الشخصي

عند نسخ المشروع وتشغيله محلياً، تأكد من وضع الملفات بالتنظيم التالي تماماً:

```text
x-downloader-bento/
├── .env.example
├── Aptfile
├── package.json
├── render.yaml
├── server.ts
├── tsconfig.json
├── vite.config.ts
├── index.html
├── bin/
│   └── yt-dlp         # (يتم تحميله تلقائياً بواسطة السيرفر عند أول تشغيل)
├── data/
│   └── db.json        # (قاعدة البيانات المحلية - يتم إنشاؤها تلقائياً)
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── types.ts
    └── components/
        └── SetupInstructions.tsx
```

---

## 📦 2. كود ملف `package.json` كاملاً

الملف يحتوي على إعدادات البناء المخصصة لتحويل كود TypeScript إلى كود Node.js متوافق ومضغوط داخل مجلد `dist/` لضمان أقصى سرعة استجابة.

```json
{
  "name": "x-downloader-bento",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "bcryptjs": "^3.0.3",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.3",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "vite": "^6.2.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2"
  }
}
```

---

## 🛠️ 3. تثبيت أداة `yt-dlp` و اعتماديّة `ffmpeg` على جهازك الشخصي

تحتاج هذه الأدوات محلياً لدمج جودات الفيديو مع الصوت بشكل كامل وصحيح:

###  نظام تشغيل Mac (macOS)
أسهل وأسرع طريقة هي استخدام مدير الحزم **Homebrew**:
1. افتح الـ Terminal واكتب الأوامر التالية:
   ```bash
   # تثبيت ffmpeg لدمج الصوت والصورة
   brew install ffmpeg

   # تثبيت python (مطلوب لعمل yt-dlp)
   brew install python
   ```

### ❖ نظام تشغيل Windows
1. قم بتحميل **FFmpeg**:
   - توجه للموقع الرسمي: [ffmpeg.org](https://ffmpeg.org/download.html) أو حمله مباشرة برابط مسبق الإعداد: [Gyan.dev FFmpeg Build](https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-full.7z).
   - فك الضغط وانقل المجلد إلى القرص الـ `C:` (مثال: `C:\ffmpeg`).
   - أضف مسار الـ `bin` (أي `C:\ffmpeg\bin`) إلى متغيرات البيئة للنظام (System Environment Variables - PATH).
2. قم بتحميل وتثبيت **Python**:
   - من متجر Windows أو الموقع الرسمي [python.org](https://www.python.org/downloads/)، وتأكد من تفعيل خيار **"Add Python to PATH"** أثناء التثبيت.

---

## 🚀 4. تشغيل المشروع محلياً (Localhost) لأول مرة

افتح مجلد المشروع في الـ Terminal على جهازك واكتب الأوامر التالية بالترتيب:

```bash
# 1. تثبيت جميع المكتبات والاعتمادات
npm install

# 2. تشغيل السيرفر في وضع التطوير النشط (Dev Mode)
npm run dev
```
سيظهر لك السيرفر يعمل مباشرة على الرابط: `http://localhost:3000`.

---

## ☁️ 5. دليل الرفع المالي المجاني على منصة Render

بفضل ملف **`Aptfile`** وملف الإعدادات المدمج **`render.yaml`**، سيقوم Render بتثبيت Python و ffmpeg تلقائياً.

### 📤 أولاً: رفع كود المشروع إلى مستودع GitHub الخاص بك
افتح مجلد المشروع في الـ Terminal على جهازك واكتب الأوامر التالية بدقة:

```bash
# 1. تهيئة مستودع Git محلي
git init

# 2. إضافة جميع الملفات للمستودع
git add .

# 3. حفظ التغييرات محلياً مع كتابة رسالة توضيحية
git commit -m "feat: initial commit with auth and bento design"

# 4. تعيين الفرع الرئيسي كـ main
git branch -M main

# 5. ربط المستودع المحلي بالمستودع البعيد على GitHub 
# (استبدل الرابط أدناه برابط مستودعك الفعلي)
git remote add origin https://github.com/USERNAME/REPO-NAME.git

# 6. دفع الكود إلى GitHub
git push -u origin main
```

---

### 🌐 ثانياً: ربط مستودع GitHub بمنصة Render وتفعيله بضغطة واحدة

1. قم بزيارة موقع [Render.com](https://render.com) وسجل الدخول باستخدام حساب GitHub الخاص بك.
2. في لوحة التحكم (Dashboard)، اضغط على زر **New +** ثم اختر **Web Service**.
3. اختر خيار **Build and deploy from a Git repository** ثم اضغط على مستودع مشروعك المرفوع حديثاً لربطه.
4. قم بضبط الإعدادات في الصفحة كالتالي:
   - **Name**: `x-downloader-bento`
   - **Region**: اختر أقرب منطقة لك (مثال: `Frankfurt (EU)`)
   - **Branch**: `main`
   - **Language**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. **إضافة الـ Buildpacks لتثبيت Ffmpeg و Python تلقائياً**:
   - اسحب لأسفل حتى تصل لقسم **Settings** في السيرفر.
   - ابحث عن **Buildpacks** واضغط **Add Buildpack**.
   - أضف رابط الـ Buildpack الخاص بـ APT لتشغيل ملف الـ `Aptfile`:
     ```text
     https://github.com/render-examples/apt-buildpack.git
     ```
   - اضغط حفظ، ثم تأكد من وجود الـ Buildpack القياسي للـ Node أيضاً.
6. **إضافة متغيرات البيئة (Environment Variables)**:
   - توجه لقسم **Environment** وأضف المتغيرات التالية:
     - `JWT_SECRET`: (اكتب أي كلمة سر عشوائية قوية لحماية حسابات المستخدمين)
     - `NODE_ENV`: `production`
7. اضغط على **Deploy Web Service** في أسفل الصفحة لتبدأ عملية البناء والتشغيل التلقائي! سيصبح موقعك متاحاً على الإنترنت مجاناً بالكامل بظرف دقيقتين.
