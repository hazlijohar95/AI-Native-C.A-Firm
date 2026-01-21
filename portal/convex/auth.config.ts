// convex/auth.config.ts
// Server-side configuration for validating WorkOS access tokens
// Docs: https://docs.convex.dev/auth/authkit

const clientId = process.env.WORKOS_CLIENT_ID;

const authConfig = {
  providers: [
    {
      // For SSO-based authentication
      type: "customJwt" as const,
      issuer: `https://api.workos.com/`,
      algorithm: "RS256" as const,
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    {
      // For User Management (email/password, social login)
      type: "customJwt" as const,
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256" as const,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};

export default authConfig;
