export type DatabaseSafetyEnvironment = {
  NODE_ENV?: string;
  REPLIT_DEPLOYMENT?: string;
};

/**
 * Replit supplies a separate runtime-managed DATABASE_URL for development and
 * published deployments. Refuse mismatched runtime markers before creating a
 * database pool so a development server cannot run inside a published service.
 */
export function assertDatabaseRuntimeEnvironment(
  environment: DatabaseSafetyEnvironment = process.env,
): void {
  const isPublished = environment.REPLIT_DEPLOYMENT === "1";
  const isProduction = environment.NODE_ENV === "production";

  if (isPublished !== isProduction) {
    throw new Error(
      "Database runtime mode does not match the Replit deployment context. " +
        "Development must use the development database; published services must run with NODE_ENV=production.",
    );
  }
}

/**
 * Schema pushes are a development-only operation. Replit Publish is the
 * supported path for applying managed production schema changes.
 */
export function assertDatabaseSchemaPushAllowed(
  environment: DatabaseSafetyEnvironment = process.env,
): void {
  assertDatabaseRuntimeEnvironment(environment);

  if (
    environment.NODE_ENV === "production" ||
    environment.REPLIT_DEPLOYMENT === "1"
  ) {
    throw new Error(
      "Database schema pushes are disabled in production. Review and apply managed production schema changes through Replit Publish.",
    );
  }
}
