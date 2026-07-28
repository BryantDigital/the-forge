import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

export const getViewer = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const authUserId = user.userId ?? user._id;
    const ownerEmails = configuredOwnerEmails();
    const membership = await ctx.db
      .query("adminMemberships")
      .withIndex("by_auth_user", (range) => range.eq("authUserId", authUserId))
      .unique();

    return {
      user: {
        id: authUserId,
        name: user.name,
        email: user.email,
      },
      canBootstrapOwner: ownerEmails.has(user.email.toLowerCase()),
      admin:
        membership && !membership.disabledAt
          ? {
              role: membership.role,
            }
          : null,
    };
  },
});

export const bootstrapOwner = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    const ownerEmails = configuredOwnerEmails();

    if (!ownerEmails.has(user.email.toLowerCase())) {
      throw new Error("This account is not configured as the Forge owner.");
    }

    const authUserId = user.userId ?? user._id;
    const existing = await ctx.db
      .query("adminMemberships")
      .withIndex("by_auth_user", (range) => range.eq("authUserId", authUserId))
      .unique();

    if (existing) {
      if (existing.disabledAt || existing.role !== "owner") {
        await ctx.db.patch(existing._id, {
          role: "owner",
          disabledAt: undefined,
          updatedAt: Date.now(),
        });
      }
      return { role: "owner" as const };
    }

    await ctx.db.insert("adminMemberships", {
      authUserId,
      email: user.email.toLowerCase(),
      role: "owner",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { role: "owner" as const };
  },
});

function configuredOwnerEmails() {
  return new Set(
    (process.env.FORGE_OWNER_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const requireEventManager = query({
  args: {
    allowCheckin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const authUserId = user.userId ?? user._id;
    const membership = await ctx.db
      .query("adminMemberships")
      .withIndex("by_auth_user", (range) => range.eq("authUserId", authUserId))
      .unique();

    if (
      !membership ||
      membership.disabledAt ||
      (membership.role === "checkin" && !args.allowCheckin)
    ) {
      return null;
    }

    return {
      authUserId,
      email: user.email,
      role: membership.role,
    };
  },
});

export async function requireAdminAccess(
  ctx: QueryCtx | MutationCtx,
  options: { allowCheckin?: boolean } = {},
) {
  const user = await authComponent.getAuthUser(ctx);
  const authUserId = user.userId ?? user._id;
  const membership = await ctx.db
    .query("adminMemberships")
    .withIndex("by_auth_user", (range) => range.eq("authUserId", authUserId))
    .unique();

  if (
    !membership ||
    membership.disabledAt ||
    (membership.role === "checkin" && !options.allowCheckin)
  ) {
    throw new Error("You do not have permission to manage Forge events.");
  }

  return {
    authUserId,
    email: user.email,
    role: membership.role,
  };
}
