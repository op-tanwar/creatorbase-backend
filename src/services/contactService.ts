import prisma from '../utils/prisma';
import { InboundLeadInput } from '../validators/contactSchemas';

export class ContactService {
  static async createInboundLead(data: InboundLeadInput) {
    const lead = await prisma.lead.create({
      data: {
        fullName: data.fullName.trim(),
        workEmail: data.workEmail.trim().toLowerCase(),
        companyName: data.companyName.trim(),
        budget: data.budget.trim(),
        notes: data.notes?.trim() || null,
      },
    });

    console.log('📬 [Enterprise Inbound Lead Received]', {
      id: lead.id,
      recipient: 'sales@creatorbase.in',
      lead: {
        name: lead.fullName,
        company: lead.companyName,
        email: lead.workEmail,
        budget: lead.budget,
        notes: lead.notes,
      },
      timestamp: new Date().toISOString(),
    });

    return lead;
  }
}
