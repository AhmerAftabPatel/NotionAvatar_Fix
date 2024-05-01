import type { NextApiRequest, NextApiResponse } from 'next';
import chromium from 'chrome-aws-lambda';
const puppeteer = require('puppeteer-core');
import { AvatarConfig, AvatarPart } from '@/types';
const production = process.env.NODE_ENV === 'production';

// TODO: reuse this logic with svg api
async function getBrowserInstance() {
  const executablePath = await chromium.executablePath;

  // if (!executablePath) {
  //   // running locally
  //   // eslint-disable-next-line
  //   const puppeteer = require('puppeteer');
  //   return puppeteer.launch({
  //     args: chromium.args,
  //     headless: true,
  //     defaultViewport: {
  //       width: 1280,
  //       height: 720,
  //     },
  //     ignoreHTTPSErrors: true,
  //   });
  // }

  return await puppeteer.launch(
    production ? {
    args: chromium.args,
    defaultViewport: {
      width: 1280,
      height: 720,
    },
    executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  } : {
    headless : 'new',
    executablePath : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
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
    console.log(browser, 'browser');
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
      console.log(browser, 'browser 2');
      await browser.close();
    }
  }
}
