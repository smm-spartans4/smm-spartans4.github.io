@echo off
REM ============================================================================
REM  Publish to the parents' site.
REM
REM  Double-click this after exporting from the site's Publish page. It finds
REM  the newest team-data file in Downloads, installs it, and pushes.
REM
REM  Chrome never overwrites a download - the second one is "team-data (1).js",
REM  the third "(2)" - so this takes the NEWEST by timestamp rather than a
REM  fixed name, which is the mistake that nearly published a stale file once.
REM ============================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\publish.ps1"
echo.
pause
