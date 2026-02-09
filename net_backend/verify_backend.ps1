$baseUrl = "http://localhost:3001"
$headers = @{ "Content-Type" = "application/json" }

function Test-Duplicate($endpoint, $payload, $name) {
    Write-Host "Testing $name..." -NoNewline
    
    # First creation - should succeed or already exist
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/$endpoint" -Method Post -Headers $headers -Body $payload -ErrorAction Stop
        Write-Host " Created - " -NoNewline
    } catch {
        # If it fails, check if it's because it already exists (409 or 400 with specific message)
        $err = $_.Exception.Response
         if ($err.StatusCode -eq [System.Net.HttpStatusCode]::Conflict -or $err.StatusCode -eq [System.Net.HttpStatusCode]::BadRequest) {
             Write-Host " Exists - " -NoNewline
         } else {
             Write-Host " Error: $($err.StatusCode) - " -NoNewline
         }
    }

    # Second creation - MUST fail
    try {
        Invoke-RestMethod -Uri "$baseUrl/$endpoint" -Method Post -Headers $headers -Body $payload -ErrorAction Stop
        Write-Host "FAILED (Duplicate allowed)" -ForegroundColor Red
    } catch {
        $err = $_.Exception.Response
        if ($err.StatusCode -eq [System.Net.HttpStatusCode]::BadRequest -or $err.StatusCode -eq [System.Net.HttpStatusCode]::Conflict) {
            # Read error message
             $reader = New-Object System.IO.StreamReader($err.GetResponseStream())
             $responseBody = $reader.ReadToEnd()
             if ($responseBody -match "already exists") {
                 Write-Host "SUCCESS (Blocked: $responseBody)" -ForegroundColor Green
             } else {
                 Write-Host "WARNING (Blocked but msg differ: $responseBody)" -ForegroundColor Yellow
             }
        } else {
            Write-Host "FAILED (Unexpected error: $($err.StatusCode))" -ForegroundColor Red
        }
    }
}

# 1. Company
$companyPayload = '{"name": "Test Duplicate Company"}'
Test-Duplicate "companies" $companyPayload "Company"

# 2. Contractor
$contractorPayload = '{"name": "Test Duplicate Contractor"}'
Test-Duplicate "contractors" $contractorPayload "Contractor"

# 3. Item Category
$categoryPayload = '{"name": "Test Duplicate Category"}'
Test-Duplicate "item-categories" $categoryPayload "Item Category"

# 4. Status
$statusPayload = '{"name": "Test Duplicate Status"}'
Test-Duplicate "statuses" $statusPayload "Status"

# 5. Location (Composite: CompanyId + Name)
# Assuming CompanyId 1 exists. If not, this might fail to find company, but let's assume seed data or previous test created one.
# We'll use the ID from the first company created/found
try {
    $companies = Invoke-RestMethod -Uri "$baseUrl/companies" -Method Get
    $companyId = $companies.data[0].id
    $locationPayload = '{"name": "Test Duplicate Location", "companyId": ' + $companyId + '}'
    Test-Duplicate "locations" $locationPayload "Location"
} catch {
    Write-Host "Skipping Location test (No companies found)" -ForegroundColor Yellow
}

# 6. Machine (Composite: ContractorId + Name)
try {
    $contractors = Invoke-RestMethod -Uri "$baseUrl/contractors" -Method Get
    $contractorId = $contractors.data[0].id
    $machinePayload = '{"name": "Test Duplicate Machine", "contractorId": ' + $contractorId + '}'
    Test-Duplicate "machines" $machinePayload "Machine"
} catch {
    Write-Host "Skipping Machine test (No contractors found)" -ForegroundColor Yellow
}

# 7. Item (Composite: CategoryId + ItemName) - Note: Item usually requires form-data because of image, validation might adhere to that.
# Our backend controller uses [FromForm] for Items, so JSON might not work directly. 
# We'll skip Item JSON test for now or try to use proper content type if supported.
# ItemsController.Create uses [FromForm], so we can't test it easily with simple JSON payload in PS without constructing multipart.
Write-Host "Skipping Item test (Requires Multipart/Form-Data)" -ForegroundColor Yellow
