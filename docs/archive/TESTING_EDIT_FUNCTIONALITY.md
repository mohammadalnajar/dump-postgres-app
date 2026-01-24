# Testing the Edit Cron Job Functionality

## Quick Test Guide

### Prerequisites
1. Server is running on `http://localhost:8080`
2. At least one cron job exists in the system
3. User is authenticated (default: admin/admin)

### Test Steps

#### 1. Access the Application
- Open browser to `http://localhost:8080`
- Login with credentials (default: admin/admin)

#### 2. Navigate to Scheduled Jobs
- Click on "Scheduled Jobs" in the sidebar navigation
- Verify existing cron jobs are displayed in the table

#### 3. Test Edit Functionality
- Click the "Edit" button (✏️) next to any cron job
- Verify you're redirected to the edit form at `/cron-jobs/{id}/edit`

#### 4. Test Schedule Pattern Editing
- Try changing the schedule using the preset dropdown
- Verify custom pattern input becomes enabled/disabled appropriately
- Enter a custom pattern like `0 3 * * *` (daily at 3 AM)
- Verify real-time validation shows pattern description
- Try invalid pattern like `invalid pattern` and verify error display

#### 5. Test Cleanup Policy Editing
- Toggle the cleanup checkbox on/off
- Change cleanup method between "days", "count", and "both"
- Modify retention values
- Verify input validation (e.g., try negative numbers)

#### 6. Test Form Validation
- Try submitting with invalid cron pattern (should be prevented)
- Try submitting with invalid retention values
- Verify appropriate error messages are shown

#### 7. Test Save Functionality
- Make valid changes to schedule pattern
- Make valid changes to cleanup policy
- Click "Save Changes"
- Verify confirmation dialog appears
- Confirm the save
- Verify redirect to main page with success message
- Verify you're automatically on the "Scheduled Jobs" tab

#### 8. Test Cancel Functionality
- Click "Edit" on a job
- Make some changes
- Click "Cancel"
- Verify you're returned to main page without changes saved

#### 9. Test Mobile Responsiveness
- Resize browser window to mobile size
- Verify edit form is responsive
- Verify action buttons stack properly on mobile

### Expected Results
- ✅ All form interactions work smoothly
- ✅ Real-time validation provides immediate feedback
- ✅ Invalid input is prevented from submission
- ✅ Success/error messages are clear and helpful
- ✅ Navigation flows are intuitive
- ✅ Mobile experience is user-friendly
- ✅ No existing functionality is broken
- ✅ Security is maintained (passwords not exposed)

### Verification Checklist
- [ ] Edit button appears in cron jobs table
- [ ] Edit form loads with correct job data
- [ ] Schedule pattern dropdown works correctly
- [ ] Custom pattern input validation works
- [ ] Cleanup policy editing works
- [ ] Form validation prevents invalid submissions
- [ ] Save operation updates the job correctly
- [ ] Cancel operation doesn't save changes
- [ ] Navigation breadcrumbs work
- [ ] Mobile layout is responsive
- [ ] Success messages appear after save
- [ ] Job restarts correctly after schedule changes

## Common Issues & Solutions

### Issue: Edit button not visible
**Solution:** Ensure server restart after code changes

### Issue: Form validation not working
**Solution:** Check browser console for JavaScript errors

### Issue: Save operation fails
**Solution:** Check server logs for validation errors

### Issue: Job not restarting after edit
**Solution:** Verify the updateCronJob function properly handles job restart

## API Endpoints for Testing

### Get Job for Editing
```
GET /cron-jobs/{jobId}/edit
```

### Save Job Changes
```
POST /cron-jobs/{jobId}/edit
Content-Type: application/x-www-form-urlencoded

cronPreset=custom&cronPattern=0+3+*+*+*&enableCleanup=on&cleanupMethod=days&cleanupTiming=after&retentionDays=30&retentionCount=10
```

### Validate Cron Pattern
```
POST /api/validate-cron
Content-Type: application/x-www-form-urlencoded

pattern=0+3+*+*+*
```