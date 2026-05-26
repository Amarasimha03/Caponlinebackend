const { execSync } = require('child_process');

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    // Return stderr if available, otherwise standard error message
    return { error: true, message: err.stderr || err.message };
  }
}

function syncRepo() {
  const statusRes = runCommand('git status --porcelain');
  if (statusRes.error) {
    console.error('❌ [GitSync Error] Could not check git status:', statusRes.message);
    return;
  }

  if (!statusRes) {
    // No changes found, skip
    return;
  }

  console.log('\n🔄 [GitSync] Changes detected:\n' + statusRes);

  // Parse changed files to generate a meaningful commit message
  const lines = statusRes.split('\n');
  const modifiedFiles = [];
  for (let line of lines) {
    // Extract file path from status output line
    const file = line.substring(3).trim();
    if (file) modifiedFiles.push(file);
  }

  let commitMessage = 'update: synchronized project files';
  if (modifiedFiles.length > 0) {
    const fileNames = modifiedFiles.map(f => f.split(/[/\\]/).pop());
    commitMessage = `fix/update: modified ${fileNames.slice(0, 3).join(', ')}${fileNames.length > 3 ? ' and other files' : ''}`;
  }

  console.log('🚀 [GitSync] Staging files (git add .)...');
  const addRes = runCommand('git add .');
  if (addRes.error) {
    console.error('❌ [GitSync Error] Git add failed:', addRes.message);
    return;
  }

  console.log(`📝 [GitSync] Committing changes: "${commitMessage}"...`);
  const commitRes = runCommand(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
  if (commitRes.error) {
    console.error('❌ [GitSync Error] Git commit failed:', commitRes.message);
    return;
  }

  console.log('📤 [GitSync] Pushing to remote (git push origin main)...');
  const pushRes = runCommand('git push origin main');
  if (pushRes.error) {
    console.error('❌ [GitSync Error] Git push failed:', pushRes.message);
    // If the push fails because the branch was modified on remote, notify
    if (pushRes.message.includes('rejected') || pushRes.message.includes('fetch first')) {
      console.warn('⚠️ [GitSync Warning] Push rejected. Retrying with force-push to align branches...');
      const forcePushRes = runCommand('git push origin main --force');
      if (forcePushRes.error) {
        console.error('❌ [GitSync Error] Force push failed:', forcePushRes.message);
      } else {
        console.log('✅ [GitSync] Force-push successful! Synced with GitHub remote.');
      }
    }
  } else {
    console.log('✅ [GitSync] Push successful! Repository fully synchronized with GitHub.');
  }
}

// Start interval watcher (every 5 seconds)
console.log('🔔 [GitSync] Auto Git Sync Watcher Active (checking for changes every 5 seconds)...');
syncRepo(); // Run immediately on start
setInterval(syncRepo, 5000);
