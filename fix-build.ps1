# fix-build.ps1
# Run this script from the project root (where package.json lives)

Write-Host "Cleaning old build artifacts..."
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\.vite -ErrorAction SilentlyContinue

Write-Host "Reinstalling dependencies..."
npm install

Write-Host "Testing build locally..."
npm run build

Write-Host "Optional: start dev server..."
# Uncomment the next line if you want to auto-run dev mode
# npm run dev

Write-Host "✅ Build script completed. If build succeeded, push changes and redeploy."
