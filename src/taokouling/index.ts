import _ from 'lodash-es';
import { spacing } from 'pangu';
import { Composer, Context, Middleware } from 'telegraf';
import { getShortlinkRegExp, getSymbolRegExp } from './constants';
import { isExpectedPlatform, parseMessage } from './parser';
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
      caption: makeCaption(parsed),
      reply_to_message_id,
    });
  } else {
    await ctx.reply(makeCaption(parsed), { reply_to_message_id });
  }
};

function makeCaption(parsed: Parsed) {
  // prettier-ignore
  const contents: Array<string | undefined> = [
    parsed.title && spacing(parsed.title),
    parsed.prices,
    parsed.url
  ];
  return _.compact(contents).join('\n\n');
}

bot.hears([getSymbolRegExp(), getShortlinkRegExp()], middleware);
bot.on('photo', middleware);

export default bot;
