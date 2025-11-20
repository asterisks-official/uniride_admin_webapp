import { supabase } from '@/lib/supabase/server';

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  missingTables: string[];
  missingColumns: Record<string, string[]>;
  errors: string[];
}

/**
 * Required tables in the unified schema
 */
const REQUIRED_TABLES = [
  'rides',
  'ride_requests',
  'ride_ratings',
  'ride_transactions',
  'ride_cancellations',
  'user_stats',
  'reports',
  'notifications',
  'admin_audit_log',
  'chat_messages',
] as const;

/**
 * Critical columns for each table that must exist
 * This is a subset of columns - we check the most important ones
 */
const REQUIRED_COLUMNS: Record<string, string[]> = {
  rides: [
    'id',
    'owner_uid',
    'type', // ride_type in unified schema
    'status',
    'earnings',
    'platform_fee',
    'total_amount',
    'payment_status',
  ],
  ride_requests: ['id', 'ride_id', 'passenger_uid', 'status'],
  ride_ratings: [
    'id',
    'ride_id',
    'rater_uid',
    'rated_uid',
    'rating',
    'review_tags', // tags field in unified schema
  ],
  ride_transactions: [
    'id',
    'ride_id',
    'payer_uid',
    'payee_uid',
    'amount',
    'platform_fee',
    'transaction_type',
    'status',
  ],
  ride_cancellations: [
    'id',
    'ride_id',
    'cancelled_by_uid',
    'cancelled_by_role',
    'reason_category',
    'fee_amount',
  ],
  user_stats: [
    'user_uid',
    'trust_score',
    'total_rides_as_rider',
    'total_rides_as_passenger',
    'total_earnings',
  ],
  reports: ['id', 'reporter_uid', 'category', 'severity', 'status'],
  notifications: ['id', 'user_uid', 'type', 'title', 'message'],
  admin_audit_log: ['id', 'admin_uid', 'action', 'entity_type'],
  chat_messages: ['id', 'ride_id', 'sender_uid', 'message'],
};

/**
 * Validate that the unified schema is properly set up in the database
 * 
 * This function checks for:
 * 1. Required tables exist
 * 2. Critical columns exist in each table
 * 
 * @returns Validation result with details about missing tables/columns
 */
export async function validateUnifiedSchema(): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    valid: true,
    missingTables: [],
    missingColumns: {},
    errors: [],
  };

  try {
    // Check each required table
    for (const tableName of REQUIRED_TABLES) {
      try {
        // Try to query the table with a limit of 0 to check if it exists
        const { error } = await supabase
          .from(tableName as any)
          .select('*')
          .limit(0);

        if (error) {
          // PostgreSQL error code 42P01 means "undefined table"
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            result.missingTables.push(tableName);
            result.valid = false;
          } else {
            // Some other error occurred
            result.errors.push(`Error checking table ${tableName}: ${error.message}`);
          }
        } else {
          // Table exists, now check for required columns
          await checkTableColumns(tableName, result);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        result.errors.push(`Exception checking table ${tableName}: ${errorMessage}`);
        result.valid = false;
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal error during schema validation: ${errorMessage}`);
    result.valid = false;
  }

  return result;
}

/**
 * Check if required columns exist in a table
 * 
 * @param tableName - Name of the table to check
 * @param result - Validation result object to update
 */
async function checkTableColumns(
  tableName: string,
  result: SchemaValidationResult
): Promise<void> {
  const requiredColumns = REQUIRED_COLUMNS[tableName];
  if (!requiredColumns || requiredColumns.length === 0) {
    return; // No specific columns to check for this table
  }

  try {
    // Try to select specific columns to see if they exist
    const columnList = requiredColumns.join(',');
    const { error } = await supabase
      .from(tableName as any)
      .select(columnList)
      .limit(0);

    if (error) {
      // PostgreSQL error code 42703 means "undefined column"
      if (error.code === '42703' || error.message.includes('column') && error.message.includes('does not exist')) {
        // Parse which column is missing from the error message
        const missingColumn = extractMissingColumnFromError(error.message);
        if (missingColumn) {
          if (!result.missingColumns[tableName]) {
            result.missingColumns[tableName] = [];
          }
          result.missingColumns[tableName].push(missingColumn);
          result.valid = false;
        } else {
          // Couldn't parse the specific column, mark all as potentially missing
          result.missingColumns[tableName] = requiredColumns;
          result.valid = false;
        }
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    result.errors.push(`Error checking columns for ${tableName}: ${errorMessage}`);
  }
}

/**
 * Extract the missing column name from a PostgreSQL error message
 * 
 * @param errorMessage - PostgreSQL error message
 * @returns The missing column name, or null if it couldn't be parsed
 */
function extractMissingColumnFromError(errorMessage: string): string | null {
  // PostgreSQL error format: 'column "column_name" does not exist'
  const match = errorMessage.match(/column "([^"]+)" does not exist/i);
  return match ? match[1] : null;
}

/**
 * Format the validation result as a human-readable message
 * 
 * @param result - Validation result
 * @returns Formatted message string
 */
export function formatValidationResult(result: SchemaValidationResult): string {
  if (result.valid) {
    return '✓ Unified schema validation passed - all required tables and columns are present.';
  }

  const messages: string[] = ['✗ Unified schema validation failed:'];

  if (result.missingTables.length > 0) {
    messages.push('');
    messages.push('Missing tables:');
    result.missingTables.forEach((table) => {
      messages.push(`  - ${table}`);
    });
  }

  if (Object.keys(result.missingColumns).length > 0) {
    messages.push('');
    messages.push('Missing columns:');
    Object.entries(result.missingColumns).forEach(([table, columns]) => {
      messages.push(`  - ${table}: ${columns.join(', ')}`);
    });
  }

  if (result.errors.length > 0) {
    messages.push('');
    messages.push('Errors:');
    result.errors.forEach((error) => {
      messages.push(`  - ${error}`);
    });
  }

  messages.push('');
  messages.push('To fix this, run the migrations from migrations_unified/ folder.');
  messages.push('See migrations_unified/QUICK_START.md for instructions.');

  return messages.join('\n');
}
