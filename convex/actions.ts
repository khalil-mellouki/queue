"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

export const notifyNext = action({
  args: { phone: v.string(), ticketNumber: v.number() },
  handler: async (ctx, args) => {
    if (!args.phone) return;
    
    try {
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE}`,
        to: `whatsapp:${args.phone}`,
        body: `🔔 Heads up! Ticket #${args.ticketNumber}, you are almost up! Please head to the counter.`
      });
    } catch (e) {
      console.error("Twilio failed", e);
    }
  },
});