@echo off
REM fix-build.bat
REM Run this file from the project root (where package.json lives)

echo Cleaning old build artifacts...
IF EXIST node_modules rmdir /s /q node_modules
IF EXIST dist rmdir /s /q dist
IF EXIST .vite rmdir /s /q .vite

echo Reinstalling dependencies...
npm install

echo Testing build locally...
npm run build

echo Optional: start dev server...
REM Uncomment the next line if you want to auto-run dev mode
REM npm run dev

echo ==========================================
echo ✅ Build script completed.
echo If build succeeded, push changes and redeploy.
echo ==========================================
pause
