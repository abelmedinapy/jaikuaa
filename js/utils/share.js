// Canvas-based PNG export for sharing a card. 1080x1080.
import { CATEGORY_HEX, CATEGORY_LABEL } from '../data.js';

const W = 1080, H = 1080;
const BG = '#14141C';
const FG = '#F5F1E8';
const FG2 = '#9C968B';
const FG3 = '#5C5850';

async function ensureFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('500 80px "Cormorant Garamond"'),
      document.fonts.load('italic 500 40px "Cormorant Garamond"'),
      document.fonts.load('400 28px "Inter"'),
      document.fonts.load('500 22px "JetBrains Mono"'),
    ]);
  } catch {}
}

// Wrap text by measuring; returns array of lines.
function wrap(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLines(ctx, lines, x, y, lineHeight, max = Infinity) {
  const shown = lines.slice(0, max);
  if (lines.length > max) shown[max - 1] = shown[max - 1].replace(/[.,;:!? ]*$/, '') + '…';
  for (let i = 0; i < shown.length; i++) {
    ctx.fillText(shown[i], x, y + i * lineHeight);
  }
  return shown.length * lineHeight;
}

export async function renderCardToCanvas(entry, canvas = document.createElement('canvas')) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await ensureFonts();

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Category accent stripe (left)
  const cat = entry.category;
  const accent = CATEGORY_HEX[cat] || '#3D3D4A';
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 8, H);

  // Big background initial letter
  const initial = (entry.title || '·').trim()[0];
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = accent;
  ctx.font = 'italic 500 540px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(initial, 56, 24);
  ctx.restore();

  const padX = 88;
  const innerW = W - padX * 2;

  // Top metadata
  ctx.fillStyle = accent;
  ctx.font = '500 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const topLabel = (CATEGORY_LABEL[cat] || cat).toUpperCase() + ' · ' + (entry.subcategory_label || entry.subcategory || '').toUpperCase();
  ctx.fillText(topLabel, padX, 88);
  if (entry.tier === 'A') {
    ctx.fillStyle = '#FFC72C';
    ctx.textAlign = 'right';
    ctx.fillText('★ DESTACADO', W - padX, 88);
    ctx.textAlign = 'left';
  }

  // Title (auto-shrink if too long)
  let titleSize = 96;
  const title = entry.title + (entry.year ? '  ·  ' + entry.year : '');
  const isGuarani = cat === 'idioma';
  const titlePrefix = isGuarani ? 'italic 500 ' : '500 ';
  while (titleSize > 48) {
    ctx.font = titlePrefix + titleSize + 'px "Cormorant Garamond", Georgia, serif';
    const lines = wrap(ctx, title, innerW);
    if (lines.length <= 3) break;
    titleSize -= 6;
  }
  ctx.font = titlePrefix + titleSize + 'px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = FG;
  const titleLines = wrap(ctx, title, innerW).slice(0, 3);
  let y = 168;
  const titleLH = titleSize * 1.08;
  drawLines(ctx, titleLines, padX, y, titleLH);
  y += titleLines.length * titleLH + 12;

  // Subtitle
  if (entry.subtitle) {
    ctx.font = 'italic 500 38px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = FG2;
    const subLines = wrap(ctx, entry.subtitle, innerW).slice(0, 2);
    drawLines(ctx, subLines, padX, y, 46);
    y += subLines.length * 46 + 24;
  } else {
    y += 12;
  }

  // Body
  if (entry.body) {
    ctx.font = '400 28px "Inter", sans-serif';
    ctx.fillStyle = FG;
    const bodyLines = wrap(ctx, entry.body, innerW);
    const maxLines = Math.floor((H - y - 220) / 42);
    drawLines(ctx, bodyLines, padX, y, 42, Math.max(1, maxLines));
  }

  // Footer separator
  ctx.strokeStyle = '#2A2A35';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, H - 168);
  ctx.lineTo(W - padX, H - 168);
  ctx.stroke();

  // Source
  if (entry.source) {
    ctx.font = '400 20px "JetBrains Mono", monospace';
    ctx.fillStyle = FG3;
    const srcLines = wrap(ctx, entry.source, innerW - 240).slice(0, 2);
    drawLines(ctx, srcLines, padX, H - 140, 28);
  }

  // Watermark "Jaikuaa"
  ctx.font = 'italic 500 44px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = FG;
  ctx.textAlign = 'right';
  ctx.fillText('Jaikuaa', W - padX, H - 116);
  ctx.font = '400 16px "JetBrains Mono", monospace';
  ctx.fillStyle = FG3;
  ctx.fillText('jaikuaa.ampost.pro', W - padX, H - 76);

  return canvas;
}

export async function shareCard(entry) {
  const cardUrl = `${location.origin}${location.pathname}#/card/${entry.id}`;
  const canvas = await renderCardToCanvas(entry);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png', 0.95));
  const safeTitle = (entry.title || 'jaikuaa').replace(/[^\w\-]+/g, '_').slice(0, 40);
  const fileName = `jaikuaa-${safeTitle}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  const text = `${entry.title}${entry.subtitle ? ' — ' + entry.subtitle : ''} · Jaikuaa`;

  // Mobile: native share with file + URL (apps like WA, Telegram show both)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], url: cardUrl, title: entry.title, text });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'aborted';
    }
  }

  // Desktop fallback: copy link AND download PNG
  let linkCopied = false;
  try {
    await navigator.clipboard.writeText(cardUrl);
    linkCopied = true;
  } catch {}
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return linkCopied ? 'link-and-png' : 'downloaded';
}
