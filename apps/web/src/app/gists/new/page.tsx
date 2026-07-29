'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gistsApi } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewGistPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([{ filename: '', content: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addFile = () => {
    setFiles([...files, { filename: '', content: '' }]);
  };

  const removeFile = (index: number) => {
    if (files.length > 1) {
      setFiles(files.filter((_, i) => i !== index));
    }
  };

  const updateFile = (index: number, field: 'filename' | 'content', value: string) => {
    const newFiles = [...files];
    newFiles[index][field] = value;
    setFiles(newFiles);
  };

  const handleSubmit = async (isPublic: boolean) => {
    // Validate
    const validFiles = files.filter(f => f.content.trim() !== '');
    if (validFiles.length === 0) {
      toast.error('Gist must have at least one file with content');
      return;
    }
    
    // Auto-fill empty filenames
    const processedFiles = validFiles.map((f, i) => ({
      filename: f.filename.trim() || `gistfile${i + 1}.txt`,
      content: f.content
    }));

    setIsSubmitting(true);
    try {
      const res = await gistsApi.create({
        description,
        isPublic,
        files: processedFiles
      });
      toast.success('Gist created successfully');
      router.push(`/gists/${res.id || res._id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create gist');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-white">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-6">Create a new Gist</h1>
        
        <div className="mb-6">
          <input
            id="gist-description"
            type="text"
            placeholder="Gist description..."
            className="w-full px-4 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-6">
          {files.map((file, index) => (
            <div key={index} className="border rounded-md overflow-hidden dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-900 p-3 border-b dark:border-slate-700">
                <input
                  id={`filename-${index}`}
                  type="text"
                  placeholder={`Filename including extension...`}
                  className="px-3 py-1.5 border rounded dark:bg-slate-800 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-1/2 md:w-1/3 text-sm font-mono"
                  value={file.filename}
                  onChange={(e) => updateFile(index, 'filename', e.target.value)}
                />
                
                {files.length > 1 && (
                  <button
                    id={`remove-file-${index}`}
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <textarea
                id={`file-content-${index}`}
                placeholder="Enter file contents..."
                className="w-full h-64 p-4 font-mono text-sm dark:bg-slate-950 focus:outline-none"
                value={file.content}
                onChange={(e) => updateFile(index, 'content', e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <button
            id="add-file-btn"
            onClick={addFile}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors w-full md:w-auto justify-center"
          >
            <Plus className="h-4 w-4" />
            Add file
          </button>
          
          <div className="flex gap-4 w-full md:w-auto">
            <button
              id="create-secret-gist-btn"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="flex-1 md:flex-none px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md transition-colors disabled:opacity-50"
            >
              Create secret gist
            </button>
            <button
              id="create-public-gist-btn"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="flex-1 md:flex-none px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              Create public gist
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
