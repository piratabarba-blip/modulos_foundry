# Feche o servidor Foundry antes de executar. Este script nao instala atualizacoes.
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory = $true)]
    [string]$DataPath
)

$ErrorActionPreference = 'Stop'
$manifestUrl = 'https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/token-action-hud-tagmar/module.json'
$dataRoot = (Resolve-Path -LiteralPath $DataPath).Path
$manifestPath = Join-Path $dataRoot 'modules/token-action-hud-tagmar/module.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw 'HUD Tagmar nao encontrado. Informe a pasta Data da instalacao correta.'
}
$original = [System.IO.File]::ReadAllText($manifestPath)
$moduleData = $original | ConvertFrom-Json
if ($moduleData.id -ne 'token-action-hud-tagmar') {
    throw 'Identificador inesperado. Nenhum arquivo foi alterado.'
}
if ($moduleData.manifest -eq $manifestUrl) {
    Write-Output 'O manifesto permanente ja esta configurado. Use Atualizar no Foundry.'
    return
}
if ($moduleData.manifest) {
    throw 'Ja existe outro manifesto configurado. Confira esse endereco antes de altera-lo.'
}
if (Get-Process -Name FoundryVTT,Foundry -ErrorAction SilentlyContinue) {
    throw 'Feche o Foundry antes de executar. Se usa servidor Node, encerre-o tambem.'
}
$moduleData | Add-Member -NotePropertyName manifest -NotePropertyValue $manifestUrl -Force
$updated = $moduleData | ConvertTo-Json -Depth 100
$check = $updated | ConvertFrom-Json
if ($check.id -ne 'token-action-hud-tagmar' -or $check.manifest -ne $manifestUrl) {
    throw 'Falha na validacao. Nenhum arquivo foi alterado.'
}
if ($PSCmdlet.ShouldProcess($manifestPath, 'Adicionar endereco de atualizacao com backup')) {
    $backup = $manifestPath + '.before-update-link-' + [Guid]::NewGuid().ToString('N') + '.bak'
    [System.IO.File]::Copy($manifestPath, $backup, $false)
    try {
        [System.IO.File]::WriteAllText($manifestPath, $updated + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
    } catch {
        [System.IO.File]::Copy($backup, $manifestPath, $true)
        throw
    }
    Write-Output "Backup: $backup"
    Write-Output 'Pronto. Abra o Foundry e clique em Atualizar no Token Action HUD Tagmar.'
}

