export function downloadBookPreviewCard({ id, title, text }: { id: string; title: string; text: string }) {
  const cardText = text.trim();
  if (!cardText) return;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#f4efe5";
  context.fillRect(0, 0, 1080, 1350);
  context.fillStyle = "#1b1a18";
  context.fillRect(70, 70, 940, 1210);
  context.fillStyle = "#f4efe5";
  context.textBaseline = "top";
  context.font = "600 28px Arial, sans-serif";
  context.fillText("ДМИТРИЙ СЛИНЬКОВ", 130, 130);
  context.font = "600 34px Arial, sans-serif";
  context.fillText("ПОГОВОРИМ БЕЗ СЛАЙДОВ", 130, 190);
  context.fillStyle = "#ffffff";
  const maxWidth = 820;
  let fontSize = 42;
  let lines: string[] = [];
  const maxHeight = 850;
  while (fontSize >= 12) {
    context.font = `${fontSize}px Georgia, serif`;
    lines = [];
    let line = "";
    for (const word of cardText.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length * Math.round(fontSize * 1.4) <= maxHeight) break;
    fontSize -= 2;
  }
  const lineHeight = Math.round(fontSize * 1.4);
  const top = Math.max(310, Math.round((1100 - lines.length * lineHeight) / 2));
  lines.forEach((value, index) => context.fillText(value, 130, top + index * lineHeight));
  context.fillStyle = "#c9c0b2";
  context.font = "26px Arial, sans-serif";
  context.fillText(title, 130, 1160);
  context.fillText("soloten.com/ru/books", 130, 1210);

  const anchor = document.createElement("a");
  anchor.download = `pogovorim-${id}.png`;
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}
