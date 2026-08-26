$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyOTYxNDgsImlkIjoiMDFhMDIzMjYtOTEwMS03OTg2LTg5N2EtNTI1YjFiMzMzYzRhIiwia2lkIjoiOTlpUmltMlowT0xtak4wNWJsdnJWQnZaSTR2eWFpLWFtclJ5N0ZxTU92dyIsInJpZCI6IjZmYmJlZTMxLWY2MTEtNDZmOC05YzY4LWUwYmY2ZjY4YmJkOCJ9.O9Z2E7lQ3kHsWeqRfQGLUFYF-Z3taOHbQ8eUIHEZDvvtYL3l5cJIRjowqYm0jvOqRG1pbvYUyrwnJqda6jSgDg"
}
$url = "https://lwa-lwa-hash.aws-ap-south-1.turso.io/v2/pipeline"

function Invoke-NewDB($requests) {
    $body = @{ requests = $requests } | ConvertTo-Json -Depth 10 -Compress
    $r = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Headers $headers -Body $body -UseBasicParsing
    return ($r.Content | ConvertFrom-Json)
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " STARTING RESTORATION TO NEW TURSO DB     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Re-create all tables
Write-Host "`n[Step 1] Creating schema in new database..." -ForegroundColor Yellow

$schemasContent = [System.IO.File]::ReadAllText("rescue_data\all_schemas.json", [System.Text.Encoding]::UTF8)
$schemasObj = $schemasContent | ConvertFrom-Json
$schemasStr = $schemasObj.results[0].response.result.rows[0][0].value

$statements = $schemasStr -split '\n---\n'

$schemaRequests = @()
foreach ($stmt in $statements) {
    $s = $stmt.Trim()
    if ($s.StartsWith("CREATE TABLE") -and -not $s.Contains("_full_") -and -not $s.Contains("_data_") -and -not $s.Contains("_schema_") -and -not $s.Contains("_extract_") -and -not $s.Contains("sqlite_sequence")) {
        $schemaRequests += @{
            type = "execute"
            stmt = @{ sql = $s }
        }
    }
}

Write-Host "Applying $($schemaRequests.Count) table creation queries..." -ForegroundColor Gray
$res = Invoke-NewDB $schemaRequests
Write-Host "Schema creation completed!" -ForegroundColor Green

# Step 2: Import Data for Each Table
Write-Host "`n[Step 2] Importing rescued datasets..." -ForegroundColor Yellow

$dataFiles = Get-ChildItem -Path "rescue_data" -Filter "*.json" | Where-Object { 
    $_.Name -ne "all_schemas.json" -and $_.Length -gt 5 
}

foreach ($file in $dataFiles) {
    $tableName = $file.BaseName
    Write-Host "Restoring table: $tableName ... " -NoNewline
    
    $jsonText = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    try {
        $rows = $jsonText | ConvertFrom-Json
    } catch {
        Write-Host "Error parsing JSON: $_" -ForegroundColor Red
        continue
    }
    
    if (-not $rows -or $rows.Count -eq 0) {
        Write-Host "0 rows (Skipped)" -ForegroundColor Gray
        continue
    }
    
    $totalRows = $rows.Count
    $batchSize = 25
    $imported = 0
    
    for ($i = 0; $i -lt $totalRows; $i += $batchSize) {
        $batch = $rows[$i..([Math]::Min($i + $batchSize - 1, $totalRows - 1))]
        $batchRequests = @()
        
        foreach ($row in $batch) {
            $cols = @()
            $placeholders = @()
            $args = @()
            
            foreach ($prop in $row.PSObject.Properties) {
                $cols += $prop.Name
                $placeholders += "?"
                $val = $prop.Value
                if ($null -eq $val) {
                    $args += @{ type = "null" }
                } elseif ($val -is [int] -or $val -is [long]) {
                    $args += @{ type = "integer"; value = "$val" }
                } elseif ($val -is [double] -or $val -is [float] -or $val -is [decimal]) {
                    $args += @{ type = "float"; value = $val }
                } elseif ($val -is [bool]) {
                    $args += @{ type = "integer"; value = $(if($val){"1"}else{"0"}) }
                } else {
                    $args += @{ type = "text"; value = [string]$val }
                }
            }
            
            $colNamesStr = ($cols | ForEach-Object { "`"$_`"" }) -join ", "
            $phStr = $placeholders -join ", "
            $sql = "INSERT OR REPLACE INTO `"$tableName`" ($colNamesStr) VALUES ($phStr)"
            
            $batchRequests += @{
                type = "execute"
                stmt = @{
                    sql = $sql
                    args = $args
                }
            }
        }
        
        $batchRes = Invoke-NewDB $batchRequests
        $imported += $batch.Count
    }
    
    Write-Host "RESTORED ($imported rows)" -ForegroundColor Green
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " DATA RESTORATION FINISHED SUCCESSFULLY!  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
