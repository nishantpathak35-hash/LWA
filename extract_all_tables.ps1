$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODE2MTE1NjksImlkIjoiMDE5ZWQwNTItOWEwMS03YjUyLWI3NGItN2RhNjFiMmZmMzgzIiwicmlkIjoiMTU1MTIzYmUtYmM3Yi00ZjYwLThlMTItZWY5MWZlNmVjNTQ4In0.bKmCgU6EAJ7CA-HNehykhz-LVgkvTq1568iaw_IMBmhaQbj45QhLBbBycHiJbUoLBOXELcN5pM_Rxtr_GZQqAA"
}
$url = "https://lwa-nishantpathak35-hash.aws-ap-south-1.turso.io/v2/pipeline"

$tableDefs = @(
    @{
        name = "purchase_orders"
        cols = @("po_no", "vendor_key", "vendor_name", "project", "po_value", "revised_po_value", "status", "po_date", "certified_value", "legacy_paid", "advance", "final_payable", "created_at", "terms", "approval_status", "submitted_by", "submitted_at", "approved_by", "approved_at", "approval_remarks", "tds_section", "tds_pct", "tds_amount", "gst_total", "gst_mode", "expected_delivery_date", "notes", "payment_status", "category", "version", "milestones", "vendor_id", "vendor_code", "general_terms", "payment_delivery_terms")
    },
    @{
        name = "payment_requests"
        cols = @("pr_id", "po_no", "vendor_name", "project", "category", "amount_requested", "proc_amt", "finance_amt", "director_amt", "proc_approval", "finance_approval", "director_approval", "remittance", "stage", "created_at", "tds_amount", "tds_percentage", "tds_section", "remarks", "created_by", "vendor_code", "remittance_ref", "remittance_date", "approved_amount", "version", "form16a_status", "form16a_ref", "form16a_date", "milestone_name", "query_status", "query_text", "query_response", "query_asked_by", "query_asked_at", "query_answered_at", "vendor_id", "invoice_id")
    },
    @{
        name = "system_payments"
        cols = @("id", "po_no", "pr_key", "amount", "remitted_by", "created_at", "bank_name", "remarks", "reference_no", "payment_mode", "utr_ref")
    },
    @{
        name = "users"
        cols = @("email", "name", "roles", "password_hash", "invite_token", "active", "created_at", "last_login", "last_login_ip", "last_login_device", "whatsapp_number", "employee_id", "department", "mobile_number")
    },
    @{
        name = "po_items"
        cols = @("id", "po_no", "description", "hsn_sac", "qty", "unit", "rate", "disc_pct", "tax_pct", "amount")
    },
    @{
        name = "audit_logs"
        cols = @("id", "timestamp", "user", "action_type", "details", "department")
    },
    @{
        name = "project_financials"
        cols = @("project", "project_value", "bcs", "inflow", "invoice_value", "tds", "updated_at", "project_ref", "client", "site_address")
    },
    @{
        name = "po_approval_history"
        cols = @("id", "po_no", "action", "performed_by", "remarks", "timestamp")
    },
    @{
        name = "manual_payments"
        cols = @("id", "po_no", "payment_date", "amount", "payment_mode", "utr_ref", "bank_name", "reference_no", "remarks", "payment_type", "recorded_by", "created_at")
    },
    @{
        name = "attachments"
        cols = @("id", "entity_type", "entity_id", "file_name", "file_type", "file_size", "file_data", "uploaded_by", "created_at")
    },
    @{
        name = "invoices"
        cols = @("id", "vendor_name", "invoice_no", "invoice_date", "total_amount", "raw_text", "status", "created_by", "created_at", "invoice_number", "po_no", "source", "vendor_code", "vendor_id", "rejection_reason", "remarks", "project", "invoice_id", "uploaded_by", "uploaded_by_type", "tax_amount", "invoice_total", "subtotal", "approved_at", "updated_at", "version", "submitted_at", "reviewed_at")
    },
    @{
        name = "approval_workflows"
        cols = @("id", "name", "module_type", "description", "is_active", "is_archived", "version", "created_by", "created_at", "updated_at")
    },
    @{
        name = "approval_workflow_stages"
        cols = @("id", "workflow_id", "stage_name", "sequence", "approver_role", "specific_user", "department", "min_approval_count", "approval_type", "comments_mandatory", "auto_approval", "escalation_ready", "skip_conditions", "is_active", "created_at")
    },
    @{
        name = "tds_sections"
        cols = @("id", "section_code", "description", "rate", "threshold", "surcharge", "cess", "effective_from", "effective_to", "is_active", "is_archived", "is_default", "sort_order", "created_at", "updated_at")
    },
    @{
        name = "dpr_reports"
        cols = @("id", "project", "site", "client", "date", "prepared_by", "weather", "shift", "status", "approval_status", "checked_by", "approved_by", "data", "created_at", "updated_at")
    },
    @{
        name = "dpr_templates"
        cols = @("id", "name", "description", "data", "created_at")
    },
    @{
        name = "notifications"
        cols = @("id", "recipient_email", "recipient_role", "type", "title", "body", "record_type", "record_id", "actor_name", "actor_email", "is_read", "created_at")
    },
    @{
        name = "vendor_portal_users"
        cols = @("id", "vendor_id", "vendor_code", "email", "name", "password_hash", "status", "last_login", "created_at")
    },
    @{
        name = "vendor_onboarding_invitations"
        cols = @("id", "invitation_id", "email", "token", "status", "expires_at", "invited_by", "created_at", "completed_at", "vendor_id")
    },
    @{
        name = "vendor_onboarding_submissions"
        cols = @("id", "submission_id", "invitation_id", "email", "legal_name", "trade_name", "vendor_type", "gstin", "pan", "address", "city", "state", "pincode", "primary_contact_name", "primary_contact_no", "accounts_contact_name", "accounts_contact_no", "bank_name", "bank_account", "ifsc", "branch", "status", "submitted_at", "reviewed_at", "reviewed_by", "rejection_reason")
    }
)

Write-Host "Extracting all table datasets..." -ForegroundColor Cyan

$idCounter = 3000
foreach ($t in $tableDefs) {
    $tbl = $t.name
    Write-Host "Fetching $tbl ... " -NoNewline
    $idCounter++
    
    $jsonObjParts = @()
    foreach ($c in $t.cols) {
        $jsonObjParts += "'$c', $c"
    }
    $jsonObjExpr = "json_object(" + ($jsonObjParts -join ", ") + ")"
    
    # Try from _full_<tbl> first
    $sql = "INSERT INTO _extract_temp (id, val) VALUES ($idCounter, 'x') ON CONFLICT(id) DO UPDATE SET val='x' RETURNING (SELECT json_group_array($jsonObjExpr) FROM _full_$tbl)"
    $body = @{requests=@(@{type="execute";stmt=@{sql=$sql}})} | ConvertTo-Json -Depth 5 -Compress
    
    $r = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Headers $headers -Body $body -UseBasicParsing
    $parsed = $r.Content | ConvertFrom-Json
    
    if ($parsed.results[0].type -eq "ok" -and $parsed.results[0].response.result.rows.Count -gt 0) {
        $data = $parsed.results[0].response.result.rows[0][0].value
        $filePath = "rescue_data\$tbl.json"
        [System.IO.File]::WriteAllText($filePath, $data, [System.Text.Encoding]::UTF8)
        Write-Host "OK ($($data.Length) bytes)" -ForegroundColor Green
    } else {
        # Fallback to direct table name
        $idCounter++
        $sql2 = "INSERT INTO _extract_temp (id, val) VALUES ($idCounter, 'x') ON CONFLICT(id) DO UPDATE SET val='x' RETURNING (SELECT json_group_array($jsonObjExpr) FROM $tbl)"
        $body2 = @{requests=@(@{type="execute";stmt=@{sql=$sql2}})} | ConvertTo-Json -Depth 5 -Compress
        $r2 = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Headers $headers -Body $body2 -UseBasicParsing
        $parsed2 = $r2.Content | ConvertFrom-Json
        if ($parsed2.results[0].type -eq "ok" -and $parsed2.results[0].response.result.rows.Count -gt 0) {
            $data2 = $parsed2.results[0].response.result.rows[0][0].value
            $filePath2 = "rescue_data\$tbl.json"
            [System.IO.File]::WriteAllText($filePath2, $data2, [System.Text.Encoding]::UTF8)
            Write-Host "OK ($($data2.Length) bytes)" -ForegroundColor Green
        } else {
            Write-Host "FAILED ($($parsed.results[0].error.message))" -ForegroundColor Red
        }
    }
}

Write-Host "`nAll extraction completed!" -ForegroundColor Cyan
