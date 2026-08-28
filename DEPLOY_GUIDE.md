# UNITPULSE Deployment & Maintenance Guide
**Unit**: `55 Fd Amb (10 Inf Div)`

---

## ১. ডেপ্লয় হওয়ার পর কোনো পরিবর্তন (Update/Change) করতে চাইলে কী করবেন?

খুবই সহজ! আপনি যখনই কোনো পরিবর্তন করবেন, নিচের নিয়মে লাইভ অ্যাপ স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে:

### পদ্ধতি ১: GitHub দিয়ে অটোমেটিক আপডেট (সবচেয়ে সুবিধাজনক ও নিরাপদ)
1. আপনার কোডে যা পরিবর্তন করার করবেন (যেমন নতুন ফিচার, লেখা পরিবর্তন বা নতুন কোনো নিয়ম)।
2. টার্মিনালে মাত্র ৩টি কমান্ড দিন:
   ```bash
   git add .
   git commit -m "Updated leave rules"
   git push origin main
   ```
3. **ব্যাস, আপনার কাজ শেষ!**
   - Vercel / Render স্বয়ংক্রিয়ভাবে গিটহাবে নতুন কোড পেয়ে ১-২ মিনিটের মধ্যে লাইভ অ্যাপ আপডেট করে দেবে।
   - **সবচেয়ে বড় বিষয়:** ডাটাবেজে থাকা কোনো ডাটা (Personnel, Duties, Leave records) মোটেও ডিলিট হবে না; সব ১০০% অক্ষত থাকবে।

### পদ্ধতি ২: লোকাল ইউনিট সার্ভার / কম্পিউটারে আপডেট
যদি অ্যাপটি আপনার ইউনিটের কম্পিউটারে রান করা থাকে:
1. নতুন কোড ফোল্ডারে পেস্ট করুন বা `git pull` দিন।
2. কমান্ড চালান:
   ```bash
   npm run build:client
   ```
3. সার্ভার রিস্টার্ট করুন।

---

## ২. রিয়েল-টাইম ক্লাউড ডেপ্লয়মেন্টের সহজ গাইড (Render / Vercel)

### ধাপ ১: GitHub-এ আপলোড
```bash
git init
git add .
git commit -m "UnitPulse initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/unitpulse.git
git push -u origin main
```

### ধাপ ২: Render-এ All-in-One ডেপ্লয় (Frontend + Backend + Persistent DB)
1. [Render.com](https://render.com)-এ ফ্রি একাউন্ট খুলুন।
2. **New +** -> **Web Service** ক্লিক করুন।
3. আপনার GitHub repository সিলেক্ট করুন।
4. সেটিংস:
   - **Name**: `unitpulse-55fdamb`
   - **Build Command**: `npm install && npm run build:client`
   - **Start Command**: `npm run start:server`
5. **Create Web Service**-এ ক্লিক করুন। ২ মিনিটে আপনার লাইভ লিংক তৈরি হয়ে যাবে!
