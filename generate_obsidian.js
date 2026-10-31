const fs = require('fs');
const path = require('path');

const obsDir = path.join(__dirname, 'obsidian');
if (!fs.existsSync(obsDir)) {
  fs.mkdirSync(obsDir, { recursive: true });
}

// 1. Core Bot Architecture Note
const archNote = `# 🤖 VODEL AI Sales Bot - Core Architecture

This is the system architecture of **Akbota** (AI Sales Manager for VODEL water filters in Kazakhstan).

## 🚀 Key Modules
- [[AI Workflow Engine]] - Powers the Gemini 3.1 Flash-Lite decision engine with zero latency.
- [[WhatsApp Server & Real-Time Vision]] - Manages connection to WhatsApp, LID account resolution, & instant Kaspi receipt OCR verification.
- [[Database & System Rules]] - The master knowledge base and strict Kazakh sales regulations.
- [[Web Dashboard]] - Live control room interface on Port 8888.

## 📱 Dual-Phone Setup
- **Phone A (Sales Agent)**: Handles customer messages automatically 24/7.
- **Phone B (Supervisor Alert)**: Receives instant WhatsApp sales summaries upon order completion.
`;
fs.writeFileSync(path.join(obsDir, 'System Architecture.md'), archNote, 'utf8');

// 2. AI Workflow Engine Note
const workflowNote = `# 🧠 AI Workflow Engine & Objection Intelligence

The engine relies on \`gemini-3.1-flash-lite\` for instant responses with zero hallucination, supported by \`gemini-1.5-flash\` for audio transcription and receipt OCR.

## 📋 Core Responsibilities & Sales Objections
- **"Too Expensive" Objection (10-Year Savings Math)**: Explains that tank filters cost 450,000 KZT over 10 years (tank replacements + annual cartridges), whereas FOURA costs only 105,000 KZT (cartridges replaced once every 3 years!).
- **"Free Gifts" Objection**: Explains customs, taxes, and factory assembly logic. Cheap filters under 100k KZT or free gifts indicate fakes or non-moving inventory.
- **Tourmaline Alkaline Water Lore**: Explains how FOURA was created by South Koreans for South Koreans to balance acid-heavy diets and alcohol, featuring genuine Tourmaline ionization.
- **Kaspi Prepayments & BIN 900614450722**: Real-time receipt verification for BIN 900614450722 across 10k, 20k, 109k, 119k, 129k, 185k, 195k, and 205k KZT.

## 🛑 Forbidden Behaviors
- No parentheses \`(...)\` in messages.
- No repeating sentences.
- No fake discounts or custom negotiations.
`;
fs.writeFileSync(path.join(obsDir, 'AI Workflow Engine.md'), workflowNote, 'utf8');

// 3. Products Note
const productsNote = `# 📦 Product Catalog & Pricing Matrix

## 1. FOURA Flagship (Direct-Flow ⚡)
- **Type**: Direct-Flow (Tankless, 16cm width).
- **Origin**: 100% South Korea.
- **Speed**: 600 GPD (2200 L/day).
- **Price**: 185,000 KZT (Warehouse cities) / 195,000 KZT (Remote villages +10k) / 205,000 KZT (>20km distant intercity villages +20k).
- **Features**: TDS water quality screen, auto self-cleaning, anti-leak sensor, Tourmaline alkaline tap.

## 2. Alkaline G75 (Tank System 🛢️)
- **Type**: 8-Liter Storage Tank.
- **Speed**: 75 GPD (280 L/day).
- **Price**: 109,000 KZT (Warehouse cities) / 119,000 KZT (Remote villages +10k) / 129,000 KZT (>20km distant intercity villages +20k).
- **Water Types**: Dual tap (Mineralized & Alkaline).

## 🏦 Bank Installment Terms
- **Kaspi 0-0-12**: Strictly 12 Months (~15,400 KZT/mo for FOURA).
- **Halyk / Freedom 0-0-24**: Strictly 24 Months (~7,700 KZT/mo for FOURA).
`;
fs.writeFileSync(path.join(obsDir, 'Product Catalog.md'), productsNote, 'utf8');

// 4. Interaction Flows Note
const flowsNote = `# 💬 Customer Interaction Flows & Logistics Scenarios

## 📍 Logistics Matrix & Prepayment Triggers
- **Warehouse Cities (Astana, Almaty, Shymkent, Atyrau)**: Free delivery & installation day-in-day out. Zero deposit required.
- **Intercity Regions**: Requires 10,000 KZT deposit via link https://pay.kaspi.kz/pay/cvwpa52v upon checkout.
- **Remote Villages (>20km away)**: Calculates +10k technician travel fee or +20k total double surcharges for distant intercity suburbs.
`;
fs.writeFileSync(path.join(obsDir, 'Customer Interaction Flows.md'), flowsNote, 'utf8');

console.log('✅ Built standalone Obsidian Vault in /obsidian');
