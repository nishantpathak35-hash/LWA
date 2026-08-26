$jwtSecret = "lwa-dev-super-secure-jwt-secret-key-2026-xyz"
$legacyKeyStr = $jwtSecret.Substring(0, [Math]::Min(32, $jwtSecret.Length)).PadRight(32, '0')
$keyBytes = [System.Text.Encoding]::UTF8.GetBytes($legacyKeyStr)

$payloadJson = @{
    email = "nishant@luxeworxatelier.com"
    exp = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + (7 * 24 * 60 * 60 * 1000))
} | ConvertTo-Json -Compress

$plainBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadJson)

$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Key = $keyBytes
$aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
$aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
$aes.GenerateIV()
$iv = $aes.IV

$encryptor = $aes.CreateEncryptor()
$cipherBytes = $encryptor.TransformFinalBlock($plainBytes, 0, $plainBytes.Length)

$ivHex = ($iv | ForEach-Object { $_.ToString("x2") }) -join ""
$cipherHex = ($cipherBytes | ForEach-Object { $_.ToString("x2") }) -join ""
$token = $ivHex + $cipherHex

Write-Host "Generated Token: $token" -ForegroundColor Yellow

$body = @{
    method = "getBootBundle"
    args = @()
} | ConvertTo-Json -Compress

$headers = @{
    "Content-Type" = "application/json"
    "x-lwa-token" = $token
}

try {
    $res = Invoke-WebRequest -Uri "https://lwa-iota.vercel.app/api/rpc" -Method POST -Headers $headers -Body $body -UseBasicParsing
    $parsed = $res.Content | ConvertFrom-Json
    Write-Host "`nSUCCESS! Vercel Live Boot Data:" -ForegroundColor Green
    Write-Host "User Email:" $parsed.user.email
    Write-Host "Vendors count:" $parsed.master.vendors.Count
    Write-Host "POs count:" $parsed.master.pos.Count
    Write-Host "Payments count:" $parsed.payments.Count
    Write-Host "KPI Total POs:" $parsed.kpis.pos
    Write-Host "KPI Total Value:" $parsed.kpis.totalPOValue
} catch {
    Write-Host "Vercel Error: $_" -ForegroundColor Red
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Error Body: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
