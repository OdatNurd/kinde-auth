/******************************************************************************/


import { createRemoteJWKSet, jwtVerify } from 'jose';
import { extractFlags } from '../core/index.js';


/******************************************************************************/


/* A global cache used to persist the JSON Web Key Set (JWKS) across multiple
 * request invocations within the same Cloudflare Worker isolate.
 *
 * Fetching the public keys from Kinde on every single request would add severe
 * latency. By declaring this outside the request handler, the Worker keeps the
 * keys in memory as long as the isolate stays warm. */
let jwksCache = null;


/******************************************************************************/


/* Parses the incoming HTTP request to extract the JWT from the Authorization
 * header. It strictly expects the standard 'Bearer <token>' format.
 *
 * Returns null if the header is missing or improperly formatted. */
export function extractBearerToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== null && authHeader.startsWith('Bearer ') === true) {
    return authHeader.split(' ')[1];
  }

  return null;
}


/******************************************************************************/


/* Verifies the cryptographic signature of the provided JWT against Kinde's
 * published public keys (JWKS) to guarantee the token was genuinely issued by
 * Kinde and has not been tampered with or expired.
 *
 * If the verification is successful, the payload is decoded and used to create
 * the exact same object that the client side library produces from the client
 * object's getContext() function call.
 *
 * This allows application code to expect a uniform structure regardless of what
 * side it is running on.
 *
 * The returned object will have a success key that indicates if the validation
 * was successful or not; if not, the error field says why the validation failed
 * for error reporting purposes; otherwise, the context key is the same value
 * as would be returned from a call to the client side getContext() function
 * call. */
export async function verifyToken(token, jwksUrl, issuer) {
  // Lazily initialize the JWKS cache on the first authentication attempt the
  // worker handles. Subsequent requests will reuse this cached object.
  if (jwksCache === null) {
    jwksCache = createRemoteJWKSet(new URL(jwksUrl));
  }

  try {
    // jwtVerify automatically checks the signature and the expiration (exp)
    // claim. By passing the issuer, we also enforce that this token came
    // specifically from our configured Kinde environment.
    const { payload } = await jwtVerify(token, jwksCache, {
      issuer: issuer
    });

    // Extract and parse the flags in the token payload.
    const flagsContext = extractFlags(payload.feature_flags);

    return {
      success: true,
      context: {
        id: payload.sub,
        permissions: payload.permissions || [],
        rawPayload: payload,
        ...flagsContext,
      },
      error: null
    };
  } catch (err) {
    // Verification fails if the token is expired, the signature is invalid, or
    // the issuer mismatches. We return a normalized failure state so the
    // middleware can cleanly reject the request.
    return {
      success: false,
      context: null,
      error: err.message
    };
  }
}


/******************************************************************************/
