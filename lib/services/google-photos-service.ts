/**
 * Google Photos Integration Service
 *
 * Features:
 * - OAuth 2.0 authentication flow
 * - List photos from Google Photos
 * - Download photos for import
 * - Token management (access/refresh)
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/photographer/google-photos/callback`
  : 'http://localhost:3000/api/v1/photographer/google-photos/callback';

// Google OAuth & Photos API endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_PHOTOS_API_URL = 'https://photoslibrary.googleapis.com/v1';

// Required scopes for Google Photos readonly access
const SCOPES = [
  'https://www.googleapis.com/auth/photoslibrary.readonly',
];

export interface GooglePhotosAuthUrl {
  authUrl: string;
  state: string; // CSRF protection token
}

export interface GooglePhotosToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  scope: string;
  tokenType: string;
}

export interface GooglePhoto {
  id: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
    };
  };
}

export interface GooglePhotosListResponse {
  mediaItems: GooglePhoto[];
  nextPageToken?: string;
}

export class GooglePhotosService {
  /**
   * Check if Google Photos integration is configured
   */
  private isConfigured(): boolean {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  }

  /**
   * Generate OAuth authorization URL
   * @param userId - User ID to associate with the token
   * @returns Authorization URL and state token
   */
  public generateAuthUrl(userId: string): GooglePhotosAuthUrl {
    if (!this.isConfigured()) {
      throw new Error('Google Photos integration not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    }

    // Generate random state token for CSRF protection
    const state = this.generateStateToken(userId);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent screen to always get refresh token
      state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    return { authUrl, state };
  }

  /**
   * Exchange authorization code for access token
   * @param code - Authorization code from OAuth callback
   * @returns Token information
   */
  public async exchangeCodeForToken(code: string): Promise<GooglePhotosToken> {
    if (!this.isConfigured()) {
      throw new Error('Google Photos integration not configured');
    }

    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Google OAuth token exchange error:', error);
        throw new Error('Failed to exchange authorization code for token');
      }

      const data = await response.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
      };

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        scope: data.scope,
        tokenType: data.token_type,
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh an expired access token
   * @param refreshToken - The refresh token
   * @returns New token information
   */
  public async refreshAccessToken(refreshToken: string): Promise<GooglePhotosToken> {
    if (!this.isConfigured()) {
      throw new Error('Google Photos integration not configured');
    }

    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Google OAuth token refresh error:', error);
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json() as {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
      };

      return {
        accessToken: data.access_token,
        refreshToken, // Keep the same refresh token
        expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        scope: data.scope,
        tokenType: data.token_type,
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * List photos from Google Photos within a date range
   * @param accessToken - Valid access token
   * @param startDate - Start date (ISO 8601)
   * @param endDate - End date (ISO 8601)
   * @param pageToken - Optional page token for pagination
   * @param pageSize - Number of items per page (max 100)
   * @returns List of photos
   */
  public async listPhotos(
    accessToken: string,
    startDate: string,
    endDate: string,
    pageToken?: string,
    pageSize: number = 50
  ): Promise<GooglePhotosListResponse> {
    try {
      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Build search filter for date range
      const filters = {
        dateFilter: {
          ranges: [
            {
              startDate: {
                year: start.getFullYear(),
                month: start.getMonth() + 1,
                day: start.getDate(),
              },
              endDate: {
                year: end.getFullYear(),
                month: end.getMonth() + 1,
                day: end.getDate(),
              },
            },
          ],
        },
        mediaTypeFilter: {
          mediaTypes: ['PHOTO'], // Only photos, not videos
        },
      };

      const requestBody: any = {
        filters,
        pageSize: Math.min(pageSize, 100), // Google Photos API max is 100
      };

      if (pageToken) {
        requestBody.pageToken = pageToken;
      }

      const response = await fetch(`${GOOGLE_PHOTOS_API_URL}/mediaItems:search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Google Photos API error:', error);
        throw new Error('Failed to list photos from Google Photos');
      }

      const data = await response.json() as GooglePhotosListResponse;
      return data;
    } catch (error) {
      console.error('Error listing photos:', error);
      throw error;
    }
  }

  /**
   * Download a photo from Google Photos
   * @param baseUrl - Base URL from photo metadata
   * @param width - Desired width (optional)
   * @param height - Desired height (optional)
   * @returns Photo buffer
   */
  public async downloadPhoto(
    baseUrl: string,
    width?: number,
    height?: number
  ): Promise<Buffer> {
    try {
      // Construct download URL with size parameters
      let downloadUrl = baseUrl;

      if (width || height) {
        const params = [];
        if (width) params.push(`w${width}`);
        if (height) params.push(`h${height}`);
        downloadUrl = `${baseUrl}=${params.join('-')}`;
      } else {
        // Request original size
        downloadUrl = `${baseUrl}=d`;
      }

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error('Failed to download photo from Google Photos');
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error downloading photo:', error);
      throw error;
    }
  }

  /**
   * Get photo metadata by ID
   * @param accessToken - Valid access token
   * @param photoId - Google Photos media item ID
   * @returns Photo metadata
   */
  public async getPhotoById(accessToken: string, photoId: string): Promise<GooglePhoto> {
    try {
      const response = await fetch(`${GOOGLE_PHOTOS_API_URL}/mediaItems/${photoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Google Photos API error:', error);
        throw new Error('Failed to get photo from Google Photos');
      }

      const data = await response.json() as GooglePhoto;
      return data;
    } catch (error) {
      console.error('Error getting photo:', error);
      throw error;
    }
  }

  /**
   * Generate a state token for CSRF protection
   * Encodes userId and a random string
   * @param userId - User ID
   * @returns State token
   */
  private generateStateToken(userId: string): string {
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();
    return Buffer.from(`${userId}:${random}:${timestamp}`).toString('base64url');
  }

  /**
   * Parse state token to extract user ID
   * @param state - State token
   * @returns User ID
   */
  public parseStateToken(state: string): string {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const [userId] = decoded.split(':');
      return userId;
    } catch (error) {
      console.error('Error parsing state token:', error);
      throw new Error('Invalid state token');
    }
  }

  /**
   * Check if token is expired
   * @param expiresAt - Unix timestamp
   * @returns True if token is expired or about to expire (within 5 minutes)
   */
  public isTokenExpired(expiresAt: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 5 * 60; // 5 minutes buffer
    return expiresAt - now < bufferTime;
  }
}

export const googlePhotosService = new GooglePhotosService();
