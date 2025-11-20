# 🗺️ Database Schema Diagram

## Table Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UNIRIDE DATABASE                             │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│     rides        │◄────┐   │  ride_requests   │
├──────────────────┤     │   ├──────────────────┤
│ id (PK)          │     └───│ ride_id (FK)     │
│ owner_uid        │         │ passenger_uid    │
│ rider_uid        │         │ status           │
│ passenger_uid    │         │ seats_requested  │
│ from/to location │         │ message          │
│ price            │         └──────────────────┘
│ status           │                 
│ type (offer/req) │         
│ earnings         │         ┌──────────────────┐
│ ...              │◄────────│ ride_transactions│
└──────────────────┘         ├──────────────────┤
        │                    │ id (PK)          │
        │                    │ ride_id (FK)     │
        ├────────────────────│ payer_uid        │
        │                    │ payee_uid        │
        │                    │ amount           │
        │                    │ platform_fee     │
        │                    └──────────────────┘
        │
        │                    ┌──────────────────┐
        ├────────────────────│  ride_ratings    │
        │                    ├──────────────────┤
        │                    │ id (PK)          │
        │                    │ ride_id (FK)     │
        │                    │ rater_uid        │
        │                    │ rated_uid        │
        │                    │ rating (1-5)     │
        │                    │ review           │
        │                    └──────────────────┘
        │
        │                    ┌──────────────────┐
        └────────────────────│ride_cancellations│
                             ├──────────────────┤
                             │ id (PK)          │
                             │ ride_id (FK)     │
                             │ cancelled_by_uid │
                             │ reason_category  │
                             │ hours_before     │
                             │ fee_amount       │
                             └──────────────────┘

┌──────────────────┐
│   user_stats     │ ◄── Referenced by Firebase UIDs (TEXT)
├──────────────────┤     No foreign key constraints
│ user_uid (PK)    │
│ trust_score      │
│ total_earnings   │
│ completed_rides  │
│ avg_rating       │
│ cancellation_cnt │
│ ...              │
└──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│    reports       │         │  notifications   │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │         │ id (PK)          │
│ reporter_uid     │         │ user_uid         │
│ reported_uid     │         │ type (enum)      │
│ ride_id (FK)     │         │ title            │
│ category         │         │ message          │
│ severity         │         │ is_read          │
│ status           │         │ action_data      │
└──────────────────┘         └──────────────────┘

┌──────────────────┐
│ admin_audit_log  │
├──────────────────┤
│ id (PK)          │
│ admin_uid        │
│ action           │
│ entity_type      │
│ entity_id        │
│ diff (JSON)      │
└──────────────────┘
```

## Data Flow

### Ride Lifecycle Flow
```
1. CREATE RIDE
   ↓
   rides (status: active, type: offer/request)

2. REQUEST RIDE
   ↓
   ride_requests (status: pending)

3. ACCEPT REQUEST
   ↓
   rides (status: matched, rider_uid, passenger_uid set)
   ride_requests (status: accepted)

4. START RIDE
   ↓
   rides (status: ongoing, ride_started_at set)

5. ONE USER CONFIRMS
   ↓
   rides (status: partially_completed)

6. BOTH CONFIRM
   ↓
   rides (status: completed, completed_at set)
   ↓
   ride_transactions (create payment record)
   ↓
   user_stats (update earnings, ride counts)

7. RATE EACH OTHER
   ↓
   ride_ratings (create ratings)
   ↓
   user_stats (update average ratings)
   ↓
   trust_score recalculated automatically
```

### Cancellation Flow
```
CANCEL RIDE
   ↓
rides (status: cancelled_by_rider/passenger)
   ↓
ride_cancellations (record created)
   ↓
user_stats (update cancellation counts)
   ↓
trust_score recalculated
```

### Trust Score Calculation
```
user_stats (updated)
   ↓
TRIGGER: auto_calculate_trust_score
   ↓
FUNCTION: calculate_trust_score()
   ├─ Rating Score (0-30)
   ├─ Completion Rate (0-25)
   ├─ Reliability (0-25)
   └─ Experience Bonus (0-20)
   ↓
user_stats.trust_score updated (0-100)
```

## Access Patterns

### Main App Queries

**User Dashboard:**
```sql
SELECT * FROM rides 
WHERE owner_uid = ? AND status = 'active'
```

**Browse Rides:**
```sql
SELECT * FROM rides 
WHERE status = 'active' AND visible = true
ORDER BY depart_at
```

**User Profile:**
```sql
SELECT * FROM user_stats WHERE user_uid = ?
```

### Admin Dashboard Queries

**All Active Rides:**
```sql
SELECT * FROM rides WHERE status IN ('active', 'matched', 'ongoing')
```

**User Analytics:**
```sql
SELECT * FROM user_stats 
ORDER BY trust_score DESC
LIMIT 100
```

**Recent Reports:**
```sql
SELECT * FROM reports 
WHERE status = 'pending'
ORDER BY created_at DESC
```

**Admin Actions:**
```sql
SELECT * FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 100
```

## Indexes for Performance

**Most Important Indexes:**
```
rides:
  - idx_rides_owner (owner_uid)
  - idx_rides_status (status)
  - idx_rides_depart_at (depart_at) WHERE status='active'
  - idx_rides_rider_uid (rider_uid)
  - idx_rides_passenger_uid (passenger_uid)

user_stats:
  - idx_user_stats_trust_score (trust_score)
  - idx_user_stats_suspended (is_suspended)

notifications:
  - idx_notifications_user_uid (user_uid)
  - idx_notifications_is_read (is_read)

reports:
  - idx_reports_status (status)
  - idx_reports_severity (severity)
```

## Security (RLS Policies)

```
rides:
  ✓ Anyone can view active rides
  ✓ Users can only edit their own rides
  
ride_requests:
  ✓ Users see their own requests
  ✓ Ride owners see all requests for their rides
  
notifications:
  ✓ Users can only see their own notifications
  
reports:
  ✓ Permissive for now (app-level security)
  
admin_audit_log:
  ✓ Service role only
```

---

**Legend:**
- PK = Primary Key
- FK = Foreign Key
- ◄── = References
- ↓ = Leads to
- ✓ = Enabled
