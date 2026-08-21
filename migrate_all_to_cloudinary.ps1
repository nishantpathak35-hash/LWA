# Cloudinary Migration Script for LuxeWorx Atelier ERP
$cloudName = "qgkol3hq"
$apiKey    = "769253525795975"
$apiSecret = "onWnnAd_pV06dFtBuHElfiJtoxo"

$tursoUrl  = "https://lwa-lwa-hash.aws-ap-south-1.turso.io/v2/pipeline"
$tursoAuth = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyOTYxNDgsImlkIjoiMDFhMDIzMjYtOTEwMS03OTg2LTg5N2EtNTI1YjFiMzMzYzRhIiwia2lkIjoiOTlpUmltMlowT0xtak4wNWJsdnJWQnZaSTR2eWFpLWFtclJ5N0ZxTU92dyIsInJpZCI6IjZmYmJlZTMxLWY2MTEtNDZmOC05YzY4LWUwYmY2ZjY4YmJkOCJ9.O9Z2E7lQ3kHsWeqRfQGLUFYF-Z3taOHbQ8eUIHEZDvvtYL3l5cJIRjowqYm0jvOqRG1pbvYUyrwnJqda6jSgDg"
$tursoHeaders = @{"Authorization"="Bearer $tursoAuth"}

function Upload-ToCloudinary {
    param(
        [string]$FileData,
        [string]$Entity,
        [string]$EntityId
    )
    
    $cleanEntity = ($Entity -replace "[^a-zA-Z0-9_\-]", "_")
    $cleanId = ($EntityId -replace "[^a-zA-Z0-9_\-]", "_")
    $folder = "erp_attachments_${cleanEntity}_${cleanId}"
    
    $timestamp = [int][double]::Parse((Get-Date -UFormat %s))
    $toSign = "folder=$folder&timestamp=$timestamp$apiSecret"
    
    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    $hashBytes = $sha1.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($toSign))
    $signature = -join ($hashBytes | ForEach-Object { "{0:x2}" -f $_ })
    
    $cleanData = if ($FileData.StartsWith("data:")) { $FileData } else { "data:application/octet-stream;base64,$FileData" }
    
    $body = @{
        file = $cleanData
        folder = $folder
        api_key = $apiKey
        timestamp = $timestamp
        signature = $signature
    }
    
    $res = Invoke-RestMethod -Uri "https://api.cloudinary.com/v1_1/$cloudName/auto/upload" -Method POST -Body $body -TimeoutSec 60
    return $res.secure_url
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   CLOUDINARY ATTACHMENTS MIGRATION      " -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# 1. Fetch all attachments needing migration
Write-Host "Fetching legacy base64 attachments from Turso..." -ForegroundColor Yellow
$fetchQuery = '{"requests":[{"type":"execute","stmt":{"sql":"SELECT id, entity_type, entity_id, file_name, file_type, file_data FROM attachments WHERE file_data NOT LIKE ''http%'' AND file_data != ''''"}}]}'
$fetchRes = Invoke-WebRequest -Uri $tursoUrl -Method POST -ContentType "application/json" -Headers $tursoHeaders -Body $fetchQuery -UseBasicParsing
$fetchJson = $fetchRes.Content | ConvertFrom-Json
$attachments = $fetchJson.results[0].response.result.rows

$total = $attachments.Count
Write-Host "Found $total legacy attachments to migrate.`n" -ForegroundColor Cyan

$migrated = 0
$failed = 0

for ($i = 0; $i -lt $total; $i++) {
    $row = $attachments[$i]
    $attId      = $row[0].value
    $entityType = $row[1].value
    $entityId   = $row[2].value
    $fileName   = $row[3].value
    $fileType   = $row[4].value
    $fileData   = $row[5].value

    $percent = [math]::Round((($i + 1) / $total) * 100)
    Write-Host "[$($i + 1)/$total - $percent%] ID: $attId | $entityType #$entityId | $fileName ..." -NoNewline

    try {
        $cloudUrl = Upload-ToCloudinary -FileData $fileData -Entity $entityType -EntityId $entityId

        # Update Turso DB
        $sqlClean = $cloudUrl.Replace("'", "''")
        $updateBody = "{""requests"":[{""type"":""execute"",""stmt"":{""sql"":""UPDATE attachments SET file_data = '$sqlClean' WHERE id = $attId""}}]}"

        $upRes = Invoke-WebRequest -Uri $tursoUrl -Method POST -ContentType "application/json" -Headers $tursoHeaders -Body $updateBody -UseBasicParsing
        Write-Host " [DONE -> $cloudUrl]" -ForegroundColor Green
        $migrated++
    } catch {
        Write-Host " [FAILED: $($_.Exception.Message)]" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Migration Finished: $migrated Migrated, $failed Failed out of $total total" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan
