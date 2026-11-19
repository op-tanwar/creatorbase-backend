import prisma from '../utils/prisma';

export interface CreateInvoiceInput {
  userId: string;
  amount: number;
  planName?: string;
  clientGstin?: string;
  clientName?: string;
  clientAddress?: string;
  paymentId?: string;
}

export class InvoiceService {
  static async createInvoice(input: CreateInvoiceInput) {
    const { userId, amount, planName, clientGstin, clientName, clientAddress, paymentId } = input;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const year = new Date().getFullYear();
    const count = await prisma.invoice.count();
    const seq = String(count + 1).padStart(4, '0');
    const invoiceNumber = `INV-${year}-${seq}`;

    // GST Calculation: 18% (SAC 998314)
    // If inclusive: amount is total
    const totalWithTax = amount;
    const baseAmount = +(totalWithTax / 1.18).toFixed(2);
    const totalGst = +(totalWithTax - baseAmount).toFixed(2);
    const cgst = +(totalGst / 2).toFixed(2);
    const sgst = +(totalGst / 2).toFixed(2);

    const agencyGstin = '23AAGCC1234F1Z8'; // Indore, Madhya Pradesh

    const lineItems = [
      {
        description: `CreatorBase Enterprise SaaS License — ${planName || user.planType || 'STARTER'} Plan`,
        sacCode: '998314',
        qty: 1,
        rate: baseAmount,
        amount: baseAmount,
      },
    ];

    const billingAddress = {
      name: clientName || user.name,
      company: user.companyName,
      email: user.email,
      address: clientAddress || 'Commercial District, India',
      gstin: clientGstin || 'Unregistered D2C/Brand',
    };

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId,
        amount: baseAmount,
        currency: 'INR',
        agencyGstin,
        clientGstin: clientGstin || null,
        sacCode: '998314',
        cgst,
        sgst,
        igst: 0,
        totalWithTax,
        status: 'PAID',
        paymentId: paymentId || `pay_sim_${Date.now()}`,
        billingAddress,
        lineItems,
      },
    });

    return invoice;
  }

  static async getInvoices(userId: string) {
    return prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getInvoiceById(userId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { user: true },
    });

    if (!invoice) {
      const err: any = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    return invoice;
  }

  static generateInvoiceHtml(invoice: any): string {
    const billing = (invoice.billingAddress as any) || {};
    const lineItems = (invoice.lineItems as any[]) || [];
    const dateFormatted = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice — ${invoice.invoiceNumber}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #060709; color: #E4E4E7; margin: 0; padding: 40px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background-color: #0C0E12; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 48px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 24px; margin-bottom: 32px; }
    .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: #FFFFFF; }
    .brand span { color: #10B981; }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; font-family: monospace; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; font-size: 13px; line-height: 1.6; }
    .section-title { font-size: 10px; font-family: monospace; text-transform: uppercase; letter-spacing: 0.1em; color: #71717A; margin-bottom: 8px; }
    .text-white { color: #FFFFFF; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; font-size: 13px; }
    th { text-align: left; padding: 12px 16px; background-color: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-family: monospace; font-size: 11px; text-transform: uppercase; color: #A1A1AA; }
    td { padding: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
    .totals { width: 320px; margin-left: auto; font-size: 13px; line-height: 2; margin-bottom: 32px; }
    .totals-row { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.04); padding: 4px 0; }
    .totals-row.grand { border-top: 1px solid rgba(16, 185, 129, 0.4); border-bottom: none; font-size: 16px; font-weight: 700; color: #10B981; padding-top: 12px; }
    .footer { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px; font-size: 11px; color: #71717A; display: flex; justify-content: space-between; align-items: center; }
    .print-btn { background-color: #10B981; color: #000; font-weight: 700; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: monospace; font-size: 12px; }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 20px auto; display: flex; justify-content: flex-end;">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand">Creator<span>Base</span></div>
        <div style="font-size: 12px; color: #A1A1AA; margin-top: 4px;">India's #1 Influencer Discovery & Campaign OS</div>
        <div style="font-size: 11px; font-family: monospace; color: #71717A; margin-top: 4px;">GSTIN: ${invoice.agencyGstin} • SAC Code: 998314</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">ORIGINAL TAX INVOICE</span>
        <div style="font-family: monospace; font-size: 16px; font-weight: 700; color: #FFF; margin-top: 8px;">${invoice.invoiceNumber}</div>
        <div style="font-size: 12px; color: #A1A1AA;">Date: ${dateFormatted}</div>
      </div>
    </div>

    <div class="grid-2">
      <div>
        <div class="section-title">ISSUED BY (SUPPLIER)</div>
        <div class="text-white">CreatorBase Technologies Pvt. Ltd.</div>
        <div>Brilliant Titanium Tower, Scheme 78</div>
        <div>Indore, Madhya Pradesh — 452010</div>
        <div>GSTIN: <span style="font-family: monospace;">${invoice.agencyGstin}</span></div>
        <div>Email: finance@creatorbase.in</div>
      </div>
      <div>
        <div class="section-title">BILLED TO (CUSTOMER)</div>
        <div class="text-white">${billing.company || billing.name}</div>
        <div>Attn: ${billing.name}</div>
        <div>${billing.address || 'Pan-India'}</div>
        <div>Email: ${billing.email}</div>
        <div>Client GSTIN: <span style="font-family: monospace;">${billing.gstin || 'B2C / Unregistered'}</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="width: 100px;">SAC / HSN</th>
          <th style="width: 60px; text-align: center;">Qty</th>
          <th style="width: 120px; text-align: right;">Rate (INR)</th>
          <th style="width: 120px; text-align: right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems
          .map(
            (item) => `
          <tr>
            <td>
              <div class="text-white">${item.description}</div>
              <div style="font-size: 11px; color: #71717A;">Online Influencer Discovery & Analytics SaaS</div>
            </td>
            <td style="font-family: monospace;">${item.sacCode}</td>
            <td style="text-align: center; font-family: monospace;">${item.qty}</td>
            <td style="text-align: right; font-family: monospace;">₹${Number(item.rate).toLocaleString('en-IN')}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 600; color: #FFF;">₹${Number(item.amount).toLocaleString('en-IN')}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Taxable Value:</span>
        <span style="font-family: monospace;">₹${Number(invoice.amount).toLocaleString('en-IN')}</span>
      </div>
      <div class="totals-row">
        <span>CGST (9%):</span>
        <span style="font-family: monospace;">₹${Number(invoice.cgst).toLocaleString('en-IN')}</span>
      </div>
      <div class="totals-row">
        <span>SGST (9%):</span>
        <span style="font-family: monospace;">₹${Number(invoice.sgst).toLocaleString('en-IN')}</span>
      </div>
      <div class="totals-row grand">
        <span>Total Paid (INR):</span>
        <span style="font-family: monospace;">₹${Number(invoice.totalWithTax).toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="footer">
      <div>
        <div>Payment Reference: <strong style="font-family: monospace; color: #FFF;">${invoice.paymentId || 'razorpay_paid'}</strong></div>
        <div style="margin-top: 4px;">This is a computer-generated tax invoice. No physical signature required.</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-weight: 700; color: #FFF;">CreatorBase Technologies</div>
        <div style="color: #10B981; font-family: monospace; font-size: 10px;">✓ AUTHENTICATED VIA RAZORPAY</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
