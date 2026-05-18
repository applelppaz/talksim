import { LANGUAGES, type TargetLanguage } from '../types';

function nativeName(lang: TargetLanguage): string {
  return LANGUAGES[lang].nativeName;
}

export const DIALOGUE_PROMPT = (situation: string, lang: TargetLanguage) => {
  const native = nativeName(lang);
  return `あなたは語学教材の作成者です。日本人学習者向けに、${native}の会話例とその語彙入れ替え候補を作成してください。

【シチュエーション（日本語）】
${situation}

【目的】
- 学習者がこの会話を音読・聴解することで、${native}のリスニング・スピーキング・語彙力を高められるようにします。
- セリフの一部の単語やフレーズを入れ替えることで、別の場面でも使い回せる「定型文」として学習できるようにします。

【要件】
1. 2人の登場人物による自然で実用的な${native}の会話を、6〜10往復（合計のセリフ数で12〜16行程度）で作成してください。
2. 各セリフの「テンプレート」には、入れ替え可能な単語/フレーズを {0} {1} {2} の形のプレースホルダで埋め込んでください。プレースホルダ番号はそのセリフ内で 0 から連番で振ってください。
3. 各セリフに 1〜3 個のプレースホルダを設定してください。プレースホルダは、別の場面でも応用が利きそうな「入れ替え価値の高い」箇所に置いてください（名詞・形容詞・短い動詞句・時刻・地名 など）。
4. 各プレースホルダに対して、入れ替え候補（alternatives）を 8〜12 個用意してください。シーンの文脈を変えずに自然に挿入できる、語彙力が広がる多彩な候補にしてください。
5. 元の語（original）と alternatives は意味・品詞が同類で、文法的にもそのまま挿入できる形にしてください。
6. translation は、元の語を当てはめた状態のセリフ全体の自然な日本語訳にしてください。
7. speaker は、シチュエーションに即した日本語の役柄名（例：「店員」「客」「面接官」「応募者」「友人A」「友人B」など）にしてください。
8. title は、この会話の短い日本語タイトル（10〜20字程度）にしてください。

【出力形式】
以下のJSON形式のみを出力してください。コードブロック記号や説明文は含めないでください。

{
  "title": "短い日本語タイトル",
  "lines": [
    {
      "speaker": "話者名（日本語）",
      "template": "${native}のセリフ。入れ替え可能な部分は {0} などのプレースホルダにする。",
      "translation": "元の語を当てはめた状態の日本語訳",
      "slots": [
        {
          "original": "{0} に入る元の${native}の語/フレーズ",
          "translation": "originalの日本語訳",
          "alternatives": [
            { "text": "候補1（${native}）", "translation": "候補1の日本語訳" },
            { "text": "候補2（${native}）", "translation": "候補2の日本語訳" }
          ]
        }
      ]
    }
  ]
}`;
};
