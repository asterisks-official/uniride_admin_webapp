// Database type definitions for Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RideStatus =
  | 'active'
  | 'matched'
  | 'confirmed'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'cancelled_by_rider'
  | 'cancelled_by_passenger'
  | 'expired';

export type RideType = 'offer' | 'request';

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export type ReportCategory = 
  | 'Rider Safety Concern'
  | 'Inappropriate Behavior'
  | 'Vehicle Issues'
  | 'Route/Navigation Problem'
  | 'Payment Issue'
  | 'App Technical Issue'
  | 'Passenger No-Show'
  | 'Safety Concern'
  | 'Damage to Vehicle'
  | 'Other';

export type ReportSeverity = 
  | 'Low - Minor inconvenience'
  | 'Medium - Moderate concern'
  | 'High - Serious issue'
  | 'Critical - Safety concern';

export type ReporterRole = 'rider' | 'passenger';

export type NotificationType =
  | 'ride_matched'
  | 'ride_confirmed'
  | 'ride_cancelled'
  | 'ride_completed'
  | 'request_accepted'
  | 'request_declined'
  | 'rating_received'
  | 'report_resolved'
  | 'admin_broadcast'
  | 'ride_started'
  | 'payment_completed';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          uid: string;
          email: string;
          name: string;
          student_id: string;
          phone: string;
          role: 'rider' | 'passenger';
          profile_image_url: string | null;
          bike_image_url: string | null;
          is_email_verified: boolean;
          is_rider_verified: boolean | null;
          rider_verification_status: 'unsubmitted' | 'pending' | 'approved' | 'rejected' | null;
          verification_rejection_reason: string | null;
          verification_submitted_at: string | null;
          verification_reviewed_at: string | null;
          verification_reviewed_by: string | null;
          bike_model: string | null;
          vehicle_number: string | null;
          vehicle_type: string | null;
          vehicle_color: string | null;
          total_rides: number;
          average_rating: number;
          onesignal_player_id: string | null;
          onesignal_subscription_id: string | null;
          push_notifications_enabled: boolean;
          is_active: boolean;
          is_suspended: boolean;
          suspension_reason: string | null;
          suspended_at: string | null;
          suspended_by: string | null;
          suspended_until: string | null;
          show_phone_to_matched: boolean;
          show_full_name: boolean;
          bio: string | null;
          university: string | null;
          department: string | null;
          graduation_year: number | null;
          preferences: Json | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          last_active_at: string;
        };
        Insert: {
          uid: string;
          email: string;
          name: string;
          student_id: string;
          phone: string;
          role: 'rider' | 'passenger';
          profile_image_url?: string | null;
          bike_image_url?: string | null;
          is_email_verified?: boolean;
          is_rider_verified?: boolean | null;
          rider_verification_status?: 'unsubmitted' | 'pending' | 'approved' | 'rejected' | null;
          verification_rejection_reason?: string | null;
          verification_submitted_at?: string | null;
          verification_reviewed_at?: string | null;
          verification_reviewed_by?: string | null;
          bike_model?: string | null;
          vehicle_number?: string | null;
          vehicle_type?: string | null;
          vehicle_color?: string | null;
          total_rides?: number;
          average_rating?: number;
          onesignal_player_id?: string | null;
          onesignal_subscription_id?: string | null;
          push_notifications_enabled?: boolean;
          is_active?: boolean;
          is_suspended?: boolean;
          suspension_reason?: string | null;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspended_until?: string | null;
          show_phone_to_matched?: boolean;
          show_full_name?: boolean;
          bio?: string | null;
          university?: string | null;
          department?: string | null;
          graduation_year?: number | null;
          preferences?: Json | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          last_active_at?: string;
        };
        Update: {
          uid?: string;
          email?: string;
          name?: string;
          student_id?: string;
          phone?: string;
          role?: 'rider' | 'passenger';
          profile_image_url?: string | null;
          bike_image_url?: string | null;
          is_email_verified?: boolean;
          is_rider_verified?: boolean | null;
          rider_verification_status?: 'unsubmitted' | 'pending' | 'approved' | 'rejected' | null;
          verification_rejection_reason?: string | null;
          verification_submitted_at?: string | null;
          verification_reviewed_at?: string | null;
          verification_reviewed_by?: string | null;
          bike_model?: string | null;
          vehicle_number?: string | null;
          vehicle_type?: string | null;
          vehicle_color?: string | null;
          total_rides?: number;
          average_rating?: number;
          onesignal_player_id?: string | null;
          onesignal_subscription_id?: string | null;
          push_notifications_enabled?: boolean;
          is_active?: boolean;
          is_suspended?: boolean;
          suspension_reason?: string | null;
          suspended_at?: string | null;
          suspended_by?: string | null;
          suspended_until?: string | null;
          show_phone_to_matched?: boolean;
          show_full_name?: boolean;
          bio?: string | null;
          university?: string | null;
          department?: string | null;
          graduation_year?: number | null;
          preferences?: Json | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          last_active_at?: string;
        };
      };
      rides: {
        Row: {
          id: string;
          owner_uid: string;
          from_location: string;
          from_lat: number;
          from_lng: number;
          to_location: string;
          to_lat: number;
          to_lng: number;
          depart_at: string;
          seats_total: number;
          seats_available: number;
          price: number;
          vehicle_info: string | null;
          notes: string | null;
          status: RideStatus;
          visible: boolean;
          type: RideType;
          flexibility_minutes: number;
          earnings: number;
          platform_fee: number;
          total_amount: number;
          payment_status: string;
          payment_method: string | null;
          ride_started_at: string | null;
          completion_verified_at: string | null;
          auto_completed_at: string | null;
          cancellation_fee: number;
          distance_km: number | null;
          duration_minutes: number | null;
          matched_at: string | null;
          rider_uid: string | null;
          passenger_uid: string | null;
          confirmation_deadline: string | null;
          rider_confirmed_going: boolean;
          passenger_confirmed_going: boolean;
          rider_confirmed_completion: boolean;
          passenger_confirmed_completion: boolean;
          cancelled_at: string | null;
          cancelled_by_uid: string | null;
          cancellation_reason: string | null;
          completed_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_uid: string;
          from_location: string;
          from_lat: number;
          from_lng: number;
          to_location: string;
          to_lat: number;
          to_lng: number;
          depart_at: string;
          seats_total: number;
          seats_available: number;
          price: number;
          vehicle_info?: string | null;
          notes?: string | null;
          status?: RideStatus;
          visible?: boolean;
          type?: RideType;
          flexibility_minutes?: number;
          earnings?: number;
          platform_fee?: number;
          total_amount?: number;
          payment_status?: string;
          payment_method?: string | null;
          ride_started_at?: string | null;
          completion_verified_at?: string | null;
          auto_completed_at?: string | null;
          cancellation_fee?: number;
          distance_km?: number | null;
          duration_minutes?: number | null;
          matched_at?: string | null;
          rider_uid?: string | null;
          passenger_uid?: string | null;
          confirmation_deadline?: string | null;
          rider_confirmed_going?: boolean;
          passenger_confirmed_going?: boolean;
          rider_confirmed_completion?: boolean;
          passenger_confirmed_completion?: boolean;
          cancelled_at?: string | null;
          cancelled_by_uid?: string | null;
          cancellation_reason?: string | null;
          completed_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_uid?: string;
          from_location?: string;
          from_lat?: number;
          from_lng?: number;
          to_location?: string;
          to_lat?: number;
          to_lng?: number;
          depart_at?: string;
          seats_total?: number;
          seats_available?: number;
          price?: number;
          vehicle_info?: string | null;
          notes?: string | null;
          status?: RideStatus;
          visible?: boolean;
          type?: RideType;
          flexibility_minutes?: number;
          earnings?: number;
          platform_fee?: number;
          total_amount?: number;
          payment_status?: string;
          payment_method?: string | null;
          ride_started_at?: string | null;
          completion_verified_at?: string | null;
          auto_completed_at?: string | null;
          cancellation_fee?: number;
          distance_km?: number | null;
          duration_minutes?: number | null;
          matched_at?: string | null;
          rider_uid?: string | null;
          passenger_uid?: string | null;
          confirmation_deadline?: string | null;
          rider_confirmed_going?: boolean;
          passenger_confirmed_going?: boolean;
          rider_confirmed_completion?: boolean;
          passenger_confirmed_completion?: boolean;
          cancelled_at?: string | null;
          cancelled_by_uid?: string | null;
          cancellation_reason?: string | null;
          completed_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ride_requests: {
        Row: {
          id: string;
          ride_id: string;
          passenger_uid: string;
          seats_requested: number;
          message: string | null;
          status: RequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          passenger_uid: string;
          seats_requested: number;
          message?: string | null;
          status?: RequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          passenger_uid?: string;
          seats_requested?: number;
          message?: string | null;
          status?: RequestStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      ride_ratings: {
        Row: {
          id: string;
          ride_id: string;
          rater_uid: string;
          rated_uid: string;
          rater_role: 'rider' | 'passenger';
          rating: number;
          review: string | null;
          review_tags: string[] | null;
          is_flagged: boolean;
          flag_reason: string | null;
          moderated_at: string | null;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          rater_uid: string;
          rated_uid: string;
          rater_role: 'rider' | 'passenger';
          rating: number;
          review?: string | null;
          review_tags?: string[] | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          moderated_at?: string | null;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          rater_uid?: string;
          rated_uid?: string;
          rater_role?: 'rider' | 'passenger';
          rating?: number;
          review?: string | null;
          review_tags?: string[] | null;
          is_flagged?: boolean;
          flag_reason?: string | null;
          moderated_at?: string | null;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_uid: string;
          reported_user_uid: string | null;
          ride_id: string | null;
          category: ReportCategory;
          severity: ReportSeverity;
          description: string;
          reporter_role: ReporterRole;
          status: ReportStatus;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          reporter_uid: string;
          reported_user_uid?: string | null;
          ride_id?: string | null;
          category: ReportCategory;
          severity: ReportSeverity;
          description: string;
          reporter_role: ReporterRole;
          status?: ReportStatus;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          reporter_uid?: string;
          reported_user_uid?: string | null;
          ride_id?: string | null;
          category?: ReportCategory;
          severity?: ReportSeverity;
          description?: string;
          reporter_role?: ReporterRole;
          status?: ReportStatus;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_uid: string;
          type: NotificationType;
          title: string;
          message: string;
          action_data: Json | null;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_uid: string;
          type: NotificationType;
          title: string;
          message: string;
          action_data?: Json | null;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_uid?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          action_data?: Json | null;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_stats: {
        Row: {
          user_uid: string;
          total_rides_as_rider: number;
          total_rides_as_passenger: number;
          completed_rides_as_rider: number;
          completed_rides_as_passenger: number;
          cancelled_rides_as_rider: number;
          cancelled_rides_as_passenger: number;
          total_earnings: number;
          pending_earnings: number;
          withdrawn_earnings: number;
          total_spent: number;
          average_rating_as_rider: number;
          average_rating_as_passenger: number;
          total_ratings_received_as_rider: number;
          total_ratings_received_as_passenger: number;
          cancellation_rate_as_rider: number;
          cancellation_rate_as_passenger: number;
          late_cancellations_count: number;
          no_show_count: number;
          trust_score: number;
          is_verified: boolean;
          is_suspended: boolean;
          suspension_reason: string | null;
          first_ride_at: string | null;
          last_ride_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_uid: string;
          total_rides_as_rider?: number;
          total_rides_as_passenger?: number;
          completed_rides_as_rider?: number;
          completed_rides_as_passenger?: number;
          cancelled_rides_as_rider?: number;
          cancelled_rides_as_passenger?: number;
          total_earnings?: number;
          pending_earnings?: number;
          withdrawn_earnings?: number;
          total_spent?: number;
          average_rating_as_rider?: number;
          average_rating_as_passenger?: number;
          total_ratings_received_as_rider?: number;
          total_ratings_received_as_passenger?: number;
          cancellation_rate_as_rider?: number;
          cancellation_rate_as_passenger?: number;
          late_cancellations_count?: number;
          no_show_count?: number;
          trust_score?: number;
          is_verified?: boolean;
          is_suspended?: boolean;
          suspension_reason?: string | null;
          first_ride_at?: string | null;
          last_ride_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_uid?: string;
          total_rides_as_rider?: number;
          total_rides_as_passenger?: number;
          completed_rides_as_rider?: number;
          completed_rides_as_passenger?: number;
          cancelled_rides_as_rider?: number;
          cancelled_rides_as_passenger?: number;
          total_earnings?: number;
          pending_earnings?: number;
          withdrawn_earnings?: number;
          total_spent?: number;
          average_rating_as_rider?: number;
          average_rating_as_passenger?: number;
          total_ratings_received_as_rider?: number;
          total_ratings_received_as_passenger?: number;
          cancellation_rate_as_rider?: number;
          cancellation_rate_as_passenger?: number;
          late_cancellations_count?: number;
          no_show_count?: number;
          trust_score?: number;
          is_verified?: boolean;
          is_suspended?: boolean;
          suspension_reason?: string | null;
          first_ride_at?: string | null;
          last_ride_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_uid: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          diff: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_uid: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          diff?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_uid?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          diff?: Json | null;
          created_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          ride_id: string;
          sender_uid: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          sender_uid: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          sender_uid?: string;
          message?: string;
          created_at?: string;
        };
      };
      ride_transactions: {
        Row: {
          id: string;
          ride_id: string;
          payer_uid: string;
          payee_uid: string;
          amount: number;
          platform_fee: number;
          net_amount: number;
          currency: string;
          transaction_type: 'ride_payment' | 'cancellation_fee' | 'refund' | 'bonus';
          payment_method: string | null;
          payment_gateway_ref: string | null;
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          processed_at: string | null;
          refunded_at: string | null;
          refund_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          payer_uid: string;
          payee_uid: string;
          amount: number;
          platform_fee?: number;
          net_amount: number;
          currency?: string;
          transaction_type: 'ride_payment' | 'cancellation_fee' | 'refund' | 'bonus';
          payment_method?: string | null;
          payment_gateway_ref?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          processed_at?: string | null;
          refunded_at?: string | null;
          refund_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          payer_uid?: string;
          payee_uid?: string;
          amount?: number;
          platform_fee?: number;
          net_amount?: number;
          currency?: string;
          transaction_type?: 'ride_payment' | 'cancellation_fee' | 'refund' | 'bonus';
          payment_method?: string | null;
          payment_gateway_ref?: string | null;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
          processed_at?: string | null;
          refunded_at?: string | null;
          refund_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ride_cancellations: {
        Row: {
          id: string;
          ride_id: string;
          cancelled_by_uid: string;
          cancelled_by_role: 'rider' | 'passenger';
          cancellation_stage: 'before_match' | 'after_match' | 'during_ride' | 'no_show';
          reason_category: 'personal_emergency' | 'found_alternative' | 'no_longer_needed' | 'passenger_no_show' | 'rider_no_show' | 'safety_concern' | 'payment_issue' | 'vehicle_issue' | 'weather' | 'other';
          reason_text: string | null;
          cancellation_fee_applied: boolean;
          fee_amount: number;
          refund_issued: boolean;
          refund_amount: number;
          ride_depart_time: string;
          hours_before_departure: number | null;
          affected_uid: string | null;
          affected_compensated: boolean;
          compensation_amount: number;
          cancelled_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          cancelled_by_uid: string;
          cancelled_by_role: 'rider' | 'passenger';
          cancellation_stage: 'before_match' | 'after_match' | 'during_ride' | 'no_show';
          reason_category: 'personal_emergency' | 'found_alternative' | 'no_longer_needed' | 'passenger_no_show' | 'rider_no_show' | 'safety_concern' | 'payment_issue' | 'vehicle_issue' | 'weather' | 'other';
          reason_text?: string | null;
          cancellation_fee_applied?: boolean;
          fee_amount?: number;
          refund_issued?: boolean;
          refund_amount?: number;
          ride_depart_time: string;
          hours_before_departure?: number | null;
          affected_uid?: string | null;
          affected_compensated?: boolean;
          compensation_amount?: number;
          cancelled_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          cancelled_by_uid?: string;
          cancelled_by_role?: 'rider' | 'passenger';
          cancellation_stage?: 'before_match' | 'after_match' | 'during_ride' | 'no_show';
          reason_category?: 'personal_emergency' | 'found_alternative' | 'no_longer_needed' | 'passenger_no_show' | 'rider_no_show' | 'safety_concern' | 'payment_issue' | 'vehicle_issue' | 'weather' | 'other';
          reason_text?: string | null;
          cancellation_fee_applied?: boolean;
          fee_amount?: number;
          refund_issued?: boolean;
          refund_amount?: number;
          ride_depart_time?: string;
          hours_before_departure?: number | null;
          affected_uid?: string | null;
          affected_compensated?: boolean;
          compensation_amount?: number;
          cancelled_at?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      user_profiles_complete: {
        Row: {
          uid: string;
          email: string;
          name: string;
          student_id: string;
          phone: string;
          role: string;
          profile_image_url: string | null;
          bike_image_url: string | null;
          is_email_verified: boolean;
          is_rider_verified: boolean | null;
          rider_verification_status: 'unsubmitted' | 'pending' | 'approved' | 'rejected' | null;
          verification_rejection_reason: string | null;
          verification_submitted_at: string | null;
          verification_reviewed_at: string | null;
          verification_reviewed_by: string | null;
          bike_model: string | null;
          vehicle_number: string | null;
          vehicle_type: string | null;
          vehicle_color: string | null;
          total_rides: number;
          average_rating: number;
          onesignal_player_id: string | null;
          onesignal_subscription_id: string | null;
          push_notifications_enabled: boolean;
          is_active: boolean;
          is_suspended: boolean;
          suspension_reason: string | null;
          suspended_at: string | null;
          suspended_by: string | null;
          suspended_until: string | null;
          show_phone_to_matched: boolean;
          show_full_name: boolean;
          bio: string | null;
          university: string | null;
          department: string | null;
          graduation_year: number | null;
          preferences: Json | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          last_active_at: string;
          completed_rides_as_rider: number | null;
          completed_rides_as_passenger: number | null;
          total_rides_as_rider: number | null;
          total_rides_as_passenger: number | null;
          cancelled_rides_as_rider: number | null;
          cancelled_rides_as_passenger: number | null;
          average_rating_as_rider: number | null;
          average_rating_as_passenger: number | null;
          total_ratings_received_as_rider: number | null;
          total_ratings_received_as_passenger: number | null;
          total_earnings: number | null;
          pending_earnings: number | null;
          withdrawn_earnings: number | null;
          total_spent: number | null;
          trust_score: number | null;
          cancellation_rate_as_rider: number | null;
          cancellation_rate_as_passenger: number | null;
          no_show_count: number | null;
          late_cancellations_count: number | null;
          is_verified: boolean | null;
          first_ride_at: string | null;
          last_ride_at: string | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
