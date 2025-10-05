import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from './config';
import { v4 as uuidv4 } from 'uuid';

// Re-export TABLES for convenience
export { TABLES };

// Generic CRUD operations
export class DynamoDBService {
  async create<T extends Record<string, any>>(tableName: string, item: T): Promise<T> {
    const itemWithId = {
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: itemWithId,
      })
    );

    return itemWithId as T;
  }

  async get<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      })
    );

    return (result.Item as T) || null;
  }

  async update<T>(
    tableName: string,
    key: Record<string, any>,
    updates: Partial<T>
  ): Promise<T> {
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      updateExpression.push(`#attr${index} = :val${index}`);
      expressionAttributeNames[`#attr${index}`] = key;
      expressionAttributeValues[`:val${index}`] = value;
    });

    // Always update the updatedAt timestamp
    updateExpression.push(`#updatedAt = :updatedAt`);
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const result = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as T;
  }

  async delete(tableName: string, key: Record<string, any>): Promise<void> {
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: key,
      })
    );
  }

  async query<T>(
    tableName: string,
    indexName: string | undefined,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<T[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      })
    );

    return (result.Items as T[]) || [];
  }

  async scan<T>(
    tableName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>
  ): Promise<T[]> {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return (result.Items as T[]) || [];
  }
}

export const db = new DynamoDBService();

// Helper functions for specific entities
export const generateId = (prefix: string) => `${prefix}_${uuidv4()}`;
