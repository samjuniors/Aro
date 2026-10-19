import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const exe = path.resolve('apps/desktop/release/win-unpacked/Aro.exe')
if (!fs.existsSync(exe)) {
  console.error(`Binary not found: ${exe}`)
  process.exit(1)
}

const stats = fs.statSync(exe)
console.log(`Package verification target: ${exe}`)
console.log(`Binary size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`)

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aro-verify-pack-'))
const homeDir = path.join(tmpDir, 'aro-home')
fs.mkdirSync(homeDir, { recursive: true })

const proc = spawn(exe, [], {
  env: {
    ...process.env,
    HERMES_HOME: homeDir,
    ELECTRON_ENABLE_LOGGING: '1'
  },
  windowsHide: true
})

console.log(`Packaged Aro.exe launched with PID: ${proc.pid}`)

await new Promise(resolve => setTimeout(resolve, 4000))

const isRunning = proc.exitCode === null
console.log(`Execution status after 4s: ${isRunning ? 'RUNNING (healthy)' : `EXITED (${proc.exitCode})`}`)

if (!isRunning && proc.exitCode !== 0) {
  console.error('Launch failed unexpectedly.')
  process.exit(1)
}

// Clean termination
proc.kill('SIGTERM')
await new Promise(resolve => setTimeout(resolve, 1000))
try {
  proc.kill('SIGKILL')
} catch {}

// Inspect generated files
const logDir = path.join(homeDir, 'logs')
let logsCreated = []
if (fs.existsSync(logDir)) {
  logsCreated = fs.readdirSync(logDir)
  console.log(`Log files generated in sandbox home: ${logsCreated.join(', ')}`)
} else {
  console.log('Sandbox home initialized.')
}

try {
  fs.rmSync(tmpDir, { recursive: true, force: true })
} catch {}

console.log('Artifact launch verification PASSED.')
