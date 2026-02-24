import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { screeningDbService } from './screening-db.service.js';
import type { ScreeningResponse } from '../types/index.js';
import type { Prisma } from '@prisma/client';

class ScreeningWebhookService {
  async sendWebhook(
    screeningId: string,
    partnerId: string,
    response: ScreeningResponse
  ): Promise<void> {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { screeningWebhookUrl: true },
    });

    if (!partner?.screeningWebhookUrl) {
      return;
    }

    const payload = {
      event: 'screening.completed',
      screeningId,
      data: response,
      timestamp: new Date().toISOString(),
    };

    const webhookEvent = await screeningDbService.createWebhookEvent({
      screeningId,
      eventType: 'screening.completed',
      payload: payload as unknown as Prisma.InputJsonValue,
    });

    try {
      const res = await axios.post(partner.screeningWebhookUrl, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      await screeningDbService.updateWebhookDelivery(
        webhookEvent.id,
        true,
        res.status,
        JSON.stringify(res.data).substring(0, 1000)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await screeningDbService.updateWebhookDelivery(
        webhookEvent.id,
        false,
        undefined,
        message.substring(0, 1000)
      );
      console.error(`[ScreeningWebhook] Delivery failed for screening ${screeningId}:`, message);
    }
  }
}

export const screeningWebhookService = new ScreeningWebhookService();
