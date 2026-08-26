$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyOTYxNDgsImlkIjoiMDFhMDIzMjYtOTEwMS03OTg2LTg5N2EtNTI1YjFiMzMzYzRhIiwia2lkIjoiOTlpUmltMlowT0xtak4wNWJsdnJWQnZaSTR2eWFpLWFtclJ5N0ZxTU92dyIsInJpZCI6IjZmYmJlZTMxLWY2MTEtNDZmOC05YzY4LWUwYmY2ZjY4YmJkOCJ9.O9Z2E7lQ3kHsWeqRfQGLUFYF-Z3taOHbQ8eUIHEZDvvtYL3l5cJIRjowqYm0jvOqRG1pbvYUyrwnJqda6jSgDg"
}
$url = "https://lwa-lwa-hash.aws-ap-south-1.turso.io/v2/pipeline"

function Invoke-NewDB($requests) {
    $body = @{ requests = $requests } | ConvertTo-Json -Depth 10 -Compress
    $r = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Headers $headers -Body $body -UseBasicParsing
    return ($r.Content | ConvertFrom-Json)
}

$raw = [System.IO.File]::ReadAllText("rescue_data\vendors.json", [System.Text.Encoding]::UTF8)
$parsed = $raw | ConvertFrom-Json
$innerJsonStr = $parsed.results[0].response.result.rows[0][0].value
$rows = $innerJsonStr | ConvertFrom-Json

Write-Host "Parsed $($rows.Count) vendors from rescue file!" -ForegroundColor Yellow

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
        $sql = "INSERT OR REPLACE INTO vendors ($colNamesStr) VALUES ($phStr)"
        
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

Write-Host "VENDORS IMPORTED: $imported rows successfully!" -ForegroundColor Green
