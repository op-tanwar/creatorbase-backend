import { ApifyService } from '../src/services/apifyService';

async function test() {
  const candidates = [
    'https://www.youtube.com/@harshbeniwal21',
    'https://www.youtube.com/@HarshBeniwal',
    'https://www.youtube.com/@scoutop',
    'https://www.youtube.com/@scoutofficial',
    'https://www.youtube.com/@scout_op',
  ];

  for (const url of candidates) {
    const res = await ApifyService.verifyUrlLive(url);
    console.log(url, res);
  }
}

test();
