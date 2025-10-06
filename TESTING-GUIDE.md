# Testing Guide - Teacher Management System

**Date:** 2025-10-06
**Dev Server:** http://localhost:3001

---

## 🎯 Test Credentials

### 👑 FOUNDER (Admin) - Full Access
```
📧 Email: admin@planbeta.in
🔑 Password: admin123
```

**Can Access:**
- ✅ All features
- ✅ Create/manage teachers
- ✅ Approve/reject teacher hours
- ✅ Mark hours as paid
- ✅ View all audit logs
- ✅ Manage batches, students, leads
- ✅ View analytics and insights

---

### 📢 MARKETING - Lead & Student Management
```
📧 Email: marketing@planbeta.in
🔑 Password: marketing123
```

**Can Access:**
- ✅ View teachers (read-only)
- ✅ Create/manage leads
- ✅ Create/update students
- ✅ View batches (read-only)
- ✅ Manage referrals
- ✅ View insights

**Cannot Access:**
- ❌ Create/edit teachers
- ❌ Approve teacher hours
- ❌ View payments
- ❌ View attendance
- ❌ Delete students

---

### 👨‍🏫 TEACHER - Teaching & Hours
```
📧 Email: teacher@planbeta.in
🔑 Password: teacher123
```

**Can Access:**
- ✅ Own dashboard (/dashboard/teacher)
- ✅ Edit own profile (/dashboard/profile)
- ✅ View assigned batches
- ✅ Log teaching hours
- ✅ View hour submission status
- ✅ View students (read-only)
- ✅ Manage attendance

**Cannot Access:**
- ❌ View other teachers
- ❌ Approve own hours
- ❌ View payments
- ❌ Manage leads
- ❌ View analytics

---

## 🧪 Critical Features to Test

### 1. Authentication & Permissions

#### Test Login for Each Role
```bash
1. Go to http://localhost:3001/login
2. Try each credential set above
3. Verify redirect to correct dashboard
```

**Expected Results:**
- ✅ FOUNDER → /dashboard (main)
- ✅ MARKETING → /dashboard (main)
- ✅ TEACHER → /dashboard (main, but different nav)

#### Test Navigation Visibility
Login as each role and verify navigation items:

**FOUNDER should see:**
- Dashboard
- Leads
- Students
- Batches
- Teachers ⭐ NEW
- Teacher Hours ⭐ NEW
- Attendance
- Payments
- Referrals
- Insights

**MARKETING should see:**
- Dashboard
- Leads
- Students
- Batches
- Referrals
- Insights

**TEACHER should see:**
- Dashboard
- My Dashboard ⭐ NEW
- My Profile ⭐ NEW
- Students
- Batches
- Attendance

---

### 2. Teacher Management (FOUNDER Only)

#### Create a New Teacher
```
1. Login as FOUNDER (admin@planbeta.in)
2. Navigate to "Teachers" in sidebar
3. Click "+ Add Teacher"
4. Fill in the form:
   - Email: newteacher@test.com
   - Name: New Test Teacher
   - Password: test123
   - Phone: +91 9999999999
   - Hourly Rate: 1000
   - Specializations: Grammar, Conversation
5. Click "Create Teacher"
```

**Expected:**
- ✅ Teacher created successfully
- ✅ Appears in teachers list
- ✅ Audit log entry: TEACHER_CREATED
- ✅ Status shows "Active"

#### View Teacher Details
```
1. Click on any teacher card
2. Should see:
   - Full profile information
   - List of assigned batches
   - Professional details
```

**Expected:**
- ✅ All teacher details visible
- ✅ Batch count accurate
- ✅ Can see specializations, experience, etc.

#### Activate/Deactivate Teacher
```
1. From teachers list, click "Deactivate" on a teacher
2. Verify status changes to "Inactive"
3. Click "Activate" to re-activate
```

**Expected:**
- ✅ Status toggles correctly
- ✅ Audit log entry: TEACHER_DEACTIVATED / TEACHER_ACTIVATED
- ✅ UI updates immediately

---

### 3. Teacher Profile (TEACHER Only)

#### Edit Own Profile
```
1. Login as TEACHER (teacher@planbeta.in)
2. Navigate to "My Profile"
3. Update fields:
   - Bio: "Updated bio text"
   - Hourly Rate: 900
   - Availability: "Updated schedule"
4. Click "Save Changes"
```

**Expected:**
- ✅ Profile updated successfully
- ✅ Success message shown
- ✅ Audit log entry: TEACHER_UPDATED
- ✅ Changes persist on reload

#### Try to Edit Active Status (Should Fail)
```
1. As TEACHER, try to edit profile
2. Notice "active" field is not editable
```

**Expected:**
- ✅ Cannot change own active status
- ✅ Only FOUNDER can change active status

---

### 4. Hour Logging (TEACHER)

#### Log Teaching Hours
```
1. Login as TEACHER
2. Navigate to "My Dashboard"
3. Click "+ Log Hours" button
4. Fill in form:
   - Batch: Select a batch (or leave empty)
   - Date: Today's date
   - Hours Worked: 3.5
   - Description: "Taught A1 grammar lesson"
   - Hourly Rate: Leave empty (uses profile default)
5. Click "Log Hours"
```

**Expected:**
- ✅ Hour entry created
- ✅ Status: PENDING
- ✅ Appears in "Recent Hour Entries"
- ✅ Summary stats updated
- ✅ Audit log entry: TEACHER_HOURS_LOGGED

#### View Hours Summary
```
1. Check the summary cards at top of dashboard
2. Should show:
   - Total Hours
   - Pending Approval
   - Approved
   - Payment Status (Paid/Unpaid)
```

**Expected:**
- ✅ Numbers accurate
- ✅ Updates in real-time

---

### 5. Hour Approval (FOUNDER)

#### Approve Hours
```
1. Login as FOUNDER
2. Navigate to "Teacher Hours"
3. See pending hours
4. Click "Approve" on an entry
```

**Expected:**
- ✅ Status changes to APPROVED
- ✅ Moves from "Pending" to "Approved" section
- ✅ Audit log entry: TEACHER_HOURS_APPROVED
- ✅ Teacher can see approved status

#### Reject Hours
```
1. As FOUNDER, find another pending entry
2. Click "Reject"
3. Enter rejection reason: "Hours don't match batch schedule"
4. Submit
```

**Expected:**
- ✅ Status changes to REJECTED
- ✅ Rejection reason stored
- ✅ Teacher can see rejection reason
- ✅ Audit log entry: TEACHER_HOURS_REJECTED

#### Mark as Paid
```
1. As FOUNDER, find an APPROVED entry
2. Click "Mark as Paid"
3. Enter:
   - Paid Amount: 2700 (or actual amount)
   - Payment Notes: "Bank transfer - Ref#123456"
4. Submit
```

**Expected:**
- ✅ Status changes to PAID
- ✅ Payment date recorded
- ✅ Shows in payment info
- ✅ Teacher sees "PAID" badge
- ✅ Audit log entry: TEACHER_HOURS_PAID

---

### 6. Batch Assignment

#### Assign Teacher to Batch
```
1. Login as FOUNDER
2. Navigate to "Batches"
3. Click "New Batch" or edit existing
4. In "Assign Teacher" dropdown:
   - See list of active teachers
   - See their specializations and rates
5. Select a teacher
6. Save batch
```

**Expected:**
- ✅ Teacher dropdown populated
- ✅ Teacher information visible in dropdown
- ✅ Batch saved with teacherId
- ✅ Teacher can see batch in "My Dashboard"

---

### 7. Audit Logging

#### View Activity Log
```
1. Login as FOUNDER
2. Navigate to "Activity" (if available) or check logs
3. Look for recent entries
```

**Expected Events:**
- ✅ TEACHER_CREATED
- ✅ TEACHER_UPDATED
- ✅ TEACHER_ACTIVATED / TEACHER_DEACTIVATED
- ✅ TEACHER_HOURS_LOGGED
- ✅ TEACHER_HOURS_APPROVED
- ✅ TEACHER_HOURS_REJECTED
- ✅ TEACHER_HOURS_PAID

**Verify Each Entry Has:**
- ✅ Timestamp
- ✅ Action type
- ✅ Description
- ✅ User who performed action
- ✅ Metadata (teacherName, hoursWorked, etc.)
- ✅ IP address

---

### 8. Rate Limiting

#### Test Hour Logging Rate Limit
```bash
# Use curl or Postman
for i in {1..150}; do
  curl -X POST http://localhost:3001/api/teacher-hours \
    -H "Cookie: your-session-cookie" \
    -H "Content-Type: application/json" \
    -d '{
      "date": "2025-10-06",
      "hoursWorked": 1,
      "description": "Test spam"
    }'
done
```

**Expected:**
- ✅ First 100 requests succeed
- ✅ After 100, returns 429 Too Many Requests
- ✅ Error message includes retry-after info

---

### 9. Input Validation

#### Test Invalid Batch Update
```bash
curl -X PUT http://localhost:3001/api/batches/[some-id] \
  -H "Cookie: founder-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "batchCode": "",
    "level": "C1",
    "totalSeats": 100,
    "status": "INVALID_STATUS"
  }'
```

**Expected:**
- ✅ Returns 400 Bad Request
- ✅ Error details show validation failures:
  - "Batch code required"
  - "Invalid enum value: level"
  - "Max 50 seats"
  - "Invalid enum value: status"

#### Test Invalid Hour Logging
```bash
curl -X POST http://localhost:3001/api/teacher-hours \
  -H "Cookie: teacher-session-cookie" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "invalid-date",
    "hoursWorked": 30,
    "description": ""
  }'
```

**Expected:**
- ✅ Returns 400 Bad Request
- ✅ Error details show:
  - "Invalid date"
  - "Cannot exceed 24 hours"
  - "Description required"

---

### 10. Permission Boundaries

#### Test Unauthorized Access
```
MARKETING tries to access:
1. /dashboard/teachers → Should redirect or show 404
2. /dashboard/teacher-hours → Should redirect or show 404

TEACHER tries to:
1. POST /api/teachers → Should return 403
2. POST /api/teacher-hours with another teacher's ID → Should return 403
3. Approve own hours → Should return 403
```

**Expected:**
- ✅ All unauthorized actions blocked
- ✅ 403 Forbidden or 404 Not Found
- ✅ No data leakage

---

## 🎨 UI/UX Testing

### Teacher Dashboard (TEACHER)
```
Login as teacher@planbeta.in and verify:
- ✅ Summary cards show correct stats
- ✅ "My Batches" section shows assigned batches
- ✅ "Recent Hour Entries" shows latest submissions
- ✅ Status badges color-coded (yellow=pending, green=approved, red=rejected, blue=paid)
- ✅ "Log Hours" dialog works smoothly
- ✅ Form validation provides clear feedback
```

### Teachers Management (FOUNDER)
```
Login as admin@planbeta.in and verify:
- ✅ Teachers displayed in card grid
- ✅ Each card shows key info (name, email, specializations, batch count)
- ✅ Active/Inactive badges visible
- ✅ Create teacher modal is user-friendly
- ✅ Teacher details page is comprehensive
```

### Hour Approval Interface (FOUNDER)
```
Check /dashboard/teacher-hours:
- ✅ Stats cards show pending, approved, rejected, unpaid counts
- ✅ Filters work (status, payment status)
- ✅ Hour entries show all relevant info
- ✅ Approve/Reject/Pay dialogs are intuitive
- ✅ Rejection reason required when rejecting
```

---

## 🔍 Error Cases to Test

### 1. Create Teacher with Existing Email
```
Try to create teacher with email: teacher@planbeta.in
Expected: ✅ "Email already exists" error
```

### 2. Log Hours for Non-Assigned Batch
```
As TEACHER, try to log hours for batch not assigned to you
Expected: ✅ "You can only log hours for your assigned batches" error
```

### 3. Mark Pending Hours as Paid
```
As FOUNDER, try to mark PENDING hours as paid (skip approval)
Expected: ✅ "Only approved hours can be marked as paid" error
```

### 4. Update Teacher with Empty Name
```
Update teacher profile with empty name
Expected: ✅ "Name is required" validation error
```

### 5. Log 30 Hours in One Day
```
Try to log 30 hours of work
Expected: ✅ "Cannot exceed 24 hours" validation error
```

---

## 📊 Success Criteria

### All Tests Pass If:
- ✅ All 3 roles can login successfully
- ✅ Navigation shows correct items per role
- ✅ Teacher CRUD operations work (FOUNDER)
- ✅ Teacher can edit own profile
- ✅ Hour logging works (TEACHER)
- ✅ Hour approval/rejection works (FOUNDER)
- ✅ Payment marking works (FOUNDER)
- ✅ Batch-teacher assignment works
- ✅ All audit logs are created
- ✅ Rate limiting kicks in after 100 requests
- ✅ Input validation catches all invalid data
- ✅ Permission boundaries are enforced
- ✅ No errors in browser console
- ✅ No errors in server logs

---

## 🐛 Reporting Issues

If you find bugs, please report with:

1. **Steps to Reproduce**
2. **Expected Behavior**
3. **Actual Behavior**
4. **User Role** (FOUNDER/MARKETING/TEACHER)
5. **Screenshots** (if applicable)
6. **Browser Console Errors** (F12 → Console)
7. **Network Tab** (F12 → Network → Failed requests)

---

## 🚀 Quick Start Testing

### 5-Minute Smoke Test:
```
1. Login as FOUNDER (admin@planbeta.in / admin123)
   - ✅ See "Teachers" in nav
   - ✅ Navigate to /dashboard/teachers
   - ✅ See "Test Teacher" in list

2. Login as TEACHER (teacher@planbeta.in / teacher123)
   - ✅ See "My Dashboard" in nav
   - ✅ Navigate to /dashboard/teacher
   - ✅ Click "Log Hours"
   - ✅ Submit a test entry
   - ✅ See it appear as PENDING

3. Login back as FOUNDER
   - ✅ Navigate to /dashboard/teacher-hours
   - ✅ See the pending entry
   - ✅ Click "Approve"
   - ✅ Verify status changes to APPROVED

4. Check /dashboard/activity (if available)
   - ✅ See TEACHER_HOURS_LOGGED
   - ✅ See TEACHER_HOURS_APPROVED
```

If all 4 steps pass → **System is working! ✅**

---

**Happy Testing! 🎉**
