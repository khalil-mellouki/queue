import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  businesses: defineTable({
    slug: v.string(),
    name: v.string(),
    password: v.optional(v.string()),
    isOnline: v.optional(v.boolean()),
    activeCount: v.optional(v.number()),
    currentServing: v.number(),
    lastIssued: v.number(),
  }).index("by_slug", ["slug"]),

  tickets: defineTable({
    businessId: v.id("businesses"),
    number: v.number(),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.string(), // 'waiting', 'served', 'cancelled'
    createdAt: v.number(),
    servedAt: v.optional(v.number()), // For AI stats
  }).index("by_business_status", ["businessId", "status"]),
});