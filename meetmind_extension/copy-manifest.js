import fs from 'fs'
import path from 'path'

const distDir = path.resolve('dist')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

fs.copyFileSync('manifest.json', path.join(distDir, 'manifest.json'))

const srcIconsDir = path.resolve('icons')
const distIconsDir = path.join(distDir, 'icons')

if (fs.existsSync(srcIconsDir)) {
  if (!fs.existsSync(distIconsDir)) {
    fs.mkdirSync(distIconsDir, { recursive: true })
  }
  const files = fs.readdirSync(srcIconsDir)
  for (const file of files) {
    fs.copyFileSync(path.join(srcIconsDir, file), path.join(distIconsDir, file))
  }
}

console.log('Successfully copied manifest.json and icons to dist/')
