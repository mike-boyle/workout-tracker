# scripts/check-quota.ps1
# Script to check Firebase Firestore and Google Cloud reCAPTCHA Enterprise usage/quotas.

$ErrorActionPreference = "Stop"

# Get project ID from .firebaserc
$firebaseRcPath = Join-Path $PSScriptRoot "..\.firebaserc"
if (Test-Path $firebaseRcPath) {
    $firebaseRc = Get-Content $firebaseRcPath | ConvertFrom-Json
    $project = $firebaseRc.projects.default
} else {
    $project = "workout-tracker-498019" # fallback
}

Write-Host "Checking usage and quotas for project: $project"
Write-Host "=================================================="

# Retrieve access token using gcloud CLI
try {
    $token = (gcloud auth print-access-token).Trim()
} catch {
    Write-Error "Failed to obtain access token from gcloud CLI. Ensure 'gcloud auth login' has been run."
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# 1. Check Billing Status
$billingEnabled = $false
try {
    $billing = gcloud billing projects describe $project --format="json" | ConvertFrom-Json
    $billingEnabled = $billing.billingEnabled
} catch {
    Write-Warning "Could not determine billing status. Assuming billing is not enabled."
}

Write-Host "Billing Enabled: $billingEnabled"

# Prepare Report Content
$report = @()
$report += "## Quota & Usage Report for **$project**"
$report += "Generated on: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
$report += ""

$hasAlert = $false

# 2. Check reCAPTCHA Enterprise Usage
$report += "### 🛡️ reCAPTCHA Enterprise"
try {
    $keys = gcloud recaptcha keys list --project=$project --format="json" | ConvertFrom-Json
    if ($keys -and $keys.Count -gt 0) {
        $currentMonth = (Get-Date).Month
        $currentYear = (Get-Date).Year
        
        foreach ($key in $keys) {
            $keyId = $key.name.Split('/')[-1]
            $displayName = $key.displayName
            
            $uri = "https://recaptchaenterprise.googleapis.com/v1/projects/$project/keys/$keyId/metrics"
            $metrics = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
            
            $totalMonthAssessments = 0
            if ($metrics.scoreMetrics) {
                $startDate = [DateTime]$metrics.startTime
                for ($i = 0; $i -lt $metrics.scoreMetrics.Count; $i++) {
                    $date = $startDate.AddDays($i)
                    if ($date.Month -eq $currentMonth -and $date.Year -eq $currentYear) {
                        $buckets = $metrics.scoreMetrics[$i].overallMetrics.scoreBuckets
                        if ($buckets) {
                            foreach ($prop in $buckets.PSObject.Properties) {
                                $totalMonthAssessments += [int]$prop.Value
                            }
                        }
                    }
                }
            }
            
            $limit = 10000
            $pct = ($totalMonthAssessments / $limit) * 100
            $statusStr = "OK"
            if ($pct -ge 80) {
                $statusStr = "⚠️ WARNING (High Usage)"
                $hasAlert = $true
            }
            
            $report += "- **Key:** $displayName (``$keyId``)"
            $report += "  - **Monthly Usage (June):** $totalMonthAssessments / $limit assessments ($( [Math]::Round($pct, 2) )%)"
            $report += "  - **Status:** $statusStr"
        }
    } else {
        $report += "- No reCAPTCHA keys found in project."
    }
} catch {
    $report += "- ❌ Error querying reCAPTCHA metrics: $_"
    $hasAlert = $true
}
$report += ""

# 3. Check Firestore Usage
$report += "### 🔥 Cloud Firestore"
if ($billingEnabled) {
    # Calculate start/end time for Pacific Time (Firestore's daily reset timezone)
    $ptZone = [System.TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
    $ptNow = [System.TimeZoneInfo]::ConvertTimeFromUtc((Get-Date).ToUniversalTime(), $ptZone)
    $ptMidnight = Get-Date -Year $ptNow.Year -Month $ptNow.Month -Day $ptNow.Day -Hour 0 -Minute 0 -Second 0
    $utcMidnight = [System.TimeZoneInfo]::ConvertTimeToUtc($ptMidnight, $ptZone)
    
    $startTime = $utcMidnight.ToString("yyyy-MM-ddTHH:mm:ssZ")
    $endTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    # Check 25 hours window for storage gauge metric
    $storageStartTime = (Get-Date).AddHours(-25).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    # Helper function to get sum of delta metrics
    function Get-GCMMetricSum($metricType) {
        $uri = "https://monitoring.googleapis.com/v3/projects/$project/timeSeries?filter=metric.type=`"$metricType`"&interval.startTime=$startTime&interval.endTime=$endTime"
        try {
            $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
            $sum = 0
            if ($res.timeSeries) {
                foreach ($ts in $res.timeSeries) {
                    foreach ($point in $ts.points) {
                        $sum += [long]$point.value.int64Value
                    }
                }
            }
            return $sum
        } catch {
            return $null
        }
    }
    
    # Helper function to get latest gauge metric
    function Get-GCMMetricLatest($metricType) {
        $uri = "https://monitoring.googleapis.com/v3/projects/$project/timeSeries?filter=metric.type=`"$metricType`"&interval.startTime=$storageStartTime&interval.endTime=$endTime"
        try {
            $res = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
            if ($res.timeSeries) {
                $latestVal = 0
                $latestTime = [DateTime]::MinValue
                foreach ($ts in $res.timeSeries) {
                    foreach ($point in $ts.points) {
                        $pTime = [DateTime]$point.interval.endTime
                        if ($pTime -gt $latestTime) {
                            $latestTime = $pTime
                            $latestVal = [long]$point.value.int64Value
                        }
                    }
                }
                return $latestVal
            }
            return 0
        } catch {
            return $null
        }
    }
    
    # Retrieve metrics
    $reads = Get-GCMMetricSum "firestore.googleapis.com/document/read_ops_count"
    $writes = Get-GCMMetricSum "firestore.googleapis.com/document/write_ops_count"
    $deletes = Get-GCMMetricSum "firestore.googleapis.com/document/delete_ops_count"
    $storage = Get-GCMMetricLatest "firestore.googleapis.com/storage/data_and_index_storage_bytes"
    
    # Quotas
    $readLimit = 50000
    $writeLimit = 20000
    $deleteLimit = 20000
    $storageLimit = 1073741824 # 1 GiB
    
    # Format Reads
    if ($null -ne $reads) {
        $pct = ($reads / $readLimit) * 100
        $status = if ($pct -ge 80) { "⚠️ WARNING" } else { "OK" }
        if ($pct -ge 80) { $hasAlert = $true }
        $report += "- **Document Reads:** $reads / $readLimit per day ($( [Math]::Round($pct, 2) )%) - $status"
    } else {
        $report += "- **Document Reads:** Unable to retrieve metric"
    }
    
    # Format Writes
    if ($null -ne $writes) {
        $pct = ($writes / $writeLimit) * 100
        $status = if ($pct -ge 80) { "⚠️ WARNING" } else { "OK" }
        if ($pct -ge 80) { $hasAlert = $true }
        $report += "- **Document Writes:** $writes / $writeLimit per day ($( [Math]::Round($pct, 2) )%) - $status"
    } else {
        $report += "- **Document Writes:** Unable to retrieve metric"
    }
    
    # Format Deletes
    if ($null -ne $deletes) {
        $pct = ($deletes / $deleteLimit) * 100
        $status = if ($pct -ge 80) { "⚠️ WARNING" } else { "OK" }
        if ($pct -ge 80) { $hasAlert = $true }
        $report += "- **Document Deletes:** $deletes / $deleteLimit per day ($( [Math]::Round($pct, 2) )%) - $status"
    } else {
        $report += "- **Document Deletes:** Unable to retrieve metric"
    }
    
    # Format Storage
    if ($null -ne $storage) {
        $storageGiB = $storage / 1024 / 1024 / 1024
        $pct = ($storage / $storageLimit) * 100
        $status = if ($pct -ge 80) { "⚠️ WARNING" } else { "OK" }
        if ($pct -ge 80) { $hasAlert = $true }
        $report += "- **Stored Data:** $( [Math]::Round($storageGiB, 4) ) GiB / 1.0 GiB ($( [Math]::Round($pct, 2) )%) - $status"
    } else {
        $report += "- **Stored Data:** Unable to retrieve metric"
    }
} else {
    $report += "- ℹ️ **Firestore Daily Operations:** Programmatic monitoring of daily counters is disabled (requires Google billing enabled)."
    $report += "  - *Note:* Staying under Spark Plan limits (50k reads, 20k writes, 20k deletes/day) is still 100% free."
    
    # Check Cloud Logging for quota/exhaustion errors in last 24 hours
    try {
        $last24Hours = (Get-Date).AddDays(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        $logFilter = "timestamp >= `"$last24Hours`" AND (textPayload:`"quota`" OR textPayload:`"exhausted`" OR protoPayload.status.code=8 OR protoPayload.status.message:`"Quota`")"
        
        $logErrors = gcloud logging read $logFilter --limit=100 --format="json" --project=$project | ConvertFrom-Json
        
        if ($logErrors -and $logErrors.Count -gt 0) {
            $report += "  - 🚨 **ALERT:** Detected $($logErrors.Count) quota or exhaustion events in Cloud Logging in the last 24 hours!"
            $hasAlert = $true
            foreach ($log in $logErrors) {
                $time = $log.timestamp
                $msg = if ($log.textPayload) { $log.textPayload } else { $log.protoPayload.status.message }
                $report += "    - `[$time]` $msg"
            }
        } else {
            $report += "  - **Status:** No quota-related errors detected in Cloud Logging in the last 24 hours."
        }
    } catch {
        $report += "  - ⚠️ Failed to query Cloud Logging for quota errors: $_"
    }
}

$report += ""
if ($hasAlert) {
    $report += "### 🚨 ALERT: One or more quotas are above 80% or failed to query!"
} else {
    $report += "### ✅ Status: All checked systems are well below quota."
}

# Print the report
$reportText = $report -join "`n"
Write-Host $reportText

# Output alert flag for scheduled cron parsing
if ($hasAlert) {
    Write-Host "[QUOTA_ALERT_DETECTED]"
}
