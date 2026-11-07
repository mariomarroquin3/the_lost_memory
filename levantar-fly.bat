@echo off
REM Levanta El Rescate del Contexto en Fly.io (app rescate-contexto).
REM Doble clic desde la carpeta del proyecto. No hace commit ni push.
cd /d "%~dp0"
title Rescate del Contexto - Fly.io

where flyctl >nul 2>nul
if errorlevel 1 (
  echo No se encontro flyctl. Instalalo con:
  echo   powershell -Command "iwr https://fly.io/install.ps1 -useb ^| iex"
  goto fallo
)

echo.
echo [1/4] Comprobando sesion en Fly...
flyctl auth whoami >nul 2>nul
if errorlevel 1 (
  flyctl auth login
  if errorlevel 1 goto fallo
)

echo.
echo [2/4] Desplegando la version de esta carpeta...
flyctl deploy --ha=false
if errorlevel 1 goto fallo

echo.
echo [3/4] Dejando una sola maquina (las partidas viven en memoria)...
flyctl scale count 1 --yes
if errorlevel 1 goto fallo

echo.
echo [4/4] Estado:
flyctl status
start "" "https://rescate-contexto.fly.dev"

echo.
echo Listo. Recarga las pestanas del juego con Ctrl+Shift+R.
echo Mostrando registros del servidor (cierra la ventana o Ctrl+C para salir)...
flyctl logs
goto fin

:fallo
echo.
echo *** Algo fallo. Revisa el mensaje de arriba. ***
echo Si la conexion se corto a mitad del deploy, prueba otra red (por ejemplo los datos del celular) y vuelve a ejecutar este archivo.
pause
exit /b 1

:fin
pause
