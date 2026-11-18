import dotenv from 'dotenv';
dotenv.config();
import { ApifyClient } from 'apify-client';

async function main() {
  const token = process.env.APIFY_API_TOKEN;
  console.log('APIFY_API_TOKEN exists:', !!token, 'Length:', token?.length);
  const client = new ApifyClient({ token });
  const user = await client.user().get();
  console.log('Apify User:', {
    id: user?.id,
    username: user?.username,
    email: user?.email,
    plan: user?.plan?.id
  });
}

main().catch(console.error);
