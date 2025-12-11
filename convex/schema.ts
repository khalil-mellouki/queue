import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  queues: defineTable({
    slug: v.string(),
    currentServing: v.number(),
    lastIssued: v.number(),
  }).index("by_slug", ["slug"]),

  tickets: defineTable({
    queueId: v.id("queues"),
    number: v.number(),
    phone: v.string(),
    status: v.string(), // 'waiting', 'done'
  }).index("by_queue", ["queueId"]),
});