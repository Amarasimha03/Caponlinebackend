@echo off
echo ==============================================
echo  Running One-Time Auto GitHub Sync
echo ==============================================

echo Staging all backend and frontend files...
git add .

echo.
for /f "tokens=*" %%a in ('date /t') do set current_date=%%a
for /f "tokens=*" %%a in ('time /t') do set current_time=%%a
echo Committing with timestamp message...
git commit -m "Auto update: %current_date%%current_time%"

echo.
echo Pushing to GitHub main branch automatically...
git push origin main
echo Pushing server folder to backend repository...
git subtree push --prefix server backend main

echo.
echo ==============================================
echo  GitHub Update Complete! Render will auto deploy.
echo ==============================================
pause
