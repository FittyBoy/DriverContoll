@echo off
echo ================================
echo  AGC Microglass - Clear Cache
echo ================================

echo [1/4] Stopping Node processes...
taskkill /f /im node.exe 2>nul
timeout /t 1 /nobreak >nul

echo [2/4] Clearing backend cache...
cd backend
rd /s /q node_modules 2>nul
del /f package-lock.json 2>nul
npm install
cd ..

echo [3/4] Clearing frontend cache...
cd frontend
rd /s /q node_modules 2>nul
del /f pnpm-lock.yaml 2>nul
pnpm install
cd ..

echo [4/4] Done!
echo Now run: npm run dev
pause
