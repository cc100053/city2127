import type { Decision, SurveyView } from "../state/surveyView.ts";

const AXIS_LABELS: Readonly<Record<string, string>> = {
  automation: "自動化",
  publicSharing: "公共共有",
  environmentalPriority: "環境優先",
  urbanConcentration: "都市集約",
};

function policyText(decision: Decision): string {
  const parts = Object.entries(decision.policyChange).map(
    ([axis, delta]) => `${AXIS_LABELS[axis] ?? axis} ${delta > 0 ? "↑" : "↓"} ${delta > 0 ? "+" : ""}${delta}`,
  );
  return parts.join("　") || "変化なし";
}

function cityText(decision: Decision): string {
  return decision.cityChanges.map((change) => `${change.socketId.toUpperCase()} ${change.label}`).join("　") || "見た目の変化なし";
}

function row(label: string, value: string): HTMLElement {
  const element = document.createElement("div");
  element.className = "causal-row";
  const term = document.createElement("span");
  term.className = "causal-term";
  term.textContent = label;
  const text = document.createElement("span");
  text.textContent = value;
  element.append(term, text);
  return element;
}

/** Exhibition overlay: latest choice → policy change → city effect, plus the run's short history. */
export class CausalPanel {
  private readonly latest = document.createElement("section");
  private readonly history = document.createElement("ol");
  private readonly status = document.createElement("p");

  constructor(container: HTMLElement) {
    container.hidden = false;
    const title = document.createElement("h1");
    title.textContent = "2127 — 選択が都市を変える";
    const historyTitle = document.createElement("h2");
    historyTitle.textContent = "これまでの決定";
    this.status.className = "causal-status";
    container.replaceChildren(title, this.latest, historyTitle, this.history, this.status);
  }

  setStatus(text: string): void {
    this.status.textContent = `サーバー: ${text}`;
  }

  render(view: SurveyView): void {
    const last = view.history.at(-1);
    if (!last) {
      const empty = document.createElement("p");
      empty.textContent = "まだ決定はありません。最初のゲストの選択を待っています。";
      this.latest.replaceChildren(empty);
    } else {
      const context = document.createElement("p");
      context.className = "causal-context";
      context.textContent = `${last.year ?? ""} ${last.pressure ?? ""} — ${last.questionText}`;
      this.latest.replaceChildren(
        context,
        row("CHOICE", last.optionLabel),
        row("POLICY", policyText(last)),
        row("CITY EFFECT", cityText(last)),
      );
    }
    this.history.replaceChildren(
      ...view.history.map((decision) => {
        const item = document.createElement("li");
        item.textContent = `${decision.pressure ?? decision.questionText} → ${decision.optionLabel} → ${cityText(decision)}`;
        return item;
      }),
    );
  }
}
