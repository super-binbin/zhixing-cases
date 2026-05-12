@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 知行案例库 - 同步到网站
echo.
echo    ==================================
echo      知行案例库 - 一键同步到网站
echo    ==================================
echo.
node sync.js
echo.
pause
