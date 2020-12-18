import { Context, Middleware } from 'telegraf';

export const errorLog: Middleware<Context> = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(err);
  }
};

export const autoReply: Middleware<Context> = async (ctx, next) => {
  const chat = await ctx.getChat();
  if (chat.description) {
    await ctx.reply(chat.description, {
      reply_to_message_id: ctx.message!.message_id,
    });
  }
  return next();
};

export const onlyFromChannel: Middleware<Context> = async (ctx, next) => {
  if (ctx.from?.id === 777000) {
    return next();
  }
};
