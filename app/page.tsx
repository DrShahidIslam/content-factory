'use client';

import { useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import { MainVideo } from '../remotion/MainVideo';
import { ProjectData } from '../remotion/types';
import { fetchProjectData } from '../remotion/lib/api-client';
import { Play, Video, Settings, Wand2, Download, RefreshCw, FolderOpen } from 'lucide-react';

export default function Home() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectId, setProjectId] = useState('demo-test'); // Default to demo
  const [projectPathInput, setProjectPathInput] = useState('demo-test'); // Input state
  const [loading, setLoading] = useState(true);
  const [durationInFrames, setDurationInFrames] = useState(300);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'horror' | 'exciting' | 'happy'>('default');
  const [selectedVoice, setSelectedVoice] = useState('en-US-ChristopherNeural');

  const VOICES = [
    { id: 'en-US-ChristopherNeural', name: 'Christopher (Male, Formal)', gender: 'Male' },
    { id: 'en-US-GuyNeural', name: 'Guy (Male, Casual)', gender: 'Male' },
    { id: 'en-US-AriaNeural', name: 'Aria (Female, Formal)', gender: 'Female' },
    { id: 'en-US-JennyNeural', name: 'Jenny (Female, Casual)', gender: 'Female' },
    { id: 'en-GB-RyanNeural', name: 'Ryan (British, Male)', gender: 'Male' },
  ];

  // Render State
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  // --- Persistence ---
  useEffect(() => {
    // On Mount: Load persistence logic
    const savedPath = localStorage.getItem('lastProjectPath');
    const initialPath = savedPath || 'demo-test';

    // Set initial state
    setProjectId(initialPath);
    setProjectPathInput(initialPath);

    // Trigger load
    loadProjectInternal(initialPath);
  }, []);

  const loadProjectInternal = async (id: string, isManual = false) => {
    setLoading(true);
    try {
      if (isManual) {
        localStorage.setItem('lastProjectPath', id);
      }

      const data = await fetchProjectData(id);

      // Sync local state if first load
      if (selectedTheme === 'default' && data.theme) {
        setSelectedTheme(data.theme);
      }
      setProject(data);

      // Setup simple duration calculation
      let totalDuration = 0;
      data.assets.forEach(a => {
        totalDuration += (a.durationInSeconds || data.defaultImageDuration);
      });
      setDurationInFrames(Math.max(30, Math.round(totalDuration * data.fps)));
    } catch (err) {
      console.error(err);
      alert("Failed to load project: " + err);
    } finally {
      setLoading(false);
    }
  };

  // Manual VO Generation Trigger
  const handleGenerateVO = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-vo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || projectPathInput,
          voice: selectedVoice
        })
      });
      const json = await res.json();
      if (json.success) {
        alert('Voiceover Generated! Reloading...');
        // Reload project to pick up new file
        loadProjectInternal(projectId || projectPathInput);
      } else {
        alert("Failed: " + json.error);
      }
    } catch (e) {
      alert("Error generating VO");
    } finally {
      setLoading(false);
    }
  };

  // Wrapper for manual trigger
  const handleLoadClick = () => {
    setProjectId(projectPathInput);
    loadProjectInternal(projectPathInput, true);
  };

  const handleRender = async () => {
    setIsRendering(true);
    setRenderProgress(0);

    // Start Polling
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/render/status');
        const status = await res.json();
        if (status.progress) setRenderProgress(status.progress);
        if (status.status === 'done' || status.status === 'error') {
          clearInterval(pollInterval);
        }
      } catch (e) { }
    }, 1000);

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, // This is now the value from input (can be path or ID)
          theme: selectedTheme,
          aspectRatio
        })
      });
      const json = await res.json();
      clearInterval(pollInterval); // Stop polling
      setRenderProgress(100);

      if (json.success) {
        alert(`Render Complete! Video saved to: ${json.path}`);
      } else {
        alert(`Render failed: ${json.error}\nDetails: ${json.stderr || json.details}`);
      }
    } catch (e) {
      clearInterval(pollInterval);
      alert('Render error: See console');
      console.error(e);
    }
    setIsRendering(false);
  };



  // Preview dimensions based on Aspect Ratio
  const playerWidth = 360;
  const playerHeight = aspectRatio === '9:16' ? 640 : 202; // 16:9 roughly scaled width
  const compositionWidth = aspectRatio === '9:16' ? 1080 : 1920;
  const compositionHeight = aspectRatio === '9:16' ? 1920 : 1080;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Content Factory
          </h1>
          <p className="text-gray-400 mt-2">AI-Powered Video Automation</p>
        </div>

        {/* Project Selector */}
        <div className="flex gap-2">
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden focus-within:border-purple-500 transition-all">
            <input
              type="text"
              value={projectPathInput}
              onChange={(e) => setProjectPathInput(e.target.value)}
              placeholder="Project ID or Full Path..."
              className="bg-transparent px-4 py-2 w-64 text-sm outline-none"
            />
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/system/pick-folder', { method: 'POST' });
                  const json = await res.json();
                  if (json.path) setProjectPathInput(json.path);
                } catch (e) { console.error(e); }
              }}
              className="px-3 py-2 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border-l border-white/10"
              title="Browse Folder"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleLoadClick}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Load
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-purple-300">System Ready</span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Project & Assets */}
        <section className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-400" />
              Active Project
            </h2>

            <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-4">
              <div className="text-sm text-gray-400 uppercase tracking-wider text-[10px] mb-1">Project Name</div>
              <div className="text-xl font-medium">{projectId}</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400 px-1">
                <span>Assets Found</span>
                <span>{project?.assets.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400 px-1">
                <span>Smart SFX Cues</span>
                <span>{project?.sfxCues?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 h-[400px] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">Asset Timeline</h2>
            <div className="space-y-3">
              {project ? project.assets.map((asset, i) => (
                <div key={i} className="group flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-purple-500/30">
                  <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center text-xs font-bold text-purple-300">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-gray-200">{asset.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{asset.type} • {asset.durationInSeconds || project.defaultImageDuration}s</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-10">Loading assets...</div>
              )}
            </div>
          </div>
        </section>

        {/* Center: Preview Player */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-panel p-1 flex items-center justify-center bg-black/40 aspect-video lg:aspect-auto lg:h-[600px] relative overflow-hidden group">

            {loading ? (
              <div className="text-purple-400 animate-pulse">Initializing Engine...</div>
            ) : project ? (
              <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/5">
                <Player
                  component={MainVideo}
                  inputProps={{
                    projectData: {
                      ...project,
                      theme: selectedTheme // Pass Theme Override
                    }
                  }}
                  durationInFrames={durationInFrames}
                  fps={30}
                  compositionWidth={compositionWidth}
                  compositionHeight={compositionHeight}
                  numberOfSharedAudioTags={20} // Allow more concurrent SFX
                  style={{
                    width: `${playerWidth}px`,
                    height: `${aspectRatio === '9:16' ? '640px' : '203px'}`, // Adjust player size
                  }}
                  controls
                  autoPlay={false}
                  loop
                />
              </div>
            ) : (
              <div className="text-red-400">Failed to load project</div>
            )}

            {/* Floating Action Buttons */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-4 translate-y-20 group-hover:translate-y-0 transition-transform duration-300">
              <button className="p-4 bg-white text-black rounded-full shadow-lg hover:bg-gray-200 hover:scale-110 transition-all">
                <Download className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="glass-button p-4 rounded-xl flex items-center justify-center gap-3 text-purple-300 border-purple-500/30"
            >
              <Settings className="w-5 h-5" />
              <span>Open Settings</span>
            </button>
            <button
              onClick={handleRender}
              disabled={isRendering}
              className="glass-button p-4 rounded-xl flex items-center justify-center gap-3 text-green-300 border-green-500/30 bg-green-500/5 hover:bg-green-500/20 disabled:opacity-50 relative overflow-hidden"
            >
              {/* Progress Bar Background */}
              {isRendering && (
                <div
                  className="absolute left-0 top-0 bottom-0 bg-green-500/20 transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              )}

              <Download className="w-5 h-5 z-10" />
              <span className="z-10">
                Dr. Shahid Islam
              </a>
            </p>
          </footer>

          {/* Settings Modal */}
          {
            isSettingsOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="glass-panel p-8 w-full max-w-md space-y-6 relative">
                  <h2 className="text-2xl font-bold">Project Settings</h2>

                  {/* Aspect Ratio */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setAspectRatio('9:16')}
                        className={`p-3 rounded-lg border ${aspectRatio === '9:16' ? 'bg-purple-600 border-purple-500' : 'border-white/10 hover:bg-white/5'}`}
                      >
                        Mobile (9:16)
                      </button>
                      <button
                        onClick={() => setAspectRatio('16:9')}
                        className={`p-3 rounded-lg border ${aspectRatio === '16:9' ? 'bg-purple-600 border-purple-500' : 'border-white/10 hover:bg-white/5'}`}
                      >
                        Cinema (16:9)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Theme (Auto-detected from Script)</label>
                    <select
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value as any)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-3 outline-none focus:border-purple-500"
                    >
                      <option value="default">Default / Mixed</option>
                      <option value="horror">Horror (Slow Fades)</option>
                      <option value="exciting">Action (Fast Cuts)</option>
                      <option value="happy">Happy (Bright)</option>
                    </select>
                  </div>

                  {/* Voice Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Narrator Voice</label>
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 mb-2"
                    >
                      {VOICES.map(v => (
                        <option key={v.id} value={v.id} className="bg-gray-900">
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleGenerateVO}
                      disabled={loading}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Wand2 size={16} />
                      Generate / Update Voice
                    </button>
                  </div>

                  <div className="pt-4 flex justify-end gap-4">
                    <button
                      onClick={() => setIsSettingsOpen(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        </div >
        );
}
