# Aro First-Run & Onboarding Guide

Welcome to **Aro**! This guide walks you through setting up your first project and conducting your initial pair-programming session.

---

## 1. Quick Onboarding Strip
When you open Aro for the first time, you will see the **Get Aro Running** banner at the top of your workspace:
- **Runtime Check**: Aro verifies that a Python execution environment is reachable.
- **Provider Connection**: Click to connect your preferred LLM provider (or select a local model via Ollama).
- **Workspace Selection**: Open your project repository.

---

## 2. Configuring an LLM Provider
Aro supports standard cloud API providers as well as local models:
1. Open **Settings** (`Cmd/Ctrl+,`).
2. Go to **Model Providers**.
3. Select your provider:
   - **OpenAI**: Enter your OpenAI API key (`sk-...`).
   - **Anthropic**: Enter your Anthropic key (`sk-ant-...`).
   - **Google Gemini**: Enter your Gemini API key (`AIzaSy...`).
   - **Local / Ollama**: Select local runner with `http://localhost:11434`.
4. Your API keys are stored locally on your machine in `~/.aro/.env` with strict operating-system permissions (0600). They are never transmitted to any third party.

---

## 3. Creating or Opening a Workspace
1. In the sidebar, click the **+** button next to **Projects**.
2. Select **Choose a local folder** to pick an existing git repository or project directory on your drive.
3. Choose a color label and click **Create project**.
4. Aro inspects your repo's file structure and initializes an offline index.

---

## 4. Your First Task
1. Type a natural language task into the chat composer:
   ```
   "Review this repository and explain the main entry points."
   ```
2. Press **Enter** to submit.
3. Observe Aro's real-time streaming response, tool timeline, and visual file previews.
4. If Aro proposes modifying files, you can inspect each change using the **Diff Review** tab before approving.
