# Daily Expense Tracker

🌐 **Live Web App (Open From Anywhere):** **[https://emamuthu.github.io/daily-expense-tracker/](https://emamuthu.github.io/daily-expense-tracker/)**

A mobile-first Progressive Web App (PWA) for logging daily expenses, managing recurring monthly bills, and analyzing **11+ years of spending history (2016–present)** across all your devices.

---

## How Architecture & Privacy Work

Your setup uses two repositories under **`emamuthu`**:

| Repository | Visibility | Purpose |
| :--- | :--- | :--- |
| **[`emamuthu/daily-expense-tracker`](https://github.com/emamuthu/daily-expense-tracker)** | **Public** (GitHub Pages) | Hosts only the web app interface (`index.html`, `style.css`, `app.js`). **Contains zero personal or financial data.** |
| **[`emamuthu/daily-expense-data`](https://github.com/emamuthu/daily-expense-data)** | 🔒 **Private** | Stores your actual expense database (`expenses_db.json`). Nobody on the internet can view or access this repository without your personal token. |

---

## How to Use It From Any Computer or Phone

### 1. Open the Live App
On any computer, tablet, or phone browser, go to:
👉 **[https://emamuthu.github.io/daily-expense-tracker/](https://emamuthu.github.io/daily-expense-tracker/)**

### 2. Unlock on a New Device (First Time Only)
When you open the link on a new computer or phone for the first time, you will see the password screen:
1. Enter your **App Password** and click **Unlock Expenses**.
   *(Your GitHub token is encrypted inside `auth_vault.json` using 200,000-iteration PBKDF2-HMAC-SHA256 + Encrypt-then-MAC, so you never have to copy or remember a long token on other devices.)*
2. To change your password anytime, go to **Bills & Backup → Change App Password**, type your new password, and click **Update Password**.

- **Automatic Remember Me:** Once unlocked, your session is remembered in that browser's local storage so you stay logged in when you return.
- **Shared Computers:** If you ever use a public or borrowed computer, click the **Lock** button in the top-right corner when finished.

### 3. Install on Your Phone (iPhone / Android)
You can add the tracker to your phone's home screen so it opens full-screen like a native app:
- **iPhone (Safari):** Open [https://emamuthu.github.io/daily-expense-tracker/](https://emamuthu.github.io/daily-expense-tracker/) → tap the **Share** button (square with upward arrow) → tap **Add to Home Screen**.
- **Android (Chrome):** Open [https://emamuthu.github.io/daily-expense-tracker/](https://emamuthu.github.io/daily-expense-tracker/) → tap the **3-dot menu (`⋮`)** → tap **Install app** or **Add to Home screen**.

---

## Daily Workflow & Syncing Across Machines

- **Log a Daily Expense (`Quick Add` tab):**
  1. Type the dollar amount (`$0.00`).
  2. Tap one of your frequent quick chips (`Food`, `Grocery`, `Amazon`, `Costco`, `Target`, `Gas`, `Dress`, `CVS`, etc.) or type any item name — the category is selected automatically.
  3. Click **Add Expense**.
  - The app immediately saves the change to your private `emamuthu/daily-expense-data` repository (the top-right badge shows `Saving...` → `GitHub Synced ✓`).
- **Start a New Month (`Monthly Log` tab):**
  - Select the month and click **+ Apply Monthly Bills** to review and insert your recurring fixed bills (Mortgage, Auto, HOA, Insurance, Cell, Xfinity, etc.) in one click.
- **Switching Between Devices:**
  - Every time you open or refresh the page on another machine, it automatically loads the latest database from GitHub.
  - If the page is already open on another machine, click the **`GitHub Synced ✓`** badge in the top bar anytime to pull the latest entries.
- **Year-over-Year & Search (`Trends & YoY` tab):**
  - View the live **2016–present monthly matrix** (click any month cell to jump into that month's log).
  - Use **Search Across All Years** to see how much you spent on any merchant or item (e.g., `costco`, `amazon`, `gas`) year by year.
- **Backups (`Bills & Backup` tab):**
  - Click **Download JSON Backup** or **Download All CSV** anytime to save an offline backup copy to your computer.

---

## How to Generate a New Token (If You Ever Lose Yours or It Expires)

If you are setting up a new device and don't have your token saved, or when your token expires:

1. Sign in to GitHub as **`emamuthu`** and open **[Fine-grained Personal Access Tokens](https://github.com/settings/personal-access-tokens)** (or **[Classic Tokens](https://github.com/settings/tokens/new?scopes=repo&description=Daily+Expense+Tracker)**).
2. If creating a **Fine-grained token**:
   - **Repository access:** Select **All repositories** (or select `daily-expense-data` and `daily-expense-tracker`).
   - **Repository permissions:** Set **Contents** to **`Read and write`**.
   - Click **Generate token** and paste the new token into the app unlock screen.
3. If creating a **Classic token**:
   - Check the **`repo`** scope checkbox, click **Generate token**, and paste the `ghp_...` token into the app unlock screen.
