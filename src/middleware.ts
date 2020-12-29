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
  };
  return Promise.all([reply(), next()]);
};
