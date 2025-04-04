import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

interface SubmissionResult {
  token: string;
}

interface ApiResponse {
  status: {
    id: number;
  };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
}

interface LanguageCodeMap {
  [key: string]: number;
}

const LanguageCodeMap: LanguageCodeMap = {
  cpp: 54,
  python: 92,
  javascript: 93,
  java: 91,
};

function encodeBase64(data: string): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  return btoa(String.fromCharCode(...encoded));
}

async function getSubmission(tokenId: string): Promise<ApiResponse> {
  const options: AxiosRequestConfig = {
    method: 'GET',
    url: `https://judge0-ce.p.rapidapi.com/submissions/${tokenId}`,
    params: {
      base64_encoded: 'true',
      fields: '*',
    },
    headers: {
      'x-rapidapi-key': '65595861dcmshdd8368a99ce7c23p1c9913jsn20821aa15979',
      'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
    },
  };

  try {
    const response: AxiosResponse = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Error fetching submission:', error);
    throw new Error('Error fetching submission');
  }
}

interface MakeSubmissionParams {
  code: string;
  language: keyof LanguageCodeMap;
  callback: (status: { apiStatus: string; message?: string; data?: ApiResponse }) => void;
  stdin?: string;
}

async function makeSubmission({ code, language, callback, stdin }: MakeSubmissionParams): Promise<void> {
  // Verifique se o callback é uma função antes de utilizá-lo
  if (typeof callback !== 'function') {
    throw new TypeError('callback is not a function');
  }

  const options: AxiosRequestConfig = {
    method: 'POST',
    url: 'https://judge0-ce.p.rapidapi.com/submissions',
    params: {
      base64_encoded: 'true',
      wait: 'false',
      fields: '*',
    },
    headers: {
      'x-rapidapi-key': '65595861dcmshdd8368a99ce7c23p1c9913jsn20821aa15979',
      'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
      'Content-Type': 'application/json',
    },
    data: {
      language_id: LanguageCodeMap[language],
      source_code: encodeBase64(code),
      stdin: stdin ? encodeBase64(stdin) : '',
    },
  };

  try {
    callback({ apiStatus: 'loading' });

    const response: AxiosResponse = await axios.request(options);
    const tokenId: string = response.data.token;

    let statusCode: number = 1;
    let apiSubmissionResult: ApiResponse | null = null;

    // Monitorar o status da execução
    while (statusCode === 1 || statusCode === 2) {
      try {
        apiSubmissionResult = await getSubmission(tokenId);
        statusCode = apiSubmissionResult.status.id;
        console.log('Status da execução: ', statusCode);
      } catch (error) {
        callback({ apiStatus: 'error', message: JSON.stringify(error) });
        return;
      }
    }

    if (apiSubmissionResult && statusCode !== 3) {
      callback({ apiStatus: 'success', data: apiSubmissionResult });
    } else {
      callback({ apiStatus: 'error', message: 'Execution failed.' });
    }
  } catch (error) {
    callback({ apiStatus: 'error', message: JSON.stringify(error) });
  }
}

export { makeSubmission, getSubmission };
