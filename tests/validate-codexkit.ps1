$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $Failures.Add($Message) | Out-Null
}

function Assert-Path {
    param([string]$RelativePath)
    $Path = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $Path)) {
        Add-Failure "Missing required path: $RelativePath"
    }
}

function Read-Text {
    param([string]$Path)
    return Get-Content -LiteralPath $Path -Raw
}

$RequiredPaths = @(
    "AGENTS.md",
    ".codex/config.toml",
    ".codex/agents/planner.toml",
    ".codex/agents/implementation-worker.toml",
    ".codex/agents/reviewer.toml",
    ".codex/agents/explorer.toml",
    ".agents/skills",
    ".agents/legacy-skills",
    "docs/codexkit/source-inventory.md",
    "docs/codexkit/portability-matrix.md",
    "docs/codexkit/claude-to-codex-mapping.md",
    "docs/codexkit/parity-gaps.md",
    "docs/codexkit/cook-handoff.md"
)

foreach ($RelativePath in $RequiredPaths) {
    Assert-Path $RelativePath
}

$ExpectedSkills = @(
    "plan",
    "cook",
    "fix",
    "debug",
    "code-review",
    "test",
    "scout",
    "research",
    "docs",
    "git",
    "worktree",
    "ck-help"
)

$SkillsRoot = Join-Path $Root ".agents/skills"
if (Test-Path -LiteralPath $SkillsRoot) {
    $ActualSkills = @(Get-ChildItem -LiteralPath $SkillsRoot -Directory | Select-Object -ExpandProperty Name | Sort-Object)
    $ExpectedSorted = @($ExpectedSkills | Sort-Object)

    $Unexpected = @($ActualSkills | Where-Object { $_ -notin $ExpectedSkills })
    $Missing = @($ExpectedSkills | Where-Object { $_ -notin $ActualSkills })

    if ($Unexpected.Count -gt 0) {
        Add-Failure "Unexpected active skills: $($Unexpected -join ', ')"
    }
    if ($Missing.Count -gt 0) {
        Add-Failure "Missing active skills: $($Missing -join ', ')"
    }
    if ($ActualSkills.Count -ne $ExpectedSorted.Count) {
        Add-Failure "Expected $($ExpectedSorted.Count) active skills, found $($ActualSkills.Count)"
    }

    foreach ($SkillName in $ExpectedSkills) {
        $SkillPath = Join-Path $SkillsRoot "$SkillName/SKILL.md"
        if (-not (Test-Path -LiteralPath $SkillPath)) {
            Add-Failure "Missing SKILL.md for active skill: $SkillName"
            continue
        }

        $Content = Read-Text $SkillPath
        if ($Content -notmatch "(?ms)^---\s*.*^name:\s*.+$.*^description:\s*.+$.*^---") {
            Add-Failure "Invalid skill frontmatter: $SkillName"
        }
    }
}

$LegacyRoot = Join-Path $Root ".agents/legacy-skills"
if (Test-Path -LiteralPath $LegacyRoot) {
    $LegacyCount = @(Get-ChildItem -LiteralPath $LegacyRoot -Directory).Count
    if ($LegacyCount -lt 50) {
        Add-Failure "Expected archived legacy skill mirror, found only $LegacyCount directories"
    }
}

$AgentRoot = Join-Path $Root ".codex/agents"
if (Test-Path -LiteralPath $AgentRoot) {
    foreach ($AgentFile in Get-ChildItem -LiteralPath $AgentRoot -Filter "*.toml" -File) {
        $Content = Read-Text $AgentFile.FullName
        foreach ($Field in @("name", "description", "developer_instructions")) {
            if ($Content -notmatch "(?m)^$Field\s*=") {
                Add-Failure "Agent $($AgentFile.Name) missing required field: $Field"
            }
        }
    }
}

$LiveScanPaths = @(
    "AGENTS.md",
    ".codex",
    ".agents/skills"
)

$BannedPatterns = @(
    "TaskCreate",
    "TaskUpdate",
    "TaskGet",
    "TaskList",
    "AskUserQuestion",
    "TeamCreate",
    "SendMessage",
    "ExitPlanMode",
    "\.opencode",
    "\.claude"
)

foreach ($RelativePath in $LiveScanPaths) {
    $Path = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $Path)) {
        continue
    }

    $Files = @()
    if ((Get-Item -LiteralPath $Path).PSIsContainer) {
        $Files = @(Get-ChildItem -LiteralPath $Path -Recurse -File)
    } else {
        $Files = @(Get-Item -LiteralPath $Path)
    }

    foreach ($File in $Files) {
        $Content = Read-Text $File.FullName
        foreach ($Pattern in $BannedPatterns) {
            if ($Content -match $Pattern) {
                $DisplayPath = Resolve-Path -LiteralPath $File.FullName -Relative
                Add-Failure "Banned legacy token '$Pattern' found in live surface: $DisplayPath"
            }
        }
    }
}

if ($Failures.Count -gt 0) {
    Write-Host "CodexKit validation failed:" -ForegroundColor Red
    foreach ($Failure in $Failures) {
        Write-Host " - $Failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "CodexKit validation passed." -ForegroundColor Green
Write-Host "Note: release packaging remains deferred to Phase 2." -ForegroundColor Yellow
