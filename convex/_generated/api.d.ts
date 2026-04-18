/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as artifacts from "../artifacts.js";
import type * as processEnvironmentStates from "../processEnvironmentStates.js";
import type * as processFeatureImplementationStates from "../processFeatureImplementationStates.js";
import type * as processFeatureSpecificationStates from "../processFeatureSpecificationStates.js";
import type * as processHistoryItems from "../processHistoryItems.js";
import type * as processOutputs from "../processOutputs.js";
import type * as processProductDefinitionStates from "../processProductDefinitionStates.js";
import type * as processSideWorkItems from "../processSideWorkItems.js";
import type * as processes from "../processes.js";
import type * as projectMembers from "../projectMembers.js";
import type * as projects from "../projects.js";
import type * as serviceApiKey from "../serviceApiKey.js";
import type * as sourceAttachments from "../sourceAttachments.js";
import type * as test_helpers_fake_convex_context from "../test_helpers/fake_convex_context.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  artifacts: typeof artifacts;
  processEnvironmentStates: typeof processEnvironmentStates;
  processFeatureImplementationStates: typeof processFeatureImplementationStates;
  processFeatureSpecificationStates: typeof processFeatureSpecificationStates;
  processHistoryItems: typeof processHistoryItems;
  processOutputs: typeof processOutputs;
  processProductDefinitionStates: typeof processProductDefinitionStates;
  processSideWorkItems: typeof processSideWorkItems;
  processes: typeof processes;
  projectMembers: typeof projectMembers;
  projects: typeof projects;
  serviceApiKey: typeof serviceApiKey;
  sourceAttachments: typeof sourceAttachments;
  "test_helpers/fake_convex_context": typeof test_helpers_fake_convex_context;
  users: typeof users;
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

export declare const components: {};
