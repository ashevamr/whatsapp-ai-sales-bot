# 🤖 VODEL AI Sales Bot - Core Architecture

This is the central system architecture note for **Akbota** (AI Sales Manager for VODEL water filters in Kazakhstan).

## 🚀 Key Modules
- [[AI Workflow Engine]] - Powers the Gemini 3.1 Flash-Lite decision engine with zero latency.
- [[WhatsApp Server & Real-Time Vision]] - Manages WhatsApp connections, LID resolution, & instant Kaspi receipt OCR verification.
- [[Database & System Rules]] - Master knowledge base and strict Kazakh sales regulations.
- [[Web Dashboard]] - Live control room interface on Port 8888.

## 📱 Dual-Phone Setup
- **Phone A (Sales Agent)**: Handles customer messages automatically 24/7.
- **Phone B (Supervisor Alert)**: Receives instant WhatsApp sales summaries upon order completion.
