const axios = require('axios');

const apiUrl =
  'https://<tu-api-id>.execute-api.<tu-región>.amazonaws.com/dev/process';

const testPostProcessImage = async () => {
  const payload = {
    imagePath: 'path/to/your/image.jpg'
  };

  try {
    const response = await axios.post(apiUrl, payload);
    console.log('Status:', response.status);
    console.log('Processed Image URL:', response.data.processedImageUrl);
    console.log('Image Analysis:', response.data.analysis);
  } catch (error) {
    console.error(
      'Error:',
      error.response ? error.response.data : error.message
    );
  }
};

testPostProcessImage();
