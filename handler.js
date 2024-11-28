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
    // Validate incoming request
    if (!event.body) {
      throw new Error('Request body is missing');
    }

    let imageBuffer;

    // Check if the request is multipart/form-data
    if (event.headers['content-type']?.includes('multipart/form-data')) {
      const boundary = event.headers['content-type'].split('boundary=')[1];
      const parts = event.body.split(boundary);
      const imagePart = parts.find((part) => part.includes('name="image"'));

      if (!imagePart) {
        throw new Error('Image not found in form data');
      }

      // Extract the base64 content
      const matches = imagePart.match(
        /Content-Type: image\/\w+\r\n\r\n(.*?)\r\n/s
      );
      if (!matches) {
        throw new Error('Invalid image format in form data');
      }

      imageBuffer = Buffer.from(matches[1], 'binary');
    } else {
      // Handle JSON request (existing logic)
      const body =
        typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      if (!body.image) {
        throw new Error('Image data is missing');
      }
      const base64Image = body.image.includes('base64,')
        ? body.image.split('base64,')[1].trim()
        : body.image.trim();
      imageBuffer = Buffer.from(base64Image, 'base64');
    }

    // Generate unique filename
    const filename = `capture-${Date.now()}.jpg`;

    // Upload to S3
    const putParams = {
      Bucket: 'avenga-user-profile-images',
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
        imageUrl: `https://avenga-user-profile-images.s3.amazonaws.com/${filename}`,
        analysis: rekognitionResponse.Labels
      })
    };
  } catch (error) {
    console.error('Error details:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Error processing image',
        error: error.message,
        details: error.stack
      })
    };
  }
};
