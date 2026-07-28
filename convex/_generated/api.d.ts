/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAuth from "../adminAuth.js";
import type * as auth from "../auth.js";
import type * as communications from "../communications.js";
import type * as crons from "../crons.js";
import type * as donations from "../donations.js";
import type * as eventNotifications from "../eventNotifications.js";
import type * as events from "../events.js";
import type * as households from "../households.js";
import type * as http from "../http.js";
import type * as registrations from "../registrations.js";
import type * as volunteerAgreement from "../volunteerAgreement.js";
import type * as volunteerPortal from "../volunteerPortal.js";
import type * as volunteerSignatures from "../volunteerSignatures.js";
import type * as volunteers from "../volunteers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAuth: typeof adminAuth;
  auth: typeof auth;
  communications: typeof communications;
  crons: typeof crons;
  donations: typeof donations;
  eventNotifications: typeof eventNotifications;
  events: typeof events;
  households: typeof households;
  http: typeof http;
  registrations: typeof registrations;
  volunteerAgreement: typeof volunteerAgreement;
  volunteerPortal: typeof volunteerPortal;
  volunteerSignatures: typeof volunteerSignatures;
  volunteers: typeof volunteers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
