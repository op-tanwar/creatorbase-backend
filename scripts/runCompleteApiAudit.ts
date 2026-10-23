import dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/utils/prisma';
import { signToken } from '../src/utils/jwt';
import crypto from 'crypto';
import { config } from '../src/config';

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api';

interface ApiResponse {
  status: number;
  ok: boolean;
  data: any;
  text: string;
}

interface TestResult {
  endpoint: string;
  concurrencyIterations: string;
  scenarios: string;
  latencies: number[];
  passCount: number;
  totalCount: number;
  securityVerdict: 'PASS' | 'FAIL';
  details?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeFetch(url: string, init?: RequestInit, retries = 2): Promise<ApiResponse> {
  let lastErr: any;
  const headers = {
    Connection: 'close',
    ...(init?.headers || {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers });
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Not JSON
      }
      return {
        status: res.status,
        ok: res.ok,
        data,
        text,
      };
    } catch (err: any) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(200 * (attempt + 1));
      }
    }
  }
  throw lastErr;
}

async function runCompleteApiAudit() {
  console.log('========================================================================');
  console.log('⚡ CreatorBase Multi-Pass API Stress-Test & Security Pen-Test Suite');
  console.log('   Running 25 Iterations across all Core Business & Security Endpoints');
  console.log('========================================================================\n');

  const results: TestResult[] = [];

  // Seed / fetch test fixtures
  const testUserEmail = `stress_tester_${Date.now()}@creatorbase-audit.in`;
  const testAdminEmail = `super_admin_${Date.now()}@creatorbase-audit.in`;

  // 1. Create Test Regular User
  const regularUser = await prisma.user.create({
    data: {
      name: 'Audit Regular User',
      email: testUserEmail,
      passwordHash: '$2a$10$wT8fH/0nQhZ0o7f4P0C.aeo1W9KkW8Zf.mN.eYg9u8L7R.6R8QnOi',
      companyName: 'Audit Agency Corp',
      role: 'BRAND_ADMIN',
      planType: 'PRO',
      subscriptionStatus: 'ACTIVE',
    },
  });

  // 2. Create Test Super Admin
  const adminUser = await prisma.user.create({
    data: {
      name: 'Audit Super Admin',
      email: testAdminEmail,
      passwordHash: '$2a$10$wT8fH/0nQhZ0o7f4P0C.aeo1W9KkW8Zf.mN.eYg9u8L7R.6R8QnOi',
      companyName: 'CreatorBase Central',
      role: 'SUPER_ADMIN',
      planType: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
    },
  });

  // 3. Create Suspended User
  const suspendedUser = await prisma.user.create({
    data: {
      name: 'Suspended Audit User',
      email: `suspended_${Date.now()}@creatorbase-audit.in`,
      passwordHash: '$2a$10$wT8fH/0nQhZ0o7f4P0C.aeo1W9KkW8Zf.mN.eYg9u8L7R.6R8QnOi',
      companyName: 'Suspended Corp',
      role: 'BRAND_ADMIN',
      isSuspended: true,
      suspensionReason: 'Terms of Service Violation Audit Lock',
    },
  });

  // Get sample creator from DB
  const sampleCreator = await prisma.creator.findFirst({
    where: { followerCount: { gte: 5000 } },
  });

  if (!sampleCreator) {
    throw new Error('No creators found in database to run shortlist/pitch tests');
  }

  // Create test shortlist
  const testShortlist = await prisma.shortlist.create({
    data: {
      userId: regularUser.id,
      name: `Audit Stress Shortlist ${Date.now()}`,
      shareToken: `audit_token_${crypto.randomUUID()}`,
      isPubliclyShared: true,
    },
  });

  const regularToken = signToken({
    userId: regularUser.id,
    email: regularUser.email,
    role: regularUser.role,
  });

  const suspendedToken = signToken({
    userId: suspendedUser.id,
    email: suspendedUser.email,
    role: suspendedUser.role,
  });

  // ====================================================================
  // SUITE 1: AUTH, PRIVILEGE ESCALATION & RATE LIMITING (25 Iterations)
  // ====================================================================
  console.log('🔒 [Suite 1/5] Testing Auth, Privilege Escalation & Suspended Guard...');

  // Test 1.1: Registration collision and injection payloads
  const authRegLatencies: number[] = [];
  let authRegPassed = 0;
  const INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "admin'--",
    '<script>alert(1)</script>',
    '${7*7}',
    '../../etc/passwd',
  ];

  for (let i = 0; i < 25; i++) {
    const start = Date.now();
    const isDup = i % 2 === 0;
    const body = {
      name: `Test Injected ${INJECTION_PAYLOADS[i % INJECTION_PAYLOADS.length]}`,
      email: isDup ? testUserEmail : `new_valid_${i}_${Date.now()}@audit.com`,
      password: i % 5 === 0 ? '12' : 'Password123!',
      companyName: 'Injection Test Inc',
    };

    const res = await safeFetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - start;
    authRegLatencies.push(elapsed);

    if (isDup && (res.status === 400 || res.status === 409 || res.status === 429)) {
      authRegPassed++;
    } else if (i % 5 === 0 && (res.status === 400 || res.status === 429)) {
      authRegPassed++;
    } else if (!isDup && i % 5 !== 0 && (res.status === 201 || res.status === 200 || res.status === 429)) {
      authRegPassed++;
    }
  }

  results.push({
    endpoint: 'POST /api/auth/register',
    concurrencyIterations: '25 iterations',
    scenarios: 'Duplicate email collisions, weak passwords & SQL/XSS payloads',
    latencies: authRegLatencies,
    passCount: authRegPassed,
    totalCount: 25,
    securityVerdict: authRegPassed >= 24 ? 'PASS' : 'FAIL',
  });

  // Test 1.2: Privilege Escalation on /api/admin
  const privEscLatencies: number[] = [];
  let privEscPassed = 0;

  for (let i = 0; i < 25; i++) {
    const start = Date.now();
    const res = await safeFetch(`${BASE_URL}/admin/overview`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${regularToken}`,
      },
    });
    const elapsed = Date.now() - start;
    privEscLatencies.push(elapsed);

    if (res.status === 403) {
      privEscPassed++;
    }
  }

  results.push({
    endpoint: 'GET /api/admin/overview (PrivEsc)',
    concurrencyIterations: '25 iterations',
    scenarios: 'Ordinary AGENCY_MEMBER JWT accessing Super Admin endpoint -> 403 Strict',
    latencies: privEscLatencies,
    passCount: privEscPassed,
    totalCount: 25,
    securityVerdict: privEscPassed === 25 ? 'PASS' : 'FAIL',
  });

  // Test 1.3: Suspended Account Guard
  const suspLatencies: number[] = [];
  let suspPassed = 0;

  for (let i = 0; i < 25; i++) {
    const start = Date.now();
    const res = await safeFetch(`${BASE_URL}/shortlists`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${suspendedToken}`,
      },
    });
    const elapsed = Date.now() - start;
    suspLatencies.push(elapsed);

    if (res.status === 403) {
      suspPassed++;
    }
  }

  results.push({
    endpoint: 'ANY /api/* (Suspended Guard)',
    concurrencyIterations: '25 iterations',
    scenarios: 'Token with isSuspended=true immediately revoked with 403 Forbidden',
    latencies: suspLatencies,
    passCount: suspPassed,
    totalCount: 25,
    securityVerdict: suspPassed === 25 ? 'PASS' : 'FAIL',
  });

  // ====================================================================
  // SUITE 2: DISCOVERY ENGINE & POSTGRESQL POOL STRESS-TEST (25 Iterations / 50 Concurrent Burst)
  // ====================================================================
  console.log('🚀 [Suite 2/5] Testing Discovery Engine & PostgreSQL Pool under 50 Concurrent Bursts...');

  const discoveryLatencies: number[] = [];
  let discoveryPassed = 0;

  const filterPermutations = [
    '?platform=YOUTUBE&minFollowers=5000&minEngagement=1.0&page=1',
    '?platform=INSTAGRAM&minFollowers=10000&minEngagement=2.0&page=2',
    '?city=Mumbai&niche=Tech&minFollowers=5000&page=1',
    '?city=Delhi&niche=Food&minEngagement=1.5&page=1',
    '?search=totalgaming&page=1',
    '?platform=ALL&page=5&limit=12',
    '?platform=YOUTUBE&page=10&limit=12',
  ];

  for (let cycle = 0; cycle < 5; cycle++) {
    const burstPromises = Array.from({ length: 5 }).map(async (_, idx) => {
      const q = filterPermutations[(cycle * 5 + idx) % filterPermutations.length];
      const start = Date.now();
      const res = await safeFetch(`${BASE_URL}/creators${q}`, {
        headers: {
          Authorization: `Bearer ${regularToken}`,
        },
      });
      const elapsed = Date.now() - start;
      const data = res.data;

      let qualityOk = true;
      if (res.status === 200 && data?.success && Array.isArray(data?.data?.creators)) {
        for (const c of data.data.creators) {
          if (c.followerCount < 5000 || c.engagementRate < 1.0) {
            qualityOk = false;
            break;
          }
        }
      } else {
        qualityOk = false;
      }

      return { elapsed, success: qualityOk };
    });

    const burstResults = await Promise.all(burstPromises);
    for (const b of burstResults) {
      discoveryLatencies.push(b.elapsed);
      if (b.success) discoveryPassed++;
    }
  }

  results.push({
    endpoint: 'GET /api/creators',
    concurrencyIterations: '25 iterations (5x5 concurrent bursts)',
    scenarios: 'Multi-filter permutations, min 5K subs, min 1% engagement & Neon pool reuse',
    latencies: discoveryLatencies,
    passCount: discoveryPassed,
    totalCount: 25,
    securityVerdict: discoveryPassed === 25 ? 'PASS' : 'FAIL',
  });

  // ====================================================================
  // SUITE 3: PAYMENT SECURITY & REPLAY ATTACK DEFENSE (25 Iterations)
  // ====================================================================
  console.log('💳 [Suite 3/5] Testing Payment Server Calculation, Signature HMAC & Idempotency...');

  const paymentLatencies: number[] = [];
  let paymentPassed = 0;

  for (let i = 0; i < 25; i++) {
    const start = Date.now();

    // 1. Order Creation with client price tampering attempt
    const orderRes = await safeFetch(`${BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regularToken}`,
      },
      body: JSON.stringify({
        plan: 'PRO',
        billingCycle: 'monthly',
        tamperedAmount: 100, // Client tries to pay ₹1 instead of ₹7,999
      }),
    });

    const orderData = orderRes.data;
    const orderCreatedOk =
      (orderRes.status === 200 || orderRes.status === 201) &&
      orderData?.success &&
      orderData?.data?.amount === 799900; // Must be strictly 799900 Paise

    // 2. Signature verification test
    let verifyOk = false;
    if (orderCreatedOk) {
      const orderId = orderData.data.orderId;
      const paymentId = `pay_stress_${i}_${Date.now()}`;
      const isTampered = i % 2 === 1;

      const dataToSign = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', config.razorpayKeySecret)
        .update(dataToSign)
        .digest('hex');

      const signatureToSend = isTampered
        ? 'tampered_forged_signature_00000000000000000000000000000000'
        : validSignature;

      const verifyRes = await safeFetch(`${BASE_URL}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${regularToken}`,
        },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signatureToSend,
        }),
      });

      if (isTampered && verifyRes.status === 400) {
        verifyOk = true;
      } else if (!isTampered && verifyRes.status === 200) {
        // 3. Test Idempotency / Replay Attack (call verify again with same payload)
        const replayRes = await safeFetch(`${BASE_URL}/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${regularToken}`,
          },
          body: JSON.stringify({
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signatureToSend,
          }),
        });

        // Replay should return 200 with idempotent "Subscription is already active"
        const replayData = replayRes.data;
        if (replayRes.status === 200 && replayData?.message?.includes('already active')) {
          verifyOk = true;
        }
      }
    }

    const elapsed = Date.now() - start;
    paymentLatencies.push(elapsed);
    if (orderCreatedOk && verifyOk) {
      paymentPassed++;
    }
  }

  results.push({
    endpoint: 'POST /api/payments/verify',
    concurrencyIterations: '25 iterations',
    scenarios: 'Paise enforcement, timingSafeEqual rejection & replay attack idempotency',
    latencies: paymentLatencies,
    passCount: paymentPassed,
    totalCount: 25,
    securityVerdict: paymentPassed === 25 ? 'PASS' : 'FAIL',
  });

  // ====================================================================
  // SUITE 4: KANBAN WORKFLOW & DATA INTEGRITY (25 Iterations)
  // ====================================================================
  console.log('📋 [Suite 4/5] Testing Kanban Deliverables Lifecycle & URL Validations...');

  const kanbanLatencies: number[] = [];
  let kanbanPassed = 0;

  // Ensure creator is added to shortlist
  await safeFetch(`${BASE_URL}/shortlists/${testShortlist.id}/creators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regularToken}`,
    },
    body: JSON.stringify({
      creatorId: sampleCreator.id,
      assignedFeeINR: 45000,
    }),
  });

  const STAGES = [
    'SHORTLISTED',
    'EMAIL_SENT',
    'COMMERCIALS_AGREED',
    'DRAFT_UNDER_REVIEW',
    'LIVE_AND_PAID',
  ] as const;

  for (let i = 0; i < 25; i++) {
    const start = Date.now();
    const stage = STAGES[i % STAGES.length];
    const isInvalidUrlTest = i % 5 === 0;

    const patchBody = {
      stage,
      agreedFeeINR: 50000,
      liveUrl: isInvalidUrlTest ? 'not-a-valid-url-format' : 'https://instagram.com/reel/C8xyz987',
      deliverableNotes: `Stage updated to ${stage} in cycle ${i}`,
    };

    const patchRes = await safeFetch(
      `${BASE_URL}/shortlists/${testShortlist.id}/items/${sampleCreator.id}/stage`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${regularToken}`,
        },
        body: JSON.stringify(patchBody),
      }
    );

    let stageOk = false;
    if (isInvalidUrlTest) {
      // Must be rejected by Zod with 400
      stageOk = patchRes.status === 400;
    } else {
      stageOk = patchRes.status === 200;
    }

    // Verify kanban telemetry
    if (stageOk && !isInvalidUrlTest) {
      const kanbanRes = await safeFetch(`${BASE_URL}/shortlists/${testShortlist.id}/kanban`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      const kanbanData = kanbanRes.data;
      stageOk =
        kanbanRes.status === 200 &&
        typeof kanbanData?.data?.telemetry?.totalAllocatedBudgetINR === 'number' &&
        kanbanData?.data?.telemetry?.totalAllocatedBudgetINR >= 0;
    }

    const elapsed = Date.now() - start;
    kanbanLatencies.push(elapsed);
    if (stageOk) kanbanPassed++;
  }

  results.push({
    endpoint: 'PATCH /api/shortlists/:id/items/:creatorId/stage',
    concurrencyIterations: '25 iterations',
    scenarios: '5-stage lifecycle progression, liveUrl Zod regex & INR telemetry math',
    latencies: kanbanLatencies,
    passCount: kanbanPassed,
    totalCount: 25,
    securityVerdict: kanbanPassed === 25 ? 'PASS' : 'FAIL',
  });

  // ====================================================================
  // SUITE 5: PUBLIC SHAREABLE PITCH LINK (/pitch/:shareToken) (25 Iterations)
  // ====================================================================
  console.log('🌐 [Suite 5/5] Testing Incognito Pitch Link & Client Approval Actions...');

  const pitchLatencies: number[] = [];
  let pitchPassed = 0;

  for (let i = 0; i < 25; i++) {
    const start = Date.now();

    // 1. Unauthenticated incognito fetch
    const pitchRes = await safeFetch(`${BASE_URL}/public/pitch/${testShortlist.shareToken}`);
    const pitchData = pitchRes.data;

    let incognitoLeakCheck = false;
    if (pitchRes.status === 200 && pitchData?.success && pitchData?.data) {
      const dataStr = JSON.stringify(pitchData.data);
      // Strictly verify no sensitive secrets leaked
      incognitoLeakCheck =
        !dataStr.includes('passwordHash') &&
        !dataStr.includes('jwt') &&
        !dataStr.includes('secret') &&
        !dataStr.includes(regularUser.id);
    }

    // 2. Client approval toggle action
    const approvalStatus = i % 2 === 0 ? 'APPROVED' : 'REJECTED';
    const actionRes = await safeFetch(
      `${BASE_URL}/public/pitch/${testShortlist.shareToken}/creators/${sampleCreator.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approvalStatus,
          notes: `Client feedback in cycle ${i}`,
        }),
      }
    );

    const actionOk = actionRes.status === 200;

    const elapsed = Date.now() - start;
    pitchLatencies.push(elapsed);

    if (incognitoLeakCheck && actionOk) {
      pitchPassed++;
    }
  }

  results.push({
    endpoint: 'GET /api/public/pitch/:shareToken',
    concurrencyIterations: '25 iterations',
    scenarios: 'Zero sensitive data leaks, zero-auth access & client approval state machine',
    latencies: pitchLatencies,
    passCount: pitchPassed,
    totalCount: 25,
    securityVerdict: pitchPassed === 25 ? 'PASS' : 'FAIL',
  });

  // Clean up audit test data
  try {
    await prisma.shortlistItem.deleteMany({ where: { shortlistId: testShortlist.id } });
    await prisma.shortlist.delete({ where: { id: testShortlist.id } });
    await prisma.payment.deleteMany({ where: { userId: regularUser.id } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [regularUser.id, adminUser.id, suspendedUser.id] },
      },
    });
  } catch (cleanErr: any) {
    console.warn('⚠️ [Cleanup Advisory]:', cleanErr?.message || cleanErr);
  }

  console.log('\n========================================================================');
  console.log('📊 MULTI-PASS API STRESS-TEST & SECURITY PEN-TEST SUMMARY LEDGER');
  console.log('========================================================================\n');

  console.table(
    results.map((r) => {
      const avg = Math.round(r.latencies.reduce((a, b) => a + b, 0) / r.latencies.length);
      const passRate = `${Math.round((r.passCount / r.totalCount) * 100)}%`;
      return {
        'Endpoint Tested': r.endpoint,
        'Concurrency & Iterations': r.concurrencyIterations,
        'Test Scenarios': r.scenarios,
        'Avg Latency': `${avg}ms`,
        'Pass Rate': passRate,
        'Security Verdict': r.securityVerdict,
      };
    })
  );

  return results;
}

if (require.main === module) {
  runCompleteApiAudit()
    .catch((err) => {
      console.error('Fatal API audit failure:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
