import { Composer, Context, Middleware } from 'telegraf';
import { MiddlewareFn } from 'telegraf/typings/composer';
import { shuffle } from 'lodash-es';

export const errorLog: Middleware<Context> = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(err);
  }
};

export const ignoreNonMessage: Middleware<Context> = async (ctx, next) => {
  if (ctx.updateType !== 'message') {
    return;
  }
  return next();
};

export const tap = (middleware: Middleware<Context>): MiddlewareFn<Context> => {
  const fn = Composer.unwrap(middleware);
  return (ctx, next) =>
    Promise.all([fn(ctx, Promise.resolve.bind(Promise)), next()]);
};

export const autoReply = tap(async (ctx) => {
  const { chat, message_id } = await ctx.reply('Reading', {
    reply_to_message_id: ctx.message!.message_id,
  });
  const editMessageText = (text: string) =>
    ctx.telegram.editMessageText(chat.id, message_id, undefined, text, {
      disable_web_page_preview: true,
      parse_mode: 'HTML',
    });
  const { description } = await ctx.getChat();
  try {
    if (description) {
      await editMessageText(description);
    } else {
      await ctx.deleteMessage(message_id);
    }
  } catch (error) {
    await editMessageText(String(error));
  }
});

export const autoPoll = tap(async (ctx) => {
  if (ctx.message?.from?.id !== 777000) {
    return;
  }
  const title = '🗳️';
  const options = ['👍 | 🎉', '👎 | 👀 | 😕', ...shuffle(['💊', '🌿'])];
  const poll = await ctx.replyWithPoll(title, options, {
    reply_to_message_id: ctx.message!.message_id,
    disable_notification: true,
  });
  console.info('Poll ID', poll.poll.id);
});

export const kickChatMember = tap(async (ctx) => {
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

export const deleteMessage = tap(async (ctx) => {
  const isDeleteMessage = !(
    ctx.message?.from?.id === 777000 ||
    ctx.message?.reply_to_message ||
    ctx.message?.new_chat_members
  );
  if (isDeleteMessage) {
    return ctx.deleteMessage();
  }
});

export const deleteBotCommandMessage = tap((ctx) => {
  const entry = ctx.message?.entities?.find(
    ({ type }) => type === 'bot_command',
  );
  if (entry?.offset === 0) {
    return ctx.deleteMessage();
  }
});

export const unpinChatMessage = tap((ctx) => {
  if (ctx.message?.pinned_message) {
    return ctx.unpinChatMessage();
  } else if (ctx.message?.from?.id === 777000) {
    return ctx.unpinChatMessage();
  }
});
