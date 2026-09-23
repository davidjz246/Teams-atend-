# Production Deployment Guide: Wadi Degla Clubs Attendance & Overtime System

This project is fully built and ready for production deployment. The compiled files are inside the `/public_dist` and `/dist` directories.

---

## ⚡ Option 1: Automatic 1-Click Installer (Windows / XAMPP)

1. Double-click **`install-to-xampp.bat`** in the project folder.
2. It automatically creates `C:\xampp\htdocs\attendance\` and copies all necessary production files (`index.html` + `assets/`).
3. Start **Apache** in your XAMPP Control Panel.
4. Open your browser and go to: **`http://localhost/attendance/`**

---

## 📂 Option 2: Manual Installation to XAMPP htdocs

1. Open your XAMPP folder: `C:\xampp\htdocs\`
2. Create a folder named **`attendance`**: `C:\xampp\htdocs\attendance\`
3. Copy all files from **`public_dist/`** into `C:\xampp\htdocs\attendance/`:
   - `C:\xampp\htdocs\attendance\index.html`
   - `C:\xampp\htdocs\attendance\assets\app-bundle.js`
   - `C:\xampp\htdocs\attendance\assets\index.css`
   - `C:\xampp\htdocs\attendance\assets\*.jpg`
4. Start **Apache** in the XAMPP Control Panel.
5. Open your browser and navigate to: **`http://localhost/attendance/`**

---

## 🚀 Option 3: Instant Local Server without XAMPP

Double-click **`start.bat`** or **`AttendanceTracker-App.bat`** in this folder:
- If you have Node.js, Python, or PHP installed, it automatically serves the app on `http://localhost:3000`.
- If no server is installed, it opens Edge/Chrome in dedicated App Mode with local file access enabled.

---

## 2. How to Deploy to cPanel / Shared Hosting (Apache)
1. Log in to your cPanel or File Manager.
2. Go to `public_html` (or a subfolder like `public_html/attendance`).
3. Upload the contents of the `dist` folder directly into `public_html`.
4. (Optional) Create a `.htaccess` file inside `public_html` for single-page application routing:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 3. How to Deploy to Node.js / Linux Server / VPS
To run a standalone web server for this application:
```bash
npm install -g serve
serve -s dist -l 3000
```
Or run with PM2:
```bash
pm2 serve dist 3000 --name "wadi-degla-attendance" --spa
```

---

## 4. Re-building after Code Changes
Whenever you change the source code in `src/`, rebuild the `dist` folder:
```bash
npm run build
```
