# Wadi Degla Attendance & Overtime Tracker

## How to Run Locally

### Method 1: Development Server (Recommended)
1. Open a terminal in this project folder.
2. Install dependencies (if not installed):
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the link shown in the terminal:
   ```
   http://localhost:3000
   ```

---

### Method 2: VS Code Live Server / Static Server (Port 5500)
If you are using **VS Code Live Server** or static hosting:
- **Do NOT open the root `index.html`** (because raw `.tsx` files cannot run without Vite).
- **Open `dist/index.html` instead!**
  - Right-click `dist/index.html` in VS Code -> Click **"Open with Live Server"**
  - Or visit: `http://127.0.0.1:5500/dist/index.html`

---

### Method 3: Rebuilding for Production
Whenever you make changes to the source code, run:
```bash
npm run build
```
This updates the `dist/` folder with compiled HTML, JS, and CSS.
