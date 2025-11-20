# Requirements Document

## Introduction

This document outlines the requirements for fixing two critical errors on the `/users` page: a Firebase collection error occurring during server-side rendering and a hydration mismatch warning. The Firebase error prevents the real-time verification queue subscription from working correctly, while the hydration mismatch creates inconsistencies between server and client rendering.

## Glossary

- **Users Page**: The admin interface page located at `/users` that displays user management functionality
- **Firebase Client SDK**: The client-side Firebase library used for real-time database subscriptions
- **SSR (Server-Side Rendering)**: Next.js rendering that occurs on the server before sending HTML to the client
- **Hydration**: The process where React attaches event handlers to server-rendered HTML on the client
- **Firestore Proxy**: The lazy-initialized Firestore instance exported from `lib/firebase/client.ts`
- **Real-time Subscription**: A Firestore listener that updates data automatically when database changes occur

## Requirements

### Requirement 1

**User Story:** As a developer, I want the Firebase client SDK to only initialize on the client side, so that server-side rendering does not cause Firebase collection errors

#### Acceptance Criteria

1. WHEN the Users Page component mounts on the client, THE Users Page SHALL initialize the Firestore real-time subscription
2. WHEN the server renders the Users Page, THE Users Page SHALL NOT attempt to access the Firestore instance
3. WHEN the Firestore proxy is accessed during SSR, THE Firestore Proxy SHALL return undefined or throw a clear error message
4. WHEN the Users Page component unmounts, THE Users Page SHALL properly cleanup the Firestore subscription

### Requirement 2

**User Story:** As a developer, I want to prevent hydration mismatches, so that the application renders consistently between server and client

#### Acceptance Criteria

1. WHEN the server renders the root layout, THE Root Layout SHALL NOT include any client-side only attributes or dynamic values
2. WHEN the client hydrates the application, THE Client SHALL match the server-rendered HTML exactly
3. IF a hydration mismatch occurs, THEN THE Application SHALL log a clear error message identifying the source
4. WHEN rendering user-specific or time-sensitive data, THE Component SHALL use client-side only rendering for that data

### Requirement 3

**User Story:** As an admin user, I want the pending verification count to display correctly, so that I can see how many users need verification

#### Acceptance Criteria

1. WHEN the Users Page loads on the client, THE Users Page SHALL subscribe to the rider verification queue
2. WHEN a new user requests verification, THE Users Page SHALL update the pending count in real-time
3. WHEN the pending count changes, THE Users Page SHALL display a visual indicator for 2 seconds
4. WHEN no users are pending verification, THE Users Page SHALL NOT display the pending count badge
