$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyOTYxNDgsImlkIjoiMDFhMDIzMjYtOTEwMS03OTg2LTg5N2EtNTI1YjFiMzMzYzRhIiwia2lkIjoiOTlpUmltMlowT0xtak4wNWJsdnJWQnZaSTR2eWFpLWFtclJ5N0ZxTU92dyIsInJpZCI6IjZmYmJlZTMxLWY2MTEtNDZmOC05YzY4LWUwYmY2ZjY4YmJkOCJ9.O9Z2E7lQ3kHsWeqRfQGLUFYF-Z3taOHbQ8eUIHEZDvvtYL3l5cJIRjowqYm0jvOqRG1pbvYUyrwnJqda6jSgDg"
}
$url = "https://lwa-lwa-hash.aws-ap-south-1.turso.io/v2/pipeline"

function Test-Query($name, $sql) {
    Write-Host "Testing $name ... " -NoNewline
    $body = @{requests=@(@{type="execute";stmt=@{sql=$sql}})} | ConvertTo-Json -Depth 5 -Compress
    $r = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Headers $headers -Body $body -UseBasicParsing
    $p = $r.Content | ConvertFrom-Json
    if ($p.results[0].type -eq "ok") {
        $count = $p.results[0].response.result.rows.Count
        Write-Host "OK ($count rows returned)" -ForegroundColor Green
    } else {
        Write-Host "FAIL: $($p.results[0].error.message)" -ForegroundColor Red
    }
}

Test-Query "Vendors" "SELECT * FROM vendors LIMIT 10"
Test-Query "Purchase Orders" "SELECT * FROM purchase_orders LIMIT 10"
Test-Query "Payment Requests" "SELECT * FROM payment_requests LIMIT 10"
Test-Query "System Payments" "SELECT * FROM system_payments LIMIT 10"
Test-Query "Users" "SELECT * FROM users LIMIT 10"
Test-Query "App Settings" "SELECT * FROM app_settings"
Test-Query "TDS Sections" "SELECT * FROM tds_sections WHERE is_active = 1"
Test-Query "Project Financials" "SELECT * FROM project_financials"
Test-Query "Invoices" "SELECT * FROM invoices LIMIT 10"
Test-Query "Audit Logs" "SELECT * FROM audit_logs LIMIT 10"
Test-Query "Attachments" "SELECT * FROM attachments LIMIT 10"
