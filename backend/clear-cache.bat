@echo off
echo Clearing Node.js cache...
taskkill /f /im node.exe 2>nul
timeout /t 1 /nobreak >nul
rd /s /q node_modules 2>nul
del /f package-lock.json 2>nul
npm install
echo Done! Now run: node server.js
