'use client';

import React, { useState } from 'react';

export default function OpmlUploadPage() {
  const [secret, setSecret] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !secret) {
      setStatus({ type: 'error', message: 'Please provide both a file and a secret key.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Uploading and parsing OPML...' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('secret', secret);

    try {
      const response = await fetch('/api/admin/opml', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to upload OPML' });
      } else {
        setStatus({ type: 'success', message: data.message || 'Successfully imported feeds!' });
        setFile(null);
        setSecret('');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Network error occurred.' });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm relative">
        {/* Glow effect */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">Import OPML Feeds</h1>
            <p className="text-neutral-400 text-sm">Upload a valid OPML file to expand the HopeScroll candidate pool.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="file" className="block text-sm font-medium text-neutral-300">
                OPML File
              </label>
              <input
                type="file"
                id="file"
                accept=".xml,.opml"
                onChange={handleFileChange}
                className="block w-full text-sm text-neutral-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-cyan-500/10 file:text-cyan-400
                  hover:file:bg-cyan-500/20
                  transition-colors cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="secret" className="block text-sm font-medium text-neutral-300">
                Admin Secret Key
              </label>
              <input
                type="password"
                id="secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter the secret key..."
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-neutral-600"
              />
            </div>

            {status.type !== 'idle' && (
              <div className={`p-4 rounded-xl text-sm ${
                status.type === 'loading' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={status.type === 'loading'}
              className="w-full bg-white text-neutral-950 font-semibold py-3 px-4 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status.type === 'loading' ? 'Uploading...' : 'Import Feeds'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
