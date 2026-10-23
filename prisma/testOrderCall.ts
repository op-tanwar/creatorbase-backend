import dotenv from 'dotenv';
dotenv.config();
import { signToken } from '../src/utils/jwt';

async function testOrder() {
  const token = signToken({ userId: 'test', email: 'test@test.com', role: 'BRAND_ADMIN' });
  console.log('Calling POST /api/payments/create-order...');
  const start = Date.now();
  const res = await fetch('http://127.0.0.1:5000/api/payments/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Connection: 'close',
    },
    body: JSON.stringify({ plan: 'PRO', billingCycle: 'monthly' }),
  });
  console.log(`Finished in ${Date.now() - start}ms! Status:`, res.status);
  const data = await res.json();
  console.log('Data:', data);
}

testOrder().catch(console.error);
