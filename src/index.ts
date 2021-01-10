import http from 'http';
import https from 'https';
import makeHandler from 'lambda-request-handler';
import Telegraf from 'telegraf';
import {
  autoPoll,
  autoReply,
  deleteBotCommandMessage,
  deleteMessage,
  deleteNonTextMessage,
  errorLog,
  ignoreNonMessage,
  kickChatMember,
  tap,
  unpinAllChatMessages,
} from './middleware';
import taokouling from './taokouling';

const bot = new Telegraf(process.env.BOT_TOKEN!, {
  telegram: {
    webhookReply: false,
    // @ts-ignore
    agent: ({ protocol }: URL) =>
      protocol === 'https:' ? https.globalAgent : http.globalAgent,
  },
});

bot.use(Telegraf.log());
bot.use(errorLog);
bot.use(ignoreNonMessage);
bot.use(tap(taokouling));
bot.use(unpinAllChatMessages);
bot.use(deleteBotCommandMessage);
bot.hears(/(讨论|[加入主])群/, autoReply);
bot.on('message', autoPoll, deleteMessage, deleteNonTextMessage);
bot.on('new_chat_members', autoReply, kickChatMember);

export const handler = makeHandler(
  bot.webhookCallback(process.env.BOT_HOOK_PATH!),
);
