# Fix "EMFILE: too many open files" Error

This error occurs because macOS has a limit on how many files can be watched simultaneously.

## Quick Fix (Temporary - Current Terminal Session)

Run this command in your terminal before starting Expo:

```bash
ulimit -n 4096
```

Then start Expo again:
```bash
npm start
```

## Permanent Fix

Add this to your `~/.zshrc` file (since you're using zsh):

```bash
# Increase file limit for development
ulimit -n 4096
```

Then reload your shell:
```bash
source ~/.zshrc
```

Or restart your terminal.

## Alternative: Use Watchman (Recommended)

Install Watchman (Facebook's file watching service):

```bash
brew install watchman
```

Watchman is more efficient than the default file watcher and handles large projects better.

## Verify the Fix

Check your current limit:
```bash
ulimit -n
```

It should show 4096 or higher.

## If Still Having Issues

1. Close other applications that might be watching files
2. Restart your computer
3. Try using Watchman (see above)
4. Exclude more directories in `.watchmanconfig` if needed

