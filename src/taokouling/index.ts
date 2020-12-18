import _ from 'lodash-es';
import { Composer } from 'telegraf';
import { onlyFromChannel } from '../middleware';
import { getShortlinkRegExp, getSymbolRegExp } from './constants';
import { isExpectedPlatform, parseMessage } from './parser';

const bot = new Composer();

bot.hears(
  [getSymbolRegExp(), getShortlinkRegExp()],
  onlyFromChannel,
  async (ctx) => {
    const reply_to_message_id = ctx.message!.message_id;
    const parsed = await parseMessage(ctx.message!.text!);
    if (!isExpectedPlatform(parsed.url)) {
      return ctx.reply(parsed.url, { reply_to_message_id });
    }
    const caption = _.compact([parsed.title, parsed.url]).join('\n\n');
    if (parsed.picUrl) {
      const input = { url: parsed.picUrl, filename: 'unknown.jpg' };
      await ctx.replyWithPhoto(input, { caption, reply_to_message_id });
    } else {
      await ctx.reply(caption, { reply_to_message_id });
    }
  },
);

export default bot;
