'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Portfolio {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  portfolioUrl?: string;
  specialization?: string;
  bio?: string;
  totalEvents: number;
  totalPhotos: number;
  averagePhotos: number;
  memberSince: string;
}

export default function PhotographerPortfolioPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    portfolioUrl: '',
    specialization: '',
    bio: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'PHOTOGRAPHER') {
      router.push('/login');
      return;
    }

    setUserId(user.id);
    fetchPortfolio(token, user.id);
  }, [router]);

  const fetchPortfolio = async (token: string, userId: string) => {
    try {
      const response = await fetch('/api/v1/photographer/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPortfolio(data.portfolio);
        setFormData({
          portfolioUrl: data.portfolio.portfolioUrl || '',
          specialization: data.portfolio.specialization || '',
          bio: data.portfolio.bio || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/v1/photographer/portfolio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Portfolio updated successfully!');
        fetchPortfolio(token, userId);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update portfolio');
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to update portfolio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/photographer" className="text-blue-600 hover:text-blue-800 text-sm mb-2 block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Portfolio</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{portfolio?.totalEvents || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Photos</p>
                  <p className="text-2xl font-bold text-gray-900">{portfolio?.totalPhotos || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Photos/Event</p>
                  <p className="text-2xl font-bold text-gray-900">{portfolio?.averagePhotos || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-sm font-medium text-gray-900">
                    {portfolio?.memberSince ? new Date(portfolio.memberSince).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm text-gray-900">
                    {portfolio?.firstName} {portfolio?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{portfolio?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm text-gray-900">{portfolio?.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Edit Portfolio</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://yourportfolio.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Link to your external portfolio website
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Wedding Photography, Event Photography"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your area of expertise
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell us about yourself, your experience, and your photography style..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A brief description about you and your work
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Portfolio'}
                </button>
              </form>
            </div>

            {/* Preview */}
            {(formData.bio || formData.specialization || formData.portfolioUrl) && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>

                <div className="space-y-4">
                  {formData.specialization && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Specialization</p>
                      <p className="text-gray-900">{formData.specialization}</p>
                    </div>
                  )}

                  {formData.bio && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Bio</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{formData.bio}</p>
                    </div>
                  )}

                  {formData.portfolioUrl && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Portfolio</p>
                      <a
                        href={formData.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {formData.portfolioUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
