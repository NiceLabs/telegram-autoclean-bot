import { decodeHTML5 } from 'entities';
import _ from 'lodash-es';
import { spacing } from 'pangu';
import { Composer, Context, Middleware } from 'telegraf';
import { RE_SHORTLINK, RE_SYMBOL } from './constants';
import { isExpectedPlatform, parseMessage, queryProductPrice } from './parser';
import { Parsed } from './types';

const bot = new Composer();

const middleware: Middleware<Context> = async (ctx) => {
  const reply_to_message_id = ctx.message!.message_id;
  const parsed = await parseMessage(ctx.message?.text ?? ctx.message?.caption);
  if (_.isNil(parsed)) {
    return;
  } else if (!isExpectedPlatform(parsed.url)) {
    return ctx.reply(parsed.url, { reply_to_message_id });
  } else if (parsed.picUrl) {
    const input = { url: parsed.picUrl, filename: 'unknown.jpg' };
    await ctx.replyWithPhoto(input, {
      caption: await makeCaption(parsed),
      reply_to_message_id,
    });
  } else {
    await ctx.reply(await makeCaption(parsed), { reply_to_message_id });
  }
};

async function makeCaption(parsed: Parsed) {
  // prettier-ignore
  const contents = [
    parsed.title && spacing(decodeHTML5(parsed.title)),
    await queryProductPrice(parsed.url),
    parsed.url,
    parsed.expired && `淘口令过期时间：${formatDate(parsed.expired)}`
  ];
  return _.compact(contents).join('\n\n');
}

bot.hears([RE_SHORTLINK, RE_SYMBOL], middleware);
bot.on('photo', middleware);

export default bot;

function formatDate(date: Date) {
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
