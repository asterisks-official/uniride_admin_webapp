# Requirements Document

## Introduction

The UniRide Admin WebApp is a secure, production-ready administrative interface built with Next.js and TypeScript. The system enables platform administrators to manage users, rides, requests, ratings, reports, notifications, trust scores, and application configuration. The webapp integrates with Firebase (Authentication and Firestore) and Supabase (operational data) to provide real-time dashboards, moderation workflows, and comprehensive audit logging capabilities.

## Glossary

- **Admin WebApp**: The Next.js-based administrative interface for managing the UniRide platform
- **Firebase Auth**: Authentication service providing admin claim validation
- **Firestore**: NoSQL database storing user profiles and app configuration
- **Supabase**: PostgreSQL-based operational database storing rides, requests, ratings, reports, and notifications
- **Trust Score**: A composite metric (0-100) evaluating user reliability based on ratings, completion rate, reliability, and experience
- **Rider Verification**: Administrative workflow to approve or reject users who want to offer rides
- **Audit Log**: Immutable record of all administrative actions performed in the system
- **OneSignal**: Push notification service for broadcasting messages to users
- **Service Role Key**: Privileged Supabase credential that must remain server-side only

## Requirements

### Requirement 1: User Management

**User Story:** As an administrator, I want to search, filter, and manage platform users, so that I can maintain user quality and handle verification requests.

#### Acceptance Criteria

1. WHEN an administrator requests the user list, THE Admin WebApp SHALL return paginated results with filters for query text, role, verification status, and trust score range
2. WHEN an administrator views a specific user profile, THE Admin WebApp SHALL display complete user details including trust score breakdown, ride history, and verification status
3. WHEN an administrator approves a rider verification request, THE Admin WebApp SHALL update the user's riderVerificationStatus to 'approved' and set isRiderVerified to true
4. WHEN an administrator rejects a rider verification request, THE Admin WebApp SHALL update the user's riderVerificationStatus to 'rejected' and store the rejection note
5. WHEN an administrator bans a user, THE Admin WebApp SHALL record the ban reason and prevent the user from accessing platform features

### Requirement 2: Ride Management

**User Story:** As an administrator, I want to monitor and manage rides across all statuses, so that I can resolve issues and ensure smooth platform operations.

#### Acceptance Criteria

1. WHEN an administrator requests the rides dashboard, THE Admin WebApp SHALL display rides filtered by status, owner, match state, and date range with pagination
2. WHEN an administrator views a specific ride, THE Admin WebApp SHALL display complete ride details including participants, status, pricing, confirmations, and associated chat messages
3. WHEN an administrator cancels a ride, THE Admin WebApp SHALL update the ride status to cancelled, record the cancellation reason, and apply any applicable cancellation fees
4. WHEN an administrator force-completes a ride, THE Admin WebApp SHALL update the ride status to completed and set the completion timestamp
5. WHEN an administrator views ride chat messages, THE Admin WebApp SHALL display all messages exchanged between ride participants in chronological order

### Requirement 3: Request Moderation

**User Story:** As an administrator, I want to review and manage ride requests, so that I can intervene when automated matching fails or disputes arise.

#### Acceptance Criteria

1. WHEN an administrator requests the pending requests queue, THE Admin WebApp SHALL display all ride requests filtered by ride ID and status with pagination
2. WHEN an administrator force-accepts a ride request, THE Admin WebApp SHALL update the request status to accepted and match the passenger to the ride
3. WHEN an administrator force-declines a ride request, THE Admin WebApp SHALL update the request status to declined and notify the passenger

### Requirement 4: Trust Score Management

**User Story:** As an administrator, I want to view trust score rankings and breakdowns, so that I can identify problematic users and ensure score accuracy.

#### Acceptance Criteria

1. WHEN an administrator requests trust score rankings, THE Admin WebApp SHALL return users sorted by trust score with filters for minimum and maximum score thresholds
2. WHEN an administrator views a user's trust score breakdown, THE Admin WebApp SHALL display the four component scores (rating, completion, reliability, experience) with their individual calculations
3. WHEN an administrator triggers trust score recalculation for a user, THE Admin WebApp SHALL recompute all components based on current user_stats data and update the total score
4. WHEN an administrator requests trust score outliers, THE Admin WebApp SHALL return users with scores below the specified minimum threshold or above the specified maximum threshold

### Requirement 5: Ratings and Reviews Moderation

**User Story:** As an administrator, I want to audit and moderate ratings and reviews, so that I can remove abusive content and maintain review quality.

#### Acceptance Criteria

1. WHEN an administrator requests ratings for a specific ride or user, THE Admin WebApp SHALL return all associated ratings with pagination
2. WHEN an administrator hides a rating, THE Admin WebApp SHALL set the is_visible flag to false without deleting the rating data
3. WHEN an administrator deletes a rating, THE Admin WebApp SHALL permanently remove the rating record from the database
4. WHEN an administrator views rating patterns, THE Admin WebApp SHALL display aggregated statistics showing rating distribution and potential abuse indicators

### Requirement 6: Report Management

**User Story:** As an administrator, I want to triage and resolve user reports, so that I can address platform abuse and safety concerns.

#### Acceptance Criteria

1. WHEN an administrator requests the reports queue, THE Admin WebApp SHALL display reports filtered by status and reported user with pagination
2. WHEN an administrator resolves a report, THE Admin WebApp SHALL update the report status to 'resolved' and store the resolution note
3. WHEN an administrator escalates a report, THE Admin WebApp SHALL update the report status to 'escalated' and record the escalation reason
4. WHEN an administrator views a report, THE Admin WebApp SHALL display complete report details including reporter, reported user, associated ride, type, description, and current status

### Requirement 7: Notification Broadcasting

**User Story:** As an administrator, I want to send targeted and broadcast notifications, so that I can communicate important information to platform users.

#### Acceptance Criteria

1. WHEN an administrator creates a broadcast notification, THE Admin WebApp SHALL insert notification records for all targeted users in the Supabase notifications table
2. WHEN an administrator creates a broadcast notification, THE Admin WebApp SHALL send push notifications via OneSignal to all targeted user devices
3. WHEN an administrator views notifications for a specific user, THE Admin WebApp SHALL display all notifications with read/unread status
4. WHEN an administrator marks a notification as read, THE Admin WebApp SHALL update the is_read flag to true
5. WHEN an administrator deletes a notification, THE Admin WebApp SHALL remove the notification record from the database

### Requirement 8: Application Configuration Management

**User Story:** As an administrator, I want to manage app configuration and feature flags, so that I can control platform behavior and enforce version requirements.

#### Acceptance Criteria

1. WHEN an administrator requests the current app configuration, THE Admin WebApp SHALL retrieve and display the configuration from Firestore app_config collection
2. WHEN an administrator updates the minimum app version, THE Admin WebApp SHALL update the minVersion field in Firestore app_config
3. WHEN an administrator updates feature flags, THE Admin WebApp SHALL update the flags object in Firestore app_config

### Requirement 9: Audit Logging

**User Story:** As an administrator, I want to view a complete audit trail of all administrative actions, so that I can ensure accountability and investigate issues.

#### Acceptance Criteria

1. WHEN an administrator performs any write operation, THE Admin WebApp SHALL create an audit log entry recording the admin UID, action type, entity type, entity ID, and state diff
2. WHEN an administrator requests the audit log, THE Admin WebApp SHALL return entries filtered by admin UID, entity type, entity ID, and date range with pagination
3. WHEN an administrator views an audit log entry, THE Admin WebApp SHALL display the complete action details including timestamp, admin identifier, and before/after state changes

### Requirement 10: Authentication and Authorization

**User Story:** As a platform owner, I want to ensure only authorized administrators can access the admin webapp, so that I can protect sensitive data and operations.

#### Acceptance Criteria

1. WHEN a user attempts to access any admin endpoint, THE Admin WebApp SHALL verify the Firebase ID token and validate the admin custom claim
2. WHEN a user without admin claims attempts to access an admin endpoint, THE Admin WebApp SHALL return a 403 Forbidden error
3. WHEN an admin session expires, THE Admin WebApp SHALL require re-authentication before allowing further operations
4. WHEN the Admin WebApp initializes Firebase Admin SDK, THE Admin WebApp SHALL use server-only environment variables and never expose credentials to the client

### Requirement 11: Data Export

**User Story:** As an administrator, I want to export platform data to CSV format, so that I can perform offline analysis and reporting.

#### Acceptance Criteria

1. WHEN an administrator requests a users export, THE Admin WebApp SHALL generate a CSV file containing all user records with relevant fields
2. WHEN an administrator requests a rides export, THE Admin WebApp SHALL generate a CSV file containing all ride records with relevant fields
3. WHEN an administrator requests a reports export, THE Admin WebApp SHALL generate a CSV file containing all report records with relevant fields
4. WHEN the Admin WebApp generates a CSV export, THE Admin WebApp SHALL set the Content-Type header to text/csv and provide an appropriate filename

### Requirement 12: Real-Time Updates

**User Story:** As an administrator, I want to see real-time updates for critical data, so that I can respond quickly to platform events.

#### Acceptance Criteria

1. WHEN a ride status changes in Supabase, THE Admin WebApp SHALL update the rides dashboard in real-time using Supabase Realtime subscriptions
2. WHEN a new ride request is created in Supabase, THE Admin WebApp SHALL update the requests queue in real-time using Supabase Realtime subscriptions
3. WHEN a user's rider verification status changes to pending in Firestore, THE Admin WebApp SHALL update the verification queue in real-time using Firestore snapshots
4. WHEN notification unread counts change in Supabase, THE Admin WebApp SHALL update the notification indicators in real-time using Supabase Realtime subscriptions
