'use strict'

const execa = require('execa')
const fs = require('fs-extra')
const which = require('which')

async function isExecutable (command) {
  try {
    await fs.access(command, fs.constants.X_OK)

    return true
  } catch (/** @type {any} */ err) {
    if (err.code === 'ENOENT') {
      return isExecutable(await which(command))
    }

    if (err.code === 'EACCES') {
      return false
    }

    throw err
  }
}

async function waitForOutput (expectedOutput, command, args = [], opts = {}) {
  if (!await isExecutable(command)) {
    args.unshift(command)
    command = 'node'
  }

  const proc = execa(command, args, opts)
  let output = ''
  let time = 120000

  let timeout = setTimeout(() => {
    throw new Error(`Did not see "${expectedOutput}" in output from "${[command].concat(args).join(' ')}" after ${time/1000}s`)
  }, time)

  proc.all.on('data', (data) => {
    process.stdout.write(data)

    output += data.toString('utf8')

    if (output.includes(expectedOutput)) {
      clearTimeout(timeout)
      proc.kill()
    }
  })

  try {
    await proc
  } catch (/** @type {any} */ err) {
    if (!err.killed) {
      throw err
    }
  }
}

module.exports = {
  waitForOutput
}
