'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Camera, Loader2, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    name: '',
    bio: '',
    website: '',
    location: '',
    twitterHandle: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        bio: user.bio || '',
        website: user.website || '',
        location: user.location || '',
        twitterHandle: user.twitterHandle || '',
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = await authApi.updateMe(form);
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const updatedUser = await authApi.uploadAvatar(file);
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Avatar updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!user) return null;

  const avatarUrl = user.avatarUrl 
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${user.avatarUrl}`)
    : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Public Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage how your profile appears to other users.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-8">
        <div className="p-6 border-b border-slate-100 flex items-start gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                user.username[0].toUpperCase()
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleAvatarUpload}
            />
          </div>
          
          <div className="pt-2">
            <h3 className="text-base font-semibold text-slate-900">Profile Picture</h3>
            <p className="text-sm text-slate-500 mt-1 mb-3">Upload a picture to make your profile stand out. JPG, GIF or PNG. Max 5MB.</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-secondary text-sm py-1.5"
            >
              Upload new picture
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
              <input
                id="profile-name"
                type="text"
                className="input"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="profile-location" className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
              <input
                id="profile-location"
                type="text"
                className="input"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-sm font-medium text-slate-700 mb-1.5">Bio</label>
            <textarea
              id="profile-bio"
              rows={3}
              className="input resize-none"
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell us a little bit about yourself"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="profile-website" className="block text-sm font-medium text-slate-700 mb-1.5">Website URL</label>
              <input
                id="profile-website"
                type="url"
                className="input"
                value={form.website}
                onChange={e => setForm({ ...form, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label htmlFor="profile-twitter" className="block text-sm font-medium text-slate-700 mb-1.5">Twitter Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                <input
                  id="profile-twitter"
                  type="text"
                  className="input pl-8"
                  value={form.twitterHandle}
                  onChange={e => setForm({ ...form, twitterHandle: e.target.value.replace('@', '') })}
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
