@echo off
setlocal
chcp 65001 >nul
if defined ORDER_WIZARD_PHP goto start
where php.exe >nul 2>nul
if errorlevel 1 goto portable
set "ORDER_WIZARD_PHP=php.exe"
goto start
:portable
set "ORDER_WIZARD_PHP=%LOCALAPPDATA%\CRM-Orders\php-8.4.28-nts-x64\php.exe"
if exist "%ORDER_WIZARD_PHP%" goto start
echo Укажите полный путь к php.exe в переменной ORDER_WIZARD_PHP.
exit /b 1
:start
"%ORDER_WIZARD_PHP%" "%~dp0serve.php" %*
exit /b %ERRORLEVEL%
