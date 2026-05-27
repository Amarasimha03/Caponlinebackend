@echo off
title Auto GitHub Sync Watcher
echo ==============================================
echo  Online Exam System - Auto GitHub Sync Watcher
echo ==============================================
echo.
echo Initializing Git repository and checking connection...
git status >nul 2>&1
if errorlevel 1 (
    echo Git repository not found. Initializing...
    git init
    git remote add origin https://github.com/Amarasimha03/onlinetest
)

echo.
echo Starting Auto Push Process...
echo This watcher will automatically detect file changes and push them
echo to GitHub with a timestamped commit message.
echo.
echo Keep this window open to continue automatic sync.
echo Press Ctrl+C to stop the watcher.
echo ==============================================
echo.
node git-sync.js
pause
