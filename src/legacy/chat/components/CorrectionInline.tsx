import type { Correction } from '../../../types';

export function CorrectionInline({ correction }: { correction: Correction }) {
  return (
    <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 max-w-xs sm:max-w-md">
      <div className="font-semibold mb-1">添削（日本語）</div>
      {correction.issues.length > 0 && (
        <ul className="list-disc pl-4 space-y-0.5">
          {correction.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
      {correction.improved && (
        <div className="mt-1.5">
          <span className="font-semibold">より自然な表現：</span>
          <div className="font-mono text-[13px]">{correction.improved}</div>
        </div>
      )}
      {correction.comment && <div className="mt-1">{correction.comment}</div>}
    </div>
  );
}
