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
// Chat-mode prompts (legacy roleplay chat). Japanese for now.
// ---------------------------------------------------------------------------


function langName(lang: TargetLanguage): string {
  return LANGUAGES[lang].label;
}

function formatHistory(history: Message[]): string {
  if (history.length === 0) return '（まだ会話はありません）';
  return history
    .map((m) => {
      const who = m.role === 'ai' ? 'AI' : 'ユーザー';
      const trans = m.translation ? `（日本語: ${m.translation}）` : '';
      return `${who}: ${m.text}${trans}`;
    })
    .join('\n');
}

export const OUTLINE_PROMPT = (situation: string, lang: TargetLanguage) => `あなたは語学学習教材の作成者です。以下のシチュエーションでの${langName(lang)}会話練習の流れを、4〜6個のステップに分けて日本語で出力してください。

【シチュエーション】
${situation}

各ステップは、誰が何をするか（例：「店員が挨拶し、注文を尋ねる」「客がメニューについて質問する」など）が分かるように簡潔に書いてください。
JSON形式で出力してください：
{
  "outline": ["ステップ1の説明", "ステップ2の説明", ...]
}`;

export const FIRST_TURN_PROMPT = (
  situation: string,
  outline: string[],
  lang: TargetLanguage
) => `あなたは語学学習者の会話練習相手です。以下の設定で、${nativeName(lang)}でロールプレイを開始してください。

【シチュエーション（日本語）】
${situation}

【会話の流れ】
${outline.map((s, i) => `${i + 1}. ${s}`).join('\n')}

あなたはユーザー（学習者）の会話相手として、まず最初の発話をしてください。短く自然な発話（1〜2文）にしてください。
JSON形式で出力してください：
{
  "text": "${nativeName(lang)}での発話",
  "translation": "日本語訳"
}`;

export const NEXT_TURN_PROMPT = (
  situation: string,
  outline: string[],
  lang: TargetLanguage,
  history: Message[]
) => `あなたは語学学習者の会話練習相手です。${nativeName(lang)}でロールプレイを続けてください。

【シチュエーション（日本語）】
${situation}

【会話の流れ】
${outline.map((s, i) => `${i + 1}. ${s}`).join('\n')}

【これまでの会話】
${formatHistory(history)}

ユーザーの直前の発話に対して、自然な応答を${nativeName(lang)}で1〜2文返してください。会話の流れに沿って進めてください。
JSON形式で出力してください：
{
  "text": "${nativeName(lang)}での発話",
  "translation": "日本語訳"
}`;

export const HELP_PROMPT = (
  situation: string,
  outline: string[],
  lang: TargetLanguage,
  history: Message[]
) => `あなたは語学学習のアドバイザーです。学習者が次に何と言えばよいか分からない状況です。

【シチュエーション】
${situation}

【会話の流れ】
${outline.map((s, i) => `${i + 1}. ${s}`).join('\n')}

【これまでの会話】
${formatHistory(history)}

学習者が次に言うべき内容について、${nativeName(lang)}での例文を1〜2つと、その日本語訳、使い方や注意点の解説を日本語で出力してください。
JSON形式で出力してください：
{
  "suggestions": [
    { "text": "例文（${nativeName(lang)}）", "translation": "日本語訳" }
  ],
  "explanation": "日本語での解説（場面で言うべき内容、表現のポイント、注意点）"
}`;

export const QUESTION_PROMPT = (
  lang: TargetLanguage,
  history: Message[],
  targetMessage: Message,
  question: string
) => `あなたは語学学習のサポート役です。学習者がAIの発話について質問しています。

【会話履歴】
${formatHistory(history)}

【質問対象のAI発話】
${targetMessage.text}（${nativeName(lang)}）
日本語訳: ${targetMessage.translation ?? '（未取得）'}

【学習者の質問（日本語）】
${question}

質問に対して、日本語で丁寧に分かりやすく回答してください。文法・語彙・文化的背景など、必要に応じて触れてください。
JSON形式で出力してください：
{
  "answer": "日本語での回答"
}`;

export const CHECK_PROMPT = (
  lang: TargetLanguage,
  history: Message[],
  userText: string
) => `あなたは${nativeName(lang)}の語学講師です。学習者の発話に、文法的・語法的・自然さの観点で問題がないか確認してください。

【会話の流れ（直近の履歴）】
${formatHistory(history.slice(-6))}

【学習者の発話】
${userText}

判定基準：
- 軽微なタイポや句読点は無視してください。
- 文法的に正しく、その場面で自然であればOKとしてください。
- 問題がある場合は、何が問題かを日本語で具体的に指摘し、より自然な表現を提示してください。

JSON形式で出力してください：
{
  "ok": true または false,
  "issues": ["問題点1（日本語）", "問題点2（日本語）", ...],
  "improved": "より自然な${nativeName(lang)}での言い方（問題がない場合は省略可）",
  "comment": "学習者へのコメント（日本語、1〜2文）"
}`;

export const VOCAB_PROMPT = (lang: TargetLanguage, situation: string, history: Message[]) => `あなたは語学学習教材の編集者です。以下の${nativeName(lang)}会話練習から、学習価値の高いフレーズや語彙を5〜15個抽出してください。

【シチュエーション】
${situation}

【会話】
${formatHistory(history)}

抽出基準：
- 場面で使える定型表現や応用が利く表現を優先
- 学習者にとって役立つ語彙・コロケーション
- 過度に簡単なもの（hello, yes, no など）は除外

JSON形式で出力してください：
{
  "items": [
    {
      "phrase": "${nativeName(lang)}でのフレーズ",
      "meaning_ja": "日本語訳",
      "example": "実際の使用例（${nativeName(lang)}、会話中の例または応用例）"
    }
  ]
}`;
