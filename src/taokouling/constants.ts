import _ from 'lodash-es';

export const TIMEOUT = 15 * 1000;

export const getShortlinkRegExp = _.once(
  () => /\bm\.tb\.cn\/([a-zA-Z0-9\.]{5,15})\b/,
);

export const getSymbolRegExp = _.once(() => {
  const symbols = Array.from('$¥€₤₳¢¤฿₵₡₫ƒ₲₭£₥₦₱〒₮₩₴₪៛﷼₢M₰₯₠₣₧ƒ￥/()🎵📲😺🔑')
    .map(_.escapeRegExp)
    .join('');
  return new RegExp(`\d[${symbols}]([a-zA-Z0-9]{10,15})[${symbols}].`);
});
