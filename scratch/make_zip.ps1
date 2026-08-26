$src = 'C:\Users\Admin\Desktop\Construct-O-Genie'
$zipPath = 'C:\Users\Admin\Desktop\Construct-O-Genie-Production-Ready.zip'

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

Add-Type -AssemblyName System.IO.Compression.FileSystem

$tempDir = Join-Path $env:TEMP 'COG_Export_Temp'
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$exclude = @('node_modules', '.next', '.git', 'Brand_Assets_Extracted', 'Construct-O-Genie_Brand_Assets.zip', 'Construct-O-Genie-Production-Ready.zip')

Get-ChildItem -Path $src | ForEach-Object {
    if ($exclude -notcontains $_.Name) {
        Copy-Item -Path $_.FullName -Destination (Join-Path $tempDir $_.Name) -Recurse -Force
    }
}

[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath)
Remove-Item -Recurse -Force $tempDir

Get-Item $zipPath | Select-Object FullName, Length, LastWriteTime
