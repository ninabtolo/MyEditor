# MyEditor

MyEditor is a web-based code editor designed to provide a seamless coding experience. It supports multiple programming languages, file management, and integration with AI for chat-based assistance.

## Features

- **Code Editor**: Write and edit code with syntax highlighting and language detection.
- **File Management**: Upload files and folders, create new files, and manage them in a file tree.
- **Run Code**: Execute code in supported languages and view the output directly in the editor.
- **AI Chat**: Interact with an AI assistant for coding-related queries and suggestions.
- **Download & Save**: Download individual files or save the entire project as a ZIP file.

## Planned Enhancements

- **Responsive Design**: The editor will be optimized for mobile and tablet devices, ensuring a smooth experience across all screen sizes.
- **Integrated Terminal**: A built-in terminal will be added to execute commands and interact with the system directly from the editor.

## Getting Started

### Prerequisites

- Node.js and npm installed on your system.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd MyEditor
   ```

2. Install dependencies for both frontend and backend:
   ```bash
   cd frontend
   npm install
   cd ../backend
   npm install
   ```

3. Configure the `.env` file in the `backend` folder:
   ```properties
   GEMINI_API_KEY=your_gemini_api_key_here
   JUDGE0_API_KEY=your_judge0_api_key_here
   PORT=3000
   ```

   > **Note**: Ensure both the Gemini API key and the Judge0 API key are set in the `.env` file. Replace the placeholder keys with your own API keys obtained from the respective services.

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open the application in your browser at `http://localhost:5173`.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve the project.

## License

This project is licensed under the ISC License.

