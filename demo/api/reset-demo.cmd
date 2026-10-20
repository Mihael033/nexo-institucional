@echo off
rem Reset da demo: para a API, apaga demo.db e sobe de novo com o seed limpo.
rem Uso: api\reset-demo.cmd [-NoStart] [-DryRun]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\reset-demo.ps1" %*
