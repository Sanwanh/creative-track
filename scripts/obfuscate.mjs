// build 後處理:對 dist 內「自家程式碼」的 JS 做強混淆。
// vendor-*.js(React 等第三方)維持原樣 —— 混淆它只會肥大、拖慢、且無祕密可保護。
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import JavaScriptObfuscator from 'javascript-obfuscator'

const DIR = 'dist/assets'

const OPTIONS = {
  compact: true,
  simplify: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  numbersToExpressions: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false, // 與打包輸出共存,避免改到全域名稱
  stringArray: true,
  stringArrayThreshold: 1,
  stringArrayEncoding: ['base64'],
  stringArrayCallsTransform: true,
  stringArrayWrappersType: 'function',
  splitStrings: true,
  splitStringsChunkLength: 6,
  transformObjectKeys: true,
  selfDefending: true,
  disableConsoleOutput: true,
}

if (!existsSync(DIR)) {
  console.error(`找不到 ${DIR},請先執行 vite build`)
  process.exit(1)
}

// 自家程式碼 = dist/assets 內、檔名非 vendor 開頭的 .js
const targets = readdirSync(DIR).filter((f) => f.endsWith('.js') && !/^vendor[-.]/.test(f))
if (targets.length === 0) {
  console.error('找不到要混淆的自家 JS(dist/assets 內沒有非 vendor 的 .js)')
  process.exit(1)
}

for (const file of targets) {
  const path = join(DIR, file)
  const src = readFileSync(path, 'utf8')
  const out = JavaScriptObfuscator.obfuscate(src, OPTIONS).getObfuscatedCode()
  writeFileSync(path, out)
  console.log(`混淆 ${file}: ${src.length} → ${out.length} bytes`)
}
console.log(`✓ 混淆完成(共 ${targets.length} 個檔;vendor 第三方維持原樣)`)
