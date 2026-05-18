import { DIFFICULTIES, LANGUAGES, type Difficulty, type TargetLanguage } from '../types';

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
  return `You are a ${native} language tutor. A learner role-played as "${speaker}" and attempted the target line below. Compare the target with the learner's spoken transcript (from speech-to-text) and evaluate pronunciation and accuracy.

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
- The transcript is your only window into the learner's pronunciation. Word swaps, omissions, additions, or scrambled order should be flagged as "Pronunciation" or "Vocabulary".
- If the learner said something entirely different but contextually appropriate, flag "Content drift" and note that the alternative is acceptable.
- Be specific. 1–3 issues maximum. Respond in English.
- When quoting ${native}, use the original script (no romanization, no translation).

[Output: JSON only. No code fences, no commentary.]
{
  "ok": true or false (true if pronunciation and content are both broadly acceptable),
  "score": integer 0–100,
  "summary": "1–2 sentence overall comment in English",
  "issues": [
    { "kind": "Pronunciation | Vocabulary | Grammar | Omission | Addition | Content drift", "detail": "concise English explanation" }
  ],
  "suggestion": "one-line tip for next time, in English"
}`;
};
