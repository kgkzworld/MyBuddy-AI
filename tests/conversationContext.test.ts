import { describe, expect, it } from "vitest";
import { ConversationContext } from "../src/core/conversationContext";

describe("bounded conversation context", () => {
  it("retains the application prepared by the preceding successful action", () => {
    const context = new ConversationContext(6);
    context.remember("user", "Open or foreground Notepad++");
    context.remember("assistant", "Notepad++ is open and verified.");
    context.markPreparedApplication("Notepad++");

    expect(context.preferredApplicationFor("Now show me how to open a file")).toBe("Notepad++");
    expect(context.history()).toEqual([
      { role: "user", content: "Open or foreground Notepad++" },
      { role: "assistant", content: "Notepad++ is open and verified." },
    ]);
  });

  it("bounds retained messages and does not apply app context to unrelated requests", () => {
    const context = new ConversationContext(2);
    context.markPreparedApplication("Notepad++");
    context.remember("user", "first");
    context.remember("assistant", "second");
    context.remember("user", "third");

    expect(context.history()).toEqual([
      { role: "assistant", content: "second" },
      { role: "user", content: "third" },
    ]);
    expect(context.preferredApplicationFor("What time is it?")).toBeNull();
  });

  it("expires prepared-application identity with the bounded message window", () => {
    const context = new ConversationContext(2);
    context.markPreparedApplication("Notepad++");
    context.remember("user", "first unrelated turn");
    context.remember("assistant", "first unrelated answer");
    context.remember("user", "second unrelated turn");

    expect(context.preferredApplicationFor("Show me how to open a file")).toBeNull();
  });
});
