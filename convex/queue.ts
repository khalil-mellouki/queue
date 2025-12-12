import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

import { hashSync, compareSync } from "bcryptjs";

// --- Queries ---

export const getBusiness = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const getTicket = query({
  args: { ticketId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.ticketId) return null;
    return await ctx.db.get(args.ticketId as any);
  },
});

export const getActiveTicket = query({
  args: { ticketId: v.optional(v.id("tickets")) },
  handler: async (ctx, args) => {
    try {
    if (!args.ticketId) return null;
    
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || (ticket.status !== "waiting" && ticket.status !== "served")) return null;

    // Calculate people ahead
    const peopleAhead = await ctx.db
      .query("tickets")
      .withIndex("by_business_status", (q) => 
        q.eq("businessId", ticket.businessId).eq("status", "waiting")
      )
      .filter((q) => q.lt(q.field("number"), ticket.number))
      .collect();

        // SMART WAIT TIME A.I. 🧠
        // 1. Get last 5 served tickets to calculate velocity
        const recentServed = await ctx.db
          .query("tickets")
          .withIndex("by_business_status", (q) => 
            q.eq("businessId", ticket.businessId).eq("status", "served")
          )
          .order("desc")
          .take(5);

        let estimatedWaitTime = 10; // Default 10 mins (tuned for presentation slots)

        if (recentServed.length >= 2) {
             // Calculate total duration covered by these tickets
             // Simply: (Most Recent ServedAt - Oldest ServedAt) / (Count - 1)
             const newest = recentServed[0].servedAt || recentServed[0].createdAt;
             const oldest = recentServed[recentServed.length - 1].servedAt || recentServed[recentServed.length - 1].createdAt;
             
             const durationMs = newest - oldest;
             const avgMs = durationMs / (recentServed.length - 1);
             const avgMinutes = Math.max(1, Math.round(avgMs / 60000));
             
             estimatedWaitTime = avgMinutes * peopleAhead.length;
        } else {
             estimatedWaitTime = 10 * peopleAhead.length;
        }

        return { ...ticket, peopleAhead: peopleAhead.length, estimatedWaitTime };
    } catch (e) {
        return null;
    }
  },
});

export const getAllBusinesses = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("businesses").collect();
  },
});

export const getTicketByNumber = query({
  args: { businessId: v.id("businesses"), number: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tickets")
      .withIndex("by_business_status", (q) => 
        q.eq("businessId", args.businessId)
      )
      .filter((q) => q.eq(q.field("number"), args.number))
      .first();
  },
});

// --- Mutations ---

// Used by Admin to see who they are serving


export const createBusiness = mutation({
  args: { slug: v.string(), name: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (existing) return existing._id;
    
    const hashedPassword = hashSync(args.password, 10);

    return await ctx.db.insert("businesses", {
      slug: args.slug,
      name: args.name,
      password: hashedPassword,
      isOnline: false, // Default to offline until login
      activeCount: 0,
      currentServing: 0,
      lastIssued: 0,
    });
  },
});

export const joinQueue = mutation({
  args: { slug: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!business) throw new Error("Business not found");
    // Default to true if field is missing (backward compatibility)
    if (business.isOnline === false) throw new Error("Business is currently closed");

    // We no longer check for existing ticket by phone. 
    // The client is responsible for knowing if it has a ticket (via localStorage).
    
    const newNumber = business.lastIssued + 1;
    const currentActive = business.activeCount ?? 0;
    await ctx.db.patch(business._id, { 
        lastIssued: newNumber,
        activeCount: currentActive + 1
    });

    const ticketId = await ctx.db.insert("tickets", {
      businessId: business._id,
      number: newNumber,
      name: args.name || "Guest",
      status: "waiting",
      createdAt: Date.now(),
    });

    return ticketId;
  },
});

export const nextCustomer = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!business) throw new Error("Business not found");

    if (business.currentServing > business.lastIssued) {
        throw new Error("No more customers in queue");
    }

    const nextNumber = business.currentServing + 1;
    await ctx.db.patch(business._id, { currentServing: nextNumber });

    // 2. Mark the *current* customer as Served (if they were waiting)
    // We are serving 'nextNumber'. The previous one was 'nextNumber - 1'.
    // Actually, we just need to find the ticket for 'nextNumber' and ensure it's "served" logic?
    // No, usually 'nextCustomer' means "I am ready for the NEXT person".
    // So if currentServing was 5, we are now calling 6.
    // Ticket 5 is done. Ticket 6 is now "being served".
    
    // Logic: If ticket (nextNumber) exists and is 'waiting', we decrement active count?
    // Or do we count 'being served' as active? usually yes.
    // Let's say Active = Waiting to be done.
    
    // Better logic: Active Count = "In Queue".
    // When you are called, do you leave the queue?
    // If I see "5 people ahead", and I am called, 0 people ahead.
    
    // Let's stick to: Active Count = Total Waiting + Being Served?
    // User requested: "Start -> 5 ppl. User A leaves. Start -> 4 ppl".
    
    // Let's just decrement activeCount because one person is processed.
    // BUT only if activeCount > 0.
    const currentActive = business.activeCount ?? 0;
    if (currentActive > 0) {
        await ctx.db.patch(business._id, { activeCount: currentActive - 1 });
    }

    // Mark previous ticket as served?
    // Theoretically we should find ticket # (nextNumber - 1) and mark it served.
    const prevNumber = nextNumber - 1;
    if (prevNumber > 0) {
        const prevTicket = await ctx.db
            .query("tickets")
            .withIndex("by_business_status", (q) => 
                q.eq("businessId", business._id).eq("status", "waiting")
            )
            .filter((q) => q.eq(q.field("number"), prevNumber))
            .first();
        
        // Mark as served and timestamp it
        if (prevTicket) {
             await ctx.db.patch(prevTicket._id, { 
                 status: "served",
                 servedAt: Date.now()
             });
        }
    }

    // 3. Notification removed (Phone support dropped)
  },
});

export const leaveQueue = mutation({
  args: { slug: v.string(), ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!business) throw new Error("Business not found");

    const ticket = await ctx.db.get(args.ticketId);

    if (ticket && ticket.status === "waiting") {
        await ctx.db.patch(ticket._id, { status: "cancelled" });
        
        const currentActive = business.activeCount ?? 0;
        if (currentActive > 0) {
            await ctx.db.patch(business._id, { activeCount: currentActive - 1 });
        }
    }
  },
});

export const resetQueue = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!business) throw new Error("Business not found");

    // Reset business counters
    await ctx.db.patch(business._id, {
      currentServing: 0,
      lastIssued: 0,
    });

    // Mark all waiting tickets as cancelled or served to "wipe" them from active view
    const activeTickets = await ctx.db
      .query("tickets")
      .withIndex("by_business_status", (q) => 
        q.eq("businessId", business._id).eq("status", "waiting")
      )
      .collect();

    for (const ticket of activeTickets) {
      await ctx.db.patch(ticket._id, { status: "cancelled" });
    }
  },
});

export const toggleStatus = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!business) throw new Error("Business not found");

    const currentStatus = business.isOnline ?? true; 
    await ctx.db.patch(business._id, { isOnline: !currentStatus });
  },
});

export const verifyPassword = mutation({
  args: { slug: v.string(), password: v.string(), setOnline: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const business = await ctx.db
      .query("businesses")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!business) return false;
    
    let isValid = false;
    // Check if password is a hash (bcrypt hashes start with $2)
    if (business.password && business.password.startsWith("$2")) {
        isValid = compareSync(args.password, business.password);
    } else {
        // Legacy plain text fallback
        isValid = business.password === args.password;
    }

    if (isValid && args.setOnline !== undefined) {
        await ctx.db.patch(business._id, { isOnline: args.setOnline });
    }

    return isValid;
  },
});

export const migratePasswords = mutation({
    args: {},
    handler: async (ctx) => {
        const businesses = await ctx.db.query("businesses").collect();
        let migrated = 0;
        for (const b of businesses) {
             if (b.password && !b.password.startsWith("$2")) {
                 const newHash = hashSync(b.password, 10);
                 await ctx.db.patch(b._id, { password: newHash });
                 migrated++;
             }
        }
        return `Migrated ${migrated} passwords`;
    }
});

// Migration tool
export const fixQueueData = mutation({
    args: {},
    handler: async (ctx) => {
        const businesses = await ctx.db.query("businesses").collect();
        let totalUpdated = 0;
        
        for (const b of businesses) {
            // 1. Find all "waiting" tickets
            const waiting = await ctx.db
                .query("tickets")
                .withIndex("by_business_status", (q) => q.eq("businessId", b._id).eq("status", "waiting"))
                .collect();
            
            let realActiveCount = 0;
            
            for (const t of waiting) {
                if (t.number <= b.currentServing) {
                    // Should be served
                    await ctx.db.patch(t._id, { status: "served" });
                } else {
                    realActiveCount++;
                }
            }
            
            // Update business
            await ctx.db.patch(b._id, { activeCount: realActiveCount });
            totalUpdated++;
        }
        return "Fixed " + totalUpdated + " businesses";
    }
});

export const updateBusiness = mutation({
  args: { id: v.id("businesses"), name: v.string(), slug: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const patch: any = {
        name: args.name,
        slug: args.slug,
    };
    
    // Only update password if it's not empty and different (assume UI sends "unchanged" or empty if no change? 
    // Actually simplicity: Super Admin always sends the intended password.
    // If it looks like a hash, we might assume it's unchanged, but that's risky.
    // If the Admin types "1234", we hash it.
    // Issue: If we load "hash" into the UI input, and save, we re-hash the hash.
    // Solution: Frontend shouldn't populate the password field with the existing hash.
    // Frontend handles "leave empty to keep unchanged" logic, or we handle it here.
    // Let's assume if args.password is passed, it is a NEW plain text password to be hashed.
    if (args.password && args.password.trim() !== "") {
         patch.password = hashSync(args.password, 10);
    }
    
    await ctx.db.patch(args.id, patch);
  },
});

export const deleteBusiness = mutation({
  args: { id: v.id("businesses") },
  handler: async (ctx, args) => {
    // Delete tickets first
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_business_status", (q) => q.eq("businessId", args.id))
      .collect();
    
    for (const ticket of tickets) {
      await ctx.db.delete(ticket._id);
    }
    
    await ctx.db.delete(args.id);
  },
});