import { DIFFICULTIES, LANGUAGES, type Difficulty, type Message, type TargetLanguage } from "../types";

function nativeName(lang: TargetLanguage): string {
  return LANGUAGES[lang].nativeName;
}

export const DIALOGUE_PROMPT = (
  situation: string,
  lang: TargetLanguage,
  difficulty: Difficulty
) => {
  const native = nativeName(lang);
  const diff = DIFFICULTIES[difficulty];
  return `You are a language tutor creating practice material for learners studying ${native}. Output everything in English (UI text, translations, role names, titles) except the ${native} dialogue itself.

[Situation]
${situation}

[Difficulty]
${diff.label} — ${diff.hint}

[Goal]
Produce a natural ${native} dialogue that the learner can read aloud, listen to, and use to practice vocabulary substitution to broaden their range in the target language.

[Requirements]
1. Two characters. Produce 6–10 exchanges (12–16 total lines).
2. Each line's "template" must embed {0} {1} {2} placeholders for swappable words/phrases. Number them starting at 0 within each line.
3. Each line has 1–3 placeholders, placed on the highest-value swap points (nouns, adjectives, short verb phrases, times, places, etc.).
4. Each placeholder gets 8–12 "alternatives" — varied vocabulary that fits the slot grammatically and contextually without changing the scene.
5. The "original" and "alternatives" must share part of speech and be drop-in interchangeable.
6. "translation" is the full English translation of the line with the original words inserted.
7. "speaker" is a short English role name suitable for the situation (e.g., "Barista", "Customer", "Interviewer", "Candidate", "Friend A", "Friend B").
8. "title" is a short English title for the dialogue (3–8 words).

[Difficulty calibration]
- Beginner: short common phrases, mostly present tense, A1–A2 vocabulary.
- Intermediate: natural phrasing, common idioms, mixed tenses, B1 vocabulary.
- Advanced: idiomatic phrasing, longer sentences with subordinate clauses, register awareness, B2–C1 vocabulary.
- Expert: native-fluent, slang or specialized jargon where appropriate, nuanced register shifts, complex syntactic constructions.
Aim the entire dialogue (vocabulary, sentence length, idiomaticity, syntactic complexity) at the requested level.

[Output: JSON only. No code fences, no commentary.]
{
  "title": "Short English title",
  "lines": [
    {
      "speaker": "Role name in English",
      "template": "Line in ${native} with {0} placeholders for swappable parts.",
      "translation": "Full English translation with original words inserted.",
      "slots": [
        {
          "original": "The ${native} word/phrase that fills {0}",
          "translation": "English translation of original",
          "alternatives": [
            { "text": "alternative 1 in ${native}", "translation": "English translation" },
            { "text": "alternative 2 in ${native}", "translation": "English translation" }
          ]
        }
      ]
    }
  ]
}`;
};

export const EVAL_PROMPT = (
  lang: TargetLanguage,
  speaker: string,
  expectedText: string,
  expectedTranslation: string,
  userTranscript: string,
  situation: string
) => {
  const native = nativeName(lang);
  return `You are a ${native} language tutor. A learner role-played as "${speaker}" and attempted the target line below. Compare the target with the learner's spoken transcript (from speech-to-text) AND independently audit the learner's utterance for any grammar, vocabulary, or usage errors of its own.

[Situation]
${situation}

[Target line (${native})]
${expectedText}

[Target line (English)]
${expectedTranslation}

[Learner's utterance (speech-to-text in ${native})]
${userTranscript}

[Guidelines]
- Ignore minor typos, punctuation, and case differences.
- The transcript is your only window into the learner's pronunciation. Word swaps, omissions, additions, or scrambled order vs. the target should be flagged as "Pronunciation" or "Vocabulary".
- ALSO check the learner's utterance on its own merits. Even if the learner said something different from the target but contextually appropriate, flag any standalone grammar, conjugation, agreement, article, preposition, word-order, or natural-usage errors as "Grammar" or "Usage" — do not let "Content drift" hide a broken sentence.
- If the learner's utterance contains any error you flagged, set "corrected" to the fully fixed ${native} version of what they said (keep their intended meaning and register; do not snap it back to the target line). If their utterance is already grammatical and natural, set "corrected" to null.
- Be specific. 1–4 issues maximum. Respond in English.
- When quoting ${native}, use the original script (no romanization, no translation).

[Output: JSON only. No code fences, no commentary.]
{
  "ok": true or false (true if pronunciation, content, and standalone grammar are all broadly acceptable),
  "score": integer 0–100,
  "summary": "1–2 sentence overall comment in English",
  "issues": [
    { "kind": "Pronunciation | Vocabulary | Grammar | Usage | Omission | Addition | Content drift", "detail": "concise English explanation, quote the offending ${native} phrase when helpful" }
  ],
  "corrected": "Corrected ${native} version of the learner's utterance, or null",
  "suggestion": "one-line tip for next time, in English"
}`;
};

// ---------------------------------------------------------------------------
// Chat-mode prompts (legacy roleplay chat). English UI; all translations are English.
// ---------------------------------------------------------------------------

function langLabel(lang: TargetLanguage): string {
  return LANGUAGES[lang].label;
}

function formatHistory(history: Message[]): string {
  if (history.length === 0) return '(no messages yet)';
  return history
    .map((m) => {
      const who = m.role === 'ai' ? 'AI' : 'User';
      const trans = m.translation ? ` (English: ${m.translation})` : '';
      return `${who}: ${m.text}${trans}`;
    })
    .join('\n');
}

export const OUTLINE_PROMPT = (situation: string, lang: TargetLanguage) => `You are a language-learning material designer. Draft a 4–6 step outline (in English) for a ${langLabel(lang)} conversation practice based on the situation below.

[Situation]
${situation}

Each step should briefly describe who does what (e.g. "Barista greets and asks for the order", "Customer asks about the menu").

[Output: JSON only.]
{ "outline": ["Step 1 description", "Step 2 description", ...] }`;

export const FIRST_TURN_PROMPT = (
  situation: string,
  outline: string[],
  lang: TargetLanguage
) => `You are the learner's conversation partner. Start the roleplay in ${nativeName(lang)}.

[Situation (English)]
${situation}

[Outline]
${outline.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Speak first, as the AI character. Keep it short and natural (1–2 sentences).

[Output: JSON only.]
{ "text": "Your line in ${nativeName(lang)}", "translation": "English translation" }`;

export const NEXT_TURN_PROMPT = (
  situation: string,
  outline: string[],
  lang: TargetLanguage,
  history: Message[]
) => `You are the learner's conversation partner. Continue the ${nativeName(lang)} roleplay.

[Situation (English)]
${situation}

[Outline]
${outline.map((s, i) => `${i + 1}. ${s}`).join('\n')}

[History]
${formatHistory(history)}

Reply to the user's last message in 1–2 natural ${nativeName(lang)} sentences, following the outline.

[Output: JSON only.]
{ "text": "Your line in ${nativeName(lang)}", "translation": "English translation" }`;

export const HELP_PROMPT = (
  situation: string,
  outline: string[],
  lang: TargetLanguage,
  history: Message[]
) => `You are a language tutor. The learner is unsure what to say next.

[Situation]
${situation}

[Outline]
${outline.map((s, i) => `${i + 1}. ${s}`).join('\n')}

[History]
${formatHistory(history)}

Produce 1–2 ${nativeName(lang)} sample lines the learner could say next, with English translations and a short English explanation (what they're trying to do, register tips, common pitfalls).

[Output: JSON only.]
{
  "suggestions": [{ "text": "${nativeName(lang)} sample line", "translation": "English translation" }],
  "explanation": "English explanation"
}`;

export const QUESTION_PROMPT = (
  lang: TargetLanguage,
  history: Message[],
  targetMessage: Message,
  question: string
) => `You are a language tutor. The learner asked a question about an AI line.

[History]
${formatHistory(history)}

[AI line in question]
${targetMessage.text} (${nativeName(lang)})
English: ${targetMessage.translation ?? '(not provided)'}

[Learner's question]
${question}

Answer clearly in English. Touch on grammar, vocabulary, or cultural background as needed.

[Output: JSON only.]
{ "answer": "English answer" }`;

export const CHECK_PROMPT = (
  lang: TargetLanguage,
  history: Message[],
  userText: string
) => `You are a ${nativeName(lang)} tutor. Check the learner's utterance for grammar, usage, and naturalness.

[Recent history]
${formatHistory(history.slice(-6))}

[Learner's utterance]
${userText}

Rules:
- Ignore minor typos and punctuation.
- If grammatical and natural in context, mark ok=true.
- Otherwise, list concrete issues in English and offer a more natural ${nativeName(lang)} version.

[Output: JSON only.]
{
  "ok": true or false,
  "issues": ["Issue 1 in English", "Issue 2 in English", ...],
  "improved": "More natural ${nativeName(lang)} version (omit if ok)",
  "comment": "1–2 sentence English comment for the learner"
}`;

export const VOCAB_PROMPT = (lang: TargetLanguage, situation: string, history: Message[]) => `You are a language-learning editor. Extract 5–15 high-value phrases or vocabulary items from the ${nativeName(lang)} conversation below.

[Situation]
${situation}

[Conversation]
${formatHistory(history)}

Selection criteria:
- Prefer fixed expressions and phrases that transfer to other situations.
- Useful collocations and vocabulary for the learner.
- Skip very basic items (hello, yes, no).

[Output: JSON only.]
{
  "items": [
    {
      "phrase": "${nativeName(lang)} phrase",
      "meaningEn": "English meaning",
      "example": "Usage example in ${nativeName(lang)} (from the chat or applied to a new context)"
    }
  ]
}`;
