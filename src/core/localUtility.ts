const directTimeQuestion = /^(?:what(?:'s| is) the time|what time is it|current time|tell me the time)[?.!\s]*$/i;

export function answerLocalUtility(request: string, now = new Date()): string | null {
  if (!directTimeQuestion.test(request.trim())) return null;

  const time = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
  return `The current time is ${time}.`;
}
