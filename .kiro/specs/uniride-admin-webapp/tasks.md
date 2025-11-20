# Implementation Plan

- [x] 1. Project initialization and environment setup





  - Initialize Next.js 14+ project with TypeScript and App Router
  - Configure Tailwind CSS for styling
  - Create `.env.example` with all required environment variables
  - Set up project directory structure (app, lib, components, utils)
  - Configure TypeScript with strict mode
  - _Requirements: 10.4_

- [x] 2. Core infrastructure and security layer





- [x] 2.1 Implement Firebase Admin SDK initialization


  - Create `lib/firebase/admin.ts` with singleton initialization pattern
  - Implement environment variable validation for Firebase credentials
  - Handle private key newline replacement
  - Export authAdmin and firestoreAdmin instances
  - _Requirements: 10.1, 10.4_

- [x] 2.2 Implement Supabase server client


  - Create `lib/supabase/server.ts` with service role client
  - Ensure server-only module (never exposed to client)
  - Configure auth persistence to false
  - Define TypeScript types for database schema in `lib/supabase/types.ts`
  - _Requirements: 10.1, 10.4_


- [x] 2.3 Implement authentication guard

  - Create `lib/security/authGuard.ts` with assertAdmin function
  - Implement Firebase ID token verification
  - Validate admin custom claim presence
  - Create token extraction utility from request headers
  - Implement error handling for unauthorized/forbidden cases
  - _Requirements: 10.1, 10.2_

- [x] 2.4 Create validation schemas


  - Create `lib/validation/schemas.ts` with Zod schemas
  - Define schemas for user filters, pagination, rider verification, broadcast notifications
  - Define schemas for ride filters, request filters, report filters, trust filters
  - Export all validation schemas with TypeScript type inference
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [x] 3. Audit logging system




- [x] 3.1 Create Supabase audit log table


  - Write SQL migration for `admin_audit_log` table
  - Create indexes for admin_uid, entity_type, entity_id, and created_at
  - Document migration in `migrations/001_audit_log.sql`
  - _Requirements: 9.1_

- [x] 3.2 Implement audit repository


  - Create `lib/repos/auditRepo.ts` with AuditRepository class
  - Implement logAction method to insert audit entries
  - Implement listAuditLogs with filtering and pagination
  - Implement getAuditLogById for detail view
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 4. User management implementation





- [x] 4.1 Implement users repository


  - Create `lib/repos/usersRepo.ts` with UsersRepository class
  - Implement listUsers with filters (query, role, verification status, trust score range) and pagination
  - Implement getUserByUid fetching from both Firebase and Supabase
  - Implement verifyRider to update verification status in Firestore
  - Implement banUser to update user status
  - Implement deleteUser with soft delete preference
  - Integrate audit logging for all write operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4.2 Create users API endpoints


  - Create `app/api/users/route.ts` for GET (list users)
  - Create `app/api/users/[uid]/route.ts` for GET (single user) and DELETE
  - Create `app/api/users/[uid]/verify-rider/route.ts` for POST
  - Create `app/api/users/[uid]/ban/route.ts` for POST
  - Implement auth guard on all endpoints
  - Implement input validation with Zod schemas
  - Return standardized API response envelope
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4.3 Create users management pages


  - Create `app/(admin)/users/page.tsx` with users list table
  - Implement filter bar for query, role, verification status, trust score
  - Implement pagination controls
  - Create `app/(admin)/users/[uid]/page.tsx` for user detail view
  - Display user profile, trust score, ride history, verification status
  - Add action buttons for verify, ban, delete with confirmation dialogs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5. Trust score management implementation




- [x] 5.1 Implement trust repository


  - Create `lib/repos/trustRepo.ts` with TrustRepository class
  - Implement getTrustRanking with min/max filters and pagination
  - Implement getTrustBreakdown to calculate and return all four components
  - Implement calculateTrustScore with rating (0-30), completion (0-25), reliability (0-25), experience (0-20) logic
  - Implement recalculateTrustScore to recompute and update user_stats
  - Implement getTrustOutliers with below/above thresholds
  - Integrate audit logging for recalculation operations
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5.2 Create trust score API endpoints


  - Create `app/api/trust/ranking/route.ts` for GET (trust rankings)
  - Create `app/api/trust/outliers/route.ts` for GET (outliers)
  - Create `app/api/users/[uid]/trust/breakdown/route.ts` for GET (breakdown)
  - Create `app/api/users/[uid]/trust/recalculate/route.ts` for POST
  - Implement auth guard on all endpoints
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5.3 Create trust score pages


  - Create `app/(admin)/trust/page.tsx` with trust rankings table
  - Implement filters for min/max trust score thresholds
  - Display trust score with category badge (Excellent/Good/Fair/Poor)
  - Add link to user detail page for each user
  - Create trust score breakdown component for user detail page
  - Display all four components with visual breakdown
  - Add recalculate button with confirmation
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Ride management implementation




- [x] 6.1 Implement rides repository


  - Create `lib/repos/ridesRepo.ts` with RidesRepository class
  - Implement listRides with filters (status, owner, matched, date range) and pagination
  - Implement getRideById to fetch complete ride details
  - Implement cancelRide to update status, record reason, apply fees
  - Implement forceCompleteRide to update status and completion timestamp
  - Implement getRideChat to fetch all chat messages for a ride
  - Implement getRideRatings to fetch all ratings for a ride
  - Integrate audit logging for all write operations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6.2 Create rides API endpoints


  - Create `app/api/rides/route.ts` for GET (list rides)
  - Create `app/api/rides/[id]/route.ts` for GET (single ride)
  - Create `app/api/rides/[id]/cancel/route.ts` for POST
  - Create `app/api/rides/[id]/force-complete/route.ts` for POST
  - Create `app/api/rides/[id]/chat/route.ts` for GET
  - Create `app/api/rides/[id]/ratings/route.ts` for GET
  - Implement auth guard on all endpoints
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6.3 Create rides management pages


  - Create `app/(admin)/rides/page.tsx` with rides list table
  - Implement filter bar for status, owner, matched state, date range
  - Display ride details (locations, participants, status, pricing)
  - Create `app/(admin)/rides/[id]/page.tsx` for ride detail view
  - Display complete ride information including confirmations
  - Show chat messages in chronological order
  - Show associated ratings
  - Add action buttons for cancel and force-complete with confirmation dialogs
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Request moderation implementation




- [x] 7.1 Implement requests repository


  - Create `lib/repos/requestsRepo.ts` with RequestsRepository class
  - Implement listRequests with filters (ride ID, status) and pagination
  - Implement getRequestById to fetch request details
  - Implement forceAcceptRequest to update status and match passenger
  - Implement forceDeclineRequest to update status
  - Integrate audit logging for all write operations
  - _Requirements: 3.1, 3.2, 3.3_



- [x] 7.2 Create requests API endpoints

  - Create `app/api/requests/route.ts` for GET (list requests)
  - Create `app/api/requests/[id]/force-accept/route.ts` for POST
  - Create `app/api/requests/[id]/force-decline/route.ts` for POST

  - Implement auth guard on all endpoints
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7.3 Create requests moderation page

  - Create `app/(admin)/requests/page.tsx` with requests queue table
  - Implement filter bar for ride ID and status
  - Display request details (passenger, seats, message, status)
  - Add action buttons for force-accept and force-decline with confirmation
  - Highlight pending requests for quick triage
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Ratings and reviews moderation implementation




- [x] 8.1 Implement ratings repository


  - Create `lib/repos/ratingsRepo.ts` with RatingsRepository class
  - Implement listRatings with filters (ride ID, user UID) and pagination
  - Implement getRatingById to fetch rating details
  - Implement hideRating to set is_visible to false
  - Implement deleteRating to permanently remove rating
  - Implement getRatingPatterns to return aggregated statistics
  - Integrate audit logging for all write operations
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8.2 Create ratings API endpoints


  - Create `app/api/ratings/route.ts` for GET (list ratings)
  - Create `app/api/ratings/[ratingId]/hide/route.ts` for POST
  - Create `app/api/ratings/[ratingId]/route.ts` for DELETE
  - Implement auth guard on all endpoints
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8.3 Create ratings moderation interface


  - Add ratings section to ride detail page
  - Display all ratings with visibility status
  - Add action buttons for hide and delete with confirmation
  - Create ratings patterns view showing distribution and abuse indicators
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Report management implementation






- [x] 9.1 Implement reports repository

  - Create `lib/repos/reportsRepo.ts` with ReportsRepository class
  - Implement listReports with filters (status, reported user) and pagination
  - Implement getReportById to fetch complete report details
  - Implement resolveReport to update status and store resolution note
  - Implement escalateReport to update status and record escalation reason
  - Integrate audit logging for all write operations
  - _Requirements: 6.1, 6.2, 6.3, 6.4_


- [x] 9.2 Create reports API endpoints

  - Create `app/api/reports/route.ts` for GET (list reports)
  - Create `app/api/reports/[id]/resolve/route.ts` for POST
  - Create `app/api/reports/[id]/escalate/route.ts` for POST
  - Implement auth guard on all endpoints
  - _Requirements: 6.1, 6.2, 6.3_


- [x] 9.3 Create reports triage page

  - Create `app/(admin)/reports/page.tsx` with reports queue table
  - Implement filter bar for status and reported user
  - Display report details (reporter, reported user, type, description, status)
  - Add action buttons for resolve and escalate with input forms
  - Highlight pending reports for quick triage
  - Show resolution notes for resolved reports
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Notification broadcasting implementation




- [x] 10.1 Implement notifications repository


  - Create `lib/repos/notificationsRepo.ts` with NotificationsRepository class
  - Implement listNotifications with filters (user UID, unread only)
  - Implement broadcastNotification to insert records for targeted users
  - Implement sendPushNotification to call OneSignal REST API
  - Implement markAsRead to update is_read flag
  - Implement deleteNotification to remove notification
  - Integrate audit logging for broadcast operations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10.2 Create notifications API endpoints


  - Create `app/api/notifications/route.ts` for GET (list notifications)
  - Create `app/api/notifications/broadcast/route.ts` for POST
  - Create `app/api/notifications/[id]/mark-read/route.ts` for POST
  - Create `app/api/notifications/[id]/route.ts` for DELETE
  - Implement auth guard on all endpoints
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10.3 Create notifications console page


  - Create `app/(admin)/notifications/page.tsx` with broadcast form
  - Implement form for title, message, segment selection, user UIDs input
  - Add preview of notification before sending
  - Display list of recent broadcasts with status
  - Add user-specific notifications viewer
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 11. Application configuration management






- [x] 11.1 Implement config repository

  - Create `lib/repos/configRepo.ts` with ConfigRepository class
  - Implement getConfig to fetch from Firestore app_config
  - Implement updateConfig to update minVersion and flags
  - Integrate audit logging for config changes
  - _Requirements: 8.1, 8.2, 8.3_


- [x] 11.2 Create config API endpoints

  - Create `app/api/config/route.ts` for GET and PATCH
  - Implement auth guard on all endpoints
  - Validate config updates with Zod schema
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 11.3 Create config editor page


  - Create `app/(admin)/config/page.tsx` with config form
  - Display current minVersion and feature flags
  - Implement form for updating minVersion
  - Implement feature flags toggle interface
  - Add confirmation dialog for config changes
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 12. Audit log viewer implementation





- [x] 12.1 Create audit log API endpoint


  - Create `app/api/audit/route.ts` for GET (list audit logs)
  - Implement filters for admin UID, entity type, entity ID, date range
  - Implement pagination
  - Implement auth guard
  - _Requirements: 9.2, 9.3_

- [x] 12.2 Create audit log viewer page


  - Create `app/(admin)/audit/page.tsx` with audit log table
  - Implement filter bar for admin, entity type, entity ID, date range
  - Display audit entries with timestamp, admin, action, entity details
  - Create detail view modal showing complete diff (before/after)
  - Add export to CSV functionality
  - _Requirements: 9.2, 9.3_

- [x] 13. Data export functionality






- [x] 13.1 Implement CSV export utility

  - Create `utils/csv.ts` with generateCSV function
  - Implement field selection and formatting
  - Handle special characters and escaping
  - _Requirements: 11.1, 11.2, 11.3, 11.4_


- [x] 13.2 Create export API endpoints

  - Create `app/api/export/users.csv/route.ts` for GET
  - Create `app/api/export/rides.csv/route.ts` for GET
  - Create `app/api/export/reports.csv/route.ts` for GET
  - Set proper Content-Type and filename headers
  - Implement auth guard on all endpoints
  - _Requirements: 11.1, 11.2, 11.3, 11.4_


- [x] 13.3 Add export buttons to list pages

  - Add export button to users list page
  - Add export button to rides list page
  - Add export button to reports list page
  - Add export button to audit log page
  - Implement download trigger on button click
  - _Requirements: 11.1, 11.2, 11.3_

- [x] 14. Real-time updates implementation






- [x] 14.1 Implement Supabase Realtime subscriptions

  - Create `lib/realtime/supabase.ts` with subscription utilities
  - Implement rides status change subscription
  - Implement ride requests subscription
  - Implement notifications unread count subscription
  - Handle subscription cleanup on unmount
  - _Requirements: 12.1, 12.2, 12.4_


- [x] 14.2 Implement Firestore real-time listeners

  - Create `lib/realtime/firestore.ts` with snapshot utilities
  - Implement rider verification queue listener for pending status
  - Handle listener cleanup on unmount
  - _Requirements: 12.3_


- [x] 14.3 Integrate real-time updates in pages

  - Add Realtime subscription to rides dashboard
  - Add Realtime subscription to requests queue
  - Add Firestore listener to verification queue
  - Add Realtime subscription to notification indicators
  - Display real-time status indicators (live badge)
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 15. Shared UI components




- [x] 15.1 Create layout components


  - Create `components/layout/AdminNav.tsx` with navigation sidebar
  - Create `components/layout/Header.tsx` with user menu and logout
  - Create `app/(admin)/layout.tsx` with admin layout wrapper
  - Implement responsive navigation
  - _Requirements: All_

- [x] 15.2 Create table components


  - Create `components/tables/DataTable.tsx` with sorting and filtering
  - Create `components/tables/Pagination.tsx` with page controls
  - Implement loading states and empty states
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 9.2_

- [x] 15.3 Create form components


  - Create `components/forms/FilterBar.tsx` with filter controls
  - Create `components/forms/ConfirmDialog.tsx` with confirmation modal
  - Create `components/forms/FormInput.tsx` with validation display
  - _Requirements: All_

- [x] 15.4 Create card and chart components


  - Create `components/cards/StatCard.tsx` for dashboard metrics
  - Create `components/cards/UserCard.tsx` for user summaries
  - Create `components/charts/TrustScoreChart.tsx` for trust visualization
  - _Requirements: 4.2_

- [x] 16. Dashboard and overview page





- [x] 16.1 Create dashboard page


  - Create `app/(admin)/dashboard/page.tsx` with overview metrics
  - Display total users, active rides, pending requests, unresolved reports
  - Display recent activity feed
  - Add quick action buttons for common tasks
  - Display trust score distribution chart
  - _Requirements: All_

- [x] 17. Error handling and utilities






- [x] 17.1 Implement error handling utilities

  - Create `lib/errors/AppError.ts` with custom error classes
  - Create `lib/errors/errorHandler.ts` with handleApiError function
  - Implement error mapping to HTTP status codes
  - _Requirements: All_


- [x] 17.2 Implement formatting utilities

  - Create `utils/formatting.ts` with date, currency, trust score formatters
  - Implement text truncation utility
  - _Requirements: All_

- [x] 17.3 Create error boundary components


  - Create `components/ErrorBoundary.tsx` for React error boundaries
  - Create error fallback UI components
  - _Requirements: All_

- [x] 18. Authentication and middleware




- [x] 18.1 Implement Next.js middleware


  - Create `middleware.ts` for route protection
  - Implement token verification for protected routes
  - Redirect unauthenticated users to login
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 18.2 Create Firebase client authentication


  - Create `lib/firebase/client.ts` with Firebase client SDK
  - Implement login page at `app/login/page.tsx`
  - Implement logout functionality
  - Store ID token in secure cookie or session
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 19. Documentation and setup
- [ ] 19.1 Create project documentation
  - Create comprehensive README.md with setup instructions
  - Document environment variables in .env.example
  - Document API endpoints and response formats
  - Document database schema and migrations
  - _Requirements: All_

- [ ] 19.2 Create database migration scripts
  - Create `migrations/001_audit_log.sql` for audit log table
  - Create `migrations/002_indexes.sql` for performance indexes
  - Document migration execution steps
  - _Requirements: 9.1_

- [ ] 19.3 Create security checklist
  - Document security best practices
  - Create checklist for deployment verification
  - Document credential management procedures
  - _Requirements: 10.4_

- [ ]* 20. Testing implementation
- [ ]* 20.1 Write repository unit tests
  - Create tests for UsersRepository in `__tests__/repos/usersRepo.test.ts`
  - Create tests for TrustRepository in `__tests__/repos/trustRepo.test.ts`
  - Create tests for RidesRepository in `__tests__/repos/ridesRepo.test.ts`
  - Mock Supabase and Firebase clients
  - _Requirements: All_

- [ ]* 20.2 Write API integration tests
  - Create tests for users endpoints in `__tests__/api/users.test.ts`
  - Create tests for trust endpoints in `__tests__/api/trust.test.ts`
  - Create tests for rides endpoints in `__tests__/api/rides.test.ts`
  - Test authentication and authorization
  - _Requirements: All_

- [ ]* 20.3 Write validation schema tests
  - Create tests for Zod schemas in `__tests__/validation/schemas.test.ts`
  - Test valid and invalid inputs
  - Test edge cases
  - _Requirements: All_
