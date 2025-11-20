import { validateUnifiedSchema, formatValidationResult } from '@/lib/utils/validateSchema';

/**
 * Server component that validates the database schema on startup
 * 
 * This component runs during server-side rendering and logs warnings
 * if the unified schema is not properly set up.
 */
export async function SchemaValidator() {
  // Only run validation in development or if explicitly enabled
  const shouldValidate = 
    process.env.NODE_ENV === 'development' || 
    process.env.VALIDATE_SCHEMA === 'true';

  if (!shouldValidate) {
    return null;
  }

  try {
    const result = await validateUnifiedSchema();
    
    if (!result.valid) {
      // Log warning to console
      console.warn('\n' + '='.repeat(80));
      console.warn('DATABASE SCHEMA WARNING');
      console.warn('='.repeat(80));
      console.warn(formatValidationResult(result));
      console.warn('='.repeat(80) + '\n');
    } else {
      // Log success in development
      if (process.env.NODE_ENV === 'development') {
        console.log('✓ Database schema validation passed');
      }
    }
  } catch (error) {
    // Don't crash the app if validation fails
    console.error('Error during schema validation:', error);
  }

  // This component doesn't render anything
  return null;
}
