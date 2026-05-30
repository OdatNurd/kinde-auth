/******************************************************************************/


import createKindeClient from '@kinde-oss/kinde-auth-pkce-js';
import { extractFlags } from '../core/index.js';


/******************************************************************************/


/* Initializes the Kinde authentication client for browser-based Single Page
 * Applications (SPAs) using the PKCE flow.
 *
 * This factory function takes the config parameters provided, instantiates the
 * underlying Kinde SDK, and then returns a clean, simplified API surface.
 *
 * This abstracts away the need for the application to directly parse tokens by
 * providing a getContext() method that fully evaluates the user's session
 * state, roles, permissions, and feature flags.
 *
 * The configuration object is as would be passed to createKindeClient, and can
 * have the following keys:
 *   Required:
 *     client_id:    The unique ID of the application in Kinde.
 *     domain:       Your Kinde domain (e.g., 'https://yourdomain.kinde.com').
 *     redirect_uri: The local URL to redirect back to after a successful login.
 *
 *   Optional:
 *     logout_uri:   The local URL to redirect to after a successful logout.
 *     audience:     The API identifier to ensure tokens are scoped to your
 *                   specific backend.
 *     scope:        A space-separated list of requested scopes (defaults to
 *                   'openid profile email offline').
 *
 * The turn value of the call is an object that contains the following methods:
 *   login:           (Async) Redirects to the Kinde login flow.
 *   register:        (Async) Redirects to the Kinde registration flow.
 *   logout:          (Async) Clears the local session and redirects to the
 *                            Kinde logout flow.
 *   getToken:        (Async) Returns the raw JWT access token/
 *   isAuthenticated: (Async) Returns a boolean indicating if a valid, unexpired
 *                            session currently exists.
 *   getContext:      (Async) Returns the master user state object, or null if
 *                            the user is not authenticated.
 *
 * Application code can call getContext() in order to obtain an object that has
 * decoded information from the token:
 *   profile:     An object containing the user's profile information extracted
 *                from the ID token (e.g., id, given_name, email).
 *   permissions: An object containing the permissions granted to the user.
 *   roles:       A list of role objects assigned to the user within the Kinde
 *                environment; null if there are none
 *   featureFlag: A function that returns the value of the named feature flag,
 *                returning the default value if the flag is not set.
 *   flags:       A flattened dictionary of all feature flags; the featureFlag()
 *                function accesses this.
 */
export async function createClientAuth(config) {
  // Initializing the client automatically evaluates the current URL to see if
  // the user is returning from a Kinde login redirect, parsing the token
  // fragments out of the URL if present.
  const kinde = await createKindeClient(config);

  return {
    // Standard authentication flow triggers. These redirect the browser to the
    // hosted Kinde pages to handle user credentials securely.
    login: async () => await kinde.login(),
    register: async () => await kinde.register(),
    logout: async () => await kinde.logout(),

    // Retrieves the raw JWT access token string, which is necessary to inject
    // into the Authorization header when making calls to our secured backend
    // APIs.
    getToken: async () => await kinde.getToken(),

    // Quickly evaluates if the user has a valid, non-expired session token.
    isAuthenticated: async () => await kinde.isAuthenticated(),

    // Constructs and returns the master state object for the authenticated
    // user.
    //
    // This function extracts all relevant claims from both the ID token and the
    // Access token. If the user is not authenticated, it cleanly returns null
    // to allow the application to easily route them away from secured areas
    // as needed.
    getContext: async () => {
      // Not a lot to do if the user is not authenticated.
      const isAuthenticated = await kinde.isAuthenticated();
      if (isAuthenticated === false) {
        return null;
      }

      // Retrieve ID Token Data; this data contains the profile information for
      // the user.
      const user = await kinde.getUser();

      // Retrieve Access Token Data; this data contains the authorization info
      // for the user.
      const permissionsData = await kinde.getPermissions();
      const rolesClaim = await kinde.getClaim('roles');
      const flagsClaim = await kinde.getClaim('feature_flags');
      const flagsContext = extractFlags(flagsClaim !== null ? flagsClaim.value : null);

      return {
        profile: user,
        permissions: permissionsData,
        roles: rolesClaim !== null ? rolesClaim.value : null,
        ...flagsContext,
      };
    }
  };
}


/******************************************************************************/
