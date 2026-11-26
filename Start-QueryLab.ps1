$ErrorActionPreference='Continue'
Set-Location -LiteralPath $PSScriptRoot
foreach ($candidate in (Get-Command node -All)) {
    & $candidate.Source -e "process.exit(typeof require('node:sqlite').DatabaseSync.prototype.setAuthorizer === 'function' ? 0 : 1)" *> $null
    if ($LASTEXITCODE -eq 0) {
        if (!$env:PORT) { $env:PORT='3000' }
        Write-Host "Open http://localhost:$env:PORT in your browser. Press Ctrl+C to stop."
        & $candidate.Source server.mjs
        exit $LASTEXITCODE
    }
}
throw 'Install Node.js 24.10 or newer and run this launcher again.'

