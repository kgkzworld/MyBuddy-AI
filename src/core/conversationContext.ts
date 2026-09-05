export type ConversationRole = "user" | "assistant";

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
}

const FILE_OPEN_FOLLOW_UP = /\b(?:show|teach|walk|how|what)\b[^.!?]*\bopen(?:ing)?\s+(?:a|the|this)?\s*file\b/i;

export class ConversationContext {
  private readonly messages: ConversationMessage[] = [];
  private preparedApplication: string | null = null;
  private messageSequence = 0;
  private preparedAtSequence: number | null = null;

  constructor(private readonly maximumMessages = 8) {
    if (!Number.isInteger(maximumMessages) || maximumMessages < 1 || maximumMessages > 20) {
      throw new Error("Conversation history must retain between 1 and 20 messages.");
    }
  }

  remember(role: ConversationRole, content: string): void {
    const bounded = content.trim().slice(0, 2_000);
    if (!bounded) return;
    this.messageSequence += 1;
    this.messages.push({ role, content: bounded });
    if (this.messages.length > this.maximumMessages) {
      this.messages.splice(0, this.messages.length - this.maximumMessages);
    }
  }

  history(): readonly ConversationMessage[] {
    return this.messages.map((message) => ({ ...message }));
  }

  clear(): void {
    this.messages.length = 0;
    this.preparedApplication = null;
    this.messageSequence = 0;
    this.preparedAtSequence = null;
  }

  markPreparedApplication(application: string): void {
    const bounded = application.trim().slice(0, 80);
    this.preparedApplication = bounded || null;
    this.preparedAtSequence = this.preparedApplication ? this.messageSequence : null;
  }

  preferredApplicationFor(request: string): string | null {
    const contextIsCurrent = this.preparedAtSequence !== null
      && this.messageSequence - this.preparedAtSequence <= this.maximumMessages;
    return FILE_OPEN_FOLLOW_UP.test(request) && contextIsCurrent ? this.preparedApplication : null;
  }
}
