export const CONTENT = {
  inApp: {
    message: "For smoother typing and playback, open this in your browser.",
    openLabel: "Open in browser",
    dismissLabel: "Not now",
    fallbackMessage: "If it stays here, tap the menu and choose Open in browser.",
  },
  lock: {
    eyebrow: "A private little garden",
    title: "Before we begin",
    passwordLabel: "Password",
    passwordPlaceholder: "i know u know it, yeish",
    submitLabel: "Enter softly",
    defaultHint: "Hint: one of your cat names.",
    wrongHints: ["Maybe the other one.", "Try the other one.", "Hint: your playlist name."],
  },
  player: {
    eyebrow: "Tonight",
    title: "Do I Wanna Know?",
    artist: "Hozier",
    statusIdle: "Tap play whenever you want.",
    statusRetryTap: "Tap again to play.",
    statusAutoplayBlocked: "Playback was blocked by this browser. Tap play once more.",
    stateIdle: "Ready",
  },
  welcome: {
    eyebrow: "A quiet little place made only for you",
    title: "Hi, Yeshie",
    lede: "Take your time exploring this little website. No rush, just go at your own pace.",
    beginLabel: "Begin gently",
  },
  reveal: {
    line: "Before I ask anything, I wanted this to feel a little more special.",
  },
  keepsake: {
    eyebrow: "Something honest, opened carefully",
    hint: "open the note",
  },
  note: {
    eyebrow: "For you, quietly",
    body: "I have genuinely been enjoying our conversations. There is something easy and meaningful about talking with you, and I wanted to be honest about that.",
  },
  collage: {
    cards: [
      {
        tag: "late-night feeling",
        note: "04:20:00. Those long Discord calls are something I genuinely enjoy.",
      },
      {
        tag: "small detail",
        note: "I remember the Lily. It is a small detail to some, but a priority to me. I built this whole environment around it because I know it is your favorite.",
      },
      {
        tag: "held gently",
        note: "No noise, just clarity. I build systems every day, but I am realizing some connections are better built by hand. This is me being intentional.",
      },
    ],
  },
  question: {
    eyebrow: "This is all I wanted to ask",
    lines: [
      "I've really liked talking to you, and I've been enjoying this a lot.",
      "I've been thinking about it, and I wanted to ask honestly:",
      "do you feel like we're getting to know each other in the same direction?",
      "No pressure at all, I just value honesty.",
    ],
  },
  response: {
    options: [
      {
        title: "Yes, I feel it too",
        followup: "That means a lot. I would like to keep this honest, gentle, and real.",
        endingKey: "positive",
      },
      {
        title: "I want to keep getting to know you more",
        followup: "That feels good to hear. We can let it unfold at a pace that feels right.",
        endingKey: "positive",
      },
      {
        title: "I am not sure yet",
        followup: "That is completely okay. I would rather have honesty than a rushed answer.",
        endingKey: "uncertain",
      },
      {
        title: "Let us talk about it honestly",
        followup: "I would really value that. A real conversation matters more than guessing.",
        endingKey: "honest",
      },
    ],
    defaultEcho: "Whatever you feel, I want it to be honest and easy to say.",
  },
  final: {
    line: "Thank you for taking your time here. No pressure at all, honesty is more than enough for me.",
    variants: {
      positive:
        "Thank you for meeting me here, Yeshie. I'd really like to keep getting to know you, slowly and sincerely.",
      uncertain: "Thank you for being honest, Yeshie. No pressure at all, we can take this gently.",
      honest: "I appreciate that, Yeshie. Let's talk openly and keep it simple, clear, and real.",
    },
  },
};

export function applyContent(dom) {
  setTextById("lock-card-eyebrow", CONTENT.lock.eyebrow);
  setTextById("lock-card-title", CONTENT.lock.title);
  setTextById("lock-password-label", CONTENT.lock.passwordLabel);
  setInputPlaceholderById("password-input", CONTENT.lock.passwordPlaceholder);
  setTextById("lock-submit-button", CONTENT.lock.submitLabel);
  setTextById("lock-message", CONTENT.lock.defaultHint);
  setTextById("inapp-prompt-text", CONTENT.inApp.message);
  setTextById("inapp-open-button", CONTENT.inApp.openLabel);
  setTextById("inapp-dismiss-button", CONTENT.inApp.dismissLabel);

  setTextById("music-eyebrow", CONTENT.player.eyebrow);
  setTextById("music-title", CONTENT.player.title);
  setTextById("music-artist", CONTENT.player.artist);
  setTextById("audio-status", CONTENT.player.statusIdle);
  setTextById("music-state", CONTENT.player.stateIdle);

  setTextById("welcome-eyebrow", CONTENT.welcome.eyebrow);
  setTextById("welcome-title", CONTENT.welcome.title);
  setTextById("welcome-lede", CONTENT.welcome.lede);
  setTextById("begin-button", CONTENT.welcome.beginLabel);

  setTextById("reveal-line", CONTENT.reveal.line);
  setTextById("keepsake-eyebrow", CONTENT.keepsake.eyebrow);
  setTextById("keepsake-hint", CONTENT.keepsake.hint);
  setTextById("note-eyebrow", CONTENT.note.eyebrow);
  setTextById("note-body", CONTENT.note.body);

  CONTENT.collage.cards.forEach((card, index) => {
    const cardNumber = index + 1;
    setTextById(`memory-tag-${cardNumber}`, card.tag);
    setTextById(`memory-note-${cardNumber}`, card.note);
  });

  setTextById("question-eyebrow", CONTENT.question.eyebrow);
  CONTENT.question.lines.forEach((line, index) => {
    setTextById(`question-line-${index + 1}`, line);
  });

  CONTENT.response.options.forEach((option, index) => {
    const card = dom.responseCards[index];
    if (!card) return;
    card.dataset.followup = option.followup;
    card.dataset.endingKey = option.endingKey || "";
    const title = card.querySelector(".response-card__title");
    if (title) {
      title.textContent = option.title;
    }
  });
  setTextById("response-echo", CONTENT.response.defaultEcho);
  setTextById("final-line", CONTENT.final.line);
}

function setTextById(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = value;
}

function setInputPlaceholderById(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  node.setAttribute("placeholder", value);
}
