import type { NextApiRequest, NextApiResponse } from 'next';
import chromium from 'chrome-aws-lambda';
import { AvatarConfig, AvatarPart } from '@/types';

// TODO: reuse this logic with svg api
async function getBrowserInstance() {
  // eslint-disable-next-line
  const puppeteer = require('puppeteer-core');
  // eslint-disable-next-line
  const production = process.env.NODE_ENV === 'production';
  const browser = await puppeteer.launch(
    production ? {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: 'new',
        ignoreHTTPSErrors: true
    } : {
        headless: 'new',
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    }
);
return browser
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { params } = req.query;

  // decode
  const config = JSON.parse(
    Buffer.from(params as string, `base64`).toString(),
  ) as AvatarConfig;

  const url = `${process.env.NEXT_PUBLIC_URL}?${Object.keys(config)
    .map(
      (type) =>
        `${type}=${encodeURIComponent(config[type as keyof AvatarConfig])}`,
    )
    .join(`&`)}`;

  let browser;

  try {
    browser = await getBrowserInstance();
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector(`#avatar-preview`); // wait for the selector to load

    const element = await page.$(`#avatar-preview`); // declare a variable with an ElementHandle
    const image = await element.screenshot();

    res.writeHead(200, { 'Content-Type': `image/png` }).end(image, `binary`);
  } catch (error: any) {
    res.json({
      status: `error`,
      data: error?.message || `Something went wrong`,
    });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
