import { EventWebhook } from '@sendgrid/eventwebhook';

export class SendGridVerifier {
  private eventWebhook: EventWebhook;

  constructor() {
    this.eventWebhook = new EventWebhook();
  }

  verifySignature(
    publicKey: string,
    payload: string | Buffer,
    signature: string,
    timestamp: string
  ): boolean {
    try {
      const ecdsaPublicKey = this.eventWebhook.convertPublicKeyToECDSA(publicKey);
      return this.eventWebhook.verifySignature(ecdsaPublicKey, payload, signature, timestamp);
    } catch (error) {
      console.error(`Signature verification failed: ${error}`);
      return false;
    }
  }
}