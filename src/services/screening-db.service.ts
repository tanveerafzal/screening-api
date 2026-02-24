import { prisma } from '../lib/prisma.js';
import type { ScreeningResponse } from '../types/index.js';
import type { Screening, Prisma } from '@prisma/client';

interface CreateScreeningInput {
  partnerId?: string;
  dataset: string;
  inputPayload: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  queriesCount: number;
}

interface CompleteScreeningInput {
  screeningId: string;
  response: ScreeningResponse;
  processingTimeMs: number;
}

class ScreeningDbService {
  async createScreening(input: CreateScreeningInput): Promise<Screening> {
    return prisma.screening.create({
      data: {
        partnerId: input.partnerId ?? null,
        dataset: input.dataset,
        status: 'PENDING',
        inputPayload: input.inputPayload,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        queriesCount: input.queriesCount,
      },
    });
  }

  async completeScreening(input: CompleteScreeningInput): Promise<Screening> {
    const { screeningId, response, processingTimeMs } = input;

    const verdict =
      response.summary.flagged > 0
        ? 'FLAG'
        : response.summary.review > 0
          ? 'REVIEW'
          : 'CLEAR';

    const screening = await prisma.screening.update({
      where: { id: screeningId },
      data: {
        status: 'COMPLETED',
        verdict,
        flaggedCount: response.summary.flagged,
        reviewCount: response.summary.review,
        clearCount: response.summary.clear,
        resultPayload: response as unknown as Prisma.InputJsonValue,
        processingTimeMs,
        completedAt: new Date(),
      },
    });

    // Increment partner screeningsUsed if linked to a partner
    if (screening.partnerId) {
      await prisma.partner.update({
        where: { id: screening.partnerId },
        data: { screeningsUsed: { increment: 1 } },
      });
    }

    return screening;
  }

  async failScreening(
    screeningId: string,
    processingTimeMs: number
  ): Promise<Screening> {
    return prisma.screening.update({
      where: { id: screeningId },
      data: {
        status: 'FAILED',
        processingTimeMs,
        completedAt: new Date(),
      },
    });
  }

  async createWebhookEvent(input: {
    screeningId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
  }) {
    return prisma.screeningWebhookEvent.create({
      data: {
        screeningId: input.screeningId,
        eventType: input.eventType,
        payload: input.payload,
      },
    });
  }

  async updateWebhookDelivery(
    id: string,
    delivered: boolean,
    responseStatus?: number,
    responseBody?: string
  ) {
    return prisma.screeningWebhookEvent.update({
      where: { id },
      data: {
        delivered,
        deliveryAttempts: { increment: 1 },
        lastAttemptAt: new Date(),
        ...(delivered ? { deliveredAt: new Date() } : {}),
        responseStatus: responseStatus ?? null,
        responseBody: responseBody ?? null,
      },
    });
  }
}

export const screeningDbService = new ScreeningDbService();
