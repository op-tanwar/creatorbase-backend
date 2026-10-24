import prisma from '../utils/prisma';
import { InboundLeadInput } from '../validators/contactSchemas';
import { EmailService } from './emailService';

export class ContactService {
  static async createInboundLead(data: InboundLeadInput) {
    const budgetVal = (data.budgetINR || data.budget || '₹1,00,000 - ₹5,00,000').trim();
    const cityVal = data.city?.trim() || null;

    const lead = await prisma.lead.create({
      data: {
        fullName: data.fullName.trim(),
        workEmail: data.workEmail.trim().toLowerCase(),
        companyName: data.companyName.trim(),
        city: cityVal,
        budget: budgetVal,
        budgetINR: budgetVal,
        notes: data.notes?.trim() || null,
      },
    });

    console.log('📬 [Enterprise Inbound Lead Stored in DB]', {
      id: lead.id,
      name: lead.fullName,
      company: lead.companyName,
      email: lead.workEmail,
      budget: lead.budgetINR,
      city: lead.city,
      timestamp: new Date().toISOString(),
    });

    // Fire automated email dispatches via Nodemailer
    EmailService.sendInboundLeadNotification({
      id: lead.id,
      fullName: lead.fullName,
      workEmail: lead.workEmail,
      companyName: lead.companyName,
      city: lead.city,
      budgetINR: lead.budgetINR,
      notes: lead.notes,
    }).catch((err) => {
      console.error('⚠️ [ContactService] Background email dispatch error:', err);
    });

    return lead;
  }
}
