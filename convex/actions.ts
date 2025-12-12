"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import Twilio from "twilio";

export const notifyCustomer = action({
  args: {
    phone: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.log("Twilio credentials missing - skipping notification");
      return;
    }

    try {
      const client = Twilio(accountSid, authToken);
      await client.messages.create({
        body: args.message,
        from: fromNumber,
        to: args.phone,
      });
      console.log(`Notification sent to ${args.phone}`);
    } catch (error) {
      console.error("Twilio error:", error);
    }
  },
});