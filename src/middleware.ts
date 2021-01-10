import { Composer, Context, Middleware } from 'telegraf';
import { MiddlewareFn } from 'telegraf/typings/composer';
import { ChatPermissions, User } from 'telegraf/typings/telegram-types';
import { delay } from './utils';

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
  const options = ['👍 | 🎉', '👎 | 🙄', '😲 | 🌱', '🤔', '🤐'];
  const poll = await ctx.replyWithPoll(title, options, {
    reply_to_message_id: ctx.message!.message_id,
    disable_notification: true,
  });
  console.info('Poll ID', poll.poll.id);
});

export const kickChatMember = tap(async (ctx) => {
  const members = ctx.message!.new_chat_members!.filter(
    ({ is_bot }) => !is_bot,
  );
  const until_date = Date.now() / 1000 + 3600;
  const removeChatMember = async ({ id }: User) => {
    const permissions: ChatPermissions = { can_send_messages: false };
    await ctx.restrictChatMember(id, { until_date, permissions });
    await delay(10 * 1000);
    await ctx.kickChatMember(id, until_date);
    await ctx.unbanChatMember(id);
  };
  await Promise.all(members.map(removeChatMember));
});

export const deleteMessage = tap((ctx) => {
  if (!ctx.message) {
    return;
  }
  const isDeletable = !(
    ctx.message.from?.id === 777000 ||
    ctx.message.reply_to_message ||
    ctx.message.new_chat_members
  );
  if (isDeletable) {
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

export const deleteNonTextMessage = tap((ctx) => {
  if (!ctx.message) {
    return;
  }
  const isDeletable =
    ctx.message.dice ||
    ctx.message.game ||
    ctx.message.location ||
    ctx.message.sticker ||
    ctx.message.venue;
  if (isDeletable) {
    return ctx.deleteMessage();
  }
});

export const unpinAllChatMessages = tap((ctx) => {
  if (!ctx.chat) {
    return;
  }
  return ctx.telegram.callApi('unpinAllChatMessages', {
    chat_id: ctx.chat.id,
  });
});
