# 🧪 Comprehensive Teacher Email Flow - Test Plan

## Current State
- **11 active teachers** with auto-generated emails (`@planbeta.internal`)
- **1 inactive teacher** with real email (`teacher@planbeta.in`)
- All need account setup with `temporary123` password

---

## 📋 Test Scenarios

### ✅ SCENARIO 1: View Teachers Needing Setup
**Expected Behavior:**
- Teachers list shows "Needs Setup" badge on 11 teachers
- Header shows "📧 Send Welcome Emails (11)" button
- Each teacher card has "📧 Send Email" button

**Steps:**
1. Navigate to http://localhost:3001/dashboard/teachers
2. Verify 11 teachers have yellow "Needs Setup" badge
3. Verify bulk email button shows count (11)
4. Verify individual email buttons are visible

**✓ Pass Criteria:** All visual elements present and correct count

---

### ✅ SCENARIO 2: Send Individual Setup Email
**Expected Behavior:**
- Email sends successfully
- Button shows "Sending..." during process
- Success alert appears
- Email received with credentials and setup link

**Steps:**
1. Click "📧 Send Email" on first teacher (Madhumitha)
2. Wait for "Sending..." state
3. Check for success alert
4. Check email inbox for welcome email

**Test Data:**
- Teacher: Madhumitha
- Email: teacher1760375503520@planbeta.internal
- Expected email content:
  - Subject: "Complete Your Plan Beta Teacher Account Setup"
  - Credentials: email + password (temporary123)
  - Setup button linking to login page
  - 5-step setup process
  - Feature list

**✓ Pass Criteria:** Email received with all content, no errors

---

### ✅ SCENARIO 3: Send Bulk Setup Emails
**Expected Behavior:**
- Confirmation dialog appears
- All 11 emails send (or appropriate count)
- Results summary shows sent/failed/skipped

**Steps:**
1. Click header button "📧 Send Welcome Emails (11)"
2. Confirm in dialog
3. Wait for completion
4. Check results alert

**✓ Pass Criteria:** 
- Alert shows: "Sent: 11, Failed: 0, Skipped: 0"
- All teachers receive emails

---

### ✅ SCENARIO 4: Login with Temporary Credentials
**Expected Behavior:**
- Login succeeds
- Auto-redirects to /dashboard/account-setup
- Setup page shows with form

**Steps:**
1. Logout from founder account
2. Go to http://localhost:3001/login
3. Login with:
   - Email: teacher1760375503520@planbeta.internal
   - Password: temporary123
4. Verify redirect to /dashboard/account-setup

**✓ Pass Criteria:** Successful login, auto-redirect works

---

### ✅ SCENARIO 5: Complete Account Setup
**Expected Behavior:**
- Can enter new email and password
- Validation works (email format, password strength)
- Account updates successfully
- Can login with new credentials

**Steps:**
1. On account setup page, enter:
   - New email: madhumitha.teacher@example.com
   - Current password: temporary123
   - New password: NewSecure123!
   - Confirm password: NewSecure123!
2. Click "Complete Setup"
3. Verify success message
4. Verify redirect to dashboard
5. Logout and login with new credentials

**✓ Pass Criteria:** Account updated, new login works

---

### ✅ SCENARIO 6: Edit Teacher Email (Founder)
**Expected Behavior:**
- Can update teacher email address
- Duplicate email validation works
- Changes saved successfully

**Steps:**
1. Login as founder
2. Go to teachers list
3. Click "Edit" on any teacher
4. Change email to: nitha.teacher@example.com
5. Save changes
6. Verify "Needs Setup" badge removed
7. Verify "📧 Send Email" button removed

**✓ Pass Criteria:** Email updated, UI reflects changes

---

### ⚠️ EDGE CASE 1: Duplicate Email Validation
**Expected Behavior:**
- Cannot use email that already exists
- Error message displayed

**Steps:**
1. Try to update teacher email to existing email
2. Verify error: "Email already exists"

**✓ Pass Criteria:** Validation prevents duplicate, clear error

---

### ⚠️ EDGE CASE 2: Send Email to Already-Setup Teacher
**Expected Behavior:**
- Button not shown for teachers with real emails
- API skips if somehow attempted

**Steps:**
1. Find teacher with real email (after setup)
2. Verify no "📧 Send Email" button
3. Verify no "Needs Setup" badge

**✓ Pass Criteria:** UI correctly hides buttons

---

### ⚠️ EDGE CASE 3: Password Strength Validation
**Expected Behavior:**
- Weak passwords rejected
- Clear error messages

**Steps:**
1. On account setup, try:
   - Password: "123" → Error: "Min 8 characters"
   - Password: "password" → Error: "Need uppercase, numbers"
   - Password: "Password" → Error: "Need numbers"
   - Password: "Password123" → Success

**✓ Pass Criteria:** All validation messages correct

---

### ⚠️ EDGE CASE 4: Inactive Teacher Handling
**Expected Behavior:**
- Inactive teachers not shown in default view
- Can view when "Show inactive" checked
- No email buttons for inactive teachers

**Steps:**
1. On teachers list, verify only 11 teachers shown
2. Check "Show inactive"
3. Verify 12 teachers shown (includes Test Teacher)
4. Verify Test Teacher has no email buttons (already has real email AND inactive)

**✓ Pass Criteria:** Filtering works, inactive handled correctly

---

### ⚠️ EDGE CASE 5: Re-sending Email
**Expected Behavior:**
- Can send multiple times to same teacher
- Each email includes same credentials

**Steps:**
1. Send email to teacher
2. Wait 1 minute
3. Send email again
4. Verify both emails received

**✓ Pass Criteria:** Multiple sends work, no errors

---

### ⚠️ EDGE CASE 6: Network Failure Simulation
**Expected Behavior:**
- Graceful error handling
- User-friendly error message

**Steps:**
1. Disable network briefly
2. Try sending email
3. Verify error message
4. Re-enable network
5. Try again

**✓ Pass Criteria:** Error handled gracefully, retry works

---

### 🔒 SECURITY TEST 1: Permission Check
**Expected Behavior:**
- Only FOUNDER can send setup emails
- Teachers/Marketing cannot access endpoint

**Steps:**
1. Login as teacher (after setup)
2. Try accessing /dashboard/teachers
3. Verify can only see own info
4. Try accessing API directly (if possible)

**✓ Pass Criteria:** Permissions enforced

---

### 🔒 SECURITY TEST 2: Email Content Validation
**Expected Behavior:**
- Password only sent once in email
- Email not stored in logs
- Credentials not exposed in UI

**Steps:**
1. Check email content
2. Check browser console
3. Check network tab
4. Verify password only in initial welcome email

**✓ Pass Criteria:** No credential leaks

---

## 📊 Test Results Template

```
Date: [DATE]
Tester: [NAME]

SCENARIO 1: View Teachers Needing Setup        [ ] PASS [ ] FAIL
SCENARIO 2: Send Individual Setup Email        [ ] PASS [ ] FAIL
SCENARIO 3: Send Bulk Setup Emails             [ ] PASS [ ] FAIL
SCENARIO 4: Login with Temporary Credentials   [ ] PASS [ ] FAIL
SCENARIO 5: Complete Account Setup             [ ] PASS [ ] FAIL
SCENARIO 6: Edit Teacher Email                 [ ] PASS [ ] FAIL

EDGE CASE 1: Duplicate Email Validation        [ ] PASS [ ] FAIL
EDGE CASE 2: Send to Already-Setup Teacher     [ ] PASS [ ] FAIL
EDGE CASE 3: Password Strength Validation      [ ] PASS [ ] FAIL
EDGE CASE 4: Inactive Teacher Handling         [ ] PASS [ ] FAIL
EDGE CASE 5: Re-sending Email                  [ ] PASS [ ] FAIL
EDGE CASE 6: Network Failure                   [ ] PASS [ ] FAIL

SECURITY TEST 1: Permission Check              [ ] PASS [ ] FAIL
SECURITY TEST 2: Email Content Validation      [ ] PASS [ ] FAIL

OVERALL: [ ] ALL PASS [ ] NEEDS FIXES
```

---

## 🚀 Quick Test Sequence (Recommended Order)

1. **SCENARIO 1** - Verify UI elements
2. **SCENARIO 2** - Test single email send
3. **Check email** - Verify email received
4. **SCENARIO 4** - Test login with temp credentials
5. **SCENARIO 5** - Complete account setup
6. **SCENARIO 6** - Test email editing
7. **EDGE CASE 4** - Test inactive filtering
8. **EDGE CASE 1** - Test duplicate validation
9. **SCENARIO 3** - Test bulk send (sends to remaining 10 teachers)
10. **All other edge cases** - As time permits

---

## 📧 Email Checklist

When checking welcome email, verify:
- [ ] Professional design and formatting
- [ ] Correct teacher name
- [ ] Temporary credentials visible and formatted
- [ ] "Complete Setup Now" button present and clickable
- [ ] Setup instructions (5 steps) clear
- [ ] Feature list present
- [ ] Support email included
- [ ] No typos or broken elements
- [ ] Mobile responsive (check on phone)
- [ ] Dark mode compatible (if applicable)

---

## 🐛 Known Issues / Notes

[Document any issues found during testing]

---

## ✅ Sign-off

- [ ] All critical scenarios pass
- [ ] All edge cases handled appropriately
- [ ] Security tests pass
- [ ] Ready for production use

Tested by: ________________
Date: ________________
Approved by: ________________
Date: ________________
