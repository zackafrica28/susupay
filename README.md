# SusuPay v3.0 — Community Savings App
### Web · Android (PWA) · iOS (PWA) · Firebase Live

---

## 📁 Project Structure
```
susupay/
├── package.json          ← Dependencies
├── vite.config.js        ← Vite + PWA config
├── vercel.json           ← Vercel SPA routing
├── index.html            ← PWA meta tags (iOS + Android)
├── public/
│   ├── manifest.json     ← PWA manifest
│   ├── icon-192.png      ← App icon (ADD YOUR OWN)
│   └── icon-512.png      ← App icon large (ADD YOUR OWN)
└── src/
    ├── main.jsx          ← React entry
    └── App.jsx           ← Full SusuPay app
```

---

## 🚀 Deploy to Vercel (3 steps)

### Step 1 — Install & test locally
```bash
npm install
npm run dev
# Visit http://localhost:5173
```

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "SusuPay v3.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/susupay.git
git push -u origin main
```

### Step 3 — Deploy on Vercel
1. Go to https://vercel.com → **New Project**
2. Import your GitHub repo
3. Framework: **Other** (Vite handles it)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add Environment Variables (see below)
7. Click **Deploy** ✅

---

## 🔐 Environment Variables (Vercel Dashboard)
Add these in Vercel → Settings → Environment Variables:

```
VITE_FB_API_KEY             = AIzaSyBgB2NLmL7e-8rQvrwbsJnNt7dgwUqhyKM
VITE_FB_AUTH_DOMAIN         = reliable-susu-bank.firebaseapp.com
VITE_FB_PROJECT_ID          = reliable-susu-bank
VITE_FB_STORAGE_BUCKET      = reliable-susu-bank.firebasestorage.app
VITE_FB_MESSAGING_SENDER_ID = 1014672607615
VITE_FB_APP_ID              = 1:1014672607615:web:9ce6789a907a3670a1f24a
VITE_FB_MEASUREMENT_ID      = G-RHQKLP2H5T
```

---

## 📱 Install as App (PWA)

### Android (Chrome)
1. Open your Vercel URL in Chrome
2. Tap the **⋮** menu → **Add to Home screen**
3. Tap **Add** — SusuPay appears on your home screen
4. Works fully offline after first load

### iOS (Safari)
1. Open your Vercel URL in Safari
2. Tap the **Share** button (box with arrow)
3. Scroll down → **Add to Home Screen**
4. Tap **Add** — SusuPay appears on your home screen

---

## 🔥 Firebase Firestore Rules
Paste these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chats/{groupId}/messages/{msgId} {
      allow read: if true;
      allow write: if request.resource.data.keys().hasAll(['user','text','createdAt']);
    }
  }
}
```

---

## 🖼️ App Icons (Required for PWA)
Create two square PNG icons and place in `public/`:
- `icon-192.png` — 192×192px (the gold "S" SusuPay logo)
- `icon-512.png` — 512×512px (same, larger)

You can use Canva, Figma, or any image editor.
Background: **#FFD700** (gold yellow)
Text/symbol: **S** or your logo in dark brown **#8B6500**

---

## 💰 Group Structure

| Cycle    | Members | Daily Pay  | Payout Schedule              |
|----------|---------|------------|------------------------------|
| 1 Week   | 7       | ₵45/75/100 | Daily (7 payouts)            |
| 2 Weeks  | 4       | ₵45/75/100 | Weekly (2 payouts)           |
| **1 Month**  | **4** | **₵45/75/100** | **Weekly (4 payouts)**   |
| 3 Months | 6       | ₵45/75/100 | Monthly (3 payouts)          |
| 4 Months | 8       | ₵45/75/100 | Monthly (4 payouts)          |
| **8 Months** | **8** | **₵45/75/100** | **Monthly (8 payouts)**  |
| **1 Year**   | **12** | **₵45/75/100** | **Monthly (12 payouts)** |

**Payout formula:** `dailyAmount × payoutPeriodDays × memberCount`

Example — 1 Month Gold (₵100/day):
- Each member pays: ₵100 × 7 days = ₵700/week
- Group weekly pot: ₵700 × 4 members = **₵2,800 payout**
- Rotates through all 4 members over 4 weeks

---

## 📱 SMS Offline Contribution
**Unlocks 9 months after app launch (January 2027)**

Format: `PAY [GROUPID] [AMOUNT] [ADMINPHONE]`
Send to shortcode: **1234**

Connect to Africa's Talking or Twilio for production SMS handling.

---

## 🤖 Claude AI Advisor
The AI Savings Advisor uses Anthropic's Claude API.
Works automatically — no additional API key needed in the app
(Claude API is called from the Anthropic endpoint).

---

## 📞 Admin Contact
**Kwame Mensah** — SusuPay Admin
📱 **0548298039** (MTN MoMo · Airtel · Vodafone Cash)
💰 All group contributions paid to this number
