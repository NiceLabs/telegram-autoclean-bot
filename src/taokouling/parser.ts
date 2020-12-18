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

export async function parseMessage(message: string) {
  // prettier-ignore
  return Promise.race(_.compact([
    getSymbolRegExp().test(message) && queryTaoPass(RegExp.$1),
    getShortlinkRegExp().test(message) && queryShortlink(RegExp.$1)
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
  return { url, title, picUrl };
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
  return { url, title, picUrl };
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
