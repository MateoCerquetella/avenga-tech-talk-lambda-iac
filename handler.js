import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  RekognitionClient,
  DetectLabelsCommand
} from '@aws-sdk/client-rekognition';
import { Buffer } from 'buffer';

const s3Client = new S3Client({ region: 'us-east-1' });
const rekognitionClient = new RekognitionClient({ region: 'us-east-1' });

export const process = async (event) => {
  try {
    // Parse multipart form data
    const boundary = event.headers['content-type'].split('=')[1];
    const parts = event.body.split(boundary);
    const imagePart = parts.find((part) => part.includes('filename'));
    const base64Image = imagePart.split('base64,')[1].trim();
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Generate unique filename
    const filename = `capture-${Date.now()}.jpg`;

    // Upload to S3
    const putParams = {
      Bucket: 'user-profile-images',
      Key: filename,
      Body: imageBuffer,
      ContentType: 'image/jpeg'
    };
    const putObjectCommand = new PutObjectCommand(putParams);
    await s3Client.send(putObjectCommand);

    // Analyze with Rekognition
    const rekognitionParams = {
      Image: {
        Bytes: imageBuffer
      }
    };
    const detectLabelsCommand = new DetectLabelsCommand(rekognitionParams);
    const rekognitionResponse = await rekognitionClient.send(
      detectLabelsCommand
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Image processed successfully',
        imageUrl: `https://user-profile-images.s3.amazonaws.com/${filename}`,
        analysis: rekognitionResponse.Labels
      })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error processing image',
        error: error.message
      })
    };
  }
};
