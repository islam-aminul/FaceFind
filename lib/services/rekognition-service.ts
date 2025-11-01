import {
  RekognitionClient,
  CreateCollectionCommand,
  DeleteCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DetectFacesCommand,
  DescribeCollectionCommand,
} from '@aws-sdk/client-rekognition';
import { rekognitionClient } from '../aws/config';

export interface FaceMatch {
  faceId: string;
  similarity: number;
  photoId?: string;
}

export interface FaceDetection {
  boundingBox: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
  confidence: number;
  faceId?: string;
}

export interface IndexedFace {
  faceId: string;
  imageId: string;
  boundingBox: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
  confidence: number;
}

export class RekognitionService {
  private client: RekognitionClient;

  constructor() {
    this.client = rekognitionClient;
  }

  /**
   * Create a collection for an event
   */
  async createCollection(collectionId: string): Promise<void> {
    try {
      await this.client.send(
        new CreateCollectionCommand({
          CollectionId: collectionId,
        })
      );
      console.log(`Collection created: ${collectionId}`);
    } catch (error: any) {
      if (error.name === 'ResourceAlreadyExistsException') {
        console.log(`Collection already exists: ${collectionId}`);
        return;
      }
      throw error;
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(collectionId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteCollectionCommand({
          CollectionId: collectionId,
        })
      );
      console.log(`Collection deleted: ${collectionId}`);
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`Collection not found: ${collectionId}`);
        return;
      }
      throw error;
    }
  }

  /**
   * Check if collection exists
   */
  async collectionExists(collectionId: string): Promise<boolean> {
    try {
      await this.client.send(
        new DescribeCollectionCommand({
          CollectionId: collectionId,
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Index faces from an image into a collection
   */
  async indexFaces(
    collectionId: string,
    imageBytes: Buffer,
    photoId: string
  ): Promise<IndexedFace[]> {
    try {
      const response = await this.client.send(
        new IndexFacesCommand({
          CollectionId: collectionId,
          Image: {
            Bytes: imageBytes,
          },
          ExternalImageId: photoId,
          DetectionAttributes: ['ALL'],
          MaxFaces: 10,
          QualityFilter: 'AUTO',
        })
      );

      const indexedFaces: IndexedFace[] = [];

      if (response.FaceRecords) {
        for (const record of response.FaceRecords) {
          if (record.Face && record.FaceDetail) {
            indexedFaces.push({
              faceId: record.Face.FaceId || '',
              imageId: record.Face.ExternalImageId || photoId,
              boundingBox: {
                width: record.FaceDetail.BoundingBox?.Width || 0,
                height: record.FaceDetail.BoundingBox?.Height || 0,
                left: record.FaceDetail.BoundingBox?.Left || 0,
                top: record.FaceDetail.BoundingBox?.Top || 0,
              },
              confidence: record.FaceDetail.Confidence || 0,
            });
          }
        }
      }

      return indexedFaces;
    } catch (error: any) {
      console.error('Error indexing faces:', error);
      throw new Error(`Failed to index faces: ${error.message}`);
    }
  }

  /**
   * Detect faces in an image (without indexing)
   */
  async detectFaces(imageBytes: Buffer): Promise<FaceDetection[]> {
    try {
      const response = await this.client.send(
        new DetectFacesCommand({
          Image: {
            Bytes: imageBytes,
          },
          Attributes: ['ALL'],
        })
      );

      const faces: FaceDetection[] = [];

      if (response.FaceDetails) {
        for (const face of response.FaceDetails) {
          faces.push({
            boundingBox: {
              width: face.BoundingBox?.Width || 0,
              height: face.BoundingBox?.Height || 0,
              left: face.BoundingBox?.Left || 0,
              top: face.BoundingBox?.Top || 0,
            },
            confidence: face.Confidence || 0,
          });
        }
      }

      return faces;
    } catch (error: any) {
      console.error('Error detecting faces:', error);
      throw new Error(`Failed to detect faces: ${error.message}`);
    }
  }

  /**
   * Search for matching faces in a collection
   */
  async searchFacesByImage(
    collectionId: string,
    imageBytes: Buffer,
    confidenceThreshold: number = 80,
    maxFaces: number = 50
  ): Promise<FaceMatch[]> {
    try {
      // First, ensure collection exists
      const exists = await this.collectionExists(collectionId);
      if (!exists) {
        throw new Error(`Collection ${collectionId} does not exist`);
      }

      const response = await this.client.send(
        new SearchFacesByImageCommand({
          CollectionId: collectionId,
          Image: {
            Bytes: imageBytes,
          },
          FaceMatchThreshold: confidenceThreshold,
          MaxFaces: maxFaces,
          QualityFilter: 'AUTO',
        })
      );

      const matches: FaceMatch[] = [];

      if (response.FaceMatches) {
        for (const match of response.FaceMatches) {
          if (match.Face) {
            matches.push({
              faceId: match.Face.FaceId || '',
              similarity: match.Similarity || 0,
              photoId: match.Face.ExternalImageId, // This is the photoId we stored
            });
          }
        }
      }

      return matches;
    } catch (error: any) {
      console.error('Error searching faces:', error);
      throw new Error(`Failed to search faces: ${error.message}`);
    }
  }

  /**
   * Generate collection ID for an event
   */
  static generateCollectionId(eventId: string): string {
    // AWS Rekognition collection IDs must be alphanumeric with hyphens/underscores
    return `facefind-event-${eventId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }
}

export const rekognitionService = new RekognitionService();
