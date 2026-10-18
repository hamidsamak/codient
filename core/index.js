'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureDir, readFile } = require('./fileOps');
const { buildPrompt, collectFiles } = require('./prompt');
const { executeCommands } = require('./commands');
const { showHistory, rollbackFile } = require('./backup');
const {
  createContext, getPage, navigateAndCheckChat,
  sendPrompt, sendFollowUp, waitForGenerationDone,
  submitText, isGenerationDone, getLastResponseFingerprint,
} = require('./browser');
const { processResponse, analyzeLastResponse } = require('./responseProcessor');
const { MODEL_CONFIG, resolveTargetUrl } = require('./modelConfig');

const HOME_DIR = os.homedir();
const BASE_DIR = path.join(HOME_DIR, '.codient');

function dirs() {
  const backupDir = path.join(BASE_DIR, 'backups');
  const reportDir = path.join(BASE_DIR, 'reports');
  const profilesBaseDir = path.join(BASE_DIR, 'profiles');
  const debugDir = path.join(BASE_DIR, 'debug');
  [BASE_DIR, backupDir, reportDir, profilesBaseDir, debugDir].forEach(ensureDir);
  return { backupDir, reportDir, profilesBaseDir, debugDir };
}

function listProfiles(onLog = console.log) {
  const { profilesBaseDir } = dirs();
  if (!fs.existsSync(profilesBaseDir)) {
    onLog('\n❌ No profiles directory found. No profiles created yet.');
    return [];
  }
  const profiles = fs.readdirSync(profilesBaseDir)
    .filter((d) => fs.statSync(path.join(profilesBaseDir, d)).isDirectory())
    .sort();

  if (profiles.length === 0) {
    onLog('\n❌ No profiles found.');
    return [];
  }

  onLog(`\n👤 Available Chrome profiles (${profilesBaseDir}):`);
  onLog('='.repeat(50));
  profiles.forEach((p) => onLog(`  • ${p}`));
  onLog('='.repeat(50));
  return profiles;
}

async function defaultOpenReport(reportPath) {
  try {
    const open = require('open');
    await open(`file://${reportPath}`);
  } catch {
  }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


const RESUME_PROMPT = 'Your previous response was cut off before it was finished. Please send the complete response again from the beginning, following the original rules (a short explanation, then exactly one XML code block with all file changes, or a single <need_more_info> / <run_command> tag if you need more information).';

function isBrowserClosedError(e) {
  return /has been closed|Target (page|closed)|Browser closed|context or browser/i.test((e && e.message) || '');
}

function guessChatUrl(page, model) {
  try {
    const url = page.url() || '';
    const config = MODEL_CONFIG[model];
    const origin = new URL(config.url).origin;
    const clean = url.replace(/\/$/, '');
    const base = config.url.replace(/\/$/, '');
    if (!url.startsWith(origin)) return null;
    if (clean === base || clean === origin || clean.endsWith('/new')) return null;
    return url;
  } catch {
    return null;
  }
}

async function currentResponseHash(page, model) {
  try {
    const fp = await getLastResponseFingerprint(page, MODEL_CONFIG[model].response_selector);
    return fp[1];
  } catch {
    return null;
  }
}


async function waitDoneWithin(page, config, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await isGenerationDone(page, config)) return true;
    await sleep(1000);
  }
  return false;
}

async function runResponseLoop(page, model, opts) {
  const {
    overwrite, backupDir, reportDir, cwd, onLog, openReport, maxRounds,
    nonInteractive, resolveMissingFile, debug, debugDir,
  } = opts;

  let finalDiffs = [];
  let finalWritten = [];
  let finalReportPath = null;
  let finalExplanationHtml = '';

  for (let round = 0; round < maxRounds; round++) {
    const result = await processResponse(page, model, {
      overwrite, backupDir, reportDir, currentDir: cwd, onLog, openReport,
    });

    if (result === null) break;
    if (result.runCommands) {
      onLog(`\n🖥️  AI requested ${result.commands.length} read-only command(s) (round ${round + 1}):`);
      for (const c of result.commands) {
        if (c.reason) onLog(`   Reason: ${c.reason}`);

      }

      const outputs = await executeCommands(result.commands, cwd, { onLog });
      const pseudoFiles = outputs.map((o, i) => {
        const name = `command_output_${i + 1}.txt`;
        return [name, path.join(cwd, name), o.text];
      });

      const cmdFollowUpOk = await sendFollowUp(page, model, pseudoFiles, { debug, debugDir, missingFiles: [], onLog });
      if (!cmdFollowUpOk) break;
      continue;
    }

    if (!result.needMoreInfo) {
      finalDiffs = result.diffs || [];
      finalWritten = result.writtenFiles || [];
      finalReportPath = result.reportPath || null;
      finalExplanationHtml = result.explanationHtml || '';
      break;
    }

    const { reason, files: requestedFiles } = result;
    onLog(`\n🔍 AI needs more information (round ${round + 1}):`);
    onLog(`   Reason: ${reason}`);
    onLog(`   Requested files: ${requestedFiles.join(', ')}`);

    const extraFilesContent = [];
    const missingFiles = [];
    for (const reqFile of requestedFiles) {
      const filePath = path.join(cwd, reqFile);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        try {

          extraFilesContent.push([reqFile, filePath, readFile(filePath)]);
          onLog(`   ✅ Found: ${reqFile}`);
        } catch (e) {
          onLog(`   ❌ Could not read ${reqFile}: ${e.message}`);
        }
      } else {
        onLog(`   ⚠️  File not found: ${reqFile} — AI will create it`);
        missingFiles.push(reqFile);
        if (!nonInteractive && resolveMissingFile) {
          const userPath = await resolveMissingFile(reqFile);
          if (userPath && fs.existsSync(userPath) && fs.statSync(userPath).isFile()) {
            try {
              extraFilesContent.push([reqFile, userPath, readFile(userPath)]);
              missingFiles.pop();
              onLog(`   ✅ Loaded: ${userPath}`);
            } catch (e) {
              onLog(`   ❌ Could not read ${userPath}: ${e.message}`);
            }
          }
        }
      }
    }

    const followUpOk = await sendFollowUp(page, model, extraFilesContent, { debug, debugDir, missingFiles, onLog });
    if (!followUpOk) break;
  }

  return {
    diffs: finalDiffs,
    written: finalWritten,
    reportPath: finalReportPath,
    explanationHtml: finalExplanationHtml,

  };
}

async function resumeTask(options) {
  const {
    model = 'deepseek',
    profile = 'default',
    chatId = null,
    proxy = null,
    overwrite = true,
    skipHash = null,
    cwd = process.cwd(),
    nonInteractive = true,
    maxRounds = 10,
    onLog = () => {},
    openReport = defaultOpenReport,
  } = options;

  if (!chatId) {
    return { success: false, error: 'No saved chat ID for this model. Save or set a chat ID first.' };
  }

  const { backupDir, reportDir, profilesBaseDir, debugDir } = dirs();
  const profileDir = path.join(profilesBaseDir, profile);
  const config = MODEL_CONFIG[model];

  onLog(`\n↻ Resuming chat ${chatId} (profile: ${profile})`);


  const context = await createContext(profileDir, proxy, { onLog });
  const page = await getPage(context);

  try {
    const nav = await navigateAndCheckChat(page, model, chatId, onLog);
    if (!nav.valid) {
      return {
        success: false,
        error: `The saved chat could not be opened (${nav.invalidReason || 'unknown reason'}).`,
      };
    }

    onLog('⏳ Waiting for the AI to finish generating (if it is still running)...');
    const finished = await waitDoneWithin(page, config, 180000);
    if (!finished) onLog('⚠️ Could not confirm that generation finished — using the response as it is now');
    await sleep(1000);

    const analysis = await analyzeLastResponse(page, model);
    onLog(`🔎 Last response state: ${analysis.state}`);

    if (analysis.state === 'none') {
      return { success: false, error: 'No AI response was found in this chat.' };
    }

    if (analysis.state === 'files' && skipHash && analysis.hash === skipHash) {
      return { success: true, alreadyApplied: true };
    }

    if (analysis.state === 'incomplete') {
      onLog('✂️ The last response looks cut off — asking the AI to send it again in full');
      const sent = await submitText(page, model, RESUME_PROMPT, { onLog, label: 'Resume request' });
      if (!sent) {
        return { success: false, error: 'Could not send the resume request (send button not found).' };
      }
    } else {
      onLog('📥 Processing the last response from the chat');
    }

    const loop = await runResponseLoop(page, model, {
      overwrite, backupDir, reportDir, cwd, onLog, openReport, maxRounds,
      nonInteractive, resolveMissingFile: null, debug: false, debugDir,
    });
    const lastResponseHash = await currentResponseHash(page, model);

    return {
      success: true,
      resumedFrom: analysis.state,
      diffs: loop.diffs,
      writtenFiles: loop.written,
      reportPath: loop.reportPath,
      explanationHtml: loop.explanationHtml,
      lastResponseHash,
    };
  } catch (e) {
    onLog(`❌ Error: ${e.message}`);
    return { success: false, error: e.message, browserClosed: isBrowserClosedError(e) };
  } finally {
    await context.close();

    onLog('✅ Browser closed - Profile information saved');
  }
}

async function runTask(options) {
  const {
    question,
    files = [],
    contextFiles = [],
    overwrite = false,
    debug = false,
    proxy = null,
    model = 'deepseek',
    profile = 'default',
    chatId = null,
    fullContext = false,
    nonInteractive = false,
    cwd = process.cwd(),
    maxRounds = 10,
    onLog = () => {},
    openReport = defaultOpenReport,
    resolveMissingFile = null,
  } = options;

  const { backupDir, reportDir, profilesBaseDir, debugDir } = dirs();
  const profileDir = path.join(profilesBaseDir, profile);

  const validFiles = collectFiles(files, cwd, onLog);

  onLog(`\n📝 Your question: ${question}`);
  onLog(`👤 Profile: ${profile}`);
  if (chatId) onLog(`💬 Requested chat: ${chatId}`);
  onLog(validFiles.length ? `📁 Number of files: ${validFiles.length}` : '📁 No input files — AI will create new file(s) from scratch');
  if (debug) onLog('🐛 Debug mode is ENABLED - Saving prompt, input, and response HTML');

  const context = await createContext(profileDir, proxy, { onLog });
  const page = await getPage(context);

  const hadChatId = Boolean(chatId);
  let usedChatId = chatId;
  let chatResult = { newChatUrl: null, invalidReason: null };

  try {
    const nav = await navigateAndCheckChat(page, model, chatId, onLog);
    usedChatId = nav.valid ? nav.chatId : null;
    const isContinuingChat = nav.valid && !fullContext;
    const includeRules = !isContinuingChat;
    const includeContext = !isContinuingChat;
    chatResult.invalidReason = nav.invalidReason;

    if (chatId) {
      if (nav.valid) {
        onLog(isContinuingChat
          ? '📦 Skipping Rules + project structure/cwd (already known to this chat)'
          : '📦 --full-context set: resending Rules + project structure/cwd');
      } else {
        onLog('📦 Falling back to a new chat with full Rules + project structure/cwd');
      }
    }

    const fullQuestion = buildPrompt(question, contextFiles, validFiles, cwd, { includeRules, includeContext });

    const sendResult = await sendPrompt(page, model, fullQuestion, {
      debug, debugDir, chatId: nav.valid ? nav.chatId : null, onLog,
    });
    if (!sendResult.success) {
      return { success: false, chat: { hadChatId, newChatUrl: null, model, invalidReason: chatResult.invalidReason } };
    }
    chatResult.newChatUrl = sendResult.newChatUrl;

    const loop = await runResponseLoop(page, model, {
      overwrite, backupDir, reportDir, cwd, onLog, openReport, maxRounds,
      nonInteractive, resolveMissingFile, debug, debugDir,
    });
    const finalDiffs = loop.diffs;
    const finalWritten = loop.written;
    const finalReportPath = loop.reportPath;
    const finalExplanationHtml = loop.explanationHtml;
    const lastResponseHash = await currentResponseHash(page, model);

    onLog(`\n💾 Profile session saved in: ${profileDir}`);

    return {
      success: true,
      diffs: finalDiffs,
      writtenFiles: finalWritten,
      reportPath: finalReportPath,
      explanationHtml: finalExplanationHtml,
      lastResponseHash,
      chat: { hadChatId, newChatUrl: chatResult.newChatUrl, model, invalidReason: chatResult.invalidReason },

    };
  } catch (e) {
    onLog(`❌ Error: ${e.message}`);
    if (!usedChatId && !chatResult.newChatUrl) chatResult.newChatUrl = guessChatUrl(page, model);
    return {
      success: false,
      error: e.message,
      browserClosed: isBrowserClosedError(e),
      chat: { hadChatId, newChatUrl: chatResult.newChatUrl, model, invalidReason: chatResult.invalidReason },
    };
  } finally {
    await context.close();
    onLog('✅ Browser closed - Profile information saved');
  }
}

async function openBrowserSession({ model = 'deepseek', profile = 'default', proxy = null, chatId = null, onLog = () => {} } = {}) {
  const { profilesBaseDir } = dirs();
  const profileDir = path.join(profilesBaseDir, profile);

  onLog(`\n🌐 Starting browser in standalone mode (profile: ${profile})...`);
  onLog('📝 Please login and do whatever you need.');
  onLog('🔒 Session cookies will be saved.');
  onLog('❌ Close the browser window when you\'re done.\n');

  const context = await createContext(profileDir, proxy, { onLog });
  const page = await getPage(context);
  await page.goto(resolveTargetUrl(model, chatId), { waitUntil: 'domcontentloaded' });

  await new Promise((resolve) => {
    context.on('close', () => {
      onLog('\n✅ Browser closed. Session saved!');
      resolve();
    });
  });
}

module.exports = {
  MODEL_CONFIG,
  runTask,
  openBrowserSession,
  resumeTask,
  listProfiles,
  showHistory: (fileName, onLog) => showHistory(dirs().backupDir, fileName, onLog),
  rollbackFile: (fileName, cwd, timestamp, onLog) => rollbackFile(dirs().backupDir, fileName, cwd, timestamp, onLog),
};
