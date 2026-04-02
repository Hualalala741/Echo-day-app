/** 将对话数组拼成给模型用的可读 transcript（与前端展示标签一致） */

export function messagesToTranscript(
  messages: { role: string; content: string }[]
): string {
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => `${m.role === "user" ? "Me" : "Echo"}: ${m.content}`)
    .join("\n\n");
}

/** generate 接口：优先用客户端已拼好的 transcript，否则从 conversationMessages 数组生成 */
export function resolveTranscriptFromBody(body: {
  transcript?: unknown;
  conversationMessages?: unknown;
}): string {
  if (typeof body.transcript === "string" && body.transcript.trim() !== "") {
    return body.transcript;
  }
  if (Array.isArray(body.conversationMessages)) {
    return messagesToTranscript(
      body.conversationMessages as { role: string; content: string }[]
    );
  }
  if (typeof body.transcript === "string") return body.transcript;
  return "";
}
