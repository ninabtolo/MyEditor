import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config(); 

const app = express();
const port = process.env.PORT || 3000;

const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY; 

app.use(cors());
app.use(express.json());

const LanguageCodeMap = {
  c: 110,
  csharp: 51,
  cpp: 54,
  python: 92,
  javascript: 93,
  java: 91,
  sql: 82,
  go: 107,
  php: 68,
  lua: 64,
  rust: 108,
  ruby: 72,
  swift: 83,
};

app.post('/run-code', async (req, res) => {
  const { code, language, stdin } = req.body;

  const languageId = LanguageCodeMap[language];
  const base64Code = Buffer.from(code).toString('base64');
  const base64Stdin = stdin ? Buffer.from(stdin).toString('base64') : '';

  const options = {
    method: 'POST',
    url: 'https://judge0-ce.p.rapidapi.com/submissions',
    params: {
      base64_encoded: 'true',
      wait: 'false',
      fields: '*',
    },
    headers: {
      'x-rapidapi-key': JUDGE0_API_KEY, 
      'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
      'Content-Type': 'application/json',
    },
    data: {
      language_id: languageId,
      source_code: base64Code,
      stdin: base64Stdin,
    },
  };

  try {
    const response = await axios.request(options);
    const tokenId = response.data.token;

    console.log("Token recebido:", tokenId);

    let statusCode = 1;
    let apiSubmissionResult;

    while (statusCode === 1 || statusCode === 2) {
      const statusResponse = await axios.get(`https://judge0-ce.p.rapidapi.com/submissions/${tokenId}`, {
        params: {
          base64_encoded: 'true',
          fields: '*',
        },
        headers: {
          'x-rapidapi-key': JUDGE0_API_KEY, 
          'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
        },
      });

      apiSubmissionResult = statusResponse.data;
      statusCode = apiSubmissionResult.status.id;

      if (statusCode === 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log("Resultado da execução:", apiSubmissionResult);

    let decodedOutput = null;
    if (apiSubmissionResult.stdout) {
      try {
        decodedOutput = Buffer.from(apiSubmissionResult.stdout, 'base64').toString('utf-8');
        console.log("Saída decodificada:", decodedOutput); 

        if (decodedOutput.trim() === '') {
          decodedOutput = 'No output';
        }
      } catch (error) {
        console.error('Erro ao decodificar stdout em base64:', error);
        decodedOutput = 'Error decoding output';
      }
    }

    if (statusCode === 3) {
      return res.json({
        apiStatus: 'success',
        data: {
          stdout: decodedOutput,  
          time: apiSubmissionResult.time,
          memory: apiSubmissionResult.memory,
        },
      });
    }

    res.json({
      apiStatus: 'error',
      message: 'Execution failed.',
      details: apiSubmissionResult,
    });
  } catch (error) {
    console.error('Error during submission:', error);
    res.json({
      apiStatus: 'error',
      message: error.message,
    });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
  
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY not configured"
    });
  }
  
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: message
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000
        }
      }
    );
    
    const responseText = response.data.candidates[0].content.parts[0].text;
    
    return res.json({
      success: true,
      data: responseText
    });
  } catch (error) {
    console.error('Error with Gemini API:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
