// generate-icons.js
// 外部ライブラリ不要で16x16, 48x48, 128x128の綺麗なPNGアイコンを生成するスクリプト
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawPixel) {
  // RGBA buffer
  const rowSize = width * 4 + 1; // 1 byte for filter type 0
  const buffer = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    buffer[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixel(x, y, width, height);
      buffer[pxOffset] = r;
      buffer[pxOffset + 1] = g;
      buffer[pxOffset + 2] = b;
      buffer[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(buffer);

  // PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    const fullData = Buffer.concat([typeBuf, data]);
    const crc = crc32(fullData);
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, fullData, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// デザイン関数: ドパミン遮断シールド ＆ スクロール禁止マーク
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w / 2;

  const dx = x - cx + 0.5;
  const dy = y - cy + 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // 外枠外は透明（丸みのある角または円形アイコン）
  const cornerR = w * 0.22;
  const boxX = Math.max(0, Math.abs(dx) - (w / 2 - cornerR));
  const boxY = Math.max(0, Math.abs(dy) - (h / 2 - cornerR));
  const boxDist = Math.sqrt(boxX * boxX + boxY * boxY);

  if (boxDist > cornerR) {
    return [0, 0, 0, 0];
  }

  // 背景: ダークサイバーグラデーション (#0e0e14 -> #1f1b2e)
  const gradY = y / h;
  const bgR = Math.round(14 + gradY * 18);
  const bgG = Math.round(14 + gradY * 14);
  const bgB = Math.round(22 + gradY * 26);

  // 内側のシールド／禁止リング
  // 中央に下向き矢印 ↓ と、それを突き破る禁止スラッシュ ⃠
  const normX = dx / (w * 0.42);
  const normY = dy / (h * 0.42);
  const ringDist = Math.sqrt(normX * normX + normY * normY);

  // 赤・ネオンピンクのアクセント
  // 外枠の光沢リング
  if (ringDist > 0.88 && ringDist < 1.05) {
    const alpha = ringDist > 1.0 ? Math.round((1.05 - ringDist) / 0.05 * 255) : 255;
    return [255, 45, 85, alpha]; // ネオンレッド
  }

  // 禁止スラッシュ (対角線)
  const lineDist = Math.abs(dx + dy) / Math.SQRT2;
  const slashWidth = Math.max(1.2, w * 0.09);
  const isInsideRing = ringDist <= 0.95;

  if (isInsideRing && lineDist < slashWidth) {
    return [255, 59, 48, 255]; // 禁止レッド
  }

  // 下向き矢印の描画
  // 幹: |dx| < stemWidth, dy from -w*0.25 to 0
  const stemWidth = Math.max(1, w * 0.07);
  const arrowHeadW = w * 0.22;
  const isStem = Math.abs(dx) <= stemWidth && dy >= -h * 0.25 && dy <= h * 0.05;

  // 鏃: 逆三角形
  const arrowTipY = h * 0.22;
  const arrowBaseY = 0;
  const inHead = dy >= arrowBaseY && dy <= arrowTipY &&
                 Math.abs(dx) <= (arrowHeadW * (1 - (dy - arrowBaseY) / (arrowTipY - arrowBaseY)));

  if (isStem || inHead) {
    // 矢印はシアン・ホワイト (#00e5ff ~ #ffffff)
    return [0, 229, 255, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngData = createPNG(size, size, drawIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), pngData);
  console.log(`Generated icon${size}.png (${pngData.length} bytes)`);
});

