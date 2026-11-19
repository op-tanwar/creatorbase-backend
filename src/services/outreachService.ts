import prisma from '../utils/prisma';
import { OutreachStatus } from '@prisma/client';
import nodemailer from 'nodemailer';

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'optanwar10@gmail.com',
      pass: 'grrp llwp hvcy tbea',
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export interface SendPitchInput {
  userId: string;
  creatorId: string;
  campaignId?: string;
  deliverable?: string;
  offerINR?: number;
  brandName?: string;
  customSubject?: string;
  customBody?: string;
}

export class OutreachService {
  static async sendPitch(input: SendPitchInput) {
    const { userId, creatorId, campaignId, deliverable, offerINR, brandName, customSubject, customBody } = input;

    const [user, creator] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.creator.findUnique({ where: { id: creatorId } }),
    ]);

    if (!user || !creator) {
      throw new Error('User or Creator not found');
    }

    const brand = brandName || user.companyName || 'CreatorBase Agency Partner';
    const chosenDeliverable = deliverable || '1x Dedicated Reel + 2x Stories';
    const formattedOffer = offerINR ? `₹${offerINR.toLocaleString('en-IN')}` : 'Commercial Budget (Negotiable)';

    const defaultSubject = `Collaboration Proposal: ${brand} x @${creator.handle}`;
    const subject = customSubject
      ? customSubject
          .replace(/{{creator_name}}/g, creator.fullName)
          .replace(/{{brand_name}}/g, brand)
          .replace(/{{deliverable}}/g, chosenDeliverable)
          .replace(/{{offer_inr}}/g, formattedOffer)
      : defaultSubject;

    const defaultBody = `Hi ${creator.fullName},

We love your recent content on ${creator.platform} and your genuine engagement in the ${creator.niche} space across ${creator.city}.

On behalf of ${brand}, we would love to collaborate with you on our upcoming influencer campaign.

Deliverable: ${chosenDeliverable}
Budget Allocation: ${formattedOffer}

Please let us know your availability, standard rate card, and media kit. We can finalize the brief and dispatch deliverables right away.

Best regards,
${user.name}
${brand}
via CreatorBase Operating System`;

    const bodyText = customBody
      ? customBody
          .replace(/{{creator_name}}/g, creator.fullName)
          .replace(/{{brand_name}}/g, brand)
          .replace(/{{deliverable}}/g, chosenDeliverable)
          .replace(/{{offer_inr}}/g, formattedOffer)
      : defaultBody;

    // Determine target email
    const recipientEmail = creator.businessEmail && creator.businessEmail.includes('@')
      ? creator.businessEmail
      : 'optanwar10@gmail.com'; // fallback pipeline for simulation/demo

    // Send email via Nodemailer
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"${user.name} | ${brand}" <optanwar10@gmail.com>`,
        to: recipientEmail,
        replyTo: user.email,
        subject,
        text: bodyText,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #08090B; color: #F4F4F5; padding: 24px;">
            <div style="background-color: #0C0E12; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 28px; max-width: 600px; margin: 0 auto;">
              <div style="display: inline-block; background-color: #10B981; color: #000; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 16px;">
                Verified Creator Outreach
              </div>
              <h2 style="margin-top: 0; color: #FFF; font-size: 20px;">${subject}</h2>
              <div style="font-size: 14px; line-height: 1.6; color: #D1D5DB; white-space: pre-line; margin: 20px 0;">
                ${bodyText}
              </div>
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; font-size: 11px; color: #9CA3AF;">
                Sent via <strong>CreatorBase India</strong> • Replying directly to this email reaches <em>${user.email}</em>.
              </div>
            </div>
          </div>
        `,
      });
    } catch (mailErr: any) {
      console.warn('[OutreachService] Mail dispatch note:', mailErr.message || mailErr);
    }

    // Upsert OutreachThread
    let thread = await prisma.outreachThread.findFirst({
      where: {
        userId,
        creatorId,
      },
    });

    if (!thread) {
      thread = await prisma.outreachThread.create({
        data: {
          userId,
          creatorId,
          campaignId: campaignId || null,
          creatorEmail: recipientEmail,
          subject,
          status: OutreachStatus.PITCHED,
          deliverable: chosenDeliverable,
          offerINR: offerINR || null,
          lastMessageAt: new Date(),
        },
      });
    } else {
      thread = await prisma.outreachThread.update({
        where: { id: thread.id },
        data: {
          campaignId: campaignId || thread.campaignId,
          subject,
          deliverable: chosenDeliverable,
          offerINR: offerINR || thread.offerINR,
          status: OutreachStatus.PITCHED,
          lastMessageAt: new Date(),
        },
      });
    }

    // Create OutreachMessage
    const message = await prisma.outreachMessage.create({
      data: {
        threadId: thread.id,
        sender: 'USER',
        body: bodyText,
      },
    });

    return {
      thread,
      message,
    };
  }

  static async getThreads(userId: string) {
    return prisma.outreachThread.findMany({
      where: { userId },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            fullName: true,
            avatarUrl: true,
            platform: true,
            city: true,
            niche: true,
            followerCount: true,
            engagementRate: true,
            businessEmail: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  static async getThreadById(userId: string, threadId: string) {
    const thread = await prisma.outreachThread.findFirst({
      where: { id: threadId, userId },
      include: {
        creator: true,
        campaign: true,
        messages: {
          orderBy: { sentAt: 'asc' },
        },
      },
    });

    if (!thread) {
      const err: any = new Error('Outreach thread not found');
      err.statusCode = 404;
      throw err;
    }

    return thread;
  }

  static async updateStatus(userId: string, threadId: string, status: OutreachStatus) {
    return prisma.outreachThread.update({
      where: { id: threadId, userId },
      data: { status },
    });
  }

  static async reply(userId: string, threadId: string, bodyText: string) {
    const thread = await this.getThreadById(userId, threadId);

    const message = await prisma.outreachMessage.create({
      data: {
        threadId: thread.id,
        sender: 'USER',
        body: bodyText,
      },
    });

    await prisma.outreachThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    // Optional email dispatch to creator
    try {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"CreatorBase Outreach" <optanwar10@gmail.com>`,
        to: thread.creatorEmail,
        subject: `Re: ${thread.subject}`,
        text: bodyText,
      });
    } catch (_err) {
      // ignore
    }

    return message;
  }

  static async bulkSendPitches(input: {
    userId: string;
    creatorIds: string[];
    campaignId?: string;
    deliverable?: string;
    offerINR?: number;
    brandName?: string;
    customSubject?: string;
    customBody?: string;
  }) {
    const { userId, creatorIds, campaignId, deliverable, offerINR, brandName, customSubject, customBody } = input;
    const results = [];
    for (const creatorId of creatorIds) {
      try {
        const sent = await this.sendPitch({
          userId,
          creatorId,
          campaignId,
          deliverable,
          offerINR,
          brandName,
          customSubject,
          customBody,
        });
        results.push({ creatorId, success: true, threadId: sent.thread.id });
      } catch (err: any) {
        results.push({ creatorId, success: false, error: err.message });
      }
    }
    return {
      total: creatorIds.length,
      sentCount: results.filter((r) => r.success).length,
      results,
    };
  }
}
