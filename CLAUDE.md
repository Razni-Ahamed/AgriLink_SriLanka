# Instructions for Claude in this repository

These rules apply to every Claude session here, local or in the cloud.

## Commits and pull requests: no AI attribution

This is a student team project, and each member's commits must show as their own work. GitHub
lists anyone named in a commit, as author or co-author, among the repository's contributors.

- **Author every commit as the repository owner**, never as Claude:
  - Name: `Razni Ahamed`
  - Email: `235862364+Razni-Ahamed@users.noreply.github.com`
- Before the first commit in a session, run `git config user.name` and `git config user.email`.
  If they name Claude or `noreply@anthropic.com` (cloud sessions often start that way), set them
  for this repository first:

  ```sh
  git config user.name "Razni Ahamed"
  git config user.email "235862364+Razni-Ahamed@users.noreply.github.com"
  ```

- **No `Co-Authored-By:` trailer** naming Claude or Anthropic in any commit message.
- **No "Generated with Claude Code" line**, or any other mention of Claude or AI, in commit
  messages, pull request titles or pull request descriptions.
- **Name branches after the work** (for example `feature/sms-alerts` or `fix/deploy-script`), not
  `claude/...`, because branch names end up in merge commit messages.
- Before pushing, check that nothing slipped through:

  ```sh
  git log origin/main..HEAD --format='%an <%ae>%n%cn <%ce>%n%b' | grep -iE 'claude|anthropic'
  ```

  This must print nothing. If it prints anything, fix the commits before pushing.
