import http from 'http';
import https from 'https';
import makeHandler from 'lambda-request-handler';
import Telegraf from 'telegraf';
import keywords from './keywords.json';
import { autoReply, errorLog } from './middleware';
import taokouling from './taokouling';

const bot = new Telegraf(process.env.BOT_TOKEN!, {
  telegram: {
    webhookReply: false,
    // @ts-ignore
    agent(parsedURL: URL) {
      if (parsedURL.protocol === 'https:') {
        return https.globalAgent;
      } else {
        return http.globalAgent;
      }
    },
  },
});

bot.use(Telegraf.log());

bot.use(errorLog);

bot.use(taokouling);

bot.hears(keywords, autoReply);

bot.on('new_chat_members', autoReply, async (ctx) => {
  for (const { id, is_bot } of ctx.message!.new_chat_members!) {
    if (is_bot) {
      continue;
    }
    await ctx.kickChatMember(id, Date.now() / 1000 + 300);
    await ctx.unbanChatMember(id);
  }
});

bot.on('left_chat_member', (ctx) => ctx.deleteMessage());

export const handler = makeHandler(
  bot.webhookCallback(process.env.BOT_HOOK_PATH!),
);
