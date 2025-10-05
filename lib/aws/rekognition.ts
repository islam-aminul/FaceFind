import {
  CreateCollectionCommand,
  DeleteCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DetectFacesCommand,
  DeleteFacesCommand,
} from '@aws-sdk/client-rekognition';
import { rekognitionClient } from './config';

export class RekognitionService {
  async createCollection(collectionId: string): Promise<void> {
    try {
      await rekognitionClient.send(
        new CreateCollectionCommand({
          CollectionId: collectionId,
        })
      );
    } catch (error: any) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    try {
      await rekognitionClient.send(
        new DeleteCollectionCommand({
          CollectionId: collectionId,
        })
      );
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }
  }

  async indexFaces(
    collectionId: string,
    imageBytes: Buffer,
    externalImageId: string
  ): Promise<{
    faceRecords: Array<{
      faceId: string;
      boundingBox: { Width: number; Height: number; Left: number; Top: number };
      confidence: number;
    }>;
  }> {
    const result = await rekognitionClient.send(
      new IndexFacesCommand({
        CollectionId: collectionId,
        Image: { Bytes: imageBytes },
        ExternalImageId: externalImageId,
        DetectionAttributes: ['ALL'],
        MaxFaces: 15,
        QualityFilter: 'AUTO',
      })
    );

    return {
      faceRecords: (result.FaceRecords || []).map((record) => ({
        faceId: record.Face?.FaceId || '',
        boundingBox: {
          Width: record.Face?.BoundingBox?.Width || 0,
          Height: record.Face?.BoundingBox?.Height || 0,
          Left: record.Face?.BoundingBox?.Left || 0,
          Top: record.Face?.BoundingBox?.Top || 0,
        },
        confidence: record.Face?.Confidence || 0,
      })),
    };
  }

  async searchFacesByImage(
    collectionId: string,
    imageBytes: Buffer,
    confidenceThreshold: number = 80
  ): Promise<Array<{
    faceId: string;
    similarity: number;
    externalImageId: string;
  }>> {
    const result = await rekognitionClient.send(
      new SearchFacesByImageCommand({
        CollectionId: collectionId,
        Image: { Bytes: imageBytes },
        FaceMatchThreshold: confidenceThreshold,
        MaxFaces: 100,
      })
    );

    return (result.FaceMatches || []).map((match) => ({
      faceId: match.Face?.FaceId || '',
      similarity: match.Similarity || 0,
      externalImageId: match.Face?.ExternalImageId || '',
    }));
  }

  async detectFaces(imageBytes: Buffer): Promise<number> {
    const result = await rekognitionClient.send(
      new DetectFacesCommand({
        Image: { Bytes: imageBytes },
        Attributes: ['DEFAULT'],
      })
    );

    return result.FaceDetails?.length || 0;
  }

  async deleteFaces(collectionId: string, faceIds: string[]): Promise<void> {
    if (faceIds.length === 0) return;

    await rekognitionClient.send(
      new DeleteFacesCommand({
        CollectionId: collectionId,
        FaceIds: faceIds,
      })
    );
  }
}

export const rekognitionService = new RekognitionService();
