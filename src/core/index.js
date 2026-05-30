/******************************************************************************/


/* Extracts and flattens feature flags from the raw token payload into a simple
 * key-value dictionary.
 *
 * Kinde provides feature flags as nested objects that contain the name of the
 * flags, their values, and their types:
 *
 *    "feature_flags": {
 *     "a_boolean_flag": {
 *       "t": "b",
 *       "v": false
 *     },
 *     "a_string_flag": {
 *       "t": "s",
 *       "v": "control"
 *     },
 *     "an_integer_flag": {
 *       "t": "i",
 *       "v": 1000
 *     }
 *   }
 *
 * The Kinde API for the client side has routines for pulling out flags, but
 * they require you to name the type (and generate errors if you pick the wrong
 * one.
 *
 * This utility flattens the structure down to just an object with the keys and
 * values directly, such as { flag_name: 'value' }, so that application code can
 * easily check for flags without worrying about the nested structure.
 *
 * The return value is an object with a flags key (which may be empty if there
 * are no flags or an invalid object was passed in) and a featureFlag function
 * that returns the value of a given flag, optionally giving you a default value
 * if the flag does not exist. */
export function extractFlags(featureFlags) {
  const flags = {};

  // If we got a flags object, pull the keys out into a new flattened object.
  if (featureFlags !== undefined && featureFlags !== null) {
    for (const [key, data] of Object.entries(featureFlags)) {
      flags[key] = data.v;
    }
  }

  return {
    flags,
    featureFlag: (flag, defaultValue) =>  flags[flag] === undefined ? defaultValue : flags[flag],
  }
}


/******************************************************************************/
