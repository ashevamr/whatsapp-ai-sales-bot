$ErrorActionPreference = 'Stop'
$botRoot = Split-Path -Parent $PSScriptRoot
$nodeBinary = (Get-Command node.exe -ErrorAction Stop).Source
$botProcess = Start-Process -FilePath $nodeBinary -ArgumentList ('"' + (Join-Path $PSScriptRoot 'supervise_bot.js') + '"') -WorkingDirectory $botRoot -WindowStyle Hidden -Wait -PassThru
exit $botProcess.ExitCode
