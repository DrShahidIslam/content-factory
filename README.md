# 🎬 Content Factory - AI Video Automation

**Content Factory** is a "Zero-Cost" local video automation pipeline designed to turn raw assets (Images, Videos, Script) into polished, high-retention short-form content.

It runs entirely on your local machine using **Next.js**, **Remotion**, and **Edge TTS**, offering a "Premium" video editing experience without the subscription fees of cloud tools.

## ✨ Features

### 🧠 Core Engine
-   **Local File System API**: Directly scans your folders for content. No uploads required.
-   **Smart Sequencer**: Automatically sorts and stitches `1.png`, `2.mp4` into a coherent timeline.
-   **Hybrid Pacing Engine**: The "Magic" algorithm.
    -   If *Audio > Video*: Slows down visuals to fill the gap.
    -   If *Video > Audio*: Speeds up video playback to match the voiceover perfectly.

### 🎨 Creative Suite
-   **AI Voiceovers**: Generates natural-sounding speech using Microsoft Edge Neural Voices (Christopher, Aria, Guy, etc.) for free.
-   **Perfect Sync Captions**: Uses hidden timing metadata from the TTS engine to display frame-perfect animated subtitles.
-   **Smart SFX**: 
    -   Auto-injects "Whooshes" at transitions.
    -   Scans your script for keywords (e.g., "Generic Horror") and layers matching sound effects automatically.
-   **Visual Polish**: Cinematic Color Grading and "Alive" Beat Pulse animation.

### 🛠️ Tech Stack
-   **Framework**: Next.js 14 (App Router)
-   **Video Engine**: Remotion
-   **Styling**: Tailwind CSS (Glassmorphic Dark UI)
-   **TTS**: `node-edge-tts` (Offline/Free Neural Voices)

## 🚀 Getting Started

### Prerequisites
-   Node.js 18+ installed.
-   Windows (Optimized for Windows Explorer file paths).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/content-factory.git
    cd content-factory
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

1.  **Prepare Your Content Folder**:
    Create a folder anywhere on your PC (e.g., `C:\MyVideos\Project1`) and add:
    -   `script.txt`: The text for the voiceover.
    -   `1.png`, `2.mp4`, `3.jpg`: Your visual assets in order.

2.  **Load Project**:
    -   Open the App.
    -   Paste your folder path or Project ID into the input.
    -   Click **Load**.

3.  **Generate Voice & Captions**:
    -   Open **Settings**.
    -   Select a Speaker (e.g., Christopher).
    -   Click **Generate / Update Voice**. This creates `voiceover.mp3` and `subtitles.json`.

4.  **Render**:
    -   Preview the video in the player.
    -   Click the **Render Video** button.
    -   The final `final_video.mp4` will be saved directly to your project folder.

## 👨‍💻 Developer

Developed by **[Dr. Shahid Islam](https://www.linkedin.com/in/dr-shahid-islam/)**.

Built to demonstrate the power of **Agentic AI** coding workflows.

## 📄 License

MIT License. Feel free to use and modify!
