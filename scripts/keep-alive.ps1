# Supabase Database Keep-Alive Script
# Run this anytime to refresh activity and prevent Supabase from auto-pausing

$SupabaseUrl = "https://ejqnozlhijoajykilfpy.supabase.co"
$ApiKey = "sb_publishable_gyBNo-B1YOgEZtIOWBIfmw__pouxfqc"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Ping Supabase Database (Keep-Alive)..." -ForegroundColor Cyan
Write-Host "URL: $SupabaseUrl" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan

try {
    $headers = @{
        "apikey" = $ApiKey
        "Authorization" = "Bearer $ApiKey"
    }
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/comments?select=id&limit=1" -Headers $headers -Method Get -TimeoutSec 10
    Write-Host "✅ SUCCESS: Supabase PostgreSQL is awake and responding!" -ForegroundColor Green
    Write-Host "Activity timestamp refreshed. Auto-pause prevented." -ForegroundColor Green
} catch {
    Write-Host "⚠️ NOTICE: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "If the project is paused, please visit:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/ejqnozlhijoajykilfpy" -ForegroundColor White
    Write-Host "and click 'Restore project' to reactivate." -ForegroundColor Yellow
}
