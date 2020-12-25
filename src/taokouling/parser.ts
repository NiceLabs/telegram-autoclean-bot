import _ from 'lodash-es';
import fetch from 'node-fetch';
import urlcat from 'urlcat';
import { subHours } from 'date-fns';
import { RE_SHORTLINK, RE_SYMBOL, TIMEOUT, TRACK_QUERY_NAMES, RE_TRACK_QUERY_PREFIX } from './constants';
import { Parsed, ShortlinkExtraData, TaokoulingError, TaoPassAPIResponse } from './types';

export async function parseMessage(message: string | undefined) {
  if (_.isNil(message)) {
    return;
  }
  const timeout = (ms: number) => new Promise<undefined>((resolve) => setTimeout(resolve, ms));
  // prettier-ignore
  return Promise.race(_.compact([
    RE_SYMBOL.test(message) && queryTaoPass(RegExp.$1),
    RE_SHORTLINK.test(message) && queryShortlink(RegExp.$1),
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
    throw new TaokoulingError(`This product has been deleted (from taodaxiang.com)`);
  }
  const parsed = payload.data;
  const url = getProductLink(parsed.url);
  const title = parsed.content;
  const picUrl = parsed.picUrl;
  const expired = subHours(new Date(parsed.expire), 8);
  return { url, title, picUrl, expired };
}

async function queryShortlink(code: string): Promise<Parsed> {
  const response = await fetch(urlcat('https://m.tb.cn', code), { method: 'GET', timeout: TIMEOUT });
  const html = await response.text();
  let url: string, title: string | undefined, picUrl: string | undefined;
  if (/url\s*=\s*'(.+)';/.test(html)) {
    url = getProductLink(RegExp.$1);
  } else {
    throw new TaokoulingError('This product has been deleted (from shortlink parsing)');
  }
  if (/extraData\s*=\s*(\{.+\});/.test(html)) {
    const data: ShortlinkExtraData = JSON.parse(RegExp.$1);
    title = data.title;
    picUrl = data.pic;
  }
  return { url, title, picUrl };
}

export async function queryProductPrice(link: string) {
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
    const setup = JSON.parse(RegExp.$1);
    const skuMap = setup?.valItemInfo?.skuMap;
    const defaultItemPrice = setup?.detail?.defaultItemPrice;
    if (_.isNil(skuMap) && defaultItemPrice) {
      values = [Number.parseFloat(defaultItemPrice)];
    } else {
      values = _.map(skuMap, ({ price }) => Number.parseFloat(price));
    }
  } else {
    return;
  }
  values = _.uniq(values);
  const minPrice = _.min(values)?.toFixed(2);
  const maxPrice = _.max(values)?.toFixed(2);
  if (values.length === 1) {
    return `${values[0].toFixed(2)} CNY`;
  } else if (values.length === 2) {
    return `${minPrice} CNY - ${maxPrice} CNY`;
  } else if (values[0]) {
    return `${values[0].toFixed(2)} CNY (${minPrice} CNY - ${maxPrice} CNY)`;
  } else {
    return;
  }
}

function getProductLink(link: string) {
  const url = new URL(link);
  if (/^shop(\d+)\.m\.taobao\.com$/.test(url.hostname)) {
    const shopId = RegExp.$1;
    return `shop${shopId}.taobao.com`;
  } else if (url.hostname === 'uland.taobao.com' && url.pathname === '/coupon/edetail' && url.searchParams.has('e')) {
    return urlcat(url.hostname, url.pathname, { e: url.searchParams.get('e') });
  } else if (url.hostname === 's.m.taobao.com' && url.searchParams.has('q')) {
    return urlcat('s.taobao.com/search', { q: url.searchParams.get('q') });
  } else if (url.hostname === 'a.m.taobao.com' && /^\/i(\d+).htm/.test(url.pathname)) {
    return urlcat('item.taobao.com/item.htm', { id: RegExp.$1 });
  } else if (url.searchParams.has('id')) {
    // from: item.taobao.com/item.htm
    // from: detail.m.taobao.com/item.htm
    // from: market.m.taobao.com/app/idleFish-F2e/widle-taobao-rax/page-detail
    const platform = url.hostname.includes('tmall') ? 'detail.tmall.com' : 'item.taobao.com';
    return urlcat(platform, '/item.htm', { id: url.searchParams.get('id') });
  }
  for (const name of url.searchParams.keys()) {
    if (TRACK_QUERY_NAMES.has(name) || RE_TRACK_QUERY_PREFIX.test(name)) {
      url.searchParams.delete(name);
    }
  }
  return url.toString();
}
