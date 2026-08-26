@echo off
title JLPT Master local server
REM Put this .bat in your Japanese_study_app_advanced folder (next to index.html)
REM and double-click it. Leave this window open while testing.
REM Supabase auth + data work fine from localhost.
cd /d "%~dp0"

set "ROOT=."
if not exist "%ROOT%\index.html" (
  echo Could not find index.html here.
  echo Put this .bat in the same folder as the app's index.html
  echo ^(the folder that also has anime-reader.html, js\, css\^).
  echo Current folder: %CD%
  pause & goto :eof
)

REM --- Find a Python: PATH first, then common Anaconda/Miniconda locations ---
REM (double-clicking uses plain cmd, where conda's PATH is usually NOT active,
REM  so we look for python.exe directly.)
set "PY="
for %%P in (
  "python.exe"
  "%USERPROFILE%\anaconda3\python.exe"
  "%USERPROFILE%\miniconda3\python.exe"
  "%USERPROFILE%\AppData\Local\anaconda3\python.exe"
  "%USERPROFILE%\AppData\Local\miniconda3\python.exe"
  "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
  "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
  "C:\ProgramData\anaconda3\python.exe"
  "C:\ProgramData\miniconda3\python.exe"
) do (
  if not defined PY (
    "%%~P" -c "import sys" >nul 2>nul && set "PY=%%~P"
  )
)

if not defined PY (
  echo.
  echo Could not find Python automatically.
  echo Open "Anaconda Prompt", cd to this folder, and run:
  echo     python -m http.server 5180 --directory "%ROOT%"
  echo.
  pause & goto :eof
)

echo.
echo   JLPT Master - local server
echo   Python:  %PY%
echo   Serving: %ROOT%    Open: http://localhost:5180/
echo   Anime reader:      http://localhost:5180/anime-reader.html
echo   Data manager:      http://localhost:5180/data-manager.html
echo   (Close this window to stop.)
echo.

start "" "http://localhost:5180/"
"%PY%" -m http.server 5180 --directory "%ROOT%"

echo.
echo Server stopped.
pause
