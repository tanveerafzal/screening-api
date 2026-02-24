@echo off
REM ============================================================
REM  Newman Test Runner for Screening API
REM  Runs the Postman collection using Newman CLI
REM ============================================================
REM  Usage:
REM    run-tests.bat                     Run with defaults (localhost:3000)
REM    run-tests.bat --url http://host   Override base URL
REM    run-tests.bat --env production    Use a different environment file
REM    run-tests.bat --html              Generate HTML report
REM    run-tests.bat --help              Show help
REM ============================================================

setlocal enabledelayedexpansion

REM --- Defaults ---
set "BASE_URL=https://screening-api-214036150009.northamerica-northeast2.run.app"
set "COLLECTION=%~dp0Screening-API.postman_collection.json"
set "ENVIRONMENT=%~dp0Screening-API-Local.postman_environment.json"
set "HTML_REPORT=0"
set "REPORTERS=cli"
set "REPORT_DIR=%~dp0reports"

REM --- Parse arguments ---
:parse_args
if "%~1"=="" goto :check_newman
if /i "%~1"=="--url" (
    set "BASE_URL=%~2"
    shift & shift
    goto :parse_args
)
if /i "%~1"=="--env" (
    set "ENVIRONMENT=%~dp0Screening-API-%~2.postman_environment.json"
    shift & shift
    goto :parse_args
)
if /i "%~1"=="--html" (
    set "HTML_REPORT=1"
    shift
    goto :parse_args
)
if /i "%~1"=="--help" (
    goto :show_help
)
echo Unknown option: %~1
goto :show_help

REM --- Check Newman is installed ---
:check_newman
where newman >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Newman is not installed. Installing...
    echo.
    npm install -g newman newman-reporter-htmlextra
    if %errorlevel% neq 0 (
        echo.
        echo  ERROR: Failed to install Newman. Please run:
        echo    npm install -g newman newman-reporter-htmlextra
        echo.
        exit /b 1
    )
)

REM --- Verify collection file exists ---
if not exist "%COLLECTION%" (
    echo.
    echo  ERROR: Collection file not found:
    echo    %COLLECTION%
    echo.
    exit /b 1
)

REM --- Build reporters ---
if "%HTML_REPORT%"=="1" (
    where newman-reporter-htmlextra >nul 2>&1
    if %errorlevel% neq 0 (
        echo  Installing HTML reporter...
        npm install -g newman-reporter-htmlextra
    )
    set "REPORTERS=cli,htmlextra"
    if not exist "%REPORT_DIR%" mkdir "%REPORT_DIR%"
)

REM --- Display config ---
echo.
echo  ============================================================
echo   Screening API - Newman Test Runner
echo  ============================================================
echo   Collection:  %COLLECTION%
echo   Environment: %ENVIRONMENT%
echo   Base URL:    %BASE_URL%
echo   Reporters:   %REPORTERS%
echo  ============================================================
echo.

REM --- Run Newman ---
if "%HTML_REPORT%"=="1" (
    newman run "%COLLECTION%" ^
        --environment "%ENVIRONMENT%" ^
        --env-var "baseUrl=%BASE_URL%" ^
        --reporters "%REPORTERS%" ^
        --reporter-htmlextra-export "%REPORT_DIR%\screening-api-report.html" ^
        --reporter-htmlextra-title "Screening API Test Report" ^
        --timeout-request 30000 ^
        --delay-request 100 ^
        --color on
) else (
    newman run "%COLLECTION%" ^
        --environment "%ENVIRONMENT%" ^
        --env-var "baseUrl=%BASE_URL%" ^
        --reporters "%REPORTERS%" ^
        --timeout-request 30000 ^
        --delay-request 100 ^
        --color on
)

set "EXIT_CODE=%errorlevel%"

echo.
if %EXIT_CODE% equ 0 (
    echo  ALL TESTS PASSED
) else (
    echo  SOME TESTS FAILED (exit code: %EXIT_CODE%)
)

if "%HTML_REPORT%"=="1" (
    echo  HTML Report: %REPORT_DIR%\screening-api-report.html
)
echo.

exit /b %EXIT_CODE%

REM --- Help ---
:show_help
echo.
echo  Usage: run-tests.bat [options]
echo.
echo  Options:
echo    --url URL     Base URL of the API (default: http://localhost:3000)
echo    --env NAME    Environment name, maps to Screening-API-{NAME}.postman_environment.json
echo                  (default: Local)
echo    --html        Generate an HTML report in postman/reports/
echo    --help        Show this help message
echo.
echo  Examples:
echo    run-tests.bat                                     Run against localhost
echo    run-tests.bat --url https://screening-api.run.app Run against Cloud Run
echo    run-tests.bat --html                              Run with HTML report
echo    run-tests.bat --url http://staging:3000 --html    Staging + HTML report
echo.
exit /b 0
