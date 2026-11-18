import { ApifyService } from '../src/services/apifyService';

async function test() {
  const urls = [
    'https://www.youtube.com/@TotalGaming093',
    'https://www.youtube.com/@ashishchanchlanivines',
    'https://www.youtube.com/@souravjvlogs',
    'https://www.youtube.com/@triggeredinsaan',
    'https://www.youtube.com/@CarryMinati',
    'https://www.youtube.com/@TechBurner',
    'https://www.youtube.com/@geekyranjit',
  ];

  for (const url of urls) {
    const res = await ApifyService.verifyUrlLive(url, 12000);
    console.log(url, res);
  }
}

test();
