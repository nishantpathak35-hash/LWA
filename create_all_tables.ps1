$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyOTYxNDgsImlkIjoiMDFhMDIzMjYtOTEwMS03OTg2LTg5N2EtNTI1YjFiMzMzYzRhIiwia2lkIjoiOTlpUmltMlowT0xtak4wNWJsdnJWQnZaSTR2eWFpLWFtclJ5N0ZxTU92dyIsInJpZCI6IjZmYmJlZTMxLWY2MTEtNDZmOC05YzY4LWUwYmY2ZjY4YmJkOCJ9.O9Z2E7lQ3kHsWeqRfQGLUFYF-Z3taOHbQ8eUIHEZDvvtYL3l5cJIRjowqYm0jvOqRG1pbvYUyrwnJqda6jSgDg"
}
$url = "https://lwa-lwa-hash.aws-ap-south-1.turso.io/v2/pipeline"

function Invoke-NewDB($requests) {
    $body = @{ requests = $requests } | ConvertTo-Json -Depth 10 -Compress
    $r = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Headers $headers -Body $body -UseBasicParsing
    return ($r.Content | ConvertFrom-Json)
}

$schemasRaw = [System.IO.File]::ReadAllText("rescue_data\all_schemas.json", [System.Text.Encoding]::UTF8)
$schemasObj = $schemasRaw | ConvertFrom-Json
$schemasStr = $schemasObj.results[0].response.result.rows[0][0].value

$stmts = $schemasStr -split '\\n---\\n'
Write-Host "Found $($stmts.Count) CREATE TABLE definitions in schema dump." -ForegroundColor Cyan

foreach ($stmt in $stmts) {
    $s = $stmt.Trim()
    if ($s.StartsWith("CREATE TABLE") -and -not $s.Contains("_full_") -and -not $s.Contains("_data_") -and -not $s.Contains("_schema_") -and -not $s.Contains("_extract_") -and -not $s.Contains("sqlite_sequence") -and -not $s.Contains("_table_list")) {
        # Unescape \n
        $cleanedSql = $s.Replace('\n', "`n")
        Write-Host "Creating table... " -NoNewline
        $res = Invoke-NewDB @(@{ type = "execute"; stmt = @{ sql = $cleanedSql } })
        if ($res.results[0].type -eq "ok") {
            Write-Host "OK" -ForegroundColor Green
        } else {
            Write-Host "ERR: $($res.results[0].error.message)" -ForegroundColor Red
        }
    }
}
