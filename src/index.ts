import http from 'http';
import https from 'https';
import makeHandler from 'lambda-request-handler';
import Telegraf from 'telegraf';
import { autoReply, errorLog } from './middleware';
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

bot.use(taokouling);

bot.hears(/(讨论|[加入主])群/, autoReply);

bot.on('message', async (ctx, next) => {
  const onDelete = async () => {
    const isDeleteMessage = !(
      ctx.message?.from?.id === 777000 ||
      ctx.message?.reply_to_message ||
      ctx.message?.new_chat_members
    );
    if (isDeleteMessage) {
      return ctx.deleteMessage();
    }
  };
  const onPoll = async () => {
    if (ctx.message?.from?.id !== 777000) {
      return;
    }
    const title = '🗳️';
    const options = ['👍', '👎', '🎉', '😕', '👀', '💊'];
    const poll = await ctx.replyWithPoll(title, options, {
      reply_to_message_id: ctx.message!.message_id,
      disable_notification: true,
    });
    console.info('Poll ID', poll.poll.id);
  };
  return Promise.all([onDelete(), onPoll(), next()]);
});

bot.on('new_chat_members', autoReply, async (ctx) => {
  for (const { id, is_bot } of ctx.message!.new_chat_members!) {
    if (is_bot) {
      continue;
    }
    try {
      await ctx.kickChatMember(id, Date.now() / 1000 + 300);
      await ctx.unbanChatMember(id);
    } catch (err) {
      // continue on error
      console.error(err);
    }
  }
});

bot.on('pinned_message', (ctx) => ctx.unpinChatMessage());

bot.on('text', (ctx) => {
  const entry = ctx.message?.entities?.find(
    ({ type }) => type === 'bot_command',
  );
  if (entry?.offset === 0) {
    return ctx.deleteMessage();
  }
});

export const handler = makeHandler(
  bot.webhookCallback(process.env.BOT_HOOK_PATH!),
);
