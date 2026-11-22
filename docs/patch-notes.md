# Patch Notes Generation Guide

This guide explains how to generate standardized patch notes for Novyse.

To get title + body of every commit:

> ```bash
> git log [HASH]^..HEAD --reverse --pretty="%s%n%b%n" > commit
> ```

## LLM Prompt for Patch Notes Generation

Use the following prompt template in an AI assistant to generate patch notes from a list of commits.

> You are an assistant specialized in generating software release patch notes.
>
> I will provide you with:
>
> - The Version and Version Name (format: `Novyse [VERSION] - [VERSION NAME]`)
> - A list of Git commits
>
> Please generate the patch notes in English using the following instructions:
>
> 1. Use the version and version name as the main title of the document: `# Novyse [VERSION] - [VERSION NAME]`
> 2. Generate all the patch notes in English.
> 3. The main sections must ALWAYS be present in the output as second-level headings (`##`):
>    - `## Features`
>    - `## Bug Fixes`
>    - `## Improvements`
>    - `## Known Issues`
>
>    If a main section has no changes or updates, keep the heading in the output but leave its content empty.
>
> 4. Under each main section, group the changes strictly into the following predefined, unique sub-categories:
>    - Chat
>    - Notification
>    - Security
>    - Database
>    - UI/UX
>    - Distribution
>    - Initialization
>    - API
>    - Miscellaneous
>    - Comms
>    - Messages
>    - Authentication
>    - Settings
>    - Desktop
>    - Bot
>    - AI
>    - Self-hosting
>    - Plugin
> 5. If there are no changes for a specific sub-category under a main section, leave it empty (do not include that sub-category subheading in the output).
>
> Format of the output:
>
> ```markdown
> # Novyse [VERSION] - [VERSION NAME]
>
> ## Features
>
> ### [Sub-Category Name]
>
> - **[Component/Feature]:** Description of the change or fix.
> - **[Component/Feature]:** Description of another change or fix.
>
> ## Bug Fixes
>
> ### [Sub-Category Name]
>
> - **[Component/Feature]:** Description of the fix.
>
> ## Improvements
>
> ### [Sub-Category Name]
>
> - **[Component/Feature]:** Description of the improvement.
>
> ## Known Issues
> ```
>
> ---
>
> Here are the version details:
>
> `Novyse [VERSION] - [VERSION NAME]`
>
> Here are the git commits:
>
> `[INSERT GIT COMMITS HERE]`
