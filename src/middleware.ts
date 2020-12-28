import { Context, Middleware } from 'telegraf';

export const errorLog: Middleware<Context> = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error(err);
  }
};

export const autoReply: Middleware<Context> = async (ctx, next) => {
  const reply = async () => {
    const message = await ctx.reply('Loading ...', {
      reply_to_message_id: ctx.message!.message_id,
      disable_web_page_preview: true,
    });
    const { description } = await ctx.getChat();
    if (description) {
      return ctx.telegram.editMessageText(
        message.chat.id,
        message.message_id,
        undefined,
        description,
      );
    } else {
      return ctx.deleteMessage(message.message_id);
    }
  };
  return Promise.all([reply(), next()]);
};

export const onlyFromChannel: Middleware<Context> = async (ctx, next) => {
  if (ctx.from?.id === 777000) {
    return next();
  }
};
