# Abhed — Live Connect Guide (sir ke saamne website connect karna)

**Kya dikhana hai, ek line mein:** *"Ek company ki website pe uske apne AI agents hain. Abhi woh band hain, kyunki Abhed se connect nahi hain. Main aapke saamne isko Abhed se jodta hoon — 10 second mein agents online, aur unka har action Abhed se ho ke jaata hai."*

**Setup:** NovaBank pehle se connected hai (comparison ke liye). **Sanjeevani Hospital** aur **Bazaar.in** abhi *disconnected* hain. Inhe sir ke saamne connect karna hai.

| Cheez | Link / PIN |
|---|---|
| Abhed Connect page | `kavach-os.vercel.app/connect` |
| Bazaar website | `bazaar-agents.onrender.com` (admin: `/admin`) |
| Sanjeevani website | `sanjeevani-agents.onrender.com` (admin: `/admin`) |
| Website admin PIN | **2468** |
| Approver phone PIN (Guest Judge) | **1234** |
| Disconnect PIN | **2468** |

---

## Step 0 · Demo se 15 min pehle (zaroori)

1. **Websites jagao.** Render free plan pe site 15 min baad so jaati hai. Dono kholo aur 40–50 s ruko:
   - `bazaar-agents.onrender.com`
   - `sanjeevani-agents.onrender.com`
2. Dono pe peela banner dikhna chahiye: **"Our AI assistants are switched off."** Yahi chahiye.
3. Abhed mein `kavach-os.vercel.app/connect` kholo. Bazaar aur Sanjeevani pe **"Not connected"** dikhna chahiye.
   - Agar rehearsal ke baad **"Connected"** dikh raha hai → company card select karo → **Disconnect** → PIN **2468**. 10 s mein website khud band ho jaayegi.
4. Phone pe approver app kholo: `kavach-os.vercel.app/approver` → **Bazaar.in** → **Guest Judge** → PIN **1234** → **Go on duty**.

**Tabs ka order (laptop):**
1. Abhed Connect
2. Bazaar website
3. Bazaar admin (`/admin`)
4. Abhed Fleet

---

## Step 1 · "Pehle" dikhao — website hai, agents band hain (30 s)

**DIKHAO:** Bazaar website tab. Peela banner, chat box disabled, upar right badge **"Not connected to Abhed"**.

> **BOLO:** "Yeh Bazaar.in ki website hai. Iske apne AI agents hain — Shoppy orders ke liye, Pricer prices ke liye. Lekin abhi yeh band hain. Kyunki jab tak koi inke har action pe nazar na rakhe, inhe customer ke liye kuch karne ki permission nahi."

---

## Step 2 · Abhed se pairing code nikalo (20 s)

**DIKHAO:** Abhed → **Connect** → **Bazaar.in** card → **Generate pairing code**. Bade 6 letters dikhenge, 10 min valid.

> **BOLO:** "Abhed ek one-time code deta hai. Koi password share nahi hota, koi API key copy-paste nahi hoti."

---

## Step 3 · Website ke admin mein code daalo — LIVE (30 s) ⭐

**DIKHAO:** Bazaar admin tab (`bazaar-agents.onrender.com/admin`) → PIN **2468** → screen aayegi **"Connect Bazaar.in to Abhed"** → code type karo → **Connect to Abhed**.

Hara tick aayega: **"Connected to Abhed — Shoppy and Pricer are now online"** + ledger record number.

> **BOLO:** "Company ke admin ne code daala. Website ne Abhed se apni agent keys li — runtime pe, bina dobara deploy kiye."

---

## Step 4 · Abhed mein agents online aate dikhao (30 s) ⭐

**DIKHAO:** Abhed Connect tab. Card ek **green flash** ke saath **"Connected"** ho jaata hai. Right side Live feed:
- *Website paired: bazaar-agents.onrender.com*
- *Shoppy came online…*
- *Pricer came online…*

Agents ke aage green dot: **"online · 3s ago"** (har 10 s heartbeat).

> **BOLO:** "Yeh real heartbeat hai — website ka server har 10 second mein bata raha hai ki agent zinda hai. Aur pairing khud ek signed ledger record hai."

---

## Step 5 · Ab governance live dikhao (2 min) ⭐⭐

**DIKHAO:** Bazaar website tab. Banner apne aap gayab, chat on, data load.

**(a) Chhota kaam — turant**
- "Signed in as" → **Neha Joshi · U-301**
- Suggestion: *"My order OD-5512 (Bluetooth speaker) arrived damaged. Please refund me."* → Send
- Right panel mein steps aate hain: `lookup_order` ALLOWED → `issue_refund ₹1,499` ALLOWED, `REFUND-AUTO`

> **BOLO:** "₹1,499 — company ki policy ke andar, turant. Agent slow nahi hua."

**(b) Bada kaam — insaan ke phone pe**
- Suggestion: *"My phone order OD-5530 never arrived. I want a full refund."* (customer U-302 apne aap select hota hai) → Send
- Chat mein: **"Waiting for one of our people to approve"**
- Phone pe card aata hai (auto-open) → **Evidence** dekho → **Approve**
- Website pe: **"✅ Approved by Guest Judge. Done exactly as approved."**

> **BOLO:** "₹38,990 bada amount hai. Agent ruk gaya, sahi insaan ke phone pe gaya, unke naam se approve hua, tab chala."

**DIKHAO:** Abhed Connect tab → Live feed mein yeh saare actions, ms ke saath. Phir **Fleet** → upar **Speed vs control** bada chart aur **Right now** panel (decisions/min, agents online, connected 2 of 3 → 3 of 3).

---

## Step 6 · Kill switch — disconnect live (30 s, optional but strong)

**DIKHAO:** Abhed Connect → Bazaar → **Disconnect** → PIN **2468**. Phir Bazaar website tab pe jao — **10 second ke andar** banner wapas: *"assistants are switched off"*. Chat bhejo → *"Shoppy is offline: this website is not connected to Abhed."*

> **BOLO:** "Ek click mein company ke saare agents ki keys refuse. Fail-closed — Abhed ke bina agent kuch nahi kar sakta."

Phir dobara connect karke dikhana ho → Step 2 se repeat (10 s lagte hain).

---

## Step 7 · Sanjeevani bhi isi tarah (agar time ho)

Same steps, company **Sanjeevani Hospital**:
- Patient: **Asha Kumari · P-101** → *"Please refill my metformin."* → turant
- **P-102** → *"I need a refill of my alprazolam (30 tablets), I have run out."* → controlled drug → doctor (Guest Judge) phone pe approve

Approver app mein Sanjeevani bhi add karo: Profile → **Add another company** → Sanjeevani → Guest Judge → 1234.

---

## Option B · Bilkul nayi website sir ke saamne deploy karna (5 min)

Agar sir bolein *"deploy karke dikhao"*:

1. `dashboard.render.com` → **New** → **Web Service** → repo **HarshDubey23/hackarena**
2. Settings:
   - **Name:** `bazaar-live` (kuch bhi)
   - **Region:** Singapore
   - **Build Command:** `node --version`
   - **Start Command:** `node sites/server.mjs`
   - **Instance:** Free
3. **Environment variables** (sirf 3, koi Abhed key nahi):

   | Key | Value |
   |---|---|
   | `SITE` | `bazaar` (ya `sanjeevani`) |
   | `KAVACH_URL` | `https://kavach-os.vercel.app` |
   | `ADMIN_PIN` | `2468` |

4. **Create Web Service** → 1–2 min mein live. URL kholo → *"assistants are switched off"*.
5. Ab Step 2 → 3 → 4 → 5, bas admin URL naya hoga: `https://bazaar-live.onrender.com/admin`.
   - Abhed Connect page pe **"Open its admin"** button purane URL pe jaata hai — naya URL khud type karo.
   - Live feed mein **"Website paired: https://bazaar-live.onrender.com"** naya URL dikhayega. Yahi proof hai ki abhi deploy hui site connect hui.

> Dhyaan do: purani Bazaar site bhi us company ki keys se chalti rahegi. Sirf nayi site dikhani ho toh pehle Abhed se **Disconnect** karo (purani band ho jaayegi), phir nayi site ko pair karo.

---

## Agar kuch atak jaye

| Problem | Kya karo |
|---|---|
| "This code has expired" | Abhed Connect → **New code** (code 10 min chalta hai) |
| "That code belongs to Sanjeevani, not Bazaar.in" | Galat company ka code. Connect page pe sahi card select karo. |
| "No company is waiting for this code" | Typo. Code dobara padho (0/O aur 1/I code mein nahi hote). |
| Website khul nahi rahi | Render jaag raha hai — 40–50 s ruko, refresh. |
| Website pehle connected thi, ab "switched off" | Render ne instance restart kiya (free plan). Bas dobara pair karo — 10 s. |
| Chat: "No LLM" / rate limit | Thodi der ruko. Connect + heartbeat + approvals LLM ke bina bhi chalte hain. |
| Phone pe card nahi aaya | Approver app mein sahi company (Bazaar.in) mein on duty ho? Profile → Add another company. |

---

## Judges ke sawal

| Sawal | Jawab |
|---|---|
| "Keys kahan se aayi?" | "Pairing code se. Abhed ne website ko uski agent keys runtime pe di. Code ek baar chalta hai aur 10 min mein expire." |
| "Disconnect ke baad purani key se call kare toh?" | "Abhed refuse karega — 403, *not connected*. Fail-closed." |
| "Asli company kaise use karegi?" | "Same: SDK (`abhed.call`) apne agent code mein, pairing code se connect, approvers phone pe. Integrate page pe 3 line ka code hai." |
| "Kya website Abhed ke andar hi hai?" | "Nahi. Website alag server pe hai (Render), Abhed alag (Vercel). Dono internet pe baat karte hain." |

**PINs:** website admin + disconnect **2468** · approver **1234**. Judging ke baad dono badal do.
