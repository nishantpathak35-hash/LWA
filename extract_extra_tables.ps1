$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODE2MTE1NjksImlkIjoiMDE5ZWQwNTItOWEwMS03YjUyLWI3NGItN2RhNjFiMmZmMzgzIiwicmlkIjoiMTU1MTIzYmUtYmM3Yi00ZjYwLThlMTItZWY5MWZlNmVjNTQ4In0.bKmCgU6EAJ7CA-HNehykhz-LVgkvTq1568iaw_IMBmhaQbj45QhLBbBycHiJbUoLBOXELcN5pM_Rxtr_GZQqAA"
}
$url = "https://lwa-nishantpathak35-hash.aws-ap-south-1.turso.io/v2/pipeline"

$extraTables = @(
    @{name="rooms"; cols=@("id", "project", "name", "area_sqft", "status", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="milestones"; cols=@("id", "project", "title", "target_date", "actual_date", "status", "payment_linked", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="tasks"; cols=@("id", "project", "room_id", "title", "assigned_to", "due_date", "priority", "status", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="issues"; cols=@("id", "project", "room_id", "title", "description", "priority", "assigned_to", "resolved_at", "status", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="snags"; cols=@("id", "project", "room_id", "description", "photo_before", "photo_after", "assigned_to", "status", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="site_diaries"; cols=@("id", "project", "date", "site_engineer", "weather", "work_done", "notes", "submitted_at", "status", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="site_diary_photos"; cols=@("id", "diary_id", "file_url", "room_id", "caption", "uploaded_by", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="labour_attendance"; cols=@("id", "diary_id", "project", "type", "count", "contractor", "cost", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="material_receipts"; cols=@("id", "project", "po_no", "item_code", "quantity", "unit", "received_by", "vehicle_no", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="clients"; cols=@("id", "name", "email", "password_hash", "contact", "gst", "address", "status", "created_by", "created_at", "updated_at", "deleted_at", "deleted_by")},
    @{name="item_master"; cols=@("id", "item_code", "description", "hsn_sac", "unit", "rate", "gst_pct", "category", "is_active", "created_by", "created_at", "updated_at", "sub_category", "aliases", "specification", "material_rate_metro", "labour_rate_metro", "material_labour_rate_metro", "material_rate_tier2", "labour_rate_tier2", "material_labour_rate_tier2", "preferred_vendor_type", "preferred_make", "procurement_lead_time", "wastage_pct", "installation_complexity", "required_skill_level", "rate_confidence", "rate_validity", "last_rate_updated", "recommended_rate_review_freq", "item_status", "revision", "keywords", "remarks")},
    @{name="number_series"; cols=@("id", "module_type", "prefix", "separator", "padding_length", "starting_number", "current_number", "fy_format", "include_fy", "is_active", "created_at", "updated_at")},
    @{name="number_series_transactions"; cols=@("id", "series_id", "allocated_number", "formatted_number", "entity_id", "allocated_by", "allocated_at")},
    @{name="global_configurations"; cols=@("id", "config_key", "config_value", "config_type", "module", "description", "updated_at")},
    @{name="wpr_schedules"; cols=@("id", "project", "milestone_name", "floor_zone", "planned_start", "planned_end", "planned_progress_curve", "render_image_url", "created_at")},
    @{name="wpr_reports"; cols=@("id", "project", "week_start", "week_end", "generated_by", "planned_progress", "actual_progress", "variance", "render_image_url", "actual_image_url", "summary_text", "created_at")},
    @{name="tds_challan_281"; cols=@("id", "month", "tan", "minor_head", "section_code", "itd_code", "base_tds", "interest", "fee_234e", "total_challan_amount", "bsr_code", "challan_no", "challan_date", "bank_name", "cin", "status", "remarks", "created_at")},
    @{name="record_comments"; cols=@("id", "record_type", "record_id", "author_email", "author_name", "content", "mentions", "created_at")},
    @{name="user_tasks"; cols=@("id", "assigned_to", "assigned_by", "title", "record_type", "record_id", "due_date", "status", "created_at")},
    @{name="activity_logs"; cols=@("id", "user_email", "user_name", "action", "target_type", "target_id", "details", "created_at")}
)

Write-Host "Extracting extra tables..." -ForegroundColor Cyan

$idCounter = 5000
foreach ($t in $extraTables) {
    $tbl = $t.name
    Write-Host "Fetching $tbl ... " -NoNewline
    $idCounter++
    
    $jsonObjParts = @()
    foreach ($c in $t.cols) {
        $jsonObjParts += "'$c', $c"
    }
    $jsonObjExpr = "json_object(" + ($jsonObjParts -join ", ") + ")"
    
    $sql = "INSERT INTO _extract_temp (id, val) VALUES ($idCounter, 'x') ON CONFLICT(id) DO UPDATE SET val='x' RETURNING (SELECT json_group_array($jsonObjExpr) FROM $tbl)"
    $body = @{requests=@(@{type="execute";stmt=@{sql=$sql}})} | ConvertTo-Json -Depth 5 -Compress
    
    try {
        $r = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Headers $headers -Body $body -UseBasicParsing
        $parsed = $r.Content | ConvertFrom-Json
        
        if ($parsed.results[0].type -eq "ok" -and $parsed.results[0].response.result.rows.Count -gt 0) {
            $data = $parsed.results[0].response.result.rows[0][0].value
            $filePath = "rescue_data\$tbl.json"
            [System.IO.File]::WriteAllText($filePath, $data, [System.Text.Encoding]::UTF8)
            Write-Host "OK ($($data.Length) bytes)" -ForegroundColor Green
        } else {
            Write-Host "EMPTY/NONE" -ForegroundColor Gray
        }
    } catch {
        Write-Host "ERR: $_" -ForegroundColor Red
    }
}

Write-Host "Extra tables extraction complete!" -ForegroundColor Cyan
