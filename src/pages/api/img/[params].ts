import type { NextApiRequest, NextApiResponse } from 'next';
import chromium from 'chrome-aws-lambda';
import { AvatarConfig, AvatarPart } from '@/types';

// TODO: reuse this logic with svg api
async function getBrowserInstance() {
  const executablePath =  process.env.NODE_ENV === "production"
          ? await chromium.executablePath
          : "/usr/local/bin/chromium";

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
  //     ignoreDefaultArgs: ['--disable-extensions']
  //   });
  // }

  return chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: {
      width: 1280,
      height: 720,
    },
    executablePath,
    headless: process.env.NODE_ENV === "production" ? chromium.headless : true,
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--disable-extensions']
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
    console.log('browser', browser);
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector(`#avatar-preview`); // wait for the selector to load

    const element = await page.$(`#avatar-preview`); // declare a variable with an ElementHandle
    const image = await element?.screenshot();

    res.writeHead(200, { 'Content-Type': `image/png` }).end(image, `binary`);
  } catch (error: any) {
    console.log(error);
    res.json({
      status: `error`,
      data: error?.message || `Something went wrong`,
    });
  } finally {
    if (browser !== null && browser) {
      await browser.close();
    }
  }
}
