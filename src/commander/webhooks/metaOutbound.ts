import type { CommanderEnv, OutboundMessageRequest } from "../types";
import { CommanderHttpError } from "../infra/http";

export interface MetaWhatsAppTransport {
  sendMessage(request: OutboundMessageRequest): Promise<void>;
}

export function createMetaWhatsAppTransport(env: CommanderEnv): MetaWhatsAppTransport {
  return {
    async sendMessage(request: OutboundMessageRequest): Promise<void> {
      const response = await fetch(
        `https://graph.facebook.com/${env.metaApiVersion}/${env.metaPhoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.metaAccessToken}`,
            "content-type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: request.to,
            type: "text",
            text: {
              preview_url: false,
              body: request.text,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new CommanderHttpError(
          response.status,
          "meta_send_failed",
          "Failed to send WhatsApp message via Meta",
          await response.text(),
        );
      }
    },
  };
}
