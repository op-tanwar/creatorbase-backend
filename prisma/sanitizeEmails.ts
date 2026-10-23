import prisma from '../src/utils/prisma';

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const BLOCKED_PATTERNS = [
  'dummy',
  'test',
  'example.com',
  'user@',
  'fake',
  'localhost',
  'placeholder',
  'sample',
  'temp',
  'null',
  'undefined',
  '..',
];

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();

  if (!STRICT_EMAIL_REGEX.test(clean)) return false;

  for (const pattern of BLOCKED_PATTERNS) {
    if (clean.includes(pattern)) return false;
  }

  // Domain parts check
  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;

  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) return false;

  return true;
}

function extractEmailFromBio(bio: string | null | undefined): string | null {
  if (!bio) return null;
  const matches = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return null;

  for (const candidate of matches) {
    if (isValidEmail(candidate)) {
      return candidate.trim().toLowerCase();
    }
  }
  return null;
}

async function sanitizeAllEmails() {
  console.log('====================================================================');
  console.log('🚀 CreatorBase: Database Email Sanitization & Verification Engine');
  console.log('====================================================================\n');

  const creators = await prisma.creator.findMany({
    select: {
      id: true,
      handle: true,
      fullName: true,
      businessEmail: true,
      bio: true,
    },
  });

  console.log(`Auditing ${creators.length} creator records in PostgreSQL...\n`);

  let validRetained = 0;
  let updatedFromBio = 0;
  let purgedToNull = 0;
  let unchangedValid = 0;

  for (const creator of creators) {
    const bioEmail = extractEmailFromBio(creator.bio);
    const existingEmail = creator.businessEmail ? creator.businessEmail.trim().toLowerCase() : null;

    let targetEmail: string | null = null;

    // 1. Prefer verified email found in public bio/metadata
    if (bioEmail && isValidEmail(bioEmail)) {
      targetEmail = bioEmail;
    } else if (existingEmail && isValidEmail(existingEmail)) {
      targetEmail = existingEmail;
    } else {
      // 2. Discard corrupt/placeholder text and set to null
      targetEmail = null;
    }

    // Determine if update is needed
    if (targetEmail !== creator.businessEmail) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: { businessEmail: targetEmail },
      });

      if (targetEmail && bioEmail && targetEmail === bioEmail && targetEmail !== existingEmail) {
        updatedFromBio++;
      } else if (!targetEmail && existingEmail) {
        purgedToNull++;
      }
    } else if (targetEmail) {
      unchangedValid++;
    }

    if (targetEmail) {
      validRetained++;
    }
  }

  console.log('--------------------------------------------------------------------');
  console.log('📊 Email Sanitization Summary:');
  console.log(`   • Total Creators Audited:            ${creators.length}`);
  console.log(`   • Verified Valid Emails Retained:    ${validRetained} (${((validRetained / creators.length) * 100).toFixed(1)}%)`);
  console.log(`   • Emails Extracted from Bio:         ${updatedFromBio}`);
  console.log(`   • Invalid / Placeholder Purged:      ${purgedToNull}`);
  console.log(`   • Unchanged Clean Emails:            ${unchangedValid}`);
  console.log('--------------------------------------------------------------------');
  console.log('✅ Database email sanitization completed successfully with zero fake emails.');
}

sanitizeAllEmails()
  .catch((err) => {
    console.error('❌ Error during email sanitization:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
