function toE164India(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
}

export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; provider: string; error?: string }> {
  const mobile = toE164India(params.to);

  // Option 1: MSG91 (India)
  if (process.env.MSG91_AUTH_KEY) {
    try {
      const sender = process.env.MSG91_SENDER_ID || "SANAVO";
      const templateId = process.env.MSG91_TEMPLATE_ID;

      // Flow API only when a template is configured
      if (templateId) {
        const res = await fetch("https://control.msg91.com/api/v5/flow/", {
          method: "POST",
          headers: {
            authkey: process.env.MSG91_AUTH_KEY,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            template_id: templateId,
            short_url: "0",
            recipients: [
              {
                mobiles: mobile,
                // Generic var used by many Sanavo-style templates
                VAR1: params.body.slice(0, 300),
              },
            ],
          }),
        });

        if (!res.ok) {
          return { ok: false, provider: "msg91-flow", error: await res.text() };
        }
        return { ok: true, provider: "msg91-flow" };
      }

      // Simple transactional SMS (no template)
      const simple = await fetch(
        `https://api.msg91.com/api/sendhttp.php?authkey=${process.env.MSG91_AUTH_KEY}&mobiles=${mobile}&message=${encodeURIComponent(params.body)}&sender=${sender}&route=4&country=91`
      );
      const text = await simple.text();
      // MSG91 returns a request id string on success; errors often contain "error"
      if (!simple.ok || /error|invalid/i.test(text)) {
        return { ok: false, provider: "msg91", error: text };
      }
      return { ok: true, provider: "msg91" };
    } catch (err) {
      return {
        ok: false,
        provider: "msg91",
        error: err instanceof Error ? err.message : "MSG91 failed",
      };
    }
  }

  // Option 2: Twilio
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  ) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_FROM_NUMBER;
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");

      const body = new URLSearchParams({
        To: `+${mobile}`,
        From: from,
        Body: params.body,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        }
      );

      if (!res.ok) {
        return { ok: false, provider: "twilio", error: await res.text() };
      }
      return { ok: true, provider: "twilio" };
    } catch (err) {
      return {
        ok: false,
        provider: "twilio",
        error: err instanceof Error ? err.message : "Twilio failed",
      };
    }
  }

  console.log("[SMS:DEV]", { to: params.to, body: params.body });
  return { ok: true, provider: "dev-console" };
}
