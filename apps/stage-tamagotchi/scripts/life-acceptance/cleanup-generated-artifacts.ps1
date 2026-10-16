param([switch]$Clean, [switch]$BuildsOnly)

$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$distRoot = [IO.Path]::GetFullPath((Join-Path $workspaceRoot 'apps/stage-tamagotchi/dist'))
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$processes = @(Get-CimInstance Win32_Process)
$runningTests = @($processes | Where-Object { $_.CommandLine -match '\bvitest\b' -and $_.CommandLine -like "*$workspaceRoot*" })
$targets = [Collections.Generic.List[object]]::new()

# Only disposable, named QA builds are eligible. Keep released installers and research checkouts.
foreach ($buildName in @('life-closure-qa-20261006', 'life-installer-qa-20261005', 'win-unpacked', 'life-intent-pre-api-20261006', 'stage-fix', 'stage-fix-final', 'life-continuity-20261005', 'life-experience-20261005', 'life-living-20261005', 'life-phase1-20261005', 'life-completion-20261012-release', 'life-completion-20261012-verified', 'life-completion-20261012-complete', 'life-completion-20261012-final')) {
    $candidate = [IO.Path]::GetFullPath((Join-Path $distRoot $buildName))
    if ((Split-Path $candidate -Parent) -cne $distRoot) { throw 'Build escaped the designated dist directory.' }
    if (Test-Path -LiteralPath $candidate) {
        $targets.Add([pscustomobject]@{ path = $candidate; ownership = 'obsolete generated QA build'; root = $distRoot })
    }
}

# These exact prefixes originate in runtime.test.ts and db.test.ts. Exclude recent fixtures and live tests.
if (!$BuildsOnly -and $runningTests.Count -eq 0) {
    $cutoff = (Get-Date).AddHours(-1)
    Get-ChildItem -LiteralPath $tempRoot -Directory | Where-Object {
        $_.Name -match '^alicization-(runtime|db)-test-[A-Za-z0-9]{6}$' -and $_.LastWriteTime -lt $cutoff
    } | ForEach-Object {
        $targets.Add([pscustomobject]@{ path = [IO.Path]::GetFullPath($_.FullName); ownership = 'closed unit-test mkdtemp fixture'; root = $tempRoot })
    }
}

$records = [Collections.Generic.List[object]]::new()
$freeBefore = (Get-PSDrive C).Free
foreach ($target in $targets) {
    $resolved = (Resolve-Path -LiteralPath $target.path).Path
    if ($resolved -ine $target.path -or (Split-Path $resolved -Parent) -ine $target.root) {
        throw "Unexpected resolved cleanup path: $resolved"
    }
    $active = @($processes | Where-Object {
        ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($resolved + '\', [StringComparison]::OrdinalIgnoreCase)) -or
        ($_.CommandLine -and $_.CommandLine.IndexOf($resolved, [StringComparison]::OrdinalIgnoreCase) -ge 0)
    })
    $rootItem = Get-Item -LiteralPath $resolved -Force
    $entries = @(Get-ChildItem -LiteralPath $resolved -Recurse -Force -ErrorAction Stop)
    $links = @(@($rootItem) + $entries | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
    $bytes = [long](($entries | Where-Object { -not $_.PSIsContainer } | Measure-Object Length -Sum).Sum)
    $record = [pscustomobject]@{ path = $resolved; ownership = $target.ownership; bytes = $bytes; status = 'preview'; reason = $null }
    if ($active.Count -gt 0 -or $links.Count -gt 0) {
        $record.status = 'skipped'
        $record.reason = if ($active.Count -gt 0) { 'running process' } else { 'reparse point' }
    }
    elseif ($Clean) {
        try {
            if ($target.ownership -eq 'obsolete generated QA build') {
                $metadataRoot = Join-Path $workspaceRoot ('output/retired-build-metadata/' + (Split-Path $resolved -Leaf))
                New-Item -ItemType Directory -Path $metadataRoot -Force | Out-Null
                Get-ChildItem -LiteralPath $resolved -File | Where-Object { $_.Extension -in @('.json', '.yml', '.yaml') } | ForEach-Object {
                    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $metadataRoot $_.Name) -Force
                }
            }
            Remove-Item -LiteralPath $resolved -Recurse -Force -ErrorAction Stop
            $record.status = 'removed'
        }
        catch {
            $record.status = 'failed'
            $record.reason = $_.Exception.Message
        }
    }
    $records.Add($record)
}
$reportScope = if ($BuildsOnly) { 'builds-' } else { '' }
$reportName = 'life-closure-cleanup-' + $reportScope + (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss-fffffff') + '.json'
$reportPath = Join-Path $workspaceRoot ('output/' + $reportName)
$report = [pscustomobject]@{
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    clean = [bool]$Clean
    freeBefore = $freeBefore
    freeAfter = (Get-PSDrive C).Free
    liveTestProcesses = $runningTests.Count
    records = $records
}
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding utf8
[pscustomobject]@{
    Targets = $records.Count
    Removed = @($records | Where-Object status -eq 'removed').Count
    Skipped = @($records | Where-Object status -eq 'skipped').Count
    Failed = @($records | Where-Object status -eq 'failed').Count
    RemovedGB = [math]::Round((($records | Where-Object status -eq 'removed' | Measure-Object bytes -Sum).Sum) / 1GB, 2)
    FreeGB = [math]::Round($report.freeAfter / 1GB, 2)
    Report = $reportPath
} | ConvertTo-Json
