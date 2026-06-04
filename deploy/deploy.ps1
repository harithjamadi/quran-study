# mubinapp.com - provisioning orchestrator (run from the deploy/ folder)
# Order: (1) budget safety net -> (2) SSH key pair -> (3) CloudFormation stack.
# Re-runnable: each step is guarded so re-running won't duplicate resources.

$ErrorActionPreference = "Stop"
$Region    = "ap-southeast-5"
$StackName = "mubin-prod"
$KeyName   = "mubin-key"
$AccountId = (aws sts get-caller-identity --query Account --output text)

Write-Host "Account: $AccountId  Region: $Region" -ForegroundColor Cyan

# --- STEP 1: $10/mo budget with 80% actual + forecast email alerts --------
Write-Host "`n[1/3] Creating budget mubin-monthly-10usd..." -ForegroundColor Yellow
$exists = aws budgets describe-budget --account-id $AccountId --budget-name "mubin-monthly-10usd" 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "  Budget already exists - skipping." -ForegroundColor DarkGray
} else {
  aws budgets create-budget `
    --account-id $AccountId `
    --budget file://budget.json `
    --notifications-with-subscribers file://budget-notifications.json
  Write-Host "  Budget created." -ForegroundColor Green
}

# --- STEP 2: SSH key pair (private key saved locally, chmod 400) -----------
Write-Host "`n[2/3] Creating SSH key pair $KeyName..." -ForegroundColor Yellow
$keyExists = aws ec2 describe-key-pairs --region $Region --key-names $KeyName 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "  Key pair already exists - skipping (using existing $KeyName.pem)." -ForegroundColor DarkGray
} else {
  aws ec2 create-key-pair --region $Region --key-name $KeyName `
    --query "KeyMaterial" --output text | Out-File -Encoding ascii "$KeyName.pem"
  icacls "$KeyName.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null
  Write-Host "  Saved $KeyName.pem (keep this safe - it is your only copy)." -ForegroundColor Green
}

# --- STEP 3: CloudFormation stack (SG + instance + Elastic IP) -------------
Write-Host "`n[3/3] Deploying CloudFormation stack $StackName..." -ForegroundColor Yellow
aws cloudformation create-stack `
  --region $Region `
  --stack-name $StackName `
  --template-body file://cloudformation.yml `
  --parameters ParameterKey=KeyName,ParameterValue=$KeyName

Write-Host "`nWaiting for stack to complete (instance launch ~2-3 min)..." -ForegroundColor Yellow
aws cloudformation wait stack-create-complete --region $Region --stack-name $StackName

Write-Host "`nDeployment outputs:" -ForegroundColor Green
aws cloudformation describe-stacks --region $Region --stack-name $StackName `
  --query "Stacks[0].Outputs" --output table
