import _ from 'lodash-es';
import fetch from 'node-fetch';
import urlcat from 'urlcat';
import { getShortlinkRegExp, getSymbolRegExp, TIMEOUT } from './constants';
import {
  Parsed,
  ShortlinkExtraData,
  TaokoulingError,
  TaoPassAPIResponse,
} from './types';

export async function parseMessage(message: string | undefined) {
  if (_.isNil(message)) {
    return;
  }
  const timeout = (ms: number) =>
    new Promise<undefined>((resolve) => setTimeout(resolve, ms));
  // prettier-ignore
  return Promise.race(_.compact([
    getSymbolRegExp().test(message) && queryTaoPass(RegExp.$1),
    getShortlinkRegExp().test(message) && queryShortlink(RegExp.$1),
    timeout(TIMEOUT)
  ]));
}

export function isExpectedPlatform(text: string) {
  const platforms = ['item.taobao.com', 'detail.tmall.com'];
  return _.some(platforms, text.startsWith.bind(text));
}

async function queryTaoPass(content: string): Promise<Parsed> {
  const response = await fetch('https://taodaxiang.com/taopass/parse/get', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ content }),
    timeout: TIMEOUT,
  });
  const payload: TaoPassAPIResponse = await response.json();
  if (payload.code !== 0) {
    throw new TaokoulingError(
      `This product has been deleted (from taodaxiang.com)`,
    );
  }
  const parsed = payload.data;
  const url = getProductLink(parsed.url);
  const title = parsed.content;
  const picUrl = parsed.picUrl;
  const prices = await queryProductPrice(url);
  return { url, title, picUrl, prices };
}

async function queryShortlink(code: string): Promise<Parsed> {
  const response = await fetch(urlcat('https://m.tb.cn', code), {
    method: 'GET',
    timeout: TIMEOUT,
  });
  const html = await response.text();
  let url: string, title: string | undefined, picUrl: string | undefined;
  if (/url = '(.+)';/.test(html)) {
    url = getProductLink(RegExp.$1);
  } else {
    throw new TaokoulingError(
      'This product has been deleted (from shortlink parsing)',
    );
  }
  if (/extraData = (\{.+\});/.test(html)) {
    const data: ShortlinkExtraData = JSON.parse(RegExp.$1);
    title = data.title;
    picUrl = data.pic;
  }
  const prices = await queryProductPrice(url);
  return { url, title, picUrl, prices };
}

async function queryProductPrice(link: string) {
  const response = await fetch('https://' + link);
  const html = await response.text();
  let values: number[];
  if (/skuMap\s*:\s*(\{.+\})\s*,/.test(html)) {
    // from: item.taobao.com
    const skuMap = JSON.parse(RegExp.$1);
    values = _.map(skuMap, ({ price }) => Number.parseFloat(price));
  } else if (/name="current_price"\s*value\s*=\s*"(\d+(?:\.\d+))"/.test(html)) {
    // from: item.taobao.com
    values = [Number.parseFloat(RegExp.$1)];
  } else if (/TShop\.Setup\(\s*(\{.+\})\s*\);/.test(html)) {
    // from: detail.tmall.com
    const skuMap = JSON.parse(RegExp.$1)?.valItemInfo?.skuMap;
    values = _.map(skuMap, ({ price }) => Number.parseFloat(price));
  } else {
    return;
  }
  values = _.uniq(values);
  const minPrice = _.min(values)!.toFixed(2);
  const maxPrice = _.max(values)!.toFixed(2);
  if (values.length === 1) {
    return `${values[0].toFixed(2)} CNY`;
  } else if (values.length === 2) {
    return `${minPrice} CNY - ${maxPrice} CNY`;
  } else {
    return `${values[0].toFixed(2)} CNY (${minPrice} CNY - ${maxPrice} CNY)`;
  }
}

function getProductLink(link: string) {
  const url = new URL(link);
  if (/^shop(\d+)\.m\.taobao\.com$/.test(url.hostname)) {
    const shopId = RegExp.$1;
    return `shop${shopId}.taobao.com`;
  }
  let id = url.searchParams.get('id');
  let platform = url.hostname.endsWith('tmall.com')
    ? 'detail.tmall.com'
    : 'item.taobao.com';
  if (url.hostname === 'a.m.taobao.com' && /^\/i(\d+).htm/.test(url.pathname)) {
    id = RegExp.$1;
  }
  return _.isNil(id) ? link : urlcat(platform, '/item.htm', { id });
}
