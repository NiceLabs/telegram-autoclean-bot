import _ from 'lodash-es';

export const TIMEOUT = 15 * 1000;

export const RE_SHORTLINK = /m\.tb\.cn\/(h\.\w{7})/;

export const RE_SYMBOL = /[^\s\w](\w{11})[^\s\w]/;

export const RE_TRACK_QUERY_PREFIX = /^(x_|wh_|uth_|source|bft|hm_)/i;

export const TRACK_QUERY_NAMES = new Set([
  'abtest',
  'acm',
  'alg_bts',
  'algArgs',
  'app',
  'appid',
  'cat',
  'cps',
  'from',
  'impid',
  'initiative_id',
  'lwfrom',
  'lygClk',
  'pos',
  'ppath',
  'pvid',
  'rpos',
  'scene',
  'scm',
  'share_crt_v',
  'short_name',
  'spm',
  'ssid',
  'stats_click',
  't_trace_id',
  'trackInfo',
  'uid',
  'un',
  'utparam',
]);
