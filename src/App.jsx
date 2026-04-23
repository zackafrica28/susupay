// ═══════════════════════════════════════════════════════════════════════════
//  SusuPay v3.0 | Built for Africa | Web · Android · iOS
//  Admin: Kwame Mensah | 📞 0548298039
//  Vercel-ready · Firebase-live · PWA-installable
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react"
import { initializeApp, getApps }        from "firebase/app"
import { getAnalytics }                  from "firebase/analytics"
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit as fsLimit } from "firebase/firestore"

// ── Firebase ──────────────────────────────────────────────────────────────
const FB = {
  apiKey:            import.meta.env.VITE_FB_API_KEY            || "AIzaSyBgB2NLmL7e-8rQvrwbsJnNt7dgwUqhyKM",
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN        || "reliable-susu-bank.firebaseapp.com",
  projectId:         import.meta.env.VITE_FB_PROJECT_ID         || "reliable-susu-bank",
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET     || "reliable-susu-bank.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID|| "1014672607615",
  appId:             import.meta.env.VITE_FB_APP_ID             || "1:1014672607615:web:9ce6789a907a3670a1f24a",
  measurementId:     import.meta.env.VITE_FB_MEASUREMENT_ID     || "G-RHQKLP2H5T",
}
const fbApp = getApps().length ? getApps()[0] : initializeApp(FB)
try { getAnalytics(fbApp) } catch (_) {}
const db = getFirestore(fbApp)

// ── Admin ──────────────────────────────────────────────────────────────────
const ADMIN      = "Kwame Mensah"
const PHONE      = "0548298039"
const AID        = "u1"
const LAUNCH     = new Date("2026-04-01")
const SMS_DATE   = new Date(LAUNCH.getTime() + 9 * 30 * 24 * 3600 * 1000)  // 9 months after launch
const smsLeft    = () => Math.max(0, Math.ceil((SMS_DATE - new Date()) / 864e5))
const smsReady   = () => new Date() >= SMS_DATE

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtN  = n  => `₵ ${Number(n).toLocaleString()}`
const genId = () => Math.random().toString(36).slice(2, 9)
const toDate = () => new Date().toISOString().slice(0, 10)
const tsNow  = () => { const d=new Date(); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0") }

// ── Price tiers ────────────────────────────────────────────────────────────
const TIERS = [
  { daily: 45,  grade: "Bronze", emoji: "🥉", color: "#8B6914" },
  { daily: 75,  grade: "Silver", emoji: "🥈", color: "#607D8B" },
  { daily: 100, grade: "Gold",   emoji: "🥇", color: "#B8860B" },
]

// ── CYCLE CONFIG ────────────────────────────────────────────────────────────
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │  1 Month  = 4 members  · COLLECT every 7 days (4 weekly payouts)   │
//   │  4 Months = 4 members  · COLLECT every 30 days (4 monthly payouts) │
//   │  8 Months = 8 members  · COLLECT every 30 days (8 monthly payouts) │
//   │  1 Year   = 12 members · COLLECT every 30 days (12 monthly payouts)│
//   └─────────────────────────────────────────────────────────────────────┘
//   Payout = dailyAmt × payoutPeriodDays × memberCount
const CYCLES = [
  { id:"1m", label:"1 Month",   badge:"🌕", color:"#C8900A", n:4,  payDays:7,  cycleDays:30,  freq:"Weekly",  freqLabel:"every 7 days",   desc:"4 members · Pay daily · One member COLLECTs every 7 days" },
  { id:"4m", label:"4 Months",  badge:"⭐", color:"#A06800", n:4,  payDays:30, cycleDays:120, freq:"Monthly", freqLabel:"end of month",   desc:"4 members · Pay daily · One member COLLECTs at month end" },
  { id:"8m", label:"8 Months",  badge:"🌟", color:"#906000", n:8,  payDays:30, cycleDays:240, freq:"Monthly", freqLabel:"end of month",   desc:"8 members · Pay daily · One member COLLECTs at month end" },
  { id:"1y", label:"1 Year",    badge:"👑", color:"#7A5000", n:12, payDays:30, cycleDays:365, freq:"Monthly", freqLabel:"end of month",   desc:"12 members · Pay daily · One member COLLECTs at month end" },
]
const getC     = id => CYCLES.find(c => c.id === id) || CYCLES[0]
const calcPay  = (daily, cy) => daily * cy.payDays * cy.n
const calcTotal= (daily, cy) => daily * cy.cycleDays * cy.n

// ── Plans ──────────────────────────────────────────────────────────────────
const PLANS = [
  { id:"free",     name:"Free",            price:0,    limit:11,  msgs:4,  badge:"🆓", color:"#8B6500" },
  { id:"starter",  name:"Starter",         price:438,  limit:15,  msgs:20, badge:"🌱", color:"#1A6E38" },
  { id:"growth",   name:"Growth",          price:876,  limit:30,  msgs:20, badge:"🚀", color:"#1A6E38" },
  { id:"premium",  name:"Premium",         price:1752, limit:60,  msgs:20, badge:"💎", color:"#C84A08", pop:true },
  { id:"elite",    name:"Elite",           price:3504, limit:120, msgs:20, badge:"👑", color:"#7B2FBE" },
  { id:"investor", name:"Genuine Investor",price:5100, limit:200, msgs:20, badge:"🏆", color:"#B8860B" },
]
const getPlan = id => PLANS.find(p => p.id === id) || PLANS[0]
const pColor  = id => getPlan(id).color

// ── Member pool ────────────────────────────────────────────────────────────
const POOL = ["Abena","Kofi","Ama","Yaw","Akua","Kweku","Adwoa","Kojo","Efua","Adjoa","Emeka","Ngozi","Chidi","Amara","Obinna","Tunde","Bisi","Femi","Fatima","Moussa","Aminata","Ibrahim","Mariama","Wanjiru","Kamau","Njeri","Mwangi","Akinyi","Alice","Grace","Hannah","David","Esi","Joy","Nana","Ruth","Tina","Yemi","Zara","Ade","Bola","Eze","Fola","Gbenga","Ife","Jide","Kemi","Lola","Musa","Naomi","Ola","Remi","Sola","Tobi","Uche","Vera","Yinka","Afia","Berko","Comfort","Darkoa","Enam","Fiifi","Gifty","Hamid","Irene","Joana","Kwabena","Lydia","Mawuli"]
const mkM = n => { const m=[ADMIN]; for(let i=0;i<n-1;i++) m.push(POOL[i%POOL.length]+(i>=POOL.length?` ${~~(i/POOL.length)+2}`:"")); return m }
const mkC = (mems, paid) => { const c={}; mems.forEach((m,i)=>{ c[m]=i<paid }); return c }

// ── GENERATE 202 GROUPS (monthly cohorts, 3 tiers × 4 cycles = 12/month) ──
// New groups are published each month so new users always have fresh circles
const BUILD_GROUPS = () => {
  const gs = []
  const base = new Date("2026-04-01")
  let cnt = 0

  for (let mo = 0; mo < 18 && cnt < 202; mo++) {
    const d = new Date(base)
    d.setMonth(d.getMonth() + mo)
    const mLabel = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })

    for (const cy of CYCLES) {
      for (const ti of TIERS) {
        if (cnt >= 202) break
        // Demo fill: current month has partial fills, past month is full, future months nearly empty
        const rawFill = mo === 0
          ? Math.min(Math.floor(cy.n * 0.4) + 2, cy.n)
          : mo === 1 ? cy.n
          : Math.floor(Math.random() * 2)
        const filled = Math.min(rawFill, cy.n)
        const paid   = Math.floor(filled * 0.65)
        // Admin (you) has already COLLECTed in current-month groups
        const collectedBy = mo === 0 ? [ADMIN] : []

        gs.push({
          id: `${cy.id}-${ti.daily}-m${mo}`,
          name: `${ti.grade} ${cy.label} Circle`,
          cohort: mLabel,
          cohortNum: mo,
          cycleId: cy.id,
          daily: ti.daily,
          tier: ti,
          payoutAmt: calcPay(ti.daily, cy),
          totalAmt:  calcTotal(ti.daily, cy),
          payFreq:   cy.freq,
          payDays:   cy.payDays,
          payLabel:  cy.freqLabel,
          filled,
          collectedBy,
          adminId: AID,
          isNew: mo === 0,
          round: mo === 0 ? 2 : 1,
          get members()  { return mkM(this.filled || 1) },
          get contribs() { return mkC(this.members, paid) },
        })
        cnt++
      }
    }
  }
  return gs
}

const EXPLORE_GROUPS = BUILD_GROUPS()

// Admin's personal fixed groups
const MY_GROUPS = [
  {
    id:"my1", name:"Accra Weekly Elite", cycleId:"1m", daily:100, tier:TIERS[2],
    payoutAmt:calcPay(100,getC("1m")), totalAmt:calcTotal(100,getC("1m")),
    payFreq:"Weekly", payDays:7, payLabel:"every 7 days",
    filled:4, collectedBy:[ADMIN], cohort:"April 2026", adminId:AID, round:2, isNew:false,
    get members()  { return mkM(4) },
    get contribs() { return mkC(this.members, 3) },
  },
  {
    id:"my2", name:"Kumasi 8-Month Silver", cycleId:"8m", daily:75, tier:TIERS[1],
    payoutAmt:calcPay(75,getC("8m")), totalAmt:calcTotal(75,getC("8m")),
    payFreq:"Monthly", payDays:30, payLabel:"end of month",
    filled:8, collectedBy:[], cohort:"April 2026", adminId:AID, round:1, isNew:false,
    get members()  { return mkM(8) },
    get contribs() { return mkC(this.members, 5) },
  },
]

const INIT_USER = {
  id:AID, name:ADMIN, email:"kwame@susupay.app",
  avatar:"KM", phone:PHONE, currency:"GHS",
  totalSaved:18600, planId:"investor",
}

// ── Claude AI Advisor ──────────────────────────────────────────────────────
async function askClaude(q, userName, joined, planName) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 350,
        system: "You are SusuPay's AI Savings Advisor for African savers. Give practical, warm advice in 2-3 sentences. Reference African savings culture (susu, tontine, esusu). Always be encouraging and specific.",
        messages: [{ role:"user", content:`User: ${userName}, Plan: ${planName}, Groups joined: ${joined}. Question: ${q}` }]
      })
    })
    const d = await r.json()
    return d.content?.[0]?.text || "Keep saving consistently — every cedi brings you closer to your goal! 🌟"
  } catch {
    return "In every great susu circle, consistency is the key. Your daily contributions build life-changing wealth — stay committed! 🌟"
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CSS
// ═══════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --g:#8B6500;--g2:#C8960C;--y:#FFD700;--yb:#FFFBCC;--ym:#FFF5A0;
  --grn:#1A6E38;--grn2:#28A050;--grnbg:#E5F5EC;
  --org:#C84A08;--org2:#E86010;--orgbg:#FFF0E6;
  --pur:#7B2FBE;--txt:#2A1500;--txt2:#5C3A00;--txt3:#8B6500;
  --bd:rgba(200,150,12,.22);--bd2:rgba(200,150,12,.45);--bd3:rgba(200,150,12,.75);
  --sh:0 5px 20px rgba(139,100,0,.14);--sh2:0 12px 40px rgba(139,100,0,.22);
  --r:12px;--t:.18s;
}
html,body,#root{height:100%;background:var(--yb);color:var(--txt);font-family:'DM Sans',sans-serif;font-size:14px;overflow-x:hidden;-webkit-font-smoothing:antialiased}
.serif{font-family:'Playfair Display',serif}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--ym)}
::-webkit-scrollbar-thumb{background:var(--g2);border-radius:4px}
button{cursor:pointer;font-family:'DM Sans',sans-serif;border:none;transition:var(--t)}
button:active{transform:scale(.97)}

/* ── Shell ── */
.shell{display:flex;height:100vh;overflow:hidden}
.sidebar{width:248px;min-width:248px;background:linear-gradient(180deg,#FFF8DC,#FFE566);border-right:2px solid var(--bd3);display:flex;flex-direction:column;overflow-y:auto;box-shadow:4px 0 18px rgba(139,100,0,.12)}
.main{flex:1;overflow-y:auto;background:var(--yb);position:relative;-webkit-overflow-scrolling:touch}
@media(max-width:720px){.sidebar{display:none}.main{padding-bottom:68px}}

/* ── Bottom nav (mobile) ── */
.bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#FFF8DC,#FFE566);border-top:2px solid var(--bd3);z-index:100;padding:6px 0 env(safe-area-inset-bottom)}
@media(max-width:720px){.bnav{display:flex}}
.bn-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 2px;color:var(--txt3);font-size:10px;font-weight:700;background:none;border:none}
.bn-btn.on{color:var(--g)}
.bn-ico{font-size:20px}
.bn-btn.on .bn-ico{transform:scale(1.12)}

/* ── Sidebar parts ── */
.sb-logo{padding:22px 18px 16px;border-bottom:2px solid var(--bd2);background:linear-gradient(135deg,#FFD700,#FFE566)}
.logo-ico{width:40px;height:40px;background:linear-gradient(135deg,var(--g),var(--org));border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:19px;font-weight:900;color:#fff;box-shadow:0 3px 12px rgba(139,100,0,.38)}
.logo-name{font-family:'Playfair Display',serif;font-size:21px;font-weight:900;color:var(--g)}
.logo-tag{font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-top:1px}
.sb-user{margin:12px;background:rgba(255,255,255,.72);border:1.5px solid var(--bd2);border-radius:var(--r);padding:13px}
.u-av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--g2),var(--org));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#fff;box-shadow:0 2px 8px rgba(139,100,0,.28)}
.u-name{font-weight:700;font-size:13px;color:var(--txt)}
.u-plan{font-size:10px;font-weight:800;margin-top:2px}
.u-stats{display:flex;justify-content:space-between;margin-top:10px;padding-top:9px;border-top:1px solid var(--bd2)}
.usv{font-family:'Playfair Display',serif;font-size:15px;font-weight:800;color:var(--g)}
.usl{font-size:9px;color:var(--txt3);font-weight:600}
.lm-track{background:rgba(200,150,12,.15);border-radius:4px;height:5px;overflow:hidden;margin-top:6px}
.lm-fill{height:100%;border-radius:4px;transition:width .6s}
.nav-sec{padding:7px 10px}
.nav-lbl{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--txt3);padding:8px 10px 5px}
.nav-it{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;cursor:pointer;transition:var(--t);color:var(--txt2);font-size:13px;font-weight:600;background:none;width:100%;text-align:left;-webkit-tap-highlight-color:transparent}
.nav-it:hover{background:rgba(255,215,0,.4);color:var(--g)}
.nav-it.on{background:linear-gradient(135deg,var(--g),var(--org));color:#fff;box-shadow:0 3px 12px rgba(139,100,0,.35)}
.nav-ico{font-size:16px;width:20px;text-align:center}
.nav-badge{margin-left:auto;background:var(--org);color:#fff;font-size:9px;font-weight:800;padding:1px 6px;border-radius:18px}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 18px;border-radius:9px;font-size:13px;font-weight:700;transition:var(--t);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none!important}
.btn:active:not(:disabled){transform:scale(.97)}
.btn-gold{background:linear-gradient(135deg,var(--g),var(--g2));color:#fff;box-shadow:0 4px 14px rgba(139,100,0,.38)}
.btn-gold:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 7px 20px rgba(139,100,0,.46)}
.btn-grn{background:linear-gradient(135deg,var(--grn),var(--grn2));color:#fff;box-shadow:0 4px 14px rgba(26,110,56,.38)}
.btn-grn:hover:not(:disabled){transform:translateY(-1px)}
.btn-org{background:linear-gradient(135deg,var(--org),var(--org2));color:#fff;box-shadow:0 4px 14px rgba(200,74,8,.38)}
.btn-org:hover:not(:disabled){transform:translateY(-1px)}
.btn-out{background:transparent;border:2px solid var(--bd3);color:var(--g);font-weight:700}
.btn-out:hover:not(:disabled){background:rgba(255,215,0,.2)}
.btn-sm{padding:7px 13px;font-size:12px;border-radius:8px}
.btn-xs{padding:5px 9px;font-size:10px;border-radius:7px}

/* ── Page header ── */
.ph{padding:20px 20px 0;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}
@media(min-width:769px){.ph{padding:24px 28px 0}}
.ph-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:800;color:var(--g);line-height:1.15}
@media(min-width:769px){.ph-title{font-size:28px}}
.ph-sub{font-size:12px;color:var(--txt3);font-weight:500;margin-top:3px}

/* ── Stats grid ── */
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:16px 20px}
@media(min-width:560px){.stat-grid{grid-template-columns:repeat(4,1fr)}}
@media(min-width:769px){.stat-grid{padding:18px 28px}}
.stat-c{background:rgba(255,255,255,.9);border:2px solid var(--bd2);border-radius:var(--r);padding:13px;position:relative;overflow:hidden;box-shadow:var(--sh);transition:var(--t)}
.stat-c::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--g),var(--org))}
.stat-c:hover{transform:translateY(-2px);border-color:var(--bd3);box-shadow:var(--sh2)}
.sv{font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:var(--g)}
.sl{font-size:10px;color:var(--txt3);margin-top:3px;text-transform:uppercase;letter-spacing:.05em;font-weight:700}
.sn{font-size:10px;color:var(--grn);margin-top:5px;font-weight:700}
.si{position:absolute;right:12px;top:14px;font-size:20px;opacity:.16}

/* ── Info banners ── */
.info-bar{background:linear-gradient(135deg,rgba(255,215,0,.28),rgba(232,160,20,.18));border:2px solid var(--g2);border-radius:11px;padding:11px 15px;display:flex;align-items:center;gap:11px;flex-wrap:wrap}
.pay-bar{background:linear-gradient(135deg,rgba(26,110,56,.12),rgba(40,160,80,.08));border:2px solid var(--grn);border-radius:11px;padding:11px 14px;display:flex;align-items:center;gap:11px;flex-wrap:wrap}

/* ── Category tabs ── */
.tabs{display:flex;gap:7px;padding:12px 20px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch}
@media(min-width:769px){.tabs{padding:12px 28px 10px}}
.tabs::-webkit-scrollbar{display:none}
.tab-btn{padding:7px 13px;border-radius:24px;border:2px solid var(--bd2);background:rgba(255,255,255,.65);font-size:11.5px;font-weight:700;color:var(--txt2);white-space:nowrap;flex-shrink:0;transition:var(--t);-webkit-tap-highlight-color:transparent}
.tab-btn:hover{border-color:var(--g2)}
.tab-btn.on{background:linear-gradient(135deg,var(--g),var(--org));color:#fff;border-color:transparent;box-shadow:0 3px 12px rgba(139,100,0,.35)}

/* ── Search ── */
.srch-row{display:flex;gap:10px;padding:0 20px 13px}
@media(min-width:769px){.srch-row{padding:0 28px 13px}}
.srch-inp{flex:1;background:rgba(255,255,255,.85);border:1.5px solid var(--bd2);border-radius:10px;padding:10px 14px;color:var(--txt);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:var(--t);-webkit-appearance:none}
.srch-inp:focus{border-color:var(--g2);box-shadow:0 0 0 3px rgba(200,150,12,.15)}

/* ── Groups grid ── */
.grps-grid{display:grid;grid-template-columns:1fr;gap:13px;padding:0 20px 28px}
@media(min-width:460px){.grps-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:769px){.grps-grid{grid-template-columns:repeat(3,1fr);padding:0 28px 32px}}
@media(min-width:1100px){.grps-grid{grid-template-columns:repeat(4,1fr)}}

/* ── Group card ── */
.grp-card{background:linear-gradient(155deg,rgba(255,255,255,.93),rgba(255,248,180,.83));border:2px solid var(--bd2);border-radius:16px;padding:16px;cursor:pointer;transition:var(--t);position:relative;overflow:hidden;box-shadow:var(--sh);-webkit-tap-highlight-color:transparent}
.grp-card:hover{border-color:var(--g2);transform:translateY(-3px);box-shadow:var(--sh2)}
.grp-card:active{transform:scale(.98)}
.grp-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--g),var(--org));opacity:0;transition:var(--t)}
.grp-card:hover::after{opacity:1}
.cy-tag{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;padding:4px 9px;border-radius:18px;margin-bottom:11px;text-transform:uppercase;letter-spacing:.04em}
.grp-name{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--g);margin-bottom:4px}
.cohort-lbl{font-size:10px;color:var(--txt3);font-weight:600;margin-bottom:10px}

/* ── COLLECT badge ── */
.collect-bdg{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(135deg,var(--grn),var(--grn2));color:#fff;font-size:10px;font-weight:800;padding:3px 9px;border-radius:18px;margin-bottom:8px}
@keyframes colPulse{0%,100%{box-shadow:0 0 0 0 rgba(26,110,56,.45)}50%{box-shadow:0 0 0 6px rgba(26,110,56,0)}}
.collect-bdg{animation:colPulse 2.2s infinite}

.daily-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;gap:7px;flex-wrap:wrap}
.daily-amt{font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:var(--g2)}
.payout-chip{background:linear-gradient(135deg,var(--grn),var(--grn2));color:#fff;font-size:10px;font-weight:800;padding:4px 9px;border-radius:18px}
.prog{height:4px;background:rgba(200,150,12,.15);border-radius:3px;margin-top:11px;overflow:hidden}
.prog-f{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--g),var(--org));transition:width .7s}
.grp-foot{display:flex;align-items:center;justify-content:space-between;margin-top:11px;padding-top:10px;border-top:1.5px solid var(--bd)}
.m-stack{display:flex}
.m-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;border:2px solid rgba(255,255,255,.9);margin-left:-5px}
.m-dot:first-child{margin-left:0}
.spots-open{background:linear-gradient(135deg,var(--grn),var(--grn2));color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:18px}
.spots-full{background:linear-gradient(135deg,var(--org),var(--org2));color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:18px}

/* ── Sec cards ── */
.sec-card{background:rgba(255,255,255,.88);border:1.5px solid var(--bd2);border-radius:var(--r);padding:16px;margin-bottom:12px}
.sec-title{font-size:11px;font-weight:800;color:var(--txt3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:13px;display:flex;align-items:center;justify-content:space-between;gap:8px}

/* ── Modals ── */
.overlay{position:fixed;inset:0;background:rgba(80,50,0,.55);backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center;z-index:200;padding:0}
@media(min-width:600px){.overlay{align-items:center;padding:20px}}
.modal{background:linear-gradient(145deg,#FFFDE7,#FFF5A0);border:2px solid var(--bd2);border-radius:18px 18px 0 0;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;padding:20px;position:relative}
@media(min-width:600px){.modal{border-radius:18px;padding:26px;animation:slUp .22s cubic-bezier(.4,0,.2,1)}}
.modal-x{position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:7px;background:rgba(255,215,0,.4);border:1.5px solid var(--bd2);color:var(--g);font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center}
.modal-x:hover{background:var(--g);color:#fff}
.fg{margin-bottom:15px}
.fl{font-size:10.5px;font-weight:800;color:var(--txt3);letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;display:block}
.fi{width:100%;background:rgba(255,255,255,.88);border:1.5px solid var(--bd2);border-radius:9px;padding:10px 13px;color:var(--txt);font-size:13px;font-family:'DM Sans',sans-serif;outline:none;transition:var(--t);-webkit-appearance:none}
.fi:focus{border-color:var(--g2);box-shadow:0 0 0 3px rgba(200,150,12,.16)}

/* ── Members ── */
.mem-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd)}
.mem-row:last-child{border-bottom:none}
.mem-av{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0}
.mem-name{flex:1;font-size:13px;font-weight:600;color:var(--txt)}
.cb-paid{background:var(--grnbg);color:var(--grn);border:1px solid var(--grn);font-size:10px;padding:2px 7px;border-radius:18px;font-weight:800}
.cb-pend{background:var(--orgbg);color:var(--org);border:1px solid var(--org);font-size:10px;padding:2px 7px;border-radius:18px;font-weight:800}

/* ── Timeline ── */
.tl-item{display:flex;gap:10px;padding-bottom:15px;position:relative}
.tl-item::before{content:'';position:absolute;left:11px;top:23px;bottom:0;width:2px;background:var(--bd2)}
.tl-item:last-child::before{display:none}
.tl-dot{width:23px;height:23px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff}

/* ── Chat ── */
.chat-wrap{border:1.5px solid var(--bd2);border-radius:var(--r);overflow:hidden}
.chat-head{padding:11px 14px;background:linear-gradient(135deg,var(--g),var(--org));display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}
.chat-msgs{height:280px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:rgba(255,252,220,.6);-webkit-overflow-scrolling:touch}
@media(min-width:769px){.chat-msgs{height:320px}}
.msg-row{display:flex;gap:7px;align-items:flex-end}
.msg-row.mine{flex-direction:row-reverse}
.msg-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;flex-shrink:0;border:1.5px solid rgba(255,255,255,.6)}
.msg-bub{max-width:76%;padding:8px 11px;border-radius:13px;font-size:12px;line-height:1.5;word-break:break-word}
.msg-bub.other{background:rgba(255,255,255,.92);border:1px solid var(--bd);color:var(--txt);border-bottom-left-radius:3px}
.msg-bub.mine{background:linear-gradient(135deg,var(--g),var(--g2));color:#fff;border-bottom-right-radius:3px}
.msg-bub.admin{background:linear-gradient(135deg,var(--org),var(--org2));color:#fff}
.msg-name{font-size:9px;font-weight:800;margin-bottom:3px;opacity:.7}
.msg-ts{font-size:9px;margin-top:3px;opacity:.45;text-align:right}
.chat-foot{padding:9px 11px;border-top:1px solid var(--bd);background:rgba(255,248,200,.7)}
.chat-inp-row{display:flex;gap:7px;align-items:center}
.chat-inp{flex:1;background:rgba(255,255,255,.92);border:1.5px solid var(--bd2);border-radius:18px;padding:8px 13px;font-size:12px;font-family:'DM Sans',sans-serif;outline:none;transition:var(--t);-webkit-appearance:none}
.chat-inp:focus{border-color:var(--g2)}
.chat-send{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--g),var(--org));border:none;cursor:pointer;color:#fff;font-size:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.chat-send:active{transform:scale(.9)}
.live-dot{width:7px;height:7px;border-radius:50%;background:#4AFA7A;box-shadow:0 0 5px #4AFA7A;animation:lp 1.5s infinite;flex-shrink:0}
@keyframes lp{0%,100%{opacity:1}50%{opacity:.5}}
.fb-live{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:800;color:var(--grn);padding:3px 9px;background:var(--grnbg);border:1px solid var(--grn);border-radius:18px}
.spinner{width:24px;height:24px;border:3px solid var(--bd2);border-top-color:var(--g2);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── Plans ── */
.plans-grid{display:grid;grid-template-columns:1fr;gap:13px;padding:13px 20px 36px}
@media(min-width:480px){.plans-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.plans-grid{grid-template-columns:repeat(3,1fr);padding:13px 28px 36px}}
.plan-card{border-radius:16px;padding:20px;border:2px solid var(--bd2);background:rgba(255,255,255,.9);transition:var(--t);cursor:pointer;position:relative;overflow:hidden}
.plan-card:hover{transform:translateY(-3px);box-shadow:var(--sh2)}
.plan-card.pop{box-shadow:0 0 0 2.5px var(--org),0 10px 32px rgba(200,74,8,.22)}
.cur-chip{position:absolute;top:12px;right:12px;background:linear-gradient(135deg,var(--grn),var(--grn2));color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:18px}
.pop-chip{position:absolute;top:-1px;right:-1px;background:linear-gradient(135deg,var(--org),var(--org2));color:#fff;font-size:9px;font-weight:800;padding:6px 18px;border-radius:0 16px 0 10px}
.plan-perk{display:flex;align-items:flex-start;gap:7px;font-size:12px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.06)}
.plan-perk:last-child{border-bottom:none}

/* ── AI card ── */
.ai-card{background:linear-gradient(145deg,#0D1B2A,#1B2838);border:1.5px solid rgba(139,92,246,.45);border-radius:var(--r);padding:16px;color:#fff}
.ai-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#A78BFA;margin-bottom:10px}
.ai-resp{font-size:13px;line-height:1.75;color:rgba(255,255,255,.88);min-height:44px}
.ai-q-btn{background:rgba(167,139,250,.14);border:1px solid rgba(167,139,250,.35);border-radius:18px;color:#C4B5FD;font-size:10.5px;font-weight:700;padding:4px 10px;cursor:pointer;margin:3px 3px 0 0;font-family:'DM Sans',sans-serif;transition:var(--t)}
.ai-q-btn:hover{background:rgba(167,139,250,.28)}
@keyframes aiDot{0%,80%,100%{transform:scale(.55)}40%{transform:scale(1)}}

/* ── SMS card ── */
.sms-card{background:linear-gradient(145deg,#0F2027,#1A3A4A);border:1.5px solid #00BCD4;border-radius:var(--r);padding:16px;color:#fff;margin-bottom:12px}
.sms-code{font-family:monospace;font-size:13px;background:rgba(0,229,255,.1);border:1px solid #00BCD4;border-radius:7px;padding:9px 12px;color:#00E5FF;word-break:break-all;margin-top:5px}
.cnt-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(255,165,0,.15);border:1.5px solid orange;border-radius:18px;padding:4px 12px;font-size:11px;font-weight:800;color:orange;margin-top:9px}

/* ── Detail tabs ── */
.dtabs{display:flex;gap:7px;margin-bottom:14px;flex-wrap:wrap}
.dtab{padding:7px 14px;border-radius:8px;border:1.5px solid var(--bd2);background:transparent;font-size:12px;font-weight:700;color:var(--txt3);transition:var(--t);font-family:'DM Sans',sans-serif}
.dtab:hover{border-color:var(--g2)}
.dtab.on{background:linear-gradient(135deg,var(--g),var(--org));color:#fff;border-color:transparent}

/* ── Toast ── */
.toast{position:fixed;bottom:76px;left:12px;right:12px;background:linear-gradient(135deg,#FFFDE7,#FFF5A0);border:2px solid var(--g2);border-radius:10px;padding:11px 15px;display:flex;align-items:center;gap:9px;font-size:13px;font-weight:700;z-index:400;color:var(--g);box-shadow:0 6px 24px rgba(139,100,0,.25);animation:slUp .3s}
@media(min-width:600px){.toast{bottom:22px;right:22px;left:auto;max-width:370px}}
@keyframes slUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* ── Empty ── */
.empty{text-align:center;padding:52px 20px}
.empty-ico{font-size:52px;margin-bottom:14px}

/* ── Divider ── */
.div{height:1.5px;background:linear-gradient(90deg,transparent,var(--bd2),transparent);margin:10px 0}
`

// ═══════════════════════════════════════════════════════════════════════════
//  KENTE PATTERN
// ═══════════════════════════════════════════════════════════════════════════
const KentePattern = () => (
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"
    style={{position:"absolute",top:0,left:0,opacity:.05,pointerEvents:"none",zIndex:0}}>
    <defs>
      <pattern id="kp" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect x="0"  y="0"  width="15" height="15" fill="#8B6914"/>
        <rect x="30" y="0"  width="15" height="15" fill="#8B6914"/>
        <rect x="15" y="15" width="15" height="15" fill="#C4822D"/>
        <rect x="45" y="15" width="15" height="15" fill="#C4822D"/>
        <rect x="0"  y="30" width="15" height="15" fill="#2D8040"/>
        <rect x="30" y="30" width="15" height="15" fill="#2D8040"/>
        <rect x="15" y="45" width="15" height="15" fill="#8B6914"/>
        <rect x="45" y="45" width="15" height="15" fill="#8B6914"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#kp)"/>
  </svg>
)

// ═══════════════════════════════════════════════════════════════════════════
//  CHAT ROOM (Firebase live)
// ═══════════════════════════════════════════════════════════════════════════
function ChatRoom({ groupId, groupName, user }) {
  const [msgs, setMsgs]   = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoad]= useState(true)
  const [sent, setSent]   = useState(0)
  const btmRef            = useRef(null)
  const inputRef          = useRef(null)
  const plan              = getPlan(user.planId)
  const rem               = plan.msgs - sent
  const canSend           = rem > 0 && input.trim().length > 0
  const avClr             = n => `hsl(${(n.charCodeAt(0)*37)%360},48%,44%)`

  useEffect(() => {
    const q = query(collection(db,"chats",groupId,"messages"), orderBy("createdAt","asc"), fsLimit(200))
    const unsub = onSnapshot(q, snap => {
      setMsgs(snap.docs.map(d => ({ id:d.id, ...d.data() })))
      setLoad(false)
    }, () => setLoad(false))
    return () => unsub()
  }, [groupId])

  useEffect(() => { btmRef.current?.scrollIntoView({ behavior:"smooth" }) }, [msgs])

  const send = async () => {
    if (!canSend) return
    const text = input.trim()
    setInput(""); setSent(p => p+1); inputRef.current?.focus()
    try {
      await addDoc(collection(db,"chats",groupId,"messages"), {
        user:user.name, userId:user.id, text,
        isAdmin:user.id===AID, planId:user.planId,
        ts:tsNow(), createdAt:serverTimestamp(),
      })
    } catch { setSent(p => p-1) }
  }

  return (
    <div className="chat-wrap">
      <div className="chat-head">
        <div style={{fontWeight:800,color:"#fff",fontSize:13,display:"flex",alignItems:"center",gap:7}}>
          💬 {groupName.slice(0,24)}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div className="fb-live"><div className="live-dot"/>Firebase Live</div>
          <span style={{background:"rgba(255,255,255,.2)",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:18}}>{rem}/{plan.msgs}</span>
        </div>
      </div>
      <div className="chat-msgs">
        {loading && <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:140,gap:10,color:"var(--txt3)"}}>
          <div className="spinner"/><span style={{fontSize:12,fontWeight:600}}>Loading messages…</span>
        </div>}
        {!loading && msgs.length===0 && <div style={{textAlign:"center",color:"var(--txt3)",fontSize:12,padding:"36px 0",fontWeight:600}}>
          <div style={{fontSize:32,marginBottom:8}}>💬</div>Start the conversation!
        </div>}
        {!loading && msgs.map(m => {
          const isMe = m.userId===user.id || m.user===user.name
          return (
            <div key={m.id} className={`msg-row ${isMe?"mine":""}`}>
              {!isMe && <div className="msg-av" style={{background:m.isAdmin?"linear-gradient(135deg,var(--g),var(--org))":avClr(m.user||"?")}}>
                {(m.user||"?").slice(0,2).toUpperCase()}
              </div>}
              <div className={`msg-bub ${isMe?"mine":m.isAdmin?"admin":"other"}`}>
                {!isMe && <div className="msg-name">{m.user}{m.isAdmin&&" 👑"}</div>}
                {m.text}
                <div className="msg-ts">{m.ts||""}</div>
              </div>
              {isMe && <div className="msg-av" style={{background:"linear-gradient(135deg,var(--g),var(--g2))"}}>{user.avatar}</div>}
            </div>
          )
        })}
        <div ref={btmRef}/>
      </div>
      <div className="chat-foot">
        {rem > 0 ? (
          <div className="chat-inp-row">
            <input ref={inputRef} className="chat-inp"
              placeholder={`Message… (${rem} left)`} value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} maxLength={300}/>
            <button className="chat-send" onClick={send} disabled={!canSend}>➤</button>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"7px",fontSize:12,fontWeight:700,borderRadius:7,background:"#FFE5E5",color:"#C00",border:"1px solid #C00"}}>
            ✋ Limit reached ({plan.msgs} msgs). {user.planId==="free"?"Upgrade for more!":"Session ended."}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GROUP CARD
// ═══════════════════════════════════════════════════════════════════════════
function GroupCard({ g, isMem, atLimit, onJoin, onOpen }) {
  const cy     = getC(g.cycleId)
  const spots  = cy.n - g.filled
  const isFull = spots <= 0
  const fp     = Math.round(g.filled / cy.n * 100)
  const hasCollect = g.collectedBy?.length > 0

  return (
    <div className="grp-card" onClick={onOpen}>
      {/* Live / New chip */}
      <div style={{position:"absolute",top:11,right:11}}>
        {g.isNew
          ? <span style={{background:"#28A050",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20}}>NEW</span>
          : <span style={{display:"flex",alignItems:"center",gap:4,background:"rgba(200,50,0,.88)",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20}}>
              <div className="live-dot"/>Live
            </span>}
      </div>

      {/* Cycle tag */}
      <div className="cy-tag" style={{background:`${cy.color}22`,color:cy.color,border:`1.5px solid ${cy.color}44`}}>
        {cy.badge} {cy.label}
      </div>

      <div className="grp-name">{g.name}</div>
      <div className="cohort-lbl">{g.cohort} · {cy.n} members · {cy.freq} payout</div>

      {/* COLLECT badge */}
      {hasCollect && (
        <div className="collect-bdg">✅ COLLECT — {g.collectedBy[0]}</div>
      )}

      {/* Daily amount + payout chip */}
      <div className="daily-row">
        <div>
          <div className="daily-amt">{fmtN(g.daily)}<span style={{fontSize:13,fontWeight:600,color:"var(--txt3)"}}>/day</span></div>
          <div style={{fontSize:10,color:"var(--txt3)",fontWeight:600,marginTop:2}}>{cy.freqLabel}</div>
        </div>
        <div className="payout-chip">→ {fmtN(g.payoutAmt)}</div>
      </div>

      {/* Progress */}
      <div className="prog"><div className="prog-f" style={{width:`${fp}%`}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--txt3)",marginTop:5,fontWeight:700}}>
        <span>{g.filled}/{cy.n} filled</span>
        {isFull ? <span className="spots-full">FULL</span> : <span className="spots-open">🪑 {spots} spots</span>}
      </div>

      {/* Footer */}
      <div className="grp-foot">
        <div className="m-stack">
          {g.members.slice(0,4).map((m,i) => (
            <div key={m} className="m-dot" style={{background:i===0?"linear-gradient(135deg,var(--g),var(--org))":`hsl(${i*50+20},52%,44%)`}}>
              {i===0?"👑":m.slice(0,2).toUpperCase()}
            </div>
          ))}
          {g.filled>4 && <div className="m-dot" style={{background:"var(--g2)",fontSize:8}}>+{g.filled-4}</div>}
        </div>
        {isMem
          ? <span style={{fontSize:11,color:"var(--grn)",fontWeight:800}}>✓ Joined</span>
          : isFull ? <span style={{fontSize:10,color:"var(--org)",fontWeight:800}}>Full</span>
          : atLimit ? <button className="btn btn-xs" style={{background:"var(--pur)",color:"#fff"}} onClick={e=>{e.stopPropagation()}}>↑ Upgrade</button>
          : <button className="btn btn-org btn-xs" onClick={e=>{e.stopPropagation();onJoin(g)}}>Join</button>
        }
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  GROUP DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════
function GroupDetail({ g, user, isMem, onJoin, onClose, onContrib }) {
  const [tab, setTab] = useState("members")
  const cy = getC(g.cycleId)
  const avClr = n => `hsl(${(n.charCodeAt(0)*37)%360},48%,44%)`

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>✕</button>

        {/* Header */}
        <div style={{paddingRight:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:18,marginBottom:9,background:`${cy.color}22`,color:cy.color,border:`1.5px solid ${cy.color}44`}}>
            {cy.badge} {cy.label} · {cy.n} members · {cy.freq} payout
          </div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:"var(--g)",marginBottom:3}}>{g.name}</div>
          <div style={{fontSize:11,color:"var(--txt3)",fontWeight:600,marginBottom:11}}>{g.cohort} · Pay {fmtN(g.daily)}/day → collect {fmtN(g.payoutAmt)} {cy.freqLabel}</div>
          {g.collectedBy?.length>0 && (
            <div className="collect-bdg" style={{marginBottom:11}}>✅ COLLECT — {g.collectedBy.join(", ")}</div>
          )}
        </div>

        {/* Pay banner (for members) */}
        {isMem && (
          <div className="pay-bar" style={{marginBottom:13}}>
            <span style={{fontSize:18}}>📲</span>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:800,color:"var(--txt3)",textTransform:"uppercase",marginBottom:2}}>Daily contribution → Admin</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,color:"var(--g)"}}>📞 {PHONE}</div>
              <div style={{fontSize:10,color:"var(--grn)",fontWeight:700,marginTop:2}}>✓ Confirmed same day · Ref: {g.name}</div>
            </div>
            <div style={{background:"linear-gradient(135deg,var(--grn),var(--grn2))",color:"#fff",padding:"8px 12px",borderRadius:9,fontSize:11,fontWeight:800,textAlign:"center"}}>
              {fmtN(g.daily)}/day<br/><span style={{fontSize:9}}>→ {fmtN(g.payoutAmt)} {cy.freq.toLowerCase()}</span>
            </div>
          </div>
        )}

        {!isMem && (
          <button className="btn btn-org" style={{width:"100%",marginBottom:13,justifyContent:"center"}} onClick={()=>onJoin(g)}>
            🙋 Join Group — {fmtN(g.daily)}/day
          </button>
        )}

        {/* Tabs */}
        <div className="dtabs">
          {["members","payout","chat","sms"].map(t => (
            <button key={t} className={`dtab ${tab===t?"on":""}`} onClick={()=>setTab(t)}>
              {t==="members"?"👥 Members":t==="payout"?`📅 ${cy.freq} Payouts`:t==="chat"?"🔥 Live Chat":"📱 SMS"}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {tab==="members" && (
          <div className="sec-card">
            <div className="sec-title">Members ({g.filled}/{cy.n})</div>
            {g.members.map((m,i) => {
              const hasCollect = g.collectedBy?.includes(m)
              return (
                <div key={m} className="mem-row">
                  <div className="mem-av" style={{background:i===0?"linear-gradient(135deg,var(--g),var(--org))":avClr(m)}}>
                    {i===0?"👑":m.slice(0,2).toUpperCase()}
                  </div>
                  <div className="mem-name">
                    {m}
                    {i===0 && <span style={{fontSize:9,color:"var(--org)",marginLeft:5,fontWeight:800}}>Admin</span>}
                    {m===user.name && i!==0 && <span style={{fontSize:9,color:"var(--g)",marginLeft:5,fontWeight:800}}>You</span>}
                  </div>
                  <span style={{fontSize:10,color:"var(--txt3)",fontWeight:700,marginRight:6}}>#{i+1}</span>
                  {hasCollect
                    ? <span className="collect-bdg" style={{fontSize:9,padding:"2px 7px",animation:"none"}}>✅ COLLECT</span>
                    : g.contribs?.[m]
                      ? <span className="cb-paid">✓ Paid</span>
                      : <span className="cb-pend">⏳ Pending</span>}
                  {user.id===AID && !g.contribs?.[m] && !hasCollect && (
                    <button className="btn btn-xs" style={{background:"linear-gradient(135deg,var(--grn),var(--grn2))",color:"#fff",marginLeft:5,fontSize:9}} onClick={()=>onContrib(g.id,m)}>✓</button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Payout schedule tab */}
        {tab==="payout" && (
          <div className="sec-card">
            <div className="sec-title">{cy.freq} Payout Schedule — {fmtN(g.payoutAmt)} per turn</div>
            <div style={{fontSize:11,color:"var(--txt3)",fontWeight:600,background:"rgba(255,215,0,.2)",padding:"7px 10px",borderRadius:7,marginBottom:13}}>
              💡 Each member collects {fmtN(g.payoutAmt)} on their turn · Pay {fmtN(g.daily)}/day to {PHONE}
            </div>
            {g.members.map((m,i) => {
              const hasCollect = g.collectedBy?.includes(m)
              return (
                <div key={m} className="tl-item">
                  <div className="tl-dot" style={{background:hasCollect?"var(--grn)":i===g.round-1?cy.color:"rgba(200,150,12,.22)",color:hasCollect||i===g.round-1?"#fff":"var(--txt3)"}}>
                    {hasCollect?"✓":i+1}
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--txt)"}}>{m}{i===0&&" 👑"}{m===user.name&&i>0&&" 👤"}</div>
                    <div style={{fontSize:10,color:"var(--txt3)",fontWeight:600,marginTop:2}}>{cy.freq} {i+1} · Pay to {PHONE}</div>
                    {hasCollect
                      ? <span className="collect-bdg" style={{fontSize:10,marginTop:4,display:"inline-flex",animation:"none"}}>✅ COLLECT</span>
                      : <div style={{fontSize:13,fontWeight:800,color:"var(--g)",fontFamily:"'Playfair Display',serif",marginTop:3}}>{fmtN(g.payoutAmt)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Chat tab */}
        {tab==="chat" && (
          isMem
            ? <ChatRoom groupId={g.id} groupName={g.name} user={user}/>
            : <div style={{background:"rgba(255,240,180,.6)",border:"1.5px solid var(--g2)",borderRadius:10,padding:22,textAlign:"center"}}>
                <div style={{fontSize:30,marginBottom:9}}>🔒</div>
                <div style={{fontWeight:800,color:"var(--g)",fontSize:14,marginBottom:6}}>Join to Access Live Chat</div>
                <div style={{fontSize:12,color:"var(--txt2)",marginBottom:13}}>Members-only group chat powered by Firebase</div>
                <button className="btn btn-org btn-sm" onClick={()=>onJoin(g)}>🙋 Join to Chat</button>
              </div>
        )}

        {/* SMS tab */}
        {tab==="sms" && (
          <div className="sms-card">
            <div style={{fontSize:14,fontWeight:800,color:"#00E5FF",marginBottom:7}}>📱 SMS Offline Contribution</div>
            {smsReady() ? (
              <>
                <div style={{fontSize:11,color:"rgba(255,255,255,.75)",marginBottom:12,lineHeight:1.65}}>No internet? Pay your daily contribution via SMS from any phone on any network.</div>
                <div style={{fontSize:10,color:"#00BCD4",fontWeight:800,marginBottom:4,textTransform:"uppercase"}}>SMS Code</div>
                <div className="sms-code">PAY {g.id.toUpperCase()} {g.daily} {PHONE}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:4}}>Send to shortcode: <strong style={{color:"#00E5FF"}}>1234</strong> · All networks</div>
              </>
            ) : (
              <>
                <div style={{fontSize:11,color:"rgba(255,255,255,.75)",marginBottom:12,lineHeight:1.65}}>After 9 months of SusuPay being live, all members can contribute offline via SMS — no internet needed. Works on every African mobile network.</div>
                <div className="cnt-chip">⏳ {smsLeft()} days remaining · Unlocks {SMS_DATE.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</div>
                <div style={{marginTop:14,background:"rgba(0,188,212,.08)",border:"1px solid rgba(0,188,212,.25)",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:"#00BCD4",fontWeight:800,marginBottom:5,textTransform:"uppercase"}}>Format when active</div>
                  <div className="sms-code">PAY {g.id.toUpperCase()} {g.daily} {PHONE}</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PLANS PAGE
// ═══════════════════════════════════════════════════════════════════════════
function PlansPage({ user, onUpgrade }) {
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-title">Membership Plans 💎</div>
          <div className="ph-sub">Pay to {PHONE} · Activates within 2 hours</div>
        </div>
      </div>
      {/* Comparison table */}
      <div style={{padding:"13px 20px 0",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",background:"rgba(255,255,255,.7)",borderRadius:10,overflow:"hidden",border:"1.5px solid var(--bd2)",fontSize:12,minWidth:360}}>
          <thead>
            <tr style={{background:"linear-gradient(135deg,var(--g),var(--org))",color:"#fff"}}>
              {["Plan","Price","Groups","Msgs/session"].map(h => (
                <th key={h} style={{padding:"9px 12px",textAlign:"center",fontWeight:800}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLANS.map((p,i) => (
              <tr key={p.id} style={{background:i%2===0?"rgba(255,249,200,.5)":"rgba(255,255,255,.8)",borderBottom:"1px solid var(--bd)"}}>
                <td style={{padding:"8px 12px",fontWeight:700,color:p.color}}>{p.badge} {p.name}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:800,color:"var(--g)",fontFamily:"'Playfair Display',serif"}}>{p.price===0?"FREE":fmtN(p.price)}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:800,color:"var(--org)"}}>{p.limit}</td>
                <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700}}>{p.msgs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Plan cards */}
      <div className="plans-grid">
        {PLANS.map(p => {
          const isCur = user.planId === p.id
          return (
            <div key={p.id} className={`plan-card ${p.pop?"pop":""}`} style={{border:`2px solid ${p.color}33`}} onClick={()=>!isCur&&onUpgrade(p)}>
              {isCur && <div className="cur-chip">✓ Active</div>}
              {p.pop && !isCur && <div className="pop-chip">POPULAR</div>}
              <div style={{fontSize:32,display:"block",marginBottom:8}}>{p.badge}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:p.color}}>{p.name}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:p.color,margin:"6px 0 2px"}}>{p.price===0?"Free":fmtN(p.price)}</div>
              <div style={{fontSize:10,fontWeight:600,color:"var(--txt3)",marginBottom:10}}>{p.price===0?"No payment needed":"Pay to "+PHONE}</div>
              <div style={{fontSize:13,fontWeight:800,color:p.color,marginBottom:10}}>{p.limit} groups · {p.msgs} msgs/session</div>
              {[`Join up to ${p.limit} savings groups`,`${p.msgs} chat messages per session`,`${p.badge} plan badge in all groups`,"Daily contribution tracking","Firebase real-time sync"].map(perk => (
                <div key={perk} className="plan-perk"><span>✓</span><span style={{color:"var(--txt2)"}}>{perk}</span></div>
              ))}
              {isCur
                ? <div style={{background:"var(--grnbg)",color:"var(--grn)",border:"1.5px solid var(--grn)",borderRadius:8,padding:"9px",textAlign:"center",fontSize:12,fontWeight:800,marginTop:12}}>✓ Current Plan</div>
                : <button className="btn" style={{width:"100%",marginTop:12,background:`linear-gradient(135deg,${p.color},${p.color}cc)`,color:"#fff",justifyContent:"center"}}>
                    {p.price===0?"Start Free":`Upgrade — ${fmtN(p.price)}`}
                  </button>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  AI SAVINGS ADVISOR
// ═══════════════════════════════════════════════════════════════════════════
function AIAdvisor({ user, joinedCount }) {
  const [resp, setResp]   = useState("")
  const [loading, setLoad]= useState(false)
  const plan = getPlan(user.planId)
  const QS = [
    "Which group should I join first?",
    "Is ₵45/day or ₵100/day better?",
    "Weekly vs monthly payouts — which is better?",
    "How do I get friends to join my circle?",
    "What if I miss a daily payment?",
  ]
  const ask = useCallback(async q => {
    setLoad(true); setResp("")
    const r = await askClaude(q, user.name, joinedCount, plan.name)
    setResp(r); setLoad(false)
  }, [user.name, joinedCount, plan.name])

  return (
    <div style={{padding:"14px 20px"}}>
      <div className="ph">
        <div>
          <div className="ph-title">AI Savings Advisor 🤖</div>
          <div className="ph-sub">Powered by Claude · Personalised African savings advice</div>
        </div>
      </div>
      <div style={{paddingTop:14}}>
        <div className="ai-card">
          <div className="ai-title">🤖 Ask the Savings Advisor</div>
          <div style={{display:"flex",flexWrap:"wrap",marginBottom:13}}>
            {QS.map(q => (
              <button key={q} className="ai-q-btn" onClick={()=>ask(q)}>{q}</button>
            ))}
          </div>
          {loading
            ? <div style={{display:"flex",alignItems:"center",gap:8,color:"rgba(255,255,255,.5)",fontSize:12}}>
                {[0,1,2].map(i => <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#A78BFA",animation:`aiDot ${.8+i*.16}s infinite`}}/>)}
                <span>Thinking…</span>
              </div>
            : resp
              ? <div className="ai-resp">{resp}</div>
              : <div style={{fontSize:12,color:"rgba(255,255,255,.4)",fontStyle:"italic"}}>Tap a question to get personalised savings advice ↑</div>}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SMS OFFLINE PAGE
// ═══════════════════════════════════════════════════════════════════════════
function SmsPage({ myGroups }) {
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-title">📱 SMS Offline</div>
          <div className="ph-sub">Contribute without internet · Any phone · Any network</div>
        </div>
      </div>
      <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
        {!smsReady() && (
          <div className="sms-card">
            <div style={{fontSize:15,fontWeight:800,color:"#00E5FF",marginBottom:8}}>📱 SMS Offline — Coming Soon</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.75)",marginBottom:14,lineHeight:1.7}}>
              After 9 months of SusuPay being live (January 2027), ALL members can contribute offline via SMS or USSD — no internet needed. Works on every African mobile network: MTN, Airtel, Vodafone, AirtelTigo.
            </div>
            <div className="cnt-chip">⏳ {smsLeft()} days remaining · Unlocks {SMS_DATE.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</div>
            <div style={{marginTop:14,background:"rgba(255,255,255,.06)",border:"1px solid rgba(0,188,212,.2)",borderRadius:8,padding:"11px 13px"}}>
              <div style={{fontSize:10,color:"#00BCD4",fontWeight:800,marginBottom:6,textTransform:"uppercase"}}>Format when active</div>
              <div className="sms-code">PAY [GROUP-ID] [AMOUNT] {PHONE}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:5}}>Send to shortcode: <strong style={{color:"#00E5FF"}}>1234</strong></div>
            </div>
            <div style={{marginTop:12,padding:"10px 12px",background:"rgba(0,188,212,.06)",border:"1px solid rgba(0,188,212,.2)",borderRadius:8}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.75)",fontWeight:600,lineHeight:1.7}}>
                ✓ Works on MTN · Airtel · Vodafone · AirtelTigo<br/>
                ✓ Confirmation SMS within 30 seconds<br/>
                ✓ Admin notified automatically<br/>
                ✓ No app or internet required
              </div>
            </div>
          </div>
        )}
        {smsReady() && myGroups.map(g => (
          <div key={g.id} className="sms-card">
            <div style={{fontSize:12,fontWeight:800,color:"#00E5FF",marginBottom:8}}>{g.name}</div>
            <div className="sms-code">PAY {g.id.toUpperCase()} {g.daily} {PHONE}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:5}}>Send to shortcode: 1234</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════
function Sidebar({ view, setView, user, joinedCount }) {
  const plan = getPlan(user.planId)
  const NAV = [
    { id:"dash",    ico:"🏠", label:"Dashboard" },
    { id:"explore", ico:"🔍", label:"Explore Groups", badge:String(EXPLORE_GROUPS.length), bc:"var(--grn)" },
    { id:"savings", ico:"💰", label:"My Savings" },
    { id:"plans",   ico:"💎", label:"Membership Plans", badge:"6", bc:"var(--pur)" },
    { id:"sms",     ico:"📱", label:"SMS Offline" },
    { id:"advisor", ico:"🤖", label:"AI Advisor" },
  ]
  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div className="logo-ico">S</div>
          <div><div className="logo-name">SusuPay</div><div className="logo-tag">Community Savings</div></div>
        </div>
      </div>
      <div style={{padding:"12px 12px 0"}}>
        <div className="sb-user">
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div className="u-av">{user.avatar}</div>
            <div>
              <div className="u-name">{user.name}</div>
              <div className="u-plan" style={{color:pColor(user.planId)}}>{plan.badge} {plan.name}</div>
            </div>
          </div>
          <div style={{marginTop:9}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,fontWeight:800,color:"var(--txt3)",marginBottom:3}}>
              <span>Groups Used</span><span style={{color:pColor(user.planId)}}>{joinedCount}/{plan.limit}</span>
            </div>
            <div className="lm-track">
              <div className="lm-fill" style={{width:`${Math.min(joinedCount/plan.limit*100,100)}%`,background:`linear-gradient(90deg,${pColor(user.planId)},var(--org))`}}/>
            </div>
          </div>
          <div className="u-stats">
            <div><div className="usv">{joinedCount}</div><div className="usl">Groups</div></div>
            <div><div className="usv">{plan.limit}</div><div className="usl">Limit</div></div>
            <div><div className="usv">97%</div><div className="usl">On-time</div></div>
          </div>
        </div>
      </div>
      <div className="nav-sec">
        <div className="nav-lbl">Navigation</div>
        {NAV.map(n => (
          <button key={n.id} className={`nav-it ${view===n.id?"on":""}`} onClick={()=>setView(n.id)}>
            <span className="nav-ico">{n.ico}</span>{n.label}
            {n.badge && <span className="nav-badge" style={{background:n.bc||"var(--org)"}}>{n.badge}</span>}
          </button>
        ))}
      </div>
      <div className="nav-sec" style={{marginTop:"auto",borderTop:"1.5px solid var(--bd2)",paddingTop:10}}>
        <div className="nav-lbl">System</div>
        {[{ico:"🔔",label:"Notifications"},{ico:"⚙",label:"Settings"},{ico:"🔥",label:"Firebase Console"}].map(n=>(
          <button key={n.label} className="nav-it"><span className="nav-ico">{n.ico}</span>{n.label}</button>
        ))}
      </div>
      <div style={{padding:"11px 18px 16px",fontSize:10,color:"var(--txt3)",lineHeight:1.8,borderTop:"1px solid var(--bd)"}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
          <div className="live-dot"/><span style={{color:"var(--grn)",fontWeight:800}}>Firebase Connected</span>
        </div>
        <strong style={{color:"var(--g)"}}>reliable-susu-bank</strong><br/>
        📞 <strong style={{color:"var(--g)"}}>{PHONE}</strong>
      </div>
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function SusuApp() {
  const [exploreGrps, setExploreGrps] = useState(EXPLORE_GROUPS)
  const [user, setUser] = useState(INIT_USER)
  const [view, setView] = useState("dash")
  const [cycleTab, setCycleTab] = useState("all")
  const [search, setSearch] = useState("")
  const [joinedIds, setJoinedIds] = useState(new Set())
  const [selGroup, setSelGroup]   = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showUpgModal, setShowUpgModal] = useState(false)
  const [upgPlan, setUpgPlan] = useState(null)
  const [toast, setToast]   = useState(null)
  const [newGrp, setNewGrp] = useState({ name:"", cycleId:"1m", daily:45 })
  const [memPage, setMemPage] = useState(0)

  useEffect(() => {
    const s = document.createElement("style")
    s.textContent = CSS
    document.head.appendChild(s)
    return () => document.head.removeChild(s)
  }, [])

  const pop = (msg, ico="✅") => { setToast({msg,ico}); setTimeout(()=>setToast(null),3500) }

  const plan        = getPlan(user.planId)
  const allMyGroups = [...MY_GROUPS, ...exploreGrps.filter(g => joinedIds.has(g.id))]
  const joinedCount = allMyGroups.length
  const atLimit     = joinedCount >= plan.limit && user.id !== AID

  const base = view === "explore" ? exploreGrps : allMyGroups
  const shown = base
    .filter(g => cycleTab === "all" || g.cycleId === cycleTab)
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()))

  const handleJoin = useCallback(g => {
    const cy = getC(g.cycleId)
    if (g.filled >= cy.n) { pop("Group is full! 🚫","🚫"); return }
    if (joinedIds.has(g.id)) { pop("Already a member!","ℹ️"); return }
    if (atLimit) { pop(`${plan.name} limit: ${plan.limit} groups. Upgrade for more!`,"🔒"); setView("plans"); return }
    setJoinedIds(p => new Set([...p, g.id]))
    pop(`Joined! Pay ${fmtN(g.daily)}/day to ${PHONE} 🎊`,"🎊")
  }, [joinedIds, atLimit, plan])

  const handleContrib = (gId, member) => {
    setExploreGrps(p => p.map(g => g.id===gId ? {...g, contribs:{...g.contribs,[member]:true}} : g))
    pop("Payment confirmed! 💰","💰")
  }

  const handleCreate = () => {
    if (!newGrp.name.trim()) { pop("Enter a group name","⚠️"); return }
    const cy = getC(newGrp.cycleId)
    const g = {
      id: genId(), name: newGrp.name.trim(), cohort: "April 2026", cohortNum:0,
      cycleId: newGrp.cycleId, daily: newGrp.daily,
      tier: TIERS.find(t=>t.daily===newGrp.daily)||TIERS[0],
      payoutAmt: calcPay(newGrp.daily,cy), totalAmt: calcTotal(newGrp.daily,cy),
      payFreq:cy.freq, payDays:cy.payDays, payLabel:cy.freqLabel,
      filled:1, collectedBy:[], adminId:AID, round:1, isNew:true,
      get members()  { return mkM(1) },
      get contribs() { return mkC(this.members,0) },
    }
    setExploreGrps(p => [g,...p])
    setShowCreate(false)
    setNewGrp({ name:"", cycleId:"1m", daily:45 })
    pop(`"${g.name}" created! Needs ${cy.n-1} more members.`,"🎉")
  }

  const BNAV = [
    { id:"dash",    ico:"🏠", lbl:"Home" },
    { id:"explore", ico:"🔍", lbl:"Explore" },
    { id:"plans",   ico:"💎", lbl:"Plans" },
    { id:"advisor", ico:"🤖", lbl:"AI" },
  ]

  // ── Route: special pages ──
  if (view === "plans") return (
    <div className="shell">
      <Sidebar view={view} setView={v=>{setView(v)}} user={user} joinedCount={joinedCount}/>
      <main className="main">
        <KentePattern/>
        <PlansPage user={user} onUpgrade={p=>{setUpgPlan(p);setShowUpgModal(true)}}/>
      </main>
      <nav className="bnav">{BNAV.map(n=>(<button key={n.id} className={`bn-btn ${view===n.id?"on":""}`} onClick={()=>setView(n.id)}><span className="bn-ico">{n.ico}</span>{n.lbl}</button>))}</nav>
      {showUpgModal && upgPlan && (
        <div className="overlay" onClick={()=>setShowUpgModal(false)}>
          <div className="modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
            <button className="modal-x" onClick={()=>setShowUpgModal(false)}>✕</button>
            <div style={{textAlign:"center",padding:"8px 0 16px"}}>
              <div style={{fontSize:48,marginBottom:12}}>{upgPlan.badge}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:800,color:"var(--g)",marginBottom:5}}>Upgrade to {upgPlan.name}</div>
              <div style={{fontSize:12,color:"var(--txt3)",marginBottom:18}}>{upgPlan.price===0?"Free — no payment needed":"Send payment to admin to activate"}</div>
              <div style={{background:"rgba(26,110,56,.1)",border:"1.5px solid var(--grn)",borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:upgPlan.color,marginBottom:5}}>{upgPlan.limit} Groups</div>
                <div style={{fontSize:12,color:"var(--txt3)",fontWeight:600}}>+ {upgPlan.msgs} chat messages/session</div>
                {upgPlan.price > 0 && <>
                  <div style={{height:1,background:"var(--bd2)",margin:"12px 0"}}/>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:"var(--g)"}}>{PHONE}</div>
                  <div style={{fontSize:11,color:"var(--grn)",fontWeight:700,marginTop:4}}>MTN MoMo · Airtel · Vodafone</div>
                  <div style={{fontSize:10,color:"var(--txt3)",marginTop:3}}>Ref: "SusuPay {user.name} {upgPlan.name}"</div>
                </>}
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:upgPlan.color,marginBottom:16}}>
                {upgPlan.price===0?"FREE":fmtN(upgPlan.price)}
              </div>
              <div style={{display:"flex",gap:12}}>
                <button className="btn btn-out" style={{flex:1}} onClick={()=>setShowUpgModal(false)}>Cancel</button>
                <button className="btn" style={{flex:2,background:`linear-gradient(135deg,${upgPlan.color},${upgPlan.color}cc)`,color:"#fff",justifyContent:"center"}}
                  onClick={()=>{setUser(u=>({...u,planId:upgPlan.id}));setShowUpgModal(false);pop(`Upgraded to ${upgPlan.badge} ${upgPlan.name}! Join up to ${upgPlan.limit} groups.`,"🎉")}}>
                  {upgPlan.price===0?"Activate Free":"I've Paid — Activate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.ico}</span>{toast.msg}</div>}
    </div>
  )

  if (view === "advisor") return (
    <div className="shell">
      <Sidebar view={view} setView={setView} user={user} joinedCount={joinedCount}/>
      <main className="main"><KentePattern/><AIAdvisor user={user} joinedCount={joinedCount}/></main>
      <nav className="bnav">{BNAV.map(n=>(<button key={n.id} className={`bn-btn ${view===n.id?"on":""}`} onClick={()=>setView(n.id)}><span className="bn-ico">{n.ico}</span>{n.lbl}</button>))}</nav>
      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.ico}</span>{toast.msg}</div>}
    </div>
  )

  if (view === "sms") return (
    <div className="shell">
      <Sidebar view={view} setView={setView} user={user} joinedCount={joinedCount}/>
      <main className="main"><KentePattern/><SmsPage myGroups={allMyGroups}/></main>
      <nav className="bnav">{BNAV.map(n=>(<button key={n.id} className={`bn-btn ${view===n.id?"on":""}`} onClick={()=>setView(n.id)}><span className="bn-ico">{n.ico}</span>{n.lbl}</button>))}</nav>
    </div>
  )

  // ── Dashboard / Explore / Savings ──
  return (
    <div className="shell">
      <Sidebar view={view} setView={v=>{setView(v);setCycleTab("all")}} user={user} joinedCount={joinedCount}/>

      <main className="main">
        <KentePattern/>

        {/* Page header */}
        <div className="ph">
          <div>
            <div className="ph-title">
              {view==="dash"?`Akwaaba, ${user.name.split(" ")[0]} 👋`:
               view==="explore"?"Explore Groups 🔍":"My Savings 💰"}
            </div>
            <div className="ph-sub">
              {view==="dash"
                ? `₵45 · ₵75 · ₵100 daily · Firebase live chat · ${EXPLORE_GROUPS.length} open groups`
                : `${EXPLORE_GROUPS.length} open groups · Pay daily to ${PHONE} · New groups every month`}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,fontWeight:800,color:"var(--grn)",padding:"4px 9px",background:"var(--grnbg)",border:"1px solid var(--grn)",borderRadius:18}}>
              <div className="live-dot"/>Firebase Live
            </div>
            <button className="btn btn-gold btn-sm" onClick={()=>setShowCreate(true)}>+ New Group</button>
          </div>
        </div>

        {/* Stats (dashboard only) */}
        {view==="dash" && (
          <div className="stat-grid">
            {[
              {l:"Total Saved",   v:fmtN(18600),               n:"+18% this month",      i:"💰"},
              {l:`Groups ${joinedCount}/${plan.limit}`, v:`${plan.badge} ${plan.name}`, n:"Group usage", i:"👥"},
              {l:"Next Payout",   v:fmtN(2800),                n:"In 4 days",            i:"🏆"},
              {l:"On-Time Rate",  v:"97%",                     n:"Excellent standing",   i:"✅"},
            ].map(s => (
              <div key={s.l} className="stat-c">
                <div className="si">{s.i}</div>
                <div className="sv">{s.v}</div>
                <div className="sl">{s.l}</div>
                <div className="sn">{s.n}</div>
              </div>
            ))}
          </div>
        )}

        {/* Cycle structure info bar */}
        <div className="info-bar" style={{margin:"10px 20px 4px"}}>
          <span style={{fontSize:16}}>📌</span>
          <span style={{fontSize:11,fontWeight:800,color:"var(--g)"}}>Group structures:</span>
          {[
            ["🌕 1 Month","4 members · weekly COLLECT"],
            ["⭐ 4 Months","4 members · monthly COLLECT"],
            ["🌟 8 Months","8 members · monthly COLLECT"],
            ["👑 1 Year","12 members · monthly COLLECT"],
          ].map(([badge,desc]) => (
            <span key={badge} style={{fontSize:10.5,background:"rgba(255,255,255,.75)",border:"1.5px solid var(--bd2)",borderRadius:18,padding:"3px 9px",fontWeight:700,color:"var(--g)",whiteSpace:"nowrap"}}>
              {badge} · {desc}
            </span>
          ))}
        </div>

        {/* Payment banner (explore) */}
        {view==="explore" && (
          <div className="pay-bar" style={{margin:"8px 20px 0",gap:12}}>
            <span style={{fontSize:18}}>📲</span>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:800,color:"var(--txt3)",textTransform:"uppercase",marginBottom:2}}>All daily contributions → Admin</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:900,color:"var(--g)"}}>📞 {PHONE}</div>
              <div style={{fontSize:10,color:"var(--grn)",fontWeight:700,marginTop:2}}>₵45 · ₵75 · ₵100 per day · MTN · Airtel · Vodafone · {EXPLORE_GROUPS.length} groups available</div>
            </div>
          </div>
        )}

        {/* Cycle tabs */}
        <div className="tabs">
          <button className={`tab-btn ${cycleTab==="all"?"on":""}`} onClick={()=>setCycleTab("all")}>All ({shown.length})</button>
          {CYCLES.map(c => {
            const n = base.filter(g=>g.cycleId===c.id).length
            return (
              <button key={c.id} className={`tab-btn ${cycleTab===c.id?"on":""}`} onClick={()=>setCycleTab(c.id)}>
                {c.badge} {c.label} · {c.n}p
                {n>0 && <span style={{background:"var(--org)",color:"#fff",fontSize:9,padding:"1px 5px",borderRadius:10,fontWeight:800,marginLeft:4}}>{n}</span>}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="srch-row">
          <input className="srch-inp" placeholder="🔍 Search groups…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        {/* Groups grid */}
        {shown.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">🪣</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"var(--g)",fontWeight:700,marginBottom:8}}>No groups found</div>
            <div style={{fontSize:12,color:"var(--txt3)",marginBottom:18}}>Try a different filter or create a new circle</div>
            <button className="btn btn-gold" onClick={()=>setShowCreate(true)}>+ Create Group</button>
          </div>
        ) : (
          <div className="grps-grid">
            {shown.map(g => (
              <GroupCard key={g.id} g={g}
                isMem={MY_GROUPS.some(x=>x.id===g.id)||joinedIds.has(g.id)}
                atLimit={atLimit}
                onJoin={handleJoin}
                onOpen={()=>{setSelGroup(g);setMemPage(0)}}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bnav">
        {BNAV.map(n => (
          <button key={n.id} className={`bn-btn ${view===n.id?"on":""}`} onClick={()=>{setView(n.id);setCycleTab("all")}}>
            <span className="bn-ico">{n.ico}</span>{n.lbl}
          </button>
        ))}
      </nav>

      {/* Group detail modal */}
      {selGroup && (
        <GroupDetail
          g={selGroup}
          user={user}
          isMem={MY_GROUPS.some(x=>x.id===selGroup.id)||joinedIds.has(selGroup.id)}
          onJoin={handleJoin}
          onClose={()=>setSelGroup(null)}
          onContrib={handleContrib}
        />
      )}

      {/* Create group modal */}
      {showCreate && (
        <div className="overlay" onClick={()=>setShowCreate(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <button className="modal-x" onClick={()=>setShowCreate(false)}>✕</button>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:800,color:"var(--g)",marginBottom:4}}>Create Susu Group</div>
            <div style={{fontSize:11,color:"var(--txt3)",marginBottom:16}}>You are admin · Contributions paid to {PHONE}</div>

            <div className="fg">
              <label className="fl">Group Name *</label>
              <input className="fi" placeholder="e.g. Accra Women of Gold" value={newGrp.name} onChange={e=>setNewGrp({...newGrp,name:e.target.value})}/>
            </div>

            <div className="fg">
              <label className="fl">Cycle & Member Count *</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                {CYCLES.map(c => (
                  <button key={c.id}
                    style={{border:`1.5px solid ${newGrp.cycleId===c.id?c.color:"var(--bd2)"}`,background:newGrp.cycleId===c.id?`${c.color}18`:"rgba(255,255,255,.65)",borderRadius:9,padding:"10px 8px",textAlign:"center",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"var(--t)"}}
                    onClick={()=>setNewGrp({...newGrp,cycleId:c.id})}>
                    <div style={{fontSize:20,marginBottom:3}}>{c.badge}</div>
                    <div style={{fontSize:11,fontWeight:800,color:newGrp.cycleId===c.id?c.color:"var(--g)"}}>{c.label}</div>
                    <div style={{fontSize:10,color:"var(--txt3)",fontWeight:600,marginTop:2}}>{c.n} members · {c.freq}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="fg">
              <label className="fl">Daily Amount *</label>
              <div style={{display:"flex",gap:9}}>
                {TIERS.map(t => (
                  <button key={t.daily} className="btn btn-sm"
                    style={{flex:1,background:newGrp.daily===t.daily?"linear-gradient(135deg,var(--g),var(--g2))":"transparent",color:newGrp.daily===t.daily?"#fff":"var(--g)",border:"1.5px solid var(--bd2)"}}
                    onClick={()=>setNewGrp({...newGrp,daily:t.daily})}>
                    {t.emoji} {fmtN(t.daily)}/day
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {(() => {
              const cy = getC(newGrp.cycleId)
              return (
                <div style={{background:"rgba(26,110,56,.1)",border:"1.5px solid var(--grn)",borderRadius:9,padding:"11px 14px",marginBottom:16,textAlign:"center"}}>
                  <div style={{fontSize:12,color:"var(--grn)",fontWeight:800}}>
                    {cy.n} members · {fmtN(newGrp.daily)}/day · {cy.freq} payout: {fmtN(calcPay(newGrp.daily,cy))} · Total: {fmtN(calcTotal(newGrp.daily,cy))}
                  </div>
                </div>
              )
            })()}

            <div style={{display:"flex",gap:12}}>
              <button className="btn btn-out" style={{flex:1}} onClick={()=>setShowCreate(false)}>Cancel</button>
              <button className="btn btn-gold" style={{flex:2,justifyContent:"center"}} onClick={handleCreate}>🎉 Create Group</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast"><span style={{fontSize:16}}>{toast.ico}</span>{toast.msg}</div>}
    </div>
  )
}
