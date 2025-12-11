import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// 1. Get Queue Data (Realtime)
export const getQueue = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("queues").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
  },
});

// 2. Get Specific Ticket (Realtime)
export const getTicket = query({
  args: { ticketId: v.optional(v.id("tickets")) },
  handler: async (ctx, args) => {
    if (!args.ticketId) return null;
    return await ctx.db.get(args.ticketId);
  },
});

// 3. Join Queue
export const join = mutation({
  args: { slug: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const queue = await ctx.db.query("queues").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!queue) throw new Error("Queue not found");

    const newNumber = queue.lastIssued + 1;

    // Update Queue
    await ctx.db.patch(queue._id, { lastIssued: newNumber });

    // Create Ticket
    const ticketId = await ctx.db.insert("tickets", {
      queueId: queue._id,
      number: newNumber,
      phone: args.phone,
      status: "waiting",
    });

    return ticketId;
  },
});

// 4. Initialize (Run this once manually or check in UI)
export const init = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("queues").withIndex("by_slug", (q) => q.eq("slug", "hackathon")).unique();
    if (!existing) {
      await ctx.db.insert("queues", { slug: "hackathon", currentServing: 0, lastIssued: 0 });
    }
  }
});

// Add this to convex/queue.ts

export const advanceQueue = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const queue = await ctx.db.query("queues").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!queue) return;

    const nextServing = queue.currentServing + 1;
    await ctx.db.patch(queue._id, { currentServing: nextServing });

    // Find who is N spots away (e.g., 3 spots away) to notify them
    const notifySpot = nextServing + 3; 
    
    const ticketToNotify = await ctx.db.query("tickets")
      .withIndex("by_queue", (q) => q.eq("queueId", queue._id))
      .filter((q) => q.eq(q.field("number"), notifySpot))
      .unique();

    if (ticketToNotify && ticketToNotify.phone) {
      // Trigger the external action
      // We schedule it so it doesn't block the UI
      await ctx.scheduler.runAfter(0, internal.actions.notifyNext, {
        phone: ticketToNotify.phone,
        ticketNumber: ticketToNotify.number
      });
    }
  },
});